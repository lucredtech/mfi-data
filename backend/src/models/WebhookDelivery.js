const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema({
  webhook: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  event: { type: String, required: true },
  status: { type: Number, default: 0 }, // HTTP status, 0 = network error
  ok: { type: Boolean, default: false },
  error: { type: String },
  attempt: { type: Number, default: 1 },
  duration: { type: Number }, // ms
}, { timestamps: true });

webhookDeliverySchema.index({ webhook: 1, createdAt: -1 });
webhookDeliverySchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
