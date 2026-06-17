const mongoose = require('mongoose');

const statementResultSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    email: { type: String },
    accountName: { type: String },
    bankName: { type: String },
    filename: { type: String },
    result: { type: Object },
    status: { type: String, enum: ['success', 'failed'], default: 'success' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StatementResult', statementResultSchema);
