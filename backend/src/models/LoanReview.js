const mongoose = require('mongoose');

const loanReviewSchema = new mongoose.Schema({
  client:   { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer',  required: true },

  // Loan parameters used for this run
  loanAmount:  { type: Number, default: 0 },
  loanTenor:   { type: Number, default: 0 },
  annualRate:  { type: Number, default: 0 },

  // Result
  verdict:    { type: String, enum: ['ELIGIBLE', 'CONDITIONAL', 'NOT_ELIGIBLE'], required: true },
  confidence: { type: String },
  avgScore:   { type: Number },
  summary:    { type: String },
  effectiveDTI: { type: Number },

  categories: { type: Object },   // {identityIntegrity, creditHistory, ...}
  flags:      [String],
  conditions: [String],
  dataAvailability: { type: Object },

  // Suggested amounts
  suggestedMinAmount: { type: Number },
  suggestedMaxAmount: { type: Number },
  affordableMonthly:  { type: Number },
  proposedMonthlyPayment: { type: Number },
  proposedTotalRepayment: { type: Number },
  proposedTotalInterest:  { type: Number },
}, { timestamps: true });

loanReviewSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('LoanReview', loanReviewSchema);
