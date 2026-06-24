const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teamMemberSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  email: { type: String, required: true, lowercase: true },
  name: { type: String },
  role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
  status: { type: String, enum: ['pending', 'active'], default: 'pending' },
  password: { type: String },
  inviteToken: { type: String },   // hashed
  inviteExpires: { type: Date },
  invitedBy: { type: String },     // name of the person who sent the invite
}, { timestamps: true });

teamMemberSchema.index({ client: 1 });
teamMemberSchema.index({ email: 1, client: 1 }, { unique: true });

teamMemberSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

teamMemberSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('TeamMember', teamMemberSchema);
