import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['retirement', 'education', 'house', 'car', 'wedding', 'travel', 'emergency', 'wealth', 'other'],
    required: true
  },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  targetDate: Date,
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  linkedFolios: [String],
  healthScore: { type: Number, min: 0, max: 100 }
});

const holdingSchema = new mongoose.Schema({
  folioNo: String,
  schemeName: { type: String, required: true },
  schemeCode: String,
  category: {
    type: String,
    enum: ['equity-large', 'equity-mid', 'equity-small', 'equity-flexi', 'hybrid', 'debt', 'liquid', 'elss', 'index', 'international', 'sectoral', 'other']
  },
  amc: String,
  units: { type: Number, default: 0 },
  nav: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  investedValue: { type: Number, default: 0 },
  returns: { type: Number, default: 0 },
  returnsPercent: { type: Number, default: 0 },
  purchaseDate: Date,
  isSip: { type: Boolean, default: false },
  sipAmount: Number,
  sipDate: Number // Day of month
});

const commLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['call', 'email', 'whatsapp', 'meeting', 'note'], required: true },
  summary: { type: String, required: true },
  outcome: String,
  nextAction: String,
  nextActionDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const customerSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, required: true },
  pan: { type: String, uppercase: true },
  dob: Date,
  
  // KYC
  kycStatus: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  kycDate: Date,
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String
  },
  
  // Risk Profile
  riskProfile: {
    type: String,
    enum: ['conservative', 'moderately-conservative', 'moderate', 'moderately-aggressive', 'aggressive'],
    default: 'moderate'
  },
  riskScore: { type: Number, min: 1, max: 10 },
  riskAssessmentDate: Date,
  
  // Portfolio Summary
  totalAum: { type: Number, default: 0 },
  totalInvested: { type: Number, default: 0 },
  totalReturns: { type: Number, default: 0 },
  totalReturnsPercent: { type: Number, default: 0 },
  
  // Allocation
  allocation: {
    equity: { type: Number, default: 0 },
    debt: { type: Number, default: 0 },
    hybrid: { type: Number, default: 0 },
    liquid: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  targetAllocation: {
    equity: { type: Number, default: 60 },
    debt: { type: Number, default: 30 },
    hybrid: { type: Number, default: 0 },
    liquid: { type: Number, default: 10 },
    other: { type: Number, default: 0 }
  },
  allocationDrift: { type: Number, default: 0 },

  /** Optional UI buckets (wealthos-hierarchy.html `alloc` rows) */
  portfolioSlices: [
    {
      name: { type: String, required: true },
      pct: { type: Number, required: true },
    },
  ],
  
  // Holdings
  holdings: [holdingSchema],
  
  // Goals
  goals: [goalSchema],
  
  // SIPs
  activeSipCount: { type: Number, default: 0 },
  totalSipAmount: { type: Number, default: 0 },
  nextSipDate: Date,
  
  // Status & Flags
  status: {
    type: String,
    enum: ['active', 'dormant', 'churned', 'prospect'],
    default: 'active'
  },
  churnRisk: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  },
  churnRiskScore: { type: Number, min: 0, max: 100 },
  churnRiskReasons: [String],
  
  // Compliance
  complianceStatus: {
    type: String,
    enum: ['compliant', 'attention', 'non-compliant'],
    default: 'compliant'
  },
  complianceFlags: [String],
  
  // RM Assignment (optional when ASM-owned direct book)
  rmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function () {
      return !this.isAsmDirectClient;
    }
  },
  /** ASM personal-book clients (no servicing RM in mock) */
  isAsmDirectClient: { type: Boolean, default: false },
  asmOwnerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  /** wealthos-hierarchy.html customers[].id */
  htmlId: { type: Number, sparse: true, unique: true },
  assignedDate: { type: Date, default: Date.now },
  
  // Communication
  lastContactDate: Date,
  preferredContactTime: String,
  preferredChannel: {
    type: String,
    enum: ['phone', 'whatsapp', 'email'],
    default: 'phone'
  },
  commLog: [commLogSchema],
  
  // AI-generated fields
  aiBrief: String,
  aiCallScript: String,
  aiOpportunities: [String],
  
  // Tags
  tags: [String],
  
  // External IDs
  camClientCode: String,
  hufDetails: {
    isHuf: { type: Boolean, default: false },
    kartaName: String,
    kartaPan: String
  }
}, {
  timestamps: true,
  collection: 'customers'
});

// Indexes
customerSchema.index({ rmId: 1 });
customerSchema.index({ asmOwnerUserId: 1, isAsmDirectClient: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ pan: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ churnRisk: 1 });
customerSchema.index({ totalAum: -1 });

// Virtual for YTD returns
customerSchema.virtual('ytdReturnsPercent').get(function() {
  if (!this.totalInvested || this.totalInvested === 0) return 0;
  return ((this.totalAum - this.totalInvested) / this.totalInvested * 100).toFixed(2);
});

// Method to calculate allocation drift
customerSchema.methods.calculateDrift = function() {
  const current = this.allocation;
  const target = this.targetAllocation;
  let totalDrift = 0;
  
  for (const key of Object.keys(target)) {
    totalDrift += Math.abs((current[key] || 0) - (target[key] || 0));
  }
  
  this.allocationDrift = totalDrift / 2; // Average drift
  return this.allocationDrift;
};

export default mongoose.model('Customer', customerSchema);
