import mongoose from 'mongoose';

/**
 * Normalized branch (BM / RSM rollups). Keeps hierarchy UI off `users` documents.
 * Scales with regionCode + code indexes; optional bmUserId links to User.
 */
const branchSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    regionCode: { type: String, trim: true, index: true },
    /** wealthos-hierarchy.html branch id (301 = Mumbai) */
    htmlId: { type: Number, sparse: true },
    bmUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    /** When BM is not yet a User row */
    bmDisplayName: { type: String, trim: true },
    targetAumInr: { type: Number, default: 0 },
    /** Denormalized rollups (updated by jobs); optional for mock */
    metrics: {
      aumInr: Number,
      customerCount: Number,
      asmCount: Number,
      rmCount: Number,
      targetPct: Number,
      status: String
    }
  },
  { timestamps: true, collection: 'branches' }
);

branchSchema.index({ code: 1 }, { unique: true });
branchSchema.index({ regionCode: 1, city: 1 });

export default mongoose.model('Branch', branchSchema);
