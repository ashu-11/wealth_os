import mongoose from 'mongoose';

/** RM profile rows (collection `rms`), typically linked to users with role RM. */
const rmSchema = new mongoose.Schema(
  {
    /** Stable id for Atlas / HR integrations; required for unique index when present */
    employeeId: { type: String, trim: true, unique: true, sparse: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, lowercase: true, trim: true },
    name: { type: String, trim: true },
    phone: String,
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    regionCode: String,
    branchCode: String,
    targetAum: { type: Number, default: 0 },
    targetSip: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'rms' }
);

rmSchema.index({ userId: 1 }, { unique: true });
rmSchema.index({ email: 1 });

export default mongoose.model('Rm', rmSchema);
