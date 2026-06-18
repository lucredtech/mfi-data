const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    name: { type: String, required: true },
    email: { type: String },
    bvn: { type: String },
    nin: { type: String },
    phone: { type: String },
    address: { type: String },
    customerType: { type: String, enum: ['individual', 'business'], default: 'individual' },
  },
  { timestamps: true }
);

customerSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
