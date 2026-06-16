const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    apiKey: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number },
    responseTimeMs: { type: Number },
    metadata: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UsageLog', usageLogSchema);
