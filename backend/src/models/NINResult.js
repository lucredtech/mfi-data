const mongoose = require('mongoose');

const NIN_TTL_DAYS = 90;

const ninResultSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    nin: { type: String },
    result: { type: Object }, // includes photo (base64) for analyst review; TTL expires after 90 days
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    expireAt: { type: Date, default: () => new Date(Date.now() + NIN_TTL_DAYS * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

ninResultSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('NINResult', ninResultSchema);
