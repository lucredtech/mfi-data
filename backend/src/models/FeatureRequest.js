const mongoose = require('mongoose');

const featureRequestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 2000 },
  status: { type: String, enum: ['pending', 'reviewed', 'planned', 'shipped'], default: 'pending' },
  upvotes: { type: Number, default: 0 },
}, { timestamps: true });

featureRequestSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('FeatureRequest', featureRequestSchema);
