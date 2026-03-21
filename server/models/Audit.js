import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    summary: String,
    ip: String,
    userAgent: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, strict: false, collection: 'audits' }
);

auditSchema.index({ actorId: 1, createdAt: -1 });
auditSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model('Audit', auditSchema);
