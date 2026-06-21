const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  client:     { type: mongoose.Schema.Types.ObjectId, ref: 'MFIClient', required: true },
  action:     { type: String, required: true }, // e.g. 'BVN_CHECK', 'CUSTOMER_CREATED'
  entityType: { type: String },                 // e.g. 'Customer', 'BVNResult'
  entityId:   { type: mongoose.Schema.Types.ObjectId },
  label:      { type: String },                 // human-readable description
  meta:       { type: Object, default: {} },    // extra context (customer name, BVN last4, etc.)
}, { timestamps: true });

auditLogSchema.index({ client: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
