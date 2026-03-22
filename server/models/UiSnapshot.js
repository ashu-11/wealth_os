import mongoose from 'mongoose';

/**
 * Read-model snapshots for hierarchy UI (RM team, BM team, RSM branches).
 * One document per logical row — query by kind + userId/htmlId/branchId.
 */
const uiSnapshotSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['rm_team', 'bm_team', 'rsm_branch'],
      required: true,
      index: true
    },
    /** HTML list id (101–106, 201–204, 301–308) */
    htmlId: { type: Number, required: true },
    /** Linked user when applicable (RM / ASM) */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true, collection: 'ui_snapshots' }
);

uiSnapshotSchema.index({ kind: 1, htmlId: 1 }, { unique: true });

export default mongoose.model('UiSnapshot', uiSnapshotSchema);
