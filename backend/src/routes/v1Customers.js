/**
 * v1 Customer API — API-key protected routes for programmatic access.
 * Results are stored in the same DB collections as the dashboard, so
 * MFI staff can see API-triggered checks when they log in.
 */
const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const { requireApiKey, logUsage } = require('../middleware/auth');

const Customer = require('../models/Customer');
const BVNResult = require('../models/BVNResult');
const NINResult = require('../models/NINResult');
const BureauResult = require('../models/BureauResult');
const StatementResult = require('../models/StatementResult');
const LoanReview = require('../models/LoanReview');
const Scorecard = require('../models/Scorecard');
const AuditLog = require('../models/AuditLog');

const dojahApi = require('../config/dojahApi');
const lucredApi = require('../config/lucredApi');
const { matchConsumer, getXScoreConsumerReport } = require('../config/firstCentralApi');
const computeLoanReview = require('../utils/computeLoanReview');
const computeScorecard = require('../utils/computeScorecard');

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, keyGenerator: req => req.apiKey?.key });
router.use(requireApiKey, limiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF, JPEG, PNG accepted'));
  },
});

function stripBiometrics(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const { image, photo, ...safe } = obj;
  return safe;
}

// ── POST /v1/customers — create a customer ────────────────────────────────────
router.post('/', logUsage('/v1/customers'), async (req, res) => {
  try {
    const { name, email, bvn, nin, phone, address, customerType } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const dupChecks = [];
    if (bvn) dupChecks.push({ bvn, client: req.client.id });
    if (nin) dupChecks.push({ nin, client: req.client.id });
    if (phone) dupChecks.push({ phone, client: req.client.id });
    const duplicate = dupChecks.length ? await Customer.findOne({ $or: dupChecks }).lean() : null;

    const customer = await Customer.create({
      client: req.client.id, name, email, bvn, nin, phone, address,
      customerType: customerType || 'individual',
    });
    AuditLog.create({ client: req.client.id, action: 'CUSTOMER_CREATED', entityType: 'Customer', entityId: customer._id, label: `Created via API: ${name}`, meta: { name, email, source: 'api' } }).catch(() => {});
    res.status(201).json({ customer, duplicate: duplicate ? { id: duplicate._id, name: duplicate.name } : null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /v1/customers — list customers ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { q, status, limit = 50, skip = 0 } = req.query;
    const filter = { client: req.client.id };
    if (status) filter.status = status;
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }, { bvn: new RegExp(safe, 'i') }];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip)).lean();
    const total = await Customer.countDocuments(filter);
    res.json({ customers, total });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /v1/customers/:id — get customer with latest checks ──────────────────
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const [bvnResults, ninResults, bureauResults, statements, loanReviews, scorecards] = await Promise.all([
      BVNResult.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(5).lean(),
      NINResult.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(5).lean(),
      BureauResult.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(5).lean(),
      StatementResult.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(5).lean(),
      LoanReview.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(5).lean(),
      Scorecard.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(1).lean(),
    ]);
    res.json({ customer, bvnResults, ninResults, bureauResults, statements, loanReviews, latestScorecard: scorecards[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PATCH /v1/customers/:id — update customer fields ─────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'email', 'phone', 'address', 'status'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const customer = await Customer.findOneAndUpdate({ _id: req.params.id, client: req.client.id }, update, { new: true });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/verify-bvn ────────────────────────────────────────
router.post('/:id/verify-bvn', logUsage('/v1/identity/verify-bvn'), async (req, res) => {
  try {
    const { bvn } = req.body;
    if (!bvn) return res.status(400).json({ error: 'bvn is required' });
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    let normalized;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn } });
      const e = data.entity || {};
      normalized = {
        isValid: true, bvn,
        firstName: e.first_name, lastName: e.last_name, middleName: e.middle_name,
        dateOfBirth: e.date_of_birth, gender: e.gender,
        phoneNumber: e.phone_number1 || e.phone_number, email: e.email,
        enrollmentBank: e.enrollment_bank, nin: e.nin,
        watchListed: e.watch_listed, levelOfAccount: e.level_of_account,
      };
    } catch (upstreamErr) {
      await BVNResult.create({ client: req.client.id, customer: customer._id, bvn, result: upstreamErr.response?.data || {}, status: 'failed' }).catch(() => {});
      return res.status(upstreamErr.response?.status || 502).json({ error: upstreamErr.response?.data?.error || 'BVN verification failed' });
    }

    await Customer.findByIdAndUpdate(customer._id, { bvn });
    const saved = await BVNResult.create({ client: req.client.id, customer: customer._id, bvn, result: stripBiometrics(normalized), status: 'success' });
    const dup = await Customer.findOne({ bvn, client: req.client.id, _id: { $ne: customer._id } }).lean();
    AuditLog.create({ client: req.client.id, action: 'BVN_CHECK', entityType: 'BVNResult', entityId: saved._id, label: `BVN verified for ${customer.name}`, meta: { bvnLast4: bvn.slice(-4), source: 'api' } }).catch(() => {});
    res.json({ success: true, data: normalized, resultId: saved._id, duplicate: dup ? { id: dup._id, name: dup.name } : null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/verify-nin ────────────────────────────────────────
router.post('/:id/verify-nin', logUsage('/v1/identity/verify-nin'), async (req, res) => {
  try {
    const { nin } = req.body;
    if (!nin) return res.status(400).json({ error: 'nin is required' });
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    let normalized;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/nin', { params: { nin } });
      const e = data.entity || {};
      normalized = {
        isValid: true, nin,
        firstName: e.first_name, lastName: e.last_name, middleName: e.middle_name,
        dateOfBirth: e.date_of_birth, gender: e.gender,
        phoneNumber: e.phone_number, email: e.email,
        address: e.address, stateOfOrigin: e.state_of_origin,
        nationality: e.nationality, maritalStatus: e.marital_status,
        watchListed: e.watch_listed,
      };
    } catch (upstreamErr) {
      await NINResult.create({ client: req.client.id, customer: customer._id, nin, result: upstreamErr.response?.data || {}, status: 'failed' }).catch(() => {});
      return res.status(upstreamErr.response?.status || 502).json({ error: upstreamErr.response?.data?.error || 'NIN verification failed' });
    }

    await Customer.findByIdAndUpdate(customer._id, { nin });
    const saved = await NINResult.create({ client: req.client.id, customer: customer._id, nin, result: stripBiometrics(normalized), status: 'success' });
    const dup = await Customer.findOne({ nin, client: req.client.id, _id: { $ne: customer._id } }).lean();
    AuditLog.create({ client: req.client.id, action: 'NIN_CHECK', entityType: 'NINResult', entityId: saved._id, label: `NIN verified for ${customer.name}`, meta: { ninLast4: nin.slice(-4), source: 'api' } }).catch(() => {});
    res.json({ success: true, data: normalized, resultId: saved._id, duplicate: dup ? { id: dup._id, name: dup.name } : null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/credit-bureau ─────────────────────────────────────
router.post('/:id/credit-bureau', logUsage('/v1/credit-bureau/check'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { firstName, lastName, dateOfBirth } = req.body;
    const bvn = req.body.bvn || customer.bvn;
    if (!bvn) return res.status(400).json({ error: 'bvn is required (or set it on the customer first)' });

    let result;
    try {
      const matchRes = await matchConsumer({ bvn, firstName: firstName || '', lastName: lastName || '', dateOfBirth: dateOfBirth || '' });
      const subjectId = matchRes?.SubjectId || matchRes?.subjectId;
      if (!subjectId) throw new Error('Could not match consumer in bureau');
      result = await getXScoreConsumerReport(subjectId);
    } catch (upstreamErr) {
      await BureauResult.create({ client: req.client.id, customer: customer._id, bvn, result: {}, status: 'failed' }).catch(() => {});
      return res.status(502).json({ error: upstreamErr.message || 'Credit bureau check failed' });
    }

    const saved = await BureauResult.create({ client: req.client.id, customer: customer._id, bvn, result, status: 'success' });
    AuditLog.create({ client: req.client.id, action: 'BUREAU_CHECK', entityType: 'BureauResult', entityId: saved._id, label: `Bureau check for ${customer.name}`, meta: { bvnLast4: bvn.slice(-4), source: 'api' } }).catch(() => {});
    res.json({ success: true, data: result, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/statement — upload & analyse statement ─────────────
router.post('/:id/statement', logUsage('/v1/statement/upload-analyze'), upload.single('statement'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Send PDF as multipart field named "statement"' });
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { bankName, password } = req.body;
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    if (bankName) form.append('bank', bankName);
    if (password) form.append('password', password);

    let data;
    try {
      const resp = await lucredApi.post(process.env.LUCRED_STATEMENT_ANALYZE_PATH || '/metrics/file_transactions', form, { headers: form.getHeaders() });
      data = resp.data;
    } catch (upstreamErr) {
      await StatementResult.create({ client: req.client.id, customer: customer._id, bankName, filename: req.file.originalname, status: 'failed' }).catch(() => {});
      return res.status(upstreamErr.response?.status || 502).json({ error: upstreamErr.response?.data || 'Statement analysis failed' });
    }

    const saved = await StatementResult.create({ client: req.client.id, customer: customer._id, bankName, filename: req.file.originalname, result: data, status: 'success' });
    AuditLog.create({ client: req.client.id, action: 'STATEMENT_ANALYSIS', entityType: 'StatementResult', entityId: saved._id, label: `Statement analysis for ${customer.name}`, meta: { filename: req.file.originalname, source: 'api' } }).catch(() => {});
    res.json({ success: true, data, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/scorecard ─────────────────────────────────────────
router.post('/:id/scorecard', logUsage('/v1/customers/scorecard'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [bvnResults, ninResults, bureauResults, statements] = await Promise.all([
      BVNResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      NINResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      BureauResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      StatementResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
    ]);

    const result = computeScorecard({
      latestBVN: bvnResults[0] || null,
      latestNIN: ninResults[0] || null,
      latestBureau: bureauResults[0] || null,
      latestStatement: statements[0] || null,
    });

    const saved = await Scorecard.create({ client: req.client.id, customer: customer._id, result });
    res.json({ success: true, scorecard: result, recordId: saved._id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/loan-review ───────────────────────────────────────
router.post('/:id/loan-review', logUsage('/v1/customers/loan-review'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { loanAmount = 0, loanTenor = 0, annualRate = 0 } = req.body;

    const [bvnResults, ninResults, bureauResults, statements] = await Promise.all([
      BVNResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      NINResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      BureauResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      StatementResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
    ]);

    const review = computeLoanReview({
      latestBVN: bvnResults[0] || null,
      latestNIN: ninResults[0] || null,
      latestBureau: bureauResults[0] || null,
      latestStatement: statements[0] || null,
      proposedLoanAmount: Number(loanAmount),
      loanTenor: Number(loanTenor),
      annualRate: Number(annualRate),
    });

    const saved = await LoanReview.create({
      client: req.client.id, customer: customer._id,
      loanAmount: Number(loanAmount), loanTenor: Number(loanTenor), annualRate: Number(annualRate),
      verdict: review.verdict, confidence: review.confidence, avgScore: review.avgScore,
      summary: review.summary, effectiveDTI: review.effectiveDTI,
      categories: review.categories, flags: review.flags, conditions: review.conditions,
      dataAvailability: review.dataAvailability,
      suggestedMinAmount: review.suggestedMinAmount, suggestedMaxAmount: review.suggestedMaxAmount,
      affordableMonthly: review.affordableMonthly,
      proposedMonthlyPayment: review.proposedMonthlyPayment,
      proposedTotalRepayment: review.proposedTotalRepayment,
      proposedTotalInterest: review.proposedTotalInterest,
    });

    res.json({ success: true, review, recordId: saved._id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
