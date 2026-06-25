const router = require('express').Router();
const { requireJWT, requireWriteAccess } = require('../middleware/auth');
const dojahApi = require('../config/dojahApi');
const Anthropic = require('@anthropic-ai/sdk');
const Customer = require('../models/Customer');
const StatementResult = require('../models/StatementResult');
const BVNResult = require('../models/BVNResult');
const BureauResult = require('../models/BureauResult');
const NINResult = require('../models/NINResult');
const MFIClient = require('../models/MFIClient');
const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');
const CustomerNote = require('../models/CustomerNote');
const AuditLog = require('../models/AuditLog');
const LoanReview = require('../models/LoanReview');
const Scorecard = require('../models/Scorecard');
const { smsBorrowerDecision } = require('../utils/sms');
const { notify } = require('../utils/notify');
const { sendStaffLoanReviewAlert, sendStaffStatusChangeAlert } = require('../utils/mailer');
const { deductCharge, refundCharge } = require('../utils/wallet');
const axios = require('axios');
const { dispatchWebhook } = require('./webhooks');
const TeamMember = require('../models/TeamMember');

// Get all admin emails for a client (owner + admin team members)
async function getAdminEmails(clientId) {
  const [owner, adminMembers] = await Promise.all([
    MFIClient.findById(clientId).select('email').lean(),
    TeamMember.find({ client: clientId, role: 'admin', status: 'active' }).select('email').lean(),
  ]);
  return [...new Set([owner?.email, ...adminMembers.map(m => m.email)].filter(Boolean))];
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.use(requireJWT);

// Escape user input before using in RegExp to prevent injection
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Strip biometric fields from identity results before persisting
function stripBiometrics(result) {
  if (!result || typeof result !== 'object') return result;
  const { image, photo, ...safe } = result;
  return safe;
}

// List customers for the logged-in MFI client
router.get('/', async (req, res) => {
  try {
    const { q, status, customerType, dateFrom, dateTo, hasLoanReview, hasBureau, hasBvn, sort = 'createdAt' } = req.query;
    const filter = { client: req.client.id };

    if (status) filter.status = status;
    if (customerType) filter.customerType = customerType;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
    }

    if (q) {
      const safe = escapeRegex(q);
      filter.$or = [
        { name: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { phone: new RegExp(safe, 'i') },
        { bvn: new RegExp(safe, 'i') },
      ];
    }

    let customers = await Customer.find(filter).sort({ [sort === 'name' ? 'name' : 'createdAt']: sort === 'name' ? 1 : -1 }).lean();

    // Post-filter by related records (cheaper than $lookup for typical dataset sizes)
    if (hasLoanReview === 'true' || hasBureau === 'true' || hasBvn === 'true') {
      const ids = customers.map(c => c._id);
      const [lrIds, burIds, bvnIds] = await Promise.all([
        hasLoanReview === 'true' ? LoanReview.distinct('customer', { customer: { $in: ids } }) : null,
        hasBureau === 'true' ? BureauResult.distinct('customer', { customer: { $in: ids } }) : null,
        hasBvn === 'true' ? BVNResult.distinct('customer', { customer: { $in: ids } }) : null,
      ]);
      const lrSet = lrIds ? new Set(lrIds.map(String)) : null;
      const burSet = burIds ? new Set(burIds.map(String)) : null;
      const bvnSet = bvnIds ? new Set(bvnIds.map(String)) : null;
      customers = customers.filter(c => {
        const id = String(c._id);
        if (lrSet && !lrSet.has(id)) return false;
        if (burSet && !burSet.has(id)) return false;
        if (bvnSet && !bvnSet.has(id)) return false;
        return true;
      });
    }

    res.json({ customers, total: customers.length });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create customer
router.post('/', requireWriteAccess, async (req, res) => {
  try {
    const { name, email, bvn, nin, phone, customerType } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Duplicate detection
    const dupChecks = [];
    if (bvn) dupChecks.push({ bvn, client: req.client.id });
    if (nin) dupChecks.push({ nin, client: req.client.id });
    if (phone) dupChecks.push({ phone, client: req.client.id });
    let duplicate = null;
    if (dupChecks.length) duplicate = await Customer.findOne({ $or: dupChecks }).lean();

    const customer = await Customer.create({ client: req.client.id, name, email, bvn, nin, phone, customerType: customerType || 'individual' });
    AuditLog.create({ client: req.client.id, action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer._id, label: `Created customer profile: ${name}`, meta: { name, email } }).catch(() => {});
    dispatchWebhook(req.client.id, 'customer.created', { customerId: customer._id, name, email });
    res.status(201).json({ customer, duplicate: duplicate ? { id: duplicate._id, name: duplicate.name } : null });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Static routes MUST come before /:id to avoid shadowing ──────────────────
// GET /pipeline/stats
router.get('/pipeline/stats', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const stats = await Customer.aggregate([
      { $match: { client: new mongoose.Types.ObjectId(req.client.id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const result = { applied: 0, under_review: 0, approved: 0, rejected: 0, disbursed: 0 };
    stats.forEach(({ _id, count }) => { if (_id) result[_id] = count; });
    res.json({ stats: result });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /bulk/status
router.patch('/bulk/status', requireWriteAccess, async (req, res) => {
  try {
    const VALID = ['applied', 'under_review', 'approved', 'rejected', 'disbursed'];
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await Customer.updateMany(
      { _id: { $in: ids }, client: req.client.id },
      { status }
    );
    AuditLog.create({ client: req.client.id, action: 'BULK_STATUS_CHANGE', entityType: 'Customer', label: `Bulk status → ${status} for ${result.modifiedCount} customers`, meta: { ids, status } }).catch(() => {});
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /bulk/verify — batch BVN/NIN verification (defined below after helpers)
// ─────────────────────────────────────────────────────────────────────────────

// GET /duplicates — scan for customers sharing BVN, NIN, phone, or email
router.get('/duplicates', async (req, res) => {
  try {
    const clientId = new mongoose.Types.ObjectId(req.client.id);
    const fields = ['bvn', 'nin', 'phone', 'email'];

    const groups = [];
    for (const field of fields) {
      const pipeline = [
        { $match: { client: clientId, [field]: { $exists: true, $ne: null, $ne: '' } } },
        { $group: { _id: `$${field}`, customers: { $push: { _id: '$_id', name: '$name', email: '$email', phone: '$phone', status: '$status', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ];
      const results = await Customer.aggregate(pipeline);
      for (const r of results) {
        groups.push({ field, value: r._id, customers: r.customers });
      }
    }

    res.json({ groups, total: groups.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /duplicates/merge — keep one customer, delete the rest, merge key fields
router.post('/duplicates/merge', requireWriteAccess, async (req, res) => {
  try {
    const { keepId, deleteIds } = req.body;
    if (!keepId || !Array.isArray(deleteIds) || !deleteIds.length) {
      return res.status(400).json({ error: 'keepId and deleteIds are required' });
    }

    // Verify all belong to this client
    const all = await Customer.find({ _id: { $in: [keepId, ...deleteIds] }, client: req.client.id }).lean();
    if (all.length !== deleteIds.length + 1) return res.status(404).json({ error: 'One or more customers not found' });

    const keep = all.find(c => String(c._id) === String(keepId));

    // Fill in missing fields on the kept customer from the deleted ones
    const patch = {};
    for (const field of ['bvn', 'nin', 'phone', 'email', 'address']) {
      if (!keep[field]) {
        const donor = all.find(c => String(c._id) !== String(keepId) && c[field]);
        if (donor) patch[field] = donor[field];
      }
    }
    if (Object.keys(patch).length) await Customer.findByIdAndUpdate(keepId, patch);

    await Customer.deleteMany({ _id: { $in: deleteIds }, client: req.client.id });
    AuditLog.create({ client: req.client.id, action: 'CUSTOMERS_MERGED', entityType: 'Customer', entityId: keepId, label: `Merged ${deleteIds.length} duplicate(s) into ${keep.name}`, meta: { keepId, deleteIds } }).catch(() => {});

    res.json({ success: true, merged: deleteIds.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single customer with all their analyses
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [statements, bvnResults, ninResults, bureauResults] = await Promise.all([
      StatementResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BVNResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      NINResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BureauResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({ customer, statements, bvnResults, ninResults, bureauResults });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update customer
router.patch('/:id', requireWriteAccess, async (req, res) => {
  try {
    const { name, email, bvn, nin, phone, address, customerType } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, client: req.client.id },
      { name, email, bvn, nin, phone, address, customerType },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete customer — cascade-deletes all associated analysis records
router.delete('/:id', requireWriteAccess, async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Hard-delete all records tied to this customer (NDPR right-to-erasure)
    await Promise.all([
      BVNResult.deleteMany({ customer: customer._id }),
      NINResult.deleteMany({ customer: customer._id }),
      BureauResult.deleteMany({ customer: customer._id }),
      StatementResult.deleteMany({ customer: customer._id }),
      CustomerNote.deleteMany({ customer: customer._id }),
    ]);

    AuditLog.create({ client: req.client.id, action: 'CUSTOMER_DELETED', entityType: 'Customer', label: `Deleted customer and all records: ${customer.name}`, meta: { name: customer.name } }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Customer Notes ────────────────────────────────────────────────────────────

// List notes for a customer
router.get('/:id/notes', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const notes = await CustomerNote.find({ customer: customer._id }).sort({ createdAt: -1 }).lean();
    res.json({ notes });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a note
router.post('/:id/notes', requireWriteAccess, async (req, res) => {
  try {
    const { text, author } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const note = await CustomerNote.create({
      client: req.client.id,
      customer: customer._id,
      text: text.trim().slice(0, 2000),
      author: author?.trim() || 'Credit Officer',
    });
    AuditLog.create({ client: req.client.id, action: 'NOTE_ADDED', entityType: 'CustomerNote', entityId: note._id, label: `Note added to customer: ${customer.name}`, meta: { customerName: customer.name } }).catch(() => {});
    res.status(201).json({ note });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a note
router.delete('/:id/notes/:noteId', requireWriteAccess, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const note = await CustomerNote.findOneAndDelete({ _id: req.params.noteId, client: req.client.id, customer: customer._id });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Analysis history endpoints (flat, across all customers) ──────────────────

// List all BVN results for this MFI
router.get('/analyses/bvn', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(escapeRegex(q), 'i');
    const results = await BVNResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BVNResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List all NIN results for this MFI
router.get('/analyses/nin', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.nin = new RegExp(escapeRegex(q), 'i');
    const results = await NINResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await NINResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List all bureau results for this MFI
router.get('/analyses/bureau', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(escapeRegex(q), 'i');
    const results = await BureauResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BureauResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dashboard-wide stats (all analysis types)
router.get('/analyses/stats', async (req, res) => {
  try {
    const clientId = req.client.id;
    const [statements, bvn, nin, bureau, customers] = await Promise.all([
      StatementResult.countDocuments({ client: clientId }),
      BVNResult.countDocuments({ client: clientId }),
      NINResult.countDocuments({ client: clientId }),
      BureauResult.countDocuments({ client: clientId }),
      Customer.countDocuments({ client: clientId }),
    ]);
    const [stFailed, bvnFailed, ninFailed, buFailed] = await Promise.all([
      StatementResult.countDocuments({ client: clientId, status: 'failed' }),
      BVNResult.countDocuments({ client: clientId, status: 'failed' }),
      NINResult.countDocuments({ client: clientId, status: 'failed' }),
      BureauResult.countDocuments({ client: clientId, status: 'failed' }),
    ]);
    res.json({
      customers,
      statements: { total: statements, failed: stFailed },
      bvn: { total: bvn, failed: bvnFailed },
      nin: { total: nin, failed: ninFailed },
      bureau: { total: bureau, failed: buFailed },
    });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analyses/analytics — time-series + funnel + top borrowers for the dashboard
router.get('/analyses/analytics', async (req, res) => {
  try {
    const clientId = new mongoose.Types.ObjectId(req.client.id);

    // Last 6 months: customers added per month
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

    const [customerTrend, loanReviewTrend, pipelineFunnel, topBorrowers, verdictBreakdown] = await Promise.all([
      // Customers created per month
      Customer.aggregate([
        { $match: { client: clientId, createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Loan reviews per month
      LoanReview.aggregate([
        { $match: { client: clientId, createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, eligible: { $sum: { $cond: [{ $eq: ['$verdict', 'ELIGIBLE'] }, 1, 0] } } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Pipeline funnel: count per status
      Customer.aggregate([
        { $match: { client: clientId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Top 5 borrowers by loan amount
      LoanReview.aggregate([
        { $match: { client: clientId, verdict: 'ELIGIBLE' } },
        { $sort: { loanAmount: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'cust' } },
        { $unwind: '$cust' },
        { $project: { _id: 0, customerId: '$cust._id', name: '$cust.name', loanAmount: 1, verdict: 1, createdAt: 1 } },
      ]),

      // Verdict breakdown
      LoanReview.aggregate([
        { $match: { client: clientId } },
        { $group: { _id: '$verdict', count: { $sum: 1 } } },
      ]),
    ]);

    // Normalise funnel into ordered array
    const FUNNEL_ORDER = ['applied', 'under_review', 'approved', 'rejected', 'disbursed'];
    const funnelMap = Object.fromEntries(pipelineFunnel.map(f => [f._id, f.count]));
    const funnel = FUNNEL_ORDER.map(s => ({ status: s, count: funnelMap[s] ?? 0 }));

    // Normalise verdict breakdown
    const verdictMap = Object.fromEntries(verdictBreakdown.map(v => [v._id, v.count]));

    // Build month labels for last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) });
    }

    const toMonthMap = (arr) => Object.fromEntries(arr.map(r => [`${r._id.year}-${r._id.month}`, r]));
    const ctMap = toMonthMap(customerTrend);
    const lrMap = toMonthMap(loanReviewTrend);

    const trend = months.map(({ year, month, label }) => {
      const key = `${year}-${month}`;
      return {
        label,
        customers: ctMap[key]?.count ?? 0,
        reviews: lrMap[key]?.count ?? 0,
        eligible: lrMap[key]?.eligible ?? 0,
      };
    });

    res.json({ trend, funnel, topBorrowers, verdictBreakdown: verdictMap });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export all data for this MFI (NDPR data portability)
router.get('/export/all', async (req, res) => {
  try {
    const clientId = req.client.id;
    const [customers, bvnResults, ninResults, bureauResults, statements] = await Promise.all([
      Customer.find({ client: clientId }).lean(),
      BVNResult.find({ client: clientId }).lean(),
      NINResult.find({ client: clientId }).lean(),
      BureauResult.find({ client: clientId }).lean(),
      StatementResult.find({ client: clientId }).lean(),
    ]);

    res.setHeader('Content-Disposition', 'attachment; filename="lucred-data-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json({
      exportedAt: new Date().toISOString(),
      organization: req.client.organizationName || (await MFIClient.findById(req.client.id).select('organizationName').lean())?.organizationName,
      customers,
      bvnResults,
      ninResults,
      bureauResults,
      statements,
    });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Dashboard-level identity verification (JWT auth, no API key needed) ─────

// BVN verification via dashboard (Dojah)
router.post('/verify/bvn', requireWriteAccess, async (req, res) => {
  try {
    const { bvn, customerId } = req.body;
    if (!bvn) return res.status(400).json({ error: 'bvn is required' });

    const customer = customerId ? await Customer.findById(customerId).select('name').lean() : null;
    const charge = await deductCharge(req.client.id, 'BVN_CHECK', { customerName: customer?.name, customerId });
    if (!charge.ok) return res.status(402).json({ error: charge.error, required: charge.required, balance: charge.balance });

    let normalized;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn } });
      const e = data.entity || {};
      normalized = {
        isValid: true,
        bvn,
        firstName: e.first_name,
        lastName: e.last_name,
        middleName: e.middle_name,
        dateOfBirth: e.date_of_birth,
        gender: e.gender,
        phoneNumber: e.phone_number1 || e.phone_number,
        email: e.email,
        enrollmentBank: e.enrollment_bank,
        enrollmentBranch: e.enrollment_branch,
        registrationDate: e.registration_date,
        nin: e.nin,
        watchListed: e.watch_listed,
        levelOfAccount: e.level_of_account,
        image: e.image, // returned to caller but not stored in DB
      };
    } catch (upstreamErr) {
      if (!charge.freeQuota) refundCharge(req.client.id, 'BVN_CHECK', { customerName: customer?.name, customerId }).catch(() => {});
      await BVNResult.create({
        client: req.client.id,
        customer: customerId || undefined,
        bvn,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data?.error || 'BVN verification failed' });
    }

    const saved = await BVNResult.create({
      client: req.client.id,
      customer: customerId || undefined,
      bvn,
      result: stripBiometrics(normalized),
      status: 'success',
    });

    AuditLog.create({ client: req.client.id, action: 'BVN_CHECK', entityType: 'BVNResult', entityId: saved._id, label: `BVN verification: ****${bvn.slice(-4)}`, meta: { bvnLast4: bvn.slice(-4), customerId } }).catch(() => {});
    dispatchWebhook(req.client.id, 'bvn.verified', { customerId, bvnLast4: bvn.slice(-4), resultId: saved._id });

    // Duplicate detection: same BVN already on another customer?
    const dupQuery = { bvn, client: req.client.id };
    if (customerId) dupQuery._id = { $ne: customerId };
    const dup = await Customer.findOne(dupQuery).lean();

    res.json({ success: true, data: normalized, resultId: saved._id, duplicate: dup ? { id: dup._id, name: dup.name } : null });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// NIN verification via dashboard (Dojah)
router.post('/verify/nin', requireWriteAccess, async (req, res) => {
  try {
    const { nin, customerId } = req.body;
    if (!nin) return res.status(400).json({ error: 'nin is required' });

    const customer = customerId ? await Customer.findById(customerId).select('name').lean() : null;
    const charge = await deductCharge(req.client.id, 'NIN_CHECK', { customerName: customer?.name, customerId });
    if (!charge.ok) return res.status(402).json({ error: charge.error, required: charge.required, balance: charge.balance });

    let normalized;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/nin', { params: { nin } });
      const e = data.entity || {};
      normalized = {
        isValid: true,
        nin,
        firstName: e.first_name,
        lastName: e.last_name,
        middleName: e.middle_name,
        dateOfBirth: e.date_of_birth,
        gender: e.gender,
        phoneNumber: e.phone_number,
        email: e.email,
        address: e.address,
        stateOfOrigin: e.state_of_origin,
        lga: e.lga,
        nationality: e.nationality,
        religion: e.religion,
        maritalStatus: e.marital_status,
        watchListed: e.watch_listed,
        photo: e.photo, // returned to caller but not stored in DB
      };
    } catch (upstreamErr) {
      if (!charge.freeQuota) refundCharge(req.client.id, 'NIN_CHECK', { customerName: customer?.name, customerId }).catch(() => {});
      await NINResult.create({
        client: req.client.id,
        customer: customerId || undefined,
        nin,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data?.error || 'NIN verification failed' });
    }

    const saved = await NINResult.create({
      client: req.client.id,
      customer: customerId || undefined,
      nin,
      result: stripBiometrics(normalized),
      status: 'success',
    });

    AuditLog.create({ client: req.client.id, action: 'NIN_CHECK', entityType: 'NINResult', entityId: saved._id, label: `NIN verification: ****${nin.slice(-4)}`, meta: { ninLast4: nin.slice(-4), customerId } }).catch(() => {});
    dispatchWebhook(req.client.id, 'nin.verified', { customerId, ninLast4: nin.slice(-4), resultId: saved._id });

    // Duplicate detection: same NIN already on another customer?
    const dupQuery = { nin, client: req.client.id };
    if (customerId) dupQuery._id = { $ne: customerId };
    const dup = await Customer.findOne(dupQuery).lean();

    res.json({ success: true, data: normalized, resultId: saved._id, duplicate: dup ? { id: dup._id, name: dup.name } : null });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// REMOVED: /:id/loan-review (singular) — AI scoring is now client-side; use POST /:id/loan-reviews to save
// AI loan eligibility review (dead — kept as reference, not registered)
const _unusedLoanReview = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [statements, bvnResults, ninResults, bureauResults] = await Promise.all([
      StatementResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BVNResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      NINResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BureauResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    const latestStatement = statements.find(s => s.status === 'success');
    const latestBVN = bvnResults.find(r => r.status === 'success');
    const latestNIN = ninResults.find(r => r.status === 'success');
    const latestBureau = bureauResults.find(r => r.status === 'success');

    const sections = [];

    sections.push(`## Customer Profile\nName: ${customer.name}\nEmail: ${customer.email || 'N/A'}\nPhone: ${customer.phone || 'N/A'}\nBVN: ${customer.bvn || 'N/A'}\nNIN: ${customer.nin || 'N/A'}`);

    if (latestBVN) {
      const b = latestBVN.result;
      sections.push(`## BVN Identity Data\nName: ${b.firstName} ${b.middleName || ''} ${b.lastName}\nDOB: ${b.dateOfBirth || 'N/A'}\nGender: ${b.gender || 'N/A'}\nPhone: ${b.phoneNumber || 'N/A'}\nEmail: ${b.email || 'N/A'}\nEnrollment Bank: ${b.enrollmentBank || 'N/A'}\nLevel of Account: ${b.levelOfAccount || 'N/A'}\nWatchlisted: ${b.watchListed ?? 'N/A'}\nNIN on BVN: ${b.nin || 'N/A'}`);
    }

    if (latestNIN) {
      const n = latestNIN.result;
      sections.push(`## NIN Identity Data\nName: ${n.firstName} ${n.middleName || ''} ${n.lastName}\nDOB: ${n.dateOfBirth || 'N/A'}\nGender: ${n.gender || 'N/A'}\nPhone: ${n.phoneNumber || 'N/A'}\nAddress: ${n.address || 'N/A'}\nState of Origin: ${n.stateOfOrigin || 'N/A'}\nMarital Status: ${n.maritalStatus || 'N/A'}\nNationality: ${n.nationality || 'N/A'}\nWatchlisted: ${n.watchListed ?? 'N/A'}`);
    }

    if (latestBVN && latestNIN) {
      const discFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'phoneNumber'];
      const discrepancies = discFields
        .filter(f => latestBVN.result[f] && latestNIN.result[f] && String(latestBVN.result[f]).toLowerCase() !== String(latestNIN.result[f]).toLowerCase())
        .map(f => `${f}: BVN="${latestBVN.result[f]}" vs NIN="${latestNIN.result[f]}"`);
      if (discrepancies.length > 0) {
        sections.push(`## Identity Discrepancies\n${discrepancies.join('\n')}`);
      }
    }

    if (latestBureau) {
      const bd = latestBureau.result;
      const summary = bd.summary || bd;
      sections.push(`## Credit Bureau Data\nCredit Score: ${bd.creditScore ?? summary.creditScore ?? 'N/A'}\nTotal Facilities: ${bd.totalFacilities ?? summary.totalFacilities ?? 'N/A'}\nActive Loans: ${bd.activeLoans ?? summary.activeLoans ?? 'N/A'}\nTotal Outstanding: ${bd.totalOutstanding ?? summary.totalOutstanding ?? 'N/A'}\nOverdue Amount: ${bd.overdueAmount ?? summary.overdueAmount ?? 'N/A'}\nDelinquency Status: ${bd.delinquencyStatus ?? summary.delinquencyStatus ?? 'N/A'}`);
    }

    if (latestStatement) {
      const r = latestStatement.result || {};
      const risk = r.overallRiskScore || {};
      const cf = r.cashFlowAnalysis || {};
      const inc = r.incomeSourceAnalysis || {};
      const debt = r.debtServicing || {};
      sections.push(`## Bank Statement Analysis\nRisk Grade: ${risk.overallRiskScore || 'N/A'}\nRecommendation: ${risk.recommendation || 'N/A'}\nTotal Cash Inflow: ${cf.totalCashInflow ?? 'N/A'}\nTotal Cash Outflow: ${cf.totalCashOutflow ?? 'N/A'}\nMonthly Avg Income: ${inc.monthlyAverageIncome ?? 'N/A'}\nSalary Earner: ${inc.isSalaryEarner ?? 'N/A'}\nDebt-to-Income Ratio: ${debt.loanRepayments?.DebtToIncomeRatio ?? 'N/A'}%\nIncome Stability Score: ${risk.scoreBreakdown?.incomeStability ?? 'N/A'}\nDebt Servicing Score: ${risk.scoreBreakdown?.debtServicing ?? 'N/A'}\nSpending Behavior Score: ${risk.scoreBreakdown?.spendingBehavior ?? 'N/A'}\nLiquidity Score: ${risk.scoreBreakdown?.liquidity ?? 'N/A'}`);
    }

    const prompt = `You are a senior credit analyst at a Nigerian microfinance institution. Review the following customer data and provide a structured loan eligibility assessment.

${sections.join('\n\n')}

Based on all available data, provide a JSON response (and ONLY JSON, no other text) in this exact structure:
{
  "verdict": "ELIGIBLE" | "CONDITIONAL" | "NOT_ELIGIBLE",
  "suggestedMinAmount": <number in NGN or null>,
  "suggestedMaxAmount": <number in NGN or null>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<2-3 sentence overall assessment>",
  "categories": {
    "identityIntegrity": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "creditHistory": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "incomeAndCashFlow": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "debtServicing": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" },
    "riskProfile": { "score": <0-100>, "status": "PASS"|"WARN"|"FAIL", "notes": "<brief note>" }
  },
  "conditions": ["<condition if CONDITIONAL, else empty array>"],
  "flags": ["<any red flags or concerns>"],
  "dataAvailability": { "bvn": ${!!latestBVN}, "nin": ${!!latestNIN}, "bureau": ${!!latestBureau}, "statement": ${!!latestStatement} }
}`;

    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const message = await stream.finalMessage();
    const textContent = message.content.find(b => b.type === 'text');
    if (!textContent) return res.status(502).json({ error: 'No response from AI' });

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'Could not parse AI response' });

    const review = JSON.parse(jsonMatch[0]);
    res.json({ success: true, review });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /:id/scorecards — list saved scorecards
router.get('/:id/scorecards', async (req, res) => {
  try {
    const scorecards = await Scorecard.find({ customer: req.params.id, client: req.client.id })
      .sort({ createdAt: -1 }).limit(10);
    res.json({ scorecards });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/scorecards — save a scorecard from dashboard
router.post('/:id/scorecards', requireWriteAccess, async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const scorecard = await Scorecard.create({ client: req.client.id, customer: req.params.id, result: req.body });
    res.json({ scorecard });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id/status — update loan pipeline status
router.patch('/:id/status', requireWriteAccess, async (req, res) => {
  try {
    const VALID = ['applied', 'under_review', 'approved', 'rejected', 'disbursed'];
    const { status } = req.body;
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    // Watchlist auto-block: cannot approve or disburse a watchlisted customer
    if (['approved', 'disbursed'].includes(status)) {
      const [bvnFlag, ninFlag] = await Promise.all([
        BVNResult.findOne({ customer: req.params.id, 'result.watchListed': true }),
        NINResult.findOne({ customer: req.params.id, 'result.watchListed': true }),
      ]);
      if (bvnFlag || ninFlag) {
        return res.status(422).json({
          error: 'Cannot approve or disburse a watchlisted customer',
          watchlisted: true,
          source: bvnFlag && ninFlag ? 'BVN and NIN' : bvnFlag ? 'BVN' : 'NIN',
        });
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, client: req.client.id },
      { status }, { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    AuditLog.create({ client: req.client.id, action: 'STATUS_CHANGED', entityType: 'Customer', entityId: customer._id, label: `Pipeline status changed to ${status}: ${customer.name}`, meta: { status, name: customer.name } }).catch(() => {});

    // Email admins on meaningful stage transitions
    if (['approved', 'disbursed', 'rejected'].includes(status)) {
      getAdminEmails(req.client.id).then(emails => {
        const dashboardUrl = `https://mfi-data.vercel.app/dashboard/customers/${customer._id}`;
        emails.forEach(email => sendStaffStatusChangeAlert(email, {
          customerName: customer.name,
          newStatus: status,
          dashboardUrl,
        }).catch(() => {}));
      }).catch(() => {});
    }

    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/loan-reviews — list saved reviews
router.get('/:id/loan-reviews', async (req, res) => {
  try {
    const reviews = await LoanReview.find({ customer: req.params.id, client: req.client.id })
      .sort({ createdAt: -1 }).limit(20);
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/loan-reviews — save a review run
router.post('/:id/loan-reviews', requireWriteAccess, async (req, res) => {
  try {
    const mfiClient = await MFIClient.findById(req.client.id).lean();
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const review = await LoanReview.create({ client: req.client.id, customer: req.params.id, ...req.body });
    dispatchWebhook(req.client.id, 'loan_review.created', { customerId: req.params.id, verdict: review.verdict, reviewId: review._id });

    // SMS borrower if they have a phone number
    if (customer.phone) {
      smsBorrowerDecision(customer.phone, {
        borrowerName: customer.name,
        verdict: review.verdict,
        organizationName: mfiClient?.organizationName || 'your lender',
      }).catch(() => {});
    }

    // In-app notification for the MFI
    const verdictLabel = { ELIGIBLE: 'Approved', CONDITIONAL: 'Conditional', NOT_ELIGIBLE: 'Not Eligible' }[review.verdict] || review.verdict;
    notify(req.client.id, {
      type: 'loan_review',
      title: `Loan review complete — ${verdictLabel}`,
      body: `${customer.name} · ₦${(review.loanAmount || 0).toLocaleString()}`,
      meta: { customerId: customer._id, reviewId: review._id, verdict: review.verdict },
    });

    // Email all admins
    getAdminEmails(req.client.id).then(emails => {
      const dashboardUrl = `https://mfi-data.vercel.app/dashboard/customers/${customer._id}`;
      emails.forEach(email => sendStaffLoanReviewAlert(email, {
        customerName: customer.name,
        verdict: review.verdict,
        loanAmount: review.loanAmount,
        dashboardUrl,
      }).catch(() => {}));
    }).catch(() => {});

    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /bulk/verify — batch BVN/NIN verification
router.post('/bulk/verify', requireWriteAccess, async (req, res) => {
  try {
    const { items, type } = req.body; // items: [{customerId, number}], type: 'bvn'|'nin'
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items required' });
    if (!['bvn', 'nin'].includes(type)) return res.status(400).json({ error: 'type must be bvn or nin' });

    const results = [];
    for (const item of items.slice(0, 50)) { // cap at 50
      const { customerId, number } = item;
      if (!customerId || !number) { results.push({ customerId, number, status: 'skipped', error: 'Missing fields' }); continue; }
      const customer = await Customer.findOne({ _id: customerId, client: req.client.id });
      if (!customer) { results.push({ customerId, number, status: 'error', error: 'Customer not found' }); continue; }

      try {
        const apiKey = process.env.DOJAH_API_KEY;
        const appId = process.env.DOJAH_APP_ID;
        const url = type === 'bvn'
          ? `https://api.dojah.io/api/v1/kyc/bvn/full?bvn=${number}`
          : `https://api.dojah.io/api/v1/kyc/nin?nin=${number}`;
        const resp = await axios.get(url, { headers: { AppId: appId, Authorization: apiKey } });
        const data = resp.data?.entity || resp.data;

        const updateField = type === 'bvn' ? { bvn: number } : { nin: number };
        await Customer.findByIdAndUpdate(customerId, updateField);

        // Check for duplicates within same MFI
        const dupQuery = type === 'bvn' ? { bvn: number, client: req.client.id, _id: { $ne: customerId } }
          : { nin: number, client: req.client.id, _id: { $ne: customerId } };
        const dup = await Customer.findOne(dupQuery);

        AuditLog.create({ client: req.client.id, action: type === 'bvn' ? 'BVN_CHECK' : 'NIN_CHECK', entityType: 'Customer', entityId: customer._id, label: `${type.toUpperCase()} verified for ${customer.name}`, meta: { number, name: customer.name, bulk: true } }).catch(() => {});

        results.push({ customerId, number, status: 'success', data, duplicate: dup ? { id: dup._id, name: dup.name } : null });
      } catch (err) {
        results.push({ customerId, number, status: 'error', error: err?.response?.data?.message || err.message });
      }

      // Throttle: 300ms between requests
      await new Promise(r => setTimeout(r, 300));
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV import — POST /api/customers/import
// Accepts multipart field "csv" (text) or raw body { csv: "..." }
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/import', requireWriteAccess, upload.single('file'), async (req, res) => {
  try {
    let csvText = '';
    if (req.file) {
      csvText = req.file.buffer.toString('utf8');
    } else if (req.body.csv) {
      csvText = req.body.csv;
    } else {
      return res.status(400).json({ error: 'No CSV provided. Send a file field "file" or JSON field "csv".' });
    }

    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have a header row and at least one data row.' });

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'full_name');
    const emailIdx = headers.indexOf('email');
    const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'phone_number');
    const bvnIdx = headers.indexOf('bvn');
    const addressIdx = headers.indexOf('address');

    if (nameIdx === -1) return res.status(400).json({ error: 'CSV must have a "name" column.' });

    const created = [], skipped = [], errors = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const name = cols[nameIdx];
      if (!name) { errors.push({ row: i + 1, reason: 'Missing name' }); continue; }

      const email = emailIdx >= 0 ? cols[emailIdx] : undefined;
      const phone = phoneIdx >= 0 ? cols[phoneIdx] : undefined;
      const bvn = bvnIdx >= 0 ? cols[bvnIdx] : undefined;
      const address = addressIdx >= 0 ? cols[addressIdx] : undefined;

      // Check for duplicate by email or phone within this client
      const dupQuery = { client: req.client.id, $or: [] };
      if (email) dupQuery.$or.push({ email });
      if (phone) dupQuery.$or.push({ phone });
      if (dupQuery.$or.length === 0) dupQuery.$or.push({ name });

      const existing = await Customer.findOne(dupQuery).lean();
      if (existing) { skipped.push({ row: i + 1, name, reason: 'Duplicate' }); continue; }

      try {
        const customer = await Customer.create({ client: req.client.id, name, email, phone, bvn, address });
        AuditLog.create({ client: req.client.id, action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer._id, label: `Imported: ${name}`, meta: { source: 'csv_import' } }).catch(() => {});
        created.push({ id: customer._id, name });
      } catch (err) {
        errors.push({ row: i + 1, name, reason: err.message });
      }
    }

    res.json({ created: created.length, skipped: skipped.length, errors: errors.length, details: { created, skipped, errors } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
