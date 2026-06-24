const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const apiKeySchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    key: { type: String, default: () => `lcrd_${uuidv4().replace(/-/g, '')}`, unique: true },
    label: { type: String, default: 'Default Key' },
    mode: { type: String, enum: ['live', 'test'], default: 'live' },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiKey', apiKeySchema);
