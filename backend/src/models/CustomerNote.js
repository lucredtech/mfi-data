const mongoose = require('mongoose');

const customerNoteSchema = new mongoose.Schema({
  client:   { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer',  required: true },
  text:     { type: String, required: true, maxlength: 2000 },
  author:   { type: String, default: 'Credit Officer' },
}, { timestamps: true });

customerNoteSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerNote', customerNoteSchema);
