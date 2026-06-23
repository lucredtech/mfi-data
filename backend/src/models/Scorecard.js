const mongoose = require('mongoose');

const scorecardSchema = new mongoose.Schema({
  client:   { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer',  required: true },
  result:   { type: Object, required: true },
}, { timestamps: true });

scorecardSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Scorecard', scorecardSchema);
