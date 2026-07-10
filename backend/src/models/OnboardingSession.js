const mongoose = require('mongoose');

const SESSION_TTL_DAYS = 30;

const onboardingSessionSchema = new mongoose.Schema(
  {
    client:         { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
    customer:       { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    sessionToken:   { type: String, unique: true, required: true },
    type:           { type: String, enum: ['individual', 'sme'] },
    status:         { type: String, enum: ['in_progress', 'complete', 'abandoned'], default: 'in_progress' },
    currentStep:    { type: Number, default: 0 },
    completedSteps: { type: [Number], default: [] },
    data:           { type: Object, default: {} },
    verifications:  { type: Object, default: {} },
    expireAt:       { type: Date, default: () => new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

onboardingSessionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
onboardingSessionSchema.index({ client: 1, sessionToken: 1 });

module.exports = mongoose.model('OnboardingSession', onboardingSessionSchema);
