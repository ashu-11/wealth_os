import mongoose from 'mongoose';

const complianceMetricSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    current: { type: Number, required: true },
    total: { type: Number, required: true },
    tone: { type: String, enum: ['sage', 'gold', 'rose'], default: 'sage' }
  },
  { collection: 'compliance_metrics' }
);

complianceMetricSchema.index({ key: 1 }, { unique: true });

export default mongoose.model('ComplianceMetric', complianceMetricSchema);
