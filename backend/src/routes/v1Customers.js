/**
 * v1 Customer API — API-key protected routes for programmatic access.
 * Results are stored in the same DB collections as the dashboard, so
 * MFI staff can see API-triggered checks when they log in.
 */
const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const { requireApiKeyOrJWT, logUsage } = require('../middleware/auth');
const { sandboxMock } = require('../middleware/sandbox');

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
const { matchConsumer, getXScoreConsumerReport, matchCommercial, getCommercialFullCreditReport } = require('../config/firstCentralApi');
const computeLoanReview = require('../utils/computeLoanReview');
const computeScorecard = require('../utils/computeScorecard');
const { deductCharge, refundCharge } = require('../utils/wallet');
const { uploadDocument } = require('../utils/s3');

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, keyGenerator: req => req.apiKey?.key ?? req.client?.id ?? req.ip });
router.use(requireApiKeyOrJWT, limiter);

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
      StatementResult.find({ customer: customer._id }).select("-s3Key").sort({ createdAt: -1 }).limit(5).lean(),
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
router.post('/:id/verify-bvn', sandboxMock('bvn'), logUsage('/v1/identity/verify-bvn'), async (req, res) => {
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
    const saved = await BVNResult.create({ client: req.client.id, customer: customer._id, bvn, result: normalized, status: 'success' });
    const dup = await Customer.findOne({ bvn, client: req.client.id, _id: { $ne: customer._id } }).lean();
    AuditLog.create({ client: req.client.id, action: 'BVN_CHECK', entityType: 'BVNResult', entityId: saved._id, label: `BVN verified for ${customer.name}`, meta: { bvnLast4: bvn.slice(-4), source: 'api' } }).catch(() => {});
    res.json({ success: true, data: normalized, resultId: saved._id, duplicate: dup ? { id: dup._id, name: dup.name } : null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/verify-nin ────────────────────────────────────────
router.post('/:id/verify-nin', sandboxMock('nin'), logUsage('/v1/identity/verify-nin'), async (req, res) => {
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
    const saved = await NINResult.create({ client: req.client.id, customer: customer._id, nin, result: normalized, status: 'success' });
    const dup = await Customer.findOne({ nin, client: req.client.id, _id: { $ne: customer._id } }).lean();
    AuditLog.create({ client: req.client.id, action: 'NIN_CHECK', entityType: 'NINResult', entityId: saved._id, label: `NIN verified for ${customer.name}`, meta: { ninLast4: nin.slice(-4), source: 'api' } }).catch(() => {});
    res.json({ success: true, data: normalized, resultId: saved._id, duplicate: dup ? { id: dup._id, name: dup.name } : null });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/credit-bureau ─────────────────────────────────────
router.post('/:id/credit-bureau', sandboxMock('bureau'), logUsage('/v1/credit-bureau/check'), async (req, res) => {
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
router.post('/:id/statement', sandboxMock('statement'), logUsage('/v1/statement/upload-analyze'), upload.single('statement'), async (req, res) => {
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

// ── POST /v1/customers/:id/business-bureau ───────────────────────────────────
router.post('/:id/business-bureau', sandboxMock('bureau'), logUsage('/v1/credit-bureau/check'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (customer.customerType !== 'business') {
      return res.status(400).json({ error: 'This endpoint is for business customers only. Use /credit-bureau for individuals.' });
    }

    const cacNumber = req.body.cacNumber || customer.businessDetails?.cacNumber;
    const businessName = req.body.businessName || customer.name;
    if (!cacNumber) return res.status(400).json({ error: 'cacNumber is required (or set businessDetails.cacNumber on the customer first)' });

    const charge = await deductCharge(req.client.id, 'BUREAU_CHECK', { customerName: businessName, customerId: customer._id });
    if (!charge.ok) return res.status(402).json({ error: charge.error, required: charge.required, balance: charge.balance });

    let upstreamData;
    try {
      const matchResult = await matchCommercial({ cacNumber, businessName });
      const matched = matchResult?.MatchedCommercial?.[0] ?? matchResult?.MatchedConsumer?.[0] ?? matchResult;
      const commercialID = matched?.CommercialID ?? matched?.commercialID ?? '0';
      const commercialMergeList = matched?.CommercialMergeList ?? matched?.ConsumerMergeList ?? '';
      const subscriberEnquiryEngineID = matched?.MatchingEngineID ?? matched?.SubscriberEnquiryEngineID ?? '';
      const enquiryID = matched?.EnquiryID ?? matched?.enquiryID ?? matched?.SubscriberEnquiryID ?? '';
      const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

      if (parseInt(commercialID, 10) === 0 && matchingRate === 0) {
        upstreamData = { noRecord: true, message: 'No business credit record found for this RC number.' };
      } else {
        upstreamData = await getCommercialFullCreditReport({ commercialID, commercialMergeList, subscriberEnquiryEngineID, enquiryID });
      }
    } catch (upstreamErr) {
      if (!charge.freeQuota) refundCharge(req.client.id, 'BUREAU_CHECK', { customerName: businessName, customerId: customer._id }).catch(() => {});
      await BureauResult.create({ client: req.client.id, customer: customer._id, bvn: cacNumber, result: upstreamErr.response?.data || {}, status: 'failed', meta: { type: 'business' } }).catch(() => {});
      return res.status(502).json({ error: upstreamErr.message || 'Business bureau check failed' });
    }

    const saved = await BureauResult.create({
      client: req.client.id, customer: customer._id,
      bvn: cacNumber, result: upstreamData, status: 'success',
      meta: { type: 'business' },
    });

    AuditLog.create({ client: req.client.id, action: 'BUREAU_CHECK', entityType: 'BureauResult', entityId: saved._id, label: `Business bureau check for ${businessName} (RC: ${cacNumber})`, meta: { cacNumber, customerId: customer._id, source: 'api' } }).catch(() => {});

    res.json({ success: true, resultId: saved._id, noRecord: upstreamData?.noRecord ?? false, data: upstreamData });
  } catch (err) {
    console.error('[business-bureau] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/verify-cac ────────────────────────────────────────
router.post('/:id/verify-cac', logUsage('/v1/customers/verify-cac'), upload.single('cacDocument'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (customer.customerType !== 'business') {
      return res.status(400).json({ error: 'CAC verification is only for business customers' });
    }

    const cacNumber = req.body.cacNumber || customer.businessDetails?.cacNumber;
    const companyType = req.body.companyType || customer.businessDetails?.companyType || 'COMPANY';
    if (!cacNumber) return res.status(400).json({ error: 'cacNumber is required' });

    // CAC Advance lookup — charge then call
    const cacCharge = await deductCharge(req.client.id, 'CAC_CHECK', { customerName: customer.name, customerId: customer._id });
    if (!cacCharge.ok) return res.status(402).json({ error: cacCharge.error });

    let cacResult;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/cac/basic', { params: { rc_number: cacNumber, company_type: companyType } });
      cacResult = data.entity || data;
    } catch (err) {
      if (!cacCharge.freeQuota) refundCharge(req.client.id, 'CAC_CHECK', { customerName: customer.name, customerId: customer._id }).catch(() => {});
      cacResult = { error: err.response?.data?.error || 'CAC lookup failed', failed: true };
    }

    // TIN lookup — charge then call
    const tinCharge = await deductCharge(req.client.id, 'TIN_CHECK', { customerName: customer.name, customerId: customer._id });
    let tinResult;
    if (tinCharge.ok) {
      try {
        const { data } = await dojahApi.get('/api/v1/kyc/cac/tin', { params: { rc_number: cacNumber, company_type: companyType } });
        tinResult = data.entity || data;
      } catch (err) {
        if (!tinCharge.freeQuota) refundCharge(req.client.id, 'TIN_CHECK', { customerName: customer.name, customerId: customer._id }).catch(() => {});
        tinResult = { error: err.response?.data?.error || 'TIN lookup failed', failed: true };
      }
    } else {
      tinResult = { error: tinCharge.error, failed: true };
    }

    // Upload CAC document if provided
    let cacDocKey = customer.businessDetails?.cacDocKey || null;
    if (req.file) {
      cacDocKey = await uploadDocument(req.file.buffer, {
        clientId: req.client.id,
        sessionToken: customer._id.toString(),
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        folder: 'customers/cac-docs',
      }).catch(err => { console.error('[s3] cac doc upload failed:', err.message); return cacDocKey; });
    }

    customer.businessDetails = {
      ...customer.businessDetails,
      cacNumber,
      companyType,
      cacVerified: !cacResult.failed,
      cacResult,
      cacDocKey,
      tinVerified: !tinResult.failed,
      tinNumber: tinResult.tax_id || tinResult.taxId || null,
      tinResult,
    };
    if (req.body.businessName) customer.name = req.body.businessName;
    await customer.save();

    AuditLog.create({ client: req.client.id, action: 'CAC_VERIFICATION', entityType: 'Customer', entityId: customer._id, label: `CAC + TIN verified for ${customer.name} (RC: ${cacNumber})`, meta: { cacNumber, companyType, source: 'api' } }).catch(() => {});

    res.json({ success: true, cacVerified: !cacResult.failed, cacResult, tinVerified: !tinResult.failed, tinResult });
  } catch (err) {
    console.error('[verify-cac] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/verify-tin ────────────────────────────────────────
router.post('/:id/verify-tin', logUsage('/v1/customers/verify-tin'), async (req, res) => {
  try {
    const customer = await getCustomer(req.client.id, req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (customer.customerType !== 'business') return res.status(400).json({ error: 'TIN verification is only for business customers' });

    const cacNumber = req.body.cacNumber || customer.businessDetails?.cacNumber;
    const companyType = req.body.companyType || customer.businessDetails?.companyType || 'COMPANY';
    if (!cacNumber) return res.status(400).json({ error: 'cacNumber is required (or run verify-cac first)' });

    const tinCharge = await deductCharge(req.client.id, 'TIN_CHECK', { customerName: customer.name, customerId: customer._id });
    if (!tinCharge.ok) return res.status(402).json({ error: tinCharge.error });

    let tinResult;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/cac/tin', { params: { rc_number: cacNumber, company_type: companyType } });
      tinResult = data.entity || data;
    } catch (err) {
      if (!tinCharge.freeQuota) refundCharge(req.client.id, 'TIN_CHECK', { customerName: customer.name, customerId: customer._id }).catch(() => {});
      tinResult = { error: err.response?.data?.error || 'TIN lookup failed', failed: true };
    }

    customer.businessDetails = {
      ...customer.businessDetails,
      tinVerified: !tinResult.failed,
      tinNumber: tinResult.tax_id || tinResult.taxId || null,
      tinResult,
    };
    await customer.save();

    AuditLog.create({ client: req.client.id, action: 'TIN_VERIFICATION', entityType: 'Customer', entityId: customer._id, label: `TIN verified for ${customer.name} (RC: ${cacNumber})`, meta: { cacNumber, companyType, source: 'api' } }).catch(() => {});

    res.json({ success: true, tinVerified: !tinResult.failed, tinResult });
  } catch (err) {
    console.error('[verify-tin] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/directors ─────────────────────────────────────────
router.post('/:id/directors', logUsage('/v1/customers/directors'), upload.array('idCards', 10), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (customer.customerType !== 'business') {
      return res.status(400).json({ error: 'Director verification is only for business customers' });
    }

    let directors;
    try {
      directors = typeof req.body.directors === 'string'
        ? JSON.parse(req.body.directors)
        : req.body.directors;
    } catch {
      return res.status(400).json({ error: 'directors must be a valid JSON array' });
    }
    if (!Array.isArray(directors) || directors.length === 0) {
      return res.status(400).json({ error: 'At least one director is required' });
    }

    const results = [];
    for (let i = 0; i < directors.length; i++) {
      const dir = directors[i];
      if (!dir.name) return res.status(400).json({ error: `directors[${i}].name is required` });

      const dirResult = { name: dir.name, bvn: dir.bvn || null, nin: dir.nin || null, bvnStatus: null, ninStatus: null, bureauStatus: null, idCardKey: null };

      // Upload ID card if provided
      const idCardFile = req.files?.[i];
      if (idCardFile) {
        dirResult.idCardKey = await uploadDocument(idCardFile.buffer, {
          clientId: req.client.id,
          sessionToken: customer._id.toString(),
          filename: `director-${i}-${idCardFile.originalname}`,
          mimetype: idCardFile.mimetype,
          folder: 'customers/director-ids',
        }).catch(() => null);
      }

      if (dir.bvn) {
        // BVN check
        try {
          const charge = await deductCharge(req.client.id, 'BVN_CHECK', { customerName: dir.name, customerId: customer._id });
          if (charge.ok) {
            const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn: dir.bvn } });
            const e = data.entity || {};
            const normalized = { isValid: true, bvn: dir.bvn, firstName: e.first_name, lastName: e.last_name, middleName: e.middle_name, dateOfBirth: e.date_of_birth, gender: e.gender, image: e.image || e.photo || null };
            await BVNResult.create({ client: req.client.id, customer: customer._id, bvn: dir.bvn, result: normalized, status: 'success', meta: { type: 'director', directorName: dir.name } });
            dirResult.bvnStatus = 'success';
          } else {
            dirResult.bvnStatus = 'skipped';
          }
        } catch {
          await BVNResult.create({ client: req.client.id, customer: customer._id, bvn: dir.bvn, result: {}, status: 'failed', meta: { type: 'director', directorName: dir.name } }).catch(() => {});
          dirResult.bvnStatus = 'failed';
        }

        // NIN check per director
        if (dir.nin) {
          try {
            await deductCharge(req.client.id, 'NIN_CHECK', { customerName: dir.name, customerId: customer._id }).catch(() => {});
            const { data: ninData } = await dojahApi.get('/api/v1/kyc/nin', { params: { nin: dir.nin } });
            const ne = ninData.entity || {};
            await NINResult.create({ client: req.client.id, customer: customer._id, nin: dir.nin, result: ne, status: 'success', meta: { type: 'director', directorName: dir.name } });
            dirResult.ninStatus = 'success';
          } catch {
            await NINResult.create({ client: req.client.id, customer: customer._id, nin: dir.nin, result: {}, status: 'failed', meta: { type: 'director', directorName: dir.name } }).catch(() => {});
            dirResult.ninStatus = 'failed';
          }
        }

        // Individual bureau check per director
        try {
          const charge = await deductCharge(req.client.id, 'BUREAU_CHECK', { customerName: dir.name, customerId: customer._id });
          if (charge.ok) {
            const matchResult = await matchConsumer({ bvn: dir.bvn, name: dir.name });
            const matched = matchResult?.MatchedConsumer?.[0] ?? matchResult;
            const consumerID = matched?.ConsumerID ?? '0';
            const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

            if (parseInt(consumerID, 10) !== 0 || matchingRate !== 0) {
              const bureauData = await getXScoreConsumerReport({
                consumerID,
                consumerMergeList: matched?.ConsumerMergeList ?? '',
                subscriberEnquiryEngineID: matched?.MatchingEngineID ?? matched?.SubscriberEnquiryEngineID ?? '',
                enquiryID: matched?.EnquiryID ?? '',
              });
              await BureauResult.create({ client: req.client.id, customer: customer._id, bvn: dir.bvn, result: bureauData, status: 'success', meta: { type: 'director', directorName: dir.name } });
              dirResult.bureauStatus = 'success';
            } else {
              dirResult.bureauStatus = 'no_record';
            }
          } else {
            dirResult.bureauStatus = 'skipped';
          }
        } catch {
          await BureauResult.create({ client: req.client.id, customer: customer._id, bvn: dir.bvn, result: {}, status: 'failed', meta: { type: 'director', directorName: dir.name } }).catch(() => {});
          dirResult.bureauStatus = 'failed';
        }
      }

      results.push(dirResult);
    }

    // Merge with any existing directors or replace — append by default
    const existingNames = new Set((customer.directors || []).map(d => d.name?.toLowerCase()));
    for (const r of results) {
      if (existingNames.has(r.name?.toLowerCase())) {
        const idx = customer.directors.findIndex(d => d.name?.toLowerCase() === r.name?.toLowerCase());
        customer.directors[idx] = { ...customer.directors[idx].toObject(), ...r };
      } else {
        customer.directors.push(r);
      }
    }
    await customer.save();

    AuditLog.create({ client: req.client.id, action: 'DIRECTORS_SUBMITTED', entityType: 'Customer', entityId: customer._id, label: `${results.length} director(s) submitted for ${customer.name}`, meta: { count: results.length, source: 'api' } }).catch(() => {});

    res.json({ success: true, results, totalDirectors: customer.directors.length });
  } catch (err) {
    console.error('[directors] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/financials ─────────────────────────────────────────
router.post('/:id/financials', logUsage('/v1/customers/financials'), upload.array('documents', 10), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (customer.customerType !== 'business') {
      return res.status(400).json({ error: 'Financial document upload is only for business customers' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded. Send files as multipart field named "documents"' });
    }

    const uploaded = [];
    for (const file of req.files) {
      const s3Key = await uploadDocument(file.buffer, {
        clientId: req.client.id,
        sessionToken: customer._id.toString(),
        filename: file.originalname,
        mimetype: file.mimetype,
        folder: 'customers/financials',
      }).catch(err => { console.error('[s3] financials upload failed:', err.message); return null; });

      uploaded.push({ filename: file.originalname, size: file.size, s3Key, uploadedAt: new Date() });
    }

    customer.financials = [...(customer.financials || []), ...uploaded];
    await customer.save();

    AuditLog.create({ client: req.client.id, action: 'FINANCIALS_UPLOADED', entityType: 'Customer', entityId: customer._id, label: `${uploaded.length} financial document(s) uploaded for ${customer.name}`, meta: { count: uploaded.length, source: 'api' } }).catch(() => {});

    res.json({ success: true, uploaded: uploaded.length, documents: uploaded });
  } catch (err) {
    console.error('[financials] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/:id/guarantor ─────────────────────────────────────────
router.post('/:id/guarantor', logUsage('/v1/customers/guarantor'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { name, phone, email, address, relationship } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

    customer.guarantor = { name, phone, email, address, relationship };
    await customer.save();

    AuditLog.create({ client: req.client.id, action: 'GUARANTOR_ADDED', entityType: 'Customer', entityId: customer._id, label: `Guarantor added for ${customer.name}: ${name}`, meta: { guarantorName: name, source: 'api' } }).catch(() => {});

    res.json({ success: true, guarantor: customer.guarantor });
  } catch (err) {
    console.error('[guarantor] error:', err);
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
      StatementResult.find({ customer: customer._id, status: "success" }).select("-s3Key").sort({ createdAt: -1 }).limit(1).lean(),
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
router.post('/:id/loan-review', sandboxMock('loan_review'), logUsage('/v1/customers/loan-review'), async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { loanAmount = 0, loanTenor = 0, annualRate = 0 } = req.body;

    const [bvnResults, ninResults, bureauResults, statements] = await Promise.all([
      BVNResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      NINResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      BureauResult.find({ customer: customer._id, status: 'success' }).sort({ createdAt: -1 }).limit(1).lean(),
      StatementResult.find({ customer: customer._id, status: "success" }).select("-s3Key").sort({ createdAt: -1 }).limit(1).lean(),
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

    // Notify borrower — fire-and-forget
    const { sendLoanDecision } = require('../utils/mailer');
    const { smsBorrowerDecision } = require('../utils/sms');
    const MFIClient = require('../models/MFIClient');
    const orgName = req.client.organizationName
      || (await MFIClient.findById(clientId).select('organizationName').lean())?.organizationName
      || 'your lender';
    if (customer.email) {
      sendLoanDecision(customer.email, {
        borrowerName: customer.name,
        verdict: review.verdict,
        summary: review.summary,
        loanAmount,
        loanTenor,
        organizationName: orgName,
      }).catch(e => console.error('[mailer] loan decision email failed:', e.message));
    }
    if (customer.phone) {
      smsBorrowerDecision(customer.phone, {
        borrowerName: customer.name,
        verdict: review.verdict,
        organizationName: orgName,
      }).catch(e => console.error('[sms] loan decision sms failed:', e.message));
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/bvn/rerun/:resultId ────────────────────────────────────
router.post('/bvn/rerun/:resultId', async (req, res) => {
  try {
    const result = await BVNResult.findOne({ _id: req.params.resultId, client: req.client.id });
    if (!result) return res.status(404).json({ error: 'BVN result not found' });
    const bvn = result.bvn;
    if (!bvn) return res.status(400).json({ error: 'No BVN stored on this result' });

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
      };
    } catch (upstreamErr) {
      result.result = upstreamErr.response?.data || {};
      result.status = 'failed';
      await result.save();
      return res.status(502).json({ error: 'BVN re-check failed' });
    }

    result.result = normalized;
    result.status = 'success';
    await result.save();
    res.json({ success: true, data: normalized, resultId: result._id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/nin/rerun/:resultId ────────────────────────────────────
router.post('/nin/rerun/:resultId', async (req, res) => {
  try {
    const result = await NINResult.findOne({ _id: req.params.resultId, client: req.client.id });
    if (!result) return res.status(404).json({ error: 'NIN result not found' });
    const nin = result.nin;
    if (!nin) return res.status(400).json({ error: 'No NIN stored on this result' });

    let data;
    try {
      const resp = await dojahApi.get('/api/v1/kyc/nin', { params: { nin } });
      data = resp.data.entity || resp.data;
    } catch (upstreamErr) {
      result.result = upstreamErr.response?.data || {};
      result.status = 'failed';
      await result.save();
      return res.status(502).json({ error: 'NIN re-check failed' });
    }

    result.result = data;
    result.status = 'success';
    await result.save();
    res.json({ success: true, data, resultId: result._id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/bureau/rerun/:resultId ─────────────────────────────────
router.post('/bureau/rerun/:resultId', async (req, res) => {
  try {
    const bureauResult = await BureauResult.findOne({ _id: req.params.resultId, client: req.client.id });
    if (!bureauResult) return res.status(404).json({ error: 'Bureau result not found' });
    const bvn = bureauResult.bvn;
    if (!bvn) return res.status(400).json({ error: 'No BVN/identifier stored on this result' });

    let upstreamData;
    try {
      const matchResult = await matchConsumer({ bvn });
      const matched = matchResult?.MatchedConsumer?.[0] ?? matchResult;
      const consumerID = matched?.ConsumerID ?? '0';
      const consumerMergeList = matched?.ConsumerMergeList ?? '';
      const subscriberEnquiryEngineID = matched?.MatchingEngineID ?? '';
      const enquiryID = matched?.EnquiryID ?? '';
      const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

      if (parseInt(consumerID, 10) === 0 && matchingRate === 0) {
        upstreamData = { noRecord: true, message: 'No credit record found.' };
      } else {
        upstreamData = await getXScoreConsumerReport({ consumerID, consumerMergeList, subscriberEnquiryEngineID, enquiryID });
      }
    } catch (upstreamErr) {
      bureauResult.result = upstreamErr.response?.data || {};
      bureauResult.status = 'failed';
      await bureauResult.save();
      return res.status(502).json({ error: 'Bureau re-check failed' });
    }

    bureauResult.result = upstreamData;
    bureauResult.status = 'success';
    await bureauResult.save();
    res.json({ success: true, resultId: bureauResult._id, noRecord: upstreamData?.noRecord });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /v1/customers/statement/rerun/:resultId ──────────────────────────────
router.post('/statement/rerun/:resultId', async (req, res) => {
  try {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { S3Client } = require('@aws-sdk/client-s3');
    const statResult = await StatementResult.findOne({ _id: req.params.resultId, client: req.client.id });
    if (!statResult) return res.status(404).json({ error: 'Statement result not found' });
    if (!statResult.s3Key) return res.status(400).json({ error: 'No S3 file stored for this result — cannot re-run' });

    // Fetch file from S3
    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: statResult.s3Key }));
    const chunks = [];
    for await (const chunk of s3Obj.Body) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const form = new FormData();
    form.append('file', buffer, { filename: statResult.filename || 'statement.pdf', contentType: 'application/pdf' });
    if (statResult.bankName) form.append('bank', statResult.bankName);

    let analysisData;
    try {
      const { data } = await lucredApi.post(
        process.env.LUCRED_STATEMENT_ANALYZE_PATH || '/metrics/file_transactions',
        form, { headers: form.getHeaders() }
      );
      analysisData = data;
    } catch (err) {
      statResult.status = 'failed';
      await statResult.save();
      return res.status(502).json({ error: 'Statement re-analysis failed' });
    }

    statResult.result = analysisData;
    statResult.status = 'success';
    await statResult.save();
    res.json({ success: true, data: analysisData, resultId: statResult._id });
  } catch (err) {
    console.error('[rerun] statement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
