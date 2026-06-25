const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  client:   { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true, unique: true },
  balance:  { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  // Monthly free quota — resets 1st of each month
  freeQuota: {
    bvn:       { type: Number, default: 3 },
    nin:       { type: Number, default: 3 },
    statement: { type: Number, default: 3 },
    resetAt:   { type: Date, default: () => nextMonthStart() },
  },
}, { timestamps: true });

walletSchema.index({ client: 1 });

function nextMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

module.exports = mongoose.model('Wallet', walletSchema);
