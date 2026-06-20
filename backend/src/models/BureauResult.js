const mongoose = require('mongoose');

const BUREAU_TTL_DAYS = 180;

const bureauResultSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    bvn: { type: String },
    result: { type: Object },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    expireAt: { type: Date, default: () => new Date(Date.now() + BUREAU_TTL_DAYS * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

bureauResultSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BureauResult', bureauResultSchema);
