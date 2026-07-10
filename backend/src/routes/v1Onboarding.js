/**
 * API-key-authenticated onboarding routes.
 * Mirrors the public /api/onboard/:slug flow but authenticates via API key,
 * deducts wallet charges, and uses session _id as the resource identifier.
 *
 * All routes are prefixed /v1/onboarding when registered.
 */
const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');

const { requireApiKey, logUsage } = require('../middleware/auth');
const { deductCharge, refundCharge } = require('../utils/wallet');

const OnboardingSession = require('../models/OnboardingSession');
const Customer          = require('../models/Customer');
const BVNResult         = require('../models/BVNResult');
const NINResult         = require('../models/NINResult');
const BureauResult      = require('../models/BureauResult');
const StatementResult   = require('../models/StatementResult');
const AuditLog          = require('../models/AuditLog');

const dojahApi  = require('../config/dojahApi');
const lucredApi = require('../config/lucredApi');
const { matchConsumer, getXScoreConsumerReport } = require('../config/firstCentralApi');
const { uploadDocument, uploadStatement } = require('../utils/s3');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function getSession(clientId, sessionId) {
  return OnboardingSession.findOne({ _id: sessionId, client: clientId });
}

// ── POST /v1/onboarding/sessions ─ create a new session ──────────────────────
router.post('/sessions', requireApiKey, logUsage('/v1/onboarding/sessions'), async (req, res) => {
  try {
    const { type, customerId } = req.body;
    if (!type || !['individual', 'sme'].includes(type)) {
      return res.status(400).json({ error: 'type must be "individual" or "sme"' });
    }

    const session = await OnboardingSession.create({
      client: req.client.id,
      customer: customerId || undefined,
      type,
      currentStep: 0,
      source: 'api',
    });

    res.status(201).json({
      sessionId: session._id,
      type: session.type,
      status: session.status,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
    });
  } catch (err) {
    console.error('[v1/onboarding] create session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /v1/onboarding/sessions ─ list sessions ───────────────────────────────
router.get('/sessions', requireApiKey, async (req, res) => {
  try {
    const { status, type, limit = 50, skip = 0 } = req.query;
    const filter = { client: req.client.id };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const [sessions, total] = await Promise.all([
      OnboardingSession.find(filter)
        .select('type status currentStep completedSteps verifications createdAt updatedAt')
        .populate('customer', 'name email phone')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .lean(),
      OnboardingSession.countDocuments(filter),
    ]);

    res.json({ total, sessions: sessions.map(s => ({ ...s, sessionId: s._id })) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /v1/onboarding/sessions/:id ──────────────────────────────────────────
router.get('/sessions/:id', requireApiKey, async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      sessionId: session._id,
      type: session.type,
      status: session.status,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      data: session.data,
      verifications: session.verifications,
      customer: session.customer,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /v1/onboarding/sessions/:id/status ─ poll verifications ──────────────
router.get('/sessions/:id/status', requireApiKey, async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ verifications: session.verifications, status: session.status });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/personal ── individual + SME both use this ──────────────────
router.post('/sessions/:id/step/personal', requireApiKey, async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { name, email, phone, bvn, nin, address } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

    // Upsert customer
    let customer = await Customer.findOne({ client: req.client.id, phone });
    if (!customer) {
      customer = await Customer.create({
        client: req.client.id, name, email, phone, bvn, nin, address,
        customerType: session.type === 'sme' ? 'business' : 'individual',
      });
    } else {
      Object.assign(customer, { name, email, bvn, nin, address });
      await customer.save();
    }

    session.customer = customer._id;
    session.data = { ...session.data, personal: { name, email, phone, bvn, nin, address } };
    if (!session.completedSteps.includes(0)) session.completedSteps.push(0);
    session.currentStep = Math.max(session.currentStep, 1);
    await session.save();

    // Background BVN check (charges deducted here)
    if (bvn) {
      setImmediate(async () => {
        try {
          const charge = await deductCharge(req.client.id, 'BVN_CHECK', { customerName: name, customerId: customer._id });
          if (!charge.ok) {
            await OnboardingSession.findByIdAndUpdate(session._id, {
              'verifications.bvn': { status: 'failed', error: 'Insufficient wallet balance for BVN check' },
            });
            return;
          }
          const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn } });
          const e = data.entity || {};
          const normalized = {
            isValid: true, bvn,
            firstName: e.first_name, lastName: e.last_name, middleName: e.middle_name,
            dateOfBirth: e.date_of_birth, gender: e.gender,
            phoneNumber: e.phone_number1 || e.phone_number, email: e.email,
            image: e.image || e.photo || null,
            enrollmentBank: e.enrollment_bank, nin: e.nin,
            watchListed: e.watch_listed, levelOfAccount: e.level_of_account,
          };
          const saved = await BVNResult.create({ client: req.client.id, customer: customer._id, bvn, result: normalized, status: 'success' });
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.bvn': { status: 'success', resultId: saved._id },
          });
          AuditLog.create({ client: req.client.id, action: 'BVN_CHECK', entityType: 'BVNResult', entityId: saved._id, label: `BVN check (onboarding API): ${name}`, meta: { bvn, customerId: customer._id } }).catch(() => {});
        } catch (err) {
          const errData = err.response?.data || { message: err.message };
          await BVNResult.create({ client: req.client.id, customer: customer._id, bvn, result: errData, status: 'failed' }).catch(() => {});
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.bvn': { status: 'failed', error: errData?.error || 'BVN check failed' },
          });
          if (!charge?.freeQuota) refundCharge(req.client.id, 'BVN_CHECK', { customerName: name, customerId: customer._id }).catch(() => {});
        }
      });
    }

    // Background NIN check
    if (nin) {
      setImmediate(async () => {
        try {
          const charge = await deductCharge(req.client.id, 'NIN_CHECK', { customerName: name, customerId: customer._id });
          if (!charge.ok) {
            await OnboardingSession.findByIdAndUpdate(session._id, {
              'verifications.nin': { status: 'failed', error: 'Insufficient wallet balance for NIN check' },
            });
            return;
          }
          const { data } = await dojahApi.get('/api/v1/kyc/nin', { params: { nin } });
          const e = data.entity || data;
          const saved = await NINResult.create({ client: req.client.id, customer: customer._id, nin, result: e, status: 'success' });
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.nin': { status: 'success', resultId: saved._id },
          });
          AuditLog.create({ client: req.client.id, action: 'NIN_CHECK', entityType: 'NINResult', entityId: saved._id, label: `NIN check (onboarding API): ${name}`, meta: { nin, customerId: customer._id } }).catch(() => {});
        } catch (err) {
          await NINResult.create({ client: req.client.id, customer: customer._id, nin, result: err.response?.data || {}, status: 'failed' }).catch(() => {});
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.nin': { status: 'failed', error: 'NIN check failed' },
          });
          if (!charge?.freeQuota) refundCharge(req.client.id, 'NIN_CHECK', { customerName: name, customerId: customer._id }).catch(() => {});
        }
      });
    }

    res.json({ success: true, customerId: customer._id, sessionId: session._id, currentStep: session.currentStep });
  } catch (err) {
    console.error('[v1/onboarding] personal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/bureau ── individual bureau check ───────────────────────────
router.post('/sessions/:id/step/bureau', requireApiKey, async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const bvn = session.data?.personal?.bvn;
    if (!bvn) return res.status(400).json({ error: 'BVN required. Complete the personal step with a BVN first.' });

    const charge = await deductCharge(req.client.id, 'BUREAU_CHECK', { customerName: session.data.personal?.name, customerId: session.customer });
    if (!charge.ok) return res.status(402).json({ error: charge.error, required: charge.required, balance: charge.balance });

    let upstreamData;
    try {
      const { name, dateOfBirth, phone } = session.data.personal;
      const matchResult = await matchConsumer({ bvn, name, dateOfBirth, phone });
      const matched = matchResult?.MatchedConsumer?.[0] ?? matchResult;
      const consumerID = matched?.ConsumerID ?? '0';
      const consumerMergeList = matched?.ConsumerMergeList ?? '';
      const subscriberEnquiryEngineID = matched?.MatchingEngineID ?? matched?.SubscriberEnquiryEngineID ?? '';
      const enquiryID = matched?.EnquiryID ?? '';
      const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

      upstreamData = (parseInt(consumerID, 10) === 0 && matchingRate === 0)
        ? { noRecord: true, message: 'No credit record found.' }
        : await getXScoreConsumerReport({ consumerID, consumerMergeList, subscriberEnquiryEngineID, enquiryID });
    } catch (err) {
      if (!charge.freeQuota) refundCharge(req.client.id, 'BUREAU_CHECK', { customerName: session.data.personal?.name, customerId: session.customer }).catch(() => {});
      const errBody = err.response?.data || { message: err.message };
      await BureauResult.create({ client: req.client.id, customer: session.customer, bvn, result: errBody, status: 'failed' }).catch(() => {});
      await session.updateOne({ 'verifications.bureau': { status: 'failed', error: 'Bureau check failed' } });
      return res.status(502).json({ error: 'Bureau check failed. Please try again.' });
    }

    const saved = await BureauResult.create({ client: req.client.id, customer: session.customer, bvn, result: upstreamData, status: 'success' });

    if (!session.completedSteps.includes(1)) session.completedSteps.push(1);
    session.currentStep = Math.max(session.currentStep, 2);
    session.verifications = { ...session.verifications, bureau: { status: 'success', resultId: saved._id } };
    await session.save();

    AuditLog.create({ client: req.client.id, action: 'BUREAU_CHECK', entityType: 'BureauResult', entityId: saved._id, label: `Bureau check (onboarding API): ${session.data.personal?.name}`, meta: { bvn, customerId: session.customer } }).catch(() => {});

    const summary = upstreamData?.noRecord
      ? { noRecord: true }
      : {
          name: upstreamData?.PersonalDetails?.ConsumerName,
          score: upstreamData?.Score?.Value ?? upstreamData?.CreditScore?.Value,
          totalAccounts: upstreamData?.SummaryOfPerformance?.TotalNoOfAccounts,
          delinquentAccounts: upstreamData?.SummaryOfPerformance?.TotalNoOfDelinquentFacilities,
        };

    res.json({ success: true, resultId: saved._id, summary, currentStep: session.currentStep });
  } catch (err) {
    console.error('[v1/onboarding] bureau error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/statement ───────────────────────────────────────────────────
router.post(
  '/sessions/:id/step/statement',
  requireApiKey,
  logUsage('/v1/onboarding/step/statement'),
  upload.single('statement'),
  async (req, res) => {
    try {
      const session = await getSession(req.client.id, req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded. Send file as multipart field named "statement"' });

      const { bankName, password } = req.body;
      const personal = session.data?.personal || session.data?.business || {};

      const charge = await deductCharge(req.client.id, 'STATEMENT_ANALYSIS', { customerName: personal.name || personal.businessName, customerId: session.customer });
      if (!charge.ok) return res.status(402).json({ error: charge.error, required: charge.required, balance: charge.balance });

      const form = new FormData();
      form.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
      if (bankName) form.append('bank', bankName);
      if (password) form.append('password', password);

      let analysisData;
      try {
        const { data } = await lucredApi.post(
          process.env.LUCRED_STATEMENT_ANALYZE_PATH || '/metrics/file_transactions',
          form,
          { headers: form.getHeaders() }
        );
        analysisData = data;
      } catch (err) {
        if (!charge.freeQuota) refundCharge(req.client.id, 'STATEMENT_ANALYSIS', { customerName: personal.name || personal.businessName, customerId: session.customer }).catch(() => {});
        const failed = await StatementResult.create({
          client: req.client.id, customer: session.customer,
          email: personal.email, accountName: personal.name || personal.businessName,
          bankName, filename: req.file.originalname, status: 'failed',
        }).catch(() => null);
        await session.updateOne({ 'verifications.statement': { status: 'failed' } });
        return res.status(502).json({ error: 'Statement analysis failed. Please try again.' });
      }

      const saved = await StatementResult.create({
        client: req.client.id, customer: session.customer,
        email: personal.email, accountName: personal.name || personal.businessName,
        bankName, filename: req.file.originalname, result: analysisData, status: 'success',
      });

      uploadStatement(req.file.buffer, {
        clientId: req.client.id, resultId: saved._id,
        filename: req.file.originalname, mimetype: req.file.mimetype,
      }).then(s3Key => StatementResult.findByIdAndUpdate(saved._id, { s3Key }).catch(() => {}))
        .catch(err => console.error('[s3] statement upload failed:', err.message));

      const stepIdx = session.type === 'sme' ? 1 : 2;
      if (!session.completedSteps.includes(stepIdx)) session.completedSteps.push(stepIdx);
      session.currentStep = Math.max(session.currentStep, stepIdx + 1);
      session.verifications = { ...session.verifications, statement: { status: 'success', resultId: saved._id } };
      await session.save();

      AuditLog.create({ client: req.client.id, action: 'STATEMENT_ANALYSIS', entityType: 'StatementResult', entityId: saved._id, label: `Statement analysis (onboarding API): ${personal.name || personal.businessName}`, meta: { bankName, filename: req.file.originalname, customerId: session.customer } }).catch(() => {});

      res.json({ success: true, resultId: saved._id, currentStep: session.currentStep });
    } catch (err) {
      console.error('[v1/onboarding] statement error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ── POST .../step/business ── SME only ────────────────────────────────────────
router.post('/sessions/:id/step/business', requireApiKey, upload.single('cacDocument'), async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'This step is only for SME sessions' });

    const { businessName, email, phone, cacNumber } = req.body;
    if (!businessName || !cacNumber) return res.status(400).json({ error: 'businessName and cacNumber are required' });

    // Upsert business customer
    let customer = await Customer.findOne({ client: req.client.id, $or: [{ phone }, { 'businessDetails.cacNumber': cacNumber }] });
    if (!customer) {
      customer = await Customer.create({
        client: req.client.id, name: businessName, email, phone, customerType: 'business',
        businessDetails: { name: businessName, cacNumber },
      });
    } else {
      customer.name = businessName;
      if (email) customer.email = email;
      if (phone) customer.phone = phone;
      await customer.save();
    }

    // CAC verification
    let cacResult = null;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/cac', { params: { rc_number: cacNumber } });
      cacResult = data.entity || data;
    } catch (err) {
      cacResult = { error: err.response?.data?.error || 'CAC lookup failed', failed: true };
    }

    // CAC document upload
    let cacDocKey = null;
    if (req.file) {
      cacDocKey = await uploadDocument(req.file.buffer, {
        clientId: req.client.id, sessionToken: session._id.toString(),
        filename: req.file.originalname, mimetype: req.file.mimetype,
        folder: 'onboarding/cac-docs',
      }).catch(err => { console.error('[s3] cac doc upload failed:', err.message); return null; });
    }

    session.customer = customer._id;
    session.data = { ...session.data, business: { businessName, email, phone, cacNumber, cacDocKey } };
    session.verifications = { ...session.verifications, cac: { status: cacResult?.failed ? 'failed' : 'success', data: cacResult } };
    if (!session.completedSteps.includes(0)) session.completedSteps.push(0);
    session.currentStep = Math.max(session.currentStep, 1);
    await session.save();

    res.json({ success: true, customerId: customer._id, cacResult, currentStep: session.currentStep });
  } catch (err) {
    console.error('[v1/onboarding] business error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/business-bureau ── SME only ─────────────────────────────────
router.post('/sessions/:id/step/business-bureau', requireApiKey, async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'SME only' });

    const { cacNumber, businessName } = session.data?.business || {};
    if (!cacNumber) return res.status(400).json({ error: 'Complete the business step first' });

    const charge = await deductCharge(req.client.id, 'BUREAU_CHECK', { customerName: businessName, customerId: session.customer });
    if (!charge.ok) return res.status(402).json({ error: charge.error, required: charge.required, balance: charge.balance });

    let upstreamData;
    try {
      const matchResult = await matchConsumer({ bvn: cacNumber, name: businessName, Identification: cacNumber });
      const matched = matchResult?.MatchedConsumer?.[0] ?? matchResult;
      const consumerID = matched?.ConsumerID ?? '0';
      const consumerMergeList = matched?.ConsumerMergeList ?? '';
      const subscriberEnquiryEngineID = matched?.MatchingEngineID ?? matched?.SubscriberEnquiryEngineID ?? '';
      const enquiryID = matched?.EnquiryID ?? '';
      const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

      upstreamData = (parseInt(consumerID, 10) === 0 && matchingRate === 0)
        ? { noRecord: true, message: 'No business credit record found.' }
        : await getXScoreConsumerReport({ consumerID, consumerMergeList, subscriberEnquiryEngineID, enquiryID });
    } catch (err) {
      if (!charge.freeQuota) refundCharge(req.client.id, 'BUREAU_CHECK', { customerName: businessName, customerId: session.customer }).catch(() => {});
      const errBody = err.response?.data || { message: err.message };
      await BureauResult.create({ client: req.client.id, customer: session.customer, bvn: cacNumber, result: errBody, status: 'failed', meta: { type: 'business' } }).catch(() => {});
      await session.updateOne({ 'verifications.businessBureau': { status: 'failed' } });
      return res.status(502).json({ error: 'Business bureau check failed. Please try again.' });
    }

    const saved = await BureauResult.create({ client: req.client.id, customer: session.customer, bvn: cacNumber, result: upstreamData, status: 'success', meta: { type: 'business' } });

    session.verifications = { ...session.verifications, businessBureau: { status: 'success', resultId: saved._id } };
    if (!session.completedSteps.includes(2)) session.completedSteps.push(2);
    session.currentStep = Math.max(session.currentStep, 3);
    await session.save();

    AuditLog.create({ client: req.client.id, action: 'BUREAU_CHECK', entityType: 'BureauResult', entityId: saved._id, label: `Business bureau check (onboarding API): ${businessName}`, meta: { cacNumber, customerId: session.customer } }).catch(() => {});

    res.json({ success: true, resultId: saved._id, noRecord: upstreamData?.noRecord, currentStep: session.currentStep });
  } catch (err) {
    console.error('[v1/onboarding] business-bureau error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/directors ── SME only ───────────────────────────────────────
// Accepts multipart with directors JSON + optional idCard files
router.post('/sessions/:id/step/directors', requireApiKey, upload.array('idCards', 10), async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'SME only' });

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
      const dirResult = { name: dir.name, bvnStatus: null, bureauStatus: null, idCardKey: null };

      const idCardFile = req.files?.[i];
      if (idCardFile) {
        dirResult.idCardKey = await uploadDocument(idCardFile.buffer, {
          clientId: req.client.id, sessionToken: session._id.toString(),
          filename: `director-${i}-id.${idCardFile.originalname.split('.').pop()}`,
          mimetype: idCardFile.mimetype, folder: 'onboarding/director-ids',
        }).catch(() => null);
      }

      if (dir.bvn) {
        // BVN check (charge per director)
        try {
          const charge = await deductCharge(req.client.id, 'BVN_CHECK', { customerName: dir.name, customerId: session.customer });
          if (charge.ok) {
            const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn: dir.bvn } });
            const e = data.entity || {};
            await BVNResult.create({ client: req.client.id, customer: session.customer, bvn: dir.bvn, result: { isValid: true, bvn: dir.bvn, firstName: e.first_name, lastName: e.last_name }, status: 'success' });
            dirResult.bvnStatus = 'success';
          } else {
            dirResult.bvnStatus = 'skipped';
          }
        } catch {
          await BVNResult.create({ client: req.client.id, customer: session.customer, bvn: dir.bvn, result: {}, status: 'failed' }).catch(() => {});
          dirResult.bvnStatus = 'failed';
        }

        // Bureau per director (charge per director)
        try {
          const charge = await deductCharge(req.client.id, 'BUREAU_CHECK', { customerName: dir.name, customerId: session.customer });
          if (charge.ok) {
            const matchResult = await matchConsumer({ bvn: dir.bvn, name: dir.name });
            const matched = matchResult?.MatchedConsumer?.[0] ?? matchResult;
            const consumerID = matched?.ConsumerID ?? '0';
            const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

            if (parseInt(consumerID, 10) !== 0 || matchingRate !== 0) {
              const bureauData = await getXScoreConsumerReport({
                consumerID,
                consumerMergeList: matched?.ConsumerMergeList ?? '',
                subscriberEnquiryEngineID: matched?.MatchingEngineID ?? '',
                enquiryID: matched?.EnquiryID ?? '',
              });
              await BureauResult.create({ client: req.client.id, customer: session.customer, bvn: dir.bvn, result: bureauData, status: 'success', meta: { type: 'director', directorName: dir.name } });
              dirResult.bureauStatus = 'success';
            } else {
              dirResult.bureauStatus = 'no_record';
            }
          } else {
            dirResult.bureauStatus = 'skipped';
          }
        } catch {
          dirResult.bureauStatus = 'failed';
        }
      }

      results.push(dirResult);
    }

    session.data = { ...session.data, directors };
    session.verifications = { ...session.verifications, directorBureau: results };
    if (!session.completedSteps.includes(3)) session.completedSteps.push(3);
    session.currentStep = Math.max(session.currentStep, 4);
    await session.save();

    res.json({ success: true, results, currentStep: session.currentStep });
  } catch (err) {
    console.error('[v1/onboarding] directors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/financials ── SME optional ──────────────────────────────────
router.post('/sessions/:id/step/financials', requireApiKey, upload.array('documents', 10), async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'SME only' });

    const uploaded = [];
    for (const file of (req.files || [])) {
      const key = await uploadDocument(file.buffer, {
        clientId: req.client.id, sessionToken: session._id.toString(),
        filename: file.originalname, mimetype: file.mimetype,
        folder: 'onboarding/financials',
      }).catch(() => null);
      uploaded.push({ filename: file.originalname, size: file.size, uploadedAt: new Date(), s3Key: key });
    }

    session.data = { ...session.data, financials: uploaded };
    if (!session.completedSteps.includes(4)) session.completedSteps.push(4);
    session.currentStep = Math.max(session.currentStep, 5);
    await session.save();

    res.json({ success: true, uploaded: uploaded.length, currentStep: session.currentStep });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/guarantor ── SME optional ───────────────────────────────────
router.post('/sessions/:id/step/guarantor', requireApiKey, async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'SME only' });

    const { name, phone, email, address, relationship } = req.body;
    // guarantor is optional — save whatever was provided
    session.data = { ...session.data, guarantor: { name, phone, email, address, relationship } };
    if (!session.completedSteps.includes(5)) session.completedSteps.push(5);
    session.currentStep = Math.max(session.currentStep, 6);
    await session.save();

    res.json({ success: true, currentStep: session.currentStep });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../complete ─────────────────────────────────────────────────────────
router.post('/sessions/:id/complete', requireApiKey, async (req, res) => {
  try {
    const session = await getSession(req.client.id, req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.status = 'complete';
    await session.save();

    AuditLog.create({ client: req.client.id, action: 'ONBOARDING_COMPLETE', entityType: 'OnboardingSession', entityId: session._id, label: `Onboarding completed (API): ${session.data?.personal?.name || session.data?.business?.businessName}`, meta: { type: session.type, customerId: session.customer } }).catch(() => {});

    res.json({
      success: true,
      sessionId: session._id,
      customerId: session.customer,
      type: session.type,
      verifications: session.verifications,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
