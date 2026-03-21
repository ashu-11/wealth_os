import mongoose from 'mongoose';

/**
 * Key-value AI / book prompts (hierarchy + mobile). Separated from users for size & versioning.
 */
const promptBankSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ['hierarchy_book', 'mobile_book', 'meta'],
      required: true
    },
    key: { type: String, required: true, trim: true },
    content: { type: String, required: true }
  },
  { timestamps: true, collection: 'prompt_bank' }
);

promptBankSchema.index({ scope: 1, key: 1 }, { unique: true });

export default mongoose.model('PromptBank', promptBankSchema);
