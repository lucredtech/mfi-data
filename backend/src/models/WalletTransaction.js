const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  type:        { type: String, enum: ['topup', 'charge', 'refund', 'subscription_credit'], required: true },
  amount:      { type: Number, required: true }, // positive always; direction implied by type
  balanceAfter:{ type: Number, required: true },
  service:     { type: String }, // 'BVN_CHECK' | 'NIN_CHECK' | 'BUREAU_CHECK' | 'STATEMENT_ANALYSIS'
  customerName:{ type: String }, // human-readable for the log
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  description: { type: String }, // e.g. "BVN check — Adebayo Musa"
  ref:         { type: String }, // payment reference for topups
  freeQuota:   { type: Boolean, default: false }, // true = deducted from free quota, not balance
}, { timestamps: true });

walletTransactionSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
