import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'churn-risk',
      'compliance',
      'rebalance',
      'sip-bounce',
      'sip-expiry',
      'goal-drift',
      'market-event',
      'fund-change',
      'manager-change',
      'kyc-expiry',
      'birthday',
      'anniversary',
      'tax-opportunity',
      'redemption-alert',
      'new-opportunity'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // AI-generated action script
  aiScript: String,
  suggestedAction: String,
  
  // Targeting
  targetRole: {
    type: String,
    enum: ['RM', 'ASM', 'BM', 'RSM', 'ALL'],
    default: 'RM'
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  
  // Impact
  aumImpact: Number,
  impactType: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed', 'expired'],
    default: 'active'
  },
  acknowledgedAt: Date,
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: String,
  
  // Expiry
  expiresAt: Date,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  source: {
    type: String,
    enum: ['system', 'market', 'compliance', 'ai', 'manual'],
    default: 'system'
  }
}, {
  timestamps: true,
  collection: 'alerts'
});

// Indexes
alertSchema.index({ targetUserId: 1, status: 1 });
alertSchema.index({ customerId: 1 });
alertSchema.index({ type: 1 });
alertSchema.index({ priority: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to get alerts for a user based on role
alertSchema.statics.getForUser = async function(user, options = {}) {
  const { status = 'active', limit = 50 } = options;
  
  const query = {
    status,
    $or: [
      { targetUserId: user._id },
      { targetRole: user.role },
      { targetRole: 'ALL' }
    ]
  };
  
  return this.find(query)
    .populate('customerId', 'name phone totalAum')
    .sort({ priority: 1, createdAt: -1 })
    .limit(limit);
};

export default mongoose.model('Alert', alertSchema);
