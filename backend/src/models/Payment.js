const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  plan: { type: String, enum: ['growth', 'scale'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  method: { type: String, enum: ['bank_transfer', 'card', 'paystack', 'manual'], default: 'manual' },
  reference: { type: String },
  note: { type: String },
  recordedBy: { type: String },
}, { timestamps: true });

paymentSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
