const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const webhookSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  url: { type: String, required: true, maxlength: 500 },
  events: {
    type: [String],
    enum: ['bvn.verified', 'nin.verified', 'bureau.pulled', 'statement.analysed', 'loan_review.created', 'customer.created'],
    required: true,
  },
  secret: { type: String, default: () => `whsec_${uuidv4().replace(/-/g, '')}` },
  isActive: { type: Boolean, default: true },
  lastFiredAt: { type: Date },
  lastStatus: { type: Number },
}, { timestamps: true });

webhookSchema.index({ client: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
