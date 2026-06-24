const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  type: {
    type: String,
    enum: ['webhook_failure', 'quota_warning', 'team_invite', 'loan_review', 'plan_upgraded', 'general'],
    default: 'general',
  },
  title: { type: String, required: true },
  body: { type: String },
  read: { type: Boolean, default: false },
  meta: { type: Object },
}, { timestamps: true });

notificationSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
