const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mfiClientSchema = new mongoose.Schema(
  {
    organizationName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String },
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'active' },
    plan: { type: String, enum: ['free', 'growth', 'scale'], default: 'free' },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient' },
    referralCount: { type: Number, default: 0 },
    quotaWarningsSent: { type: [String], default: [] },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String },
    emailVerifyExpires: { type: Date },
  },
  { timestamps: true }
);

mfiClientSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

mfiClientSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('MFIClient', mfiClientSchema);
