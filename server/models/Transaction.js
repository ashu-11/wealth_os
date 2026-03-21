import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    rmId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    folioNo: String,
    schemeCode: String,
    schemeName: String,
    type: {
      type: String,
      enum: ['purchase', 'redemption', 'sip', 'switch', 'stp', 'swp', 'dividend', 'other']
    },
    amount: Number,
    units: Number,
    nav: Number,
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'] },
    txnDate: Date,
    valueDate: Date,
    reference: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, strict: false, collection: 'transactions' }
);

transactionSchema.index({ customerId: 1, txnDate: -1 });
transactionSchema.index({ rmId: 1 });

export default mongoose.model('Transaction', transactionSchema);
