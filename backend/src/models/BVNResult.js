const mongoose = require('mongoose');

const BVN_TTL_DAYS = 90;

const bvnResultSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    bvn: { type: String },
    result: { type: Object }, // includes image (base64) for analyst review; TTL expires after 90 days
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
    expireAt: { type: Date, default: () => new Date(Date.now() + BVN_TTL_DAYS * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

bvnResultSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BVNResult', bvnResultSchema);
