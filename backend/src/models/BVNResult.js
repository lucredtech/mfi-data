const mongoose = require('mongoose');

const bvnResultSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    bvn: { type: String },
    result: { type: Object },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BVNResult', bvnResultSchema);
