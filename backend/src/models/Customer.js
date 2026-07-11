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
    status: { type: String, enum: ['applied', 'under_review', 'approved', 'rejected', 'disbursed'], default: 'applied' },

    // Business-specific fields
    businessDetails: {
      cacNumber:       { type: String },
      companyType:     { type: String },
      cacVerified:     { type: Boolean, default: false },
      cacResult:       { type: mongoose.Schema.Types.Mixed },
      cacDocKey:       { type: String },
      memartKey:       { type: String },
      statusReportKey: { type: String },
      tinVerified:     { type: Boolean, default: false },
      tinNumber:       { type: String },
      tinResult:       { type: mongoose.Schema.Types.Mixed },
    },
    directors: [{
      name:        { type: String },
      bvn:         { type: String },
      bvnStatus:   { type: String, enum: ['success', 'failed', 'skipped'] },
      bureauStatus:{ type: String, enum: ['success', 'failed', 'no_record', 'skipped'] },
      idCardKey:   { type: String },
      addedAt:     { type: Date, default: Date.now },
    }],
    financials: [{
      filename:    { type: String },
      s3Key:       { type: String },
      size:        { type: Number },
      uploadedAt:  { type: Date, default: Date.now },
    }],
    guarantor: {
      name:         { type: String },
      phone:        { type: String },
      email:        { type: String },
      address:      { type: String },
      relationship: { type: String },
    },
  },
  { timestamps: true }
);

customerSchema.index({ client: 1, createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
