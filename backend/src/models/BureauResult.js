const mongoose = require('mongoose');

const bureauResultSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    bvn: { type: String },
    result: { type: Object },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BureauResult', bureauResultSchema);
