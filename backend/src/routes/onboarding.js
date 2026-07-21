/**
 * Public customer self-onboarding routes — no JWT required.
 * All routes are scoped to an MFI's onboarding slug.
 */
const router = require('express').Router();
const crypto = require('crypto');
const multer = require('multer');
const FormData = require('form-data');

const MFIClient        = require('../models/MFIClient');
const OnboardingSession = require('../models/OnboardingSession');
const Customer         = require('../models/Customer');
const BVNResult        = require('../models/BVNResult');
const NINResult        = require('../models/NINResult');
const BureauResult     = require('../models/BureauResult');
const StatementResult  = require('../models/StatementResult');

const dojahApi  = require('../config/dojahApi');
const lucredApi = require('../config/lucredApi');
const { matchConsumer, getXScoreConsumerReport, matchCommercial, getCommercialFullCreditReport } = require('../config/firstCentralApi');
const { uploadDocument, uploadStatement } = require('../utils/s3');
const { notify } = require('../utils/notify');
const { sendOnboardingCompleteToClient, sendOnboardingCompleteToCustomer } = require('../utils/mailer');
const { deductCharge, refundCharge } = require('../utils/wallet');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function makeToken() {
  return crypto.randomBytes(16).toString('hex');
}

// ── Helper: resolve client from slug ─────────────────────────────────────────
async function resolveClient(slug) {
  return MFIClient.findOne({ onboardingSlug: slug, status: 'active' }).lean();
}

// ── Helper: resolve session ───────────────────────────────────────────────────
async function resolveSession(clientId, token) {
  return OnboardingSession.findOne({ client: clientId, sessionToken: token });
}

// ── GET /api/onboard/:slug — get client info ──────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Onboarding link not found or inactive.' });
    res.json({
      organizationName: client.organizationName,
      logo: null,
      slug: client.onboardingSlug,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/onboard/:slug/start ─────────────────────────────────────────────
router.post('/:slug/start', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Onboarding link not found or inactive.' });

    const { type, sessionToken: existingToken } = req.body;

    // Attempt to resume an existing session
    if (existingToken) {
      const existing = await resolveSession(client._id, existingToken);
      if (existing && existing.status === 'in_progress') {
        return res.json({
          sessionToken: existing.sessionToken,
          currentStep: existing.currentStep,
          completedSteps: existing.completedSteps,
          data: existing.data,
          type: existing.type,
        });
      }
    }

    if (!type || !['individual', 'sme'].includes(type)) {
      return res.status(400).json({ error: 'type must be "individual" or "sme"' });
    }

    const sessionToken = makeToken();
    const session = await OnboardingSession.create({
      client: client._id,
      sessionToken,
      type,
      currentStep: 0,
    });

    res.status(201).json({
      sessionToken: session.sessionToken,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      data: session.data,
      type: session.type,
    });
  } catch (err) {
    console.error('[onboard] start error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/onboard/:slug/session/:token ─────────────────────────────────────
router.get('/:slug/session/:token', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      sessionToken: session.sessionToken,
      type: session.type,
      status: session.status,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps,
      data: session.data,
      verifications: session.verifications,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/onboard/:slug/session/:token/status — poll verifications ─────────
router.get('/:slug/session/:token/status', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({ verifications: session.verifications });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/personal ────────────────────────────────────────────────────
router.post('/:slug/session/:token/step/personal', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { name, email, phone, bvn, nin, address } = req.body;
    if (!name || !phone || !email) return res.status(400).json({ error: 'name, phone, and email are required' });

    // Upsert customer record
    let customer = await Customer.findOne({ client: client._id, phone });
    if (!customer) {
      customer = await Customer.create({
        client: client._id, name, email, phone, bvn, nin, address,
        customerType: session.type === 'sme' ? 'business' : 'individual',
      });
    } else {
      Object.assign(customer, { name, email, bvn, nin, address });
      await customer.save();
    }

    // Update session
    session.customer = customer._id;
    session.data = { ...session.data, personal: { name, email, phone, bvn, nin, address } };
    if (!session.completedSteps.includes(0)) session.completedSteps.push(0);
    session.currentStep = Math.max(session.currentStep, 1);
    await session.save();

    // Background: BVN check
    if (bvn) {
      setImmediate(async () => {
        try {
          const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn } });
          const e = data.entity || {};
          const normalized = {
            isValid: true, bvn,
            firstName: e.first_name, lastName: e.last_name, middleName: e.middle_name,
            dateOfBirth: e.date_of_birth, gender: e.gender,
            phoneNumber: e.phone_number1 || e.phone_number, email: e.email,
            enrollmentBank: e.enrollment_bank, nin: e.nin,
            watchListed: e.watch_listed, levelOfAccount: e.level_of_account,
          };
          const saved = await BVNResult.create({
            client: client._id, customer: customer._id, bvn, result: normalized, status: 'success',
          });
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.bvn': { status: 'success', resultId: saved._id, data: normalized },
          });
        } catch (err) {
          const errData = err.response?.data || { message: err.message };
          await BVNResult.create({
            client: client._id, customer: customer._id, bvn, result: errData, status: 'failed',
          }).catch(() => {});
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.bvn': { status: 'failed', error: errData?.error || 'BVN check failed' },
          });
        }
      });
    }

    // Background: NIN check
    if (nin) {
      setImmediate(async () => {
        try {
          const { data } = await dojahApi.get('/api/v1/kyc/nin', { params: { nin } });
          const e = data.entity || data;
          const saved = await NINResult.create({
            client: client._id, customer: customer._id, nin, result: e, status: 'success',
          });
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.nin': { status: 'success', resultId: saved._id },
          });
        } catch (err) {
          await NINResult.create({
            client: client._id, customer: customer._id, nin,
            result: err.response?.data || {}, status: 'failed',
          }).catch(() => {});
          await OnboardingSession.findByIdAndUpdate(session._id, {
            'verifications.nin': { status: 'failed', error: 'NIN check failed' },
          });
        }
      });
    }

    notify(client._id, {
      type: 'onboarding',
      title: 'New onboarding started',
      body: `${name} started the onboarding form`,
      meta: { sessionToken: session.sessionToken, customerId: customer._id },
    });

    res.json({ success: true, customerId: customer._id, nextStep: 1 });
  } catch (err) {
    console.error('[onboard] personal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/bureau ──────────────────────────────────────────────────────
router.post('/:slug/session/:token/step/bureau', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const bvn = session.data?.personal?.bvn;
    if (!bvn) return res.status(400).json({ error: 'BVN is required for bureau check. Complete the personal step first.' });

    const { firstName, lastName, dateOfBirth, phone } = session.data?.personal || {};

    let upstreamData;
    try {
      const matchResult = await matchConsumer({ bvn, name: session.data.personal?.name, dateOfBirth, phone });
      const matched = matchResult?.MatchedConsumer?.[0] ?? matchResult;
      const consumerID = matched?.ConsumerID ?? matched?.consumerID ?? '0';
      const consumerMergeList = matched?.ConsumerMergeList ?? '';
      const subscriberEnquiryEngineID = matched?.MatchingEngineID ?? matched?.SubscriberEnquiryEngineID ?? '';
      const enquiryID = matched?.EnquiryID ?? matched?.enquiryID ?? '';
      const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

      if (parseInt(consumerID, 10) === 0 && matchingRate === 0) {
        upstreamData = { noRecord: true, message: 'No credit record found.' };
      } else {
        upstreamData = await getXScoreConsumerReport({ consumerID, consumerMergeList, subscriberEnquiryEngineID, enquiryID });
      }
    } catch (upstreamErr) {
      const errBody = upstreamErr.response?.data || { message: upstreamErr.message };
      await BureauResult.create({
        client: client._id, customer: session.customer, bvn, result: errBody, status: 'failed',
      }).catch(() => {});
      await session.updateOne({ 'verifications.bureau': { status: 'failed', error: 'Bureau check failed' } });
      return res.status(502).json({ error: 'Bureau check failed. Please try again.' });
    }

    const saved = await BureauResult.create({
      client: client._id, customer: session.customer, bvn, result: upstreamData, status: 'success',
    });

    if (!session.completedSteps.includes(1)) session.completedSteps.push(1);
    session.currentStep = Math.max(session.currentStep, 2);
    session.verifications = {
      ...session.verifications,
      bureau: { status: 'success', resultId: saved._id, summary: upstreamData?.noRecord ? 'No record' : 'Report retrieved' },
    };
    await session.save();

    // Summarise for frontend without sending full blob
    const summary = upstreamData?.noRecord
      ? { noRecord: true }
      : {
          name: upstreamData?.PersonalDetails?.ConsumerName,
          score: upstreamData?.Score?.Value ?? upstreamData?.CreditScore?.Value,
          totalAccounts: upstreamData?.SummaryOfPerformance?.TotalNoOfAccounts,
          delinquentAccounts: upstreamData?.SummaryOfPerformance?.TotalNoOfDelinquentFacilities,
        };

    notify(client._id, {
      type: 'onboarding',
      title: 'Bureau check completed',
      body: `Credit bureau retrieved for ${session.data?.personal?.name}`,
      meta: { sessionToken: session.sessionToken },
    });

    res.json({ success: true, resultId: saved._id, summary });
  } catch (err) {
    console.error('[onboard] bureau error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/statement ───────────────────────────────────────────────────
router.post('/:slug/session/:token/step/statement', upload.single('statement'), async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Send file as multipart field named "statement"' });

    const { bankName, password } = req.body;
    const personal = session.data?.personal || {};

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
      const failed = await StatementResult.create({
        client: client._id, customer: session.customer,
        email: personal.email, accountName: personal.name, bankName,
        filename: req.file.originalname, status: 'failed',
      }).catch(() => null);
      await session.updateOne({ 'verifications.statement': { status: 'failed' } });
      return res.status(502).json({ error: 'Statement analysis failed. Please try again.' });
    }

    const saved = await StatementResult.create({
      client: client._id, customer: session.customer,
      email: personal.email, accountName: personal.name, bankName,
      filename: req.file.originalname, result: analysisData, status: 'success',
    });

    // S3 upload fire-and-forget
    uploadStatement(req.file.buffer, {
      clientId: client._id, resultId: saved._id,
      filename: req.file.originalname, mimetype: req.file.mimetype,
    }).then(s3Key => StatementResult.findByIdAndUpdate(saved._id, { s3Key }).catch(() => {}))
      .catch(err => console.error('[s3] statement upload failed:', err.message));

    if (!session.completedSteps.includes(2)) session.completedSteps.push(2);
    session.currentStep = Math.max(session.currentStep, 3);
    session.verifications = {
      ...session.verifications,
      statement: { status: 'success', resultId: saved._id },
    };
    await session.save();

    notify(client._id, {
      type: 'onboarding',
      title: 'Statement uploaded',
      body: `Bank statement analysed for ${personal.name}`,
      meta: { sessionToken: session.sessionToken },
    });

    res.json({ success: true, resultId: saved._id });
  } catch (err) {
    console.error('[onboard] statement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/business (SME only) ────────────────────────────────────────
router.post('/:slug/session/:token/step/business', upload.fields([
  { name: 'cacDocument', maxCount: 1 },
  { name: 'memartDocument', maxCount: 1 },
  { name: 'statusReport', maxCount: 1 },
]), async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'This step is only for SME sessions' });

    const { businessName, cacNumber, companyType = 'COMPANY' } = req.body;
    if (!businessName || !cacNumber) return res.status(400).json({ error: 'businessName and cacNumber are required' });

    // CAC verification — deduct charge
    const cacCharge = await deductCharge(client._id, 'CAC_CHECK', { customerName: businessName });
    if (!cacCharge.ok) return res.status(402).json({ error: cacCharge.error });

    let cacResult = null;
    try {
      const { data } = await dojahApi.get('/api/v1/kyc/cac/basic', { params: { rc_number: cacNumber, company_type: companyType } });
      cacResult = data.entity || data;
    } catch (err) {
      if (!cacCharge.freeQuota) refundCharge(client._id, 'CAC_CHECK', { customerName: businessName }).catch(() => {});
      cacResult = { error: err.response?.data?.error || 'CAC lookup failed', failed: true };
    }

    // TIN verification — deduct charge
    const tinCharge = await deductCharge(client._id, 'TIN_CHECK', { customerName: businessName });
    let tinResult = null;
    if (tinCharge.ok) {
      try {
        const { data } = await dojahApi.get('/api/v1/kyc/cac/tin', { params: { rc_number: cacNumber, company_type: companyType } });
        tinResult = data.entity || data;
      } catch (err) {
        if (!tinCharge.freeQuota) refundCharge(client._id, 'TIN_CHECK', { customerName: businessName }).catch(() => {});
        tinResult = { error: err.response?.data?.error || 'TIN lookup failed', failed: true };
      }
    } else {
      tinResult = { error: tinCharge.error, failed: true };
    }

    const files = req.files || {};

    // Upload CAC document
    let cacDocKey = null;
    if (files.cacDocument?.[0]) {
      const f = files.cacDocument[0];
      cacDocKey = await uploadDocument(f.buffer, {
        clientId: client._id, sessionToken: session.sessionToken,
        filename: f.originalname, mimetype: f.mimetype, folder: 'onboarding/cac-docs',
      }).catch(err => { console.error('[s3] cac doc upload failed:', err.message); return null; });
    }

    // Upload Memart
    let memartKey = null;
    if (files.memartDocument?.[0]) {
      const f = files.memartDocument[0];
      memartKey = await uploadDocument(f.buffer, {
        clientId: client._id, sessionToken: session.sessionToken,
        filename: f.originalname, mimetype: f.mimetype, folder: 'onboarding/memart-docs',
      }).catch(err => { console.error('[s3] memart upload failed:', err.message); return null; });
    }

    // Upload Status Report
    let statusReportKey = null;
    if (files.statusReport?.[0]) {
      const f = files.statusReport[0];
      statusReportKey = await uploadDocument(f.buffer, {
        clientId: client._id, sessionToken: session.sessionToken,
        filename: f.originalname, mimetype: f.mimetype, folder: 'onboarding/status-reports',
      }).catch(err => { console.error('[s3] status report upload failed:', err.message); return null; });
    }

    session.data = { ...session.data, business: { businessName, cacNumber, companyType, cacDocKey, memartKey, statusReportKey } };
    if (!session.completedSteps.includes(0)) session.completedSteps.push(0);
    session.currentStep = Math.max(session.currentStep, 1);
    session.verifications = {
      ...session.verifications,
      cac: { status: cacResult?.failed ? 'failed' : 'success', data: cacResult },
      tin: { status: tinResult?.failed ? 'failed' : 'success', data: tinResult },
    };
    await session.save();

    notify(client._id, {
      type: 'onboarding',
      title: 'Business info submitted',
      body: `${businessName} (RC: ${cacNumber}) submitted business details`,
      meta: { sessionToken: session.sessionToken },
    });

    res.json({ success: true, cacResult, tinResult });
  } catch (err) {
    console.error('[onboard] business error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/business-bureau (SME only) ──────────────────────────────────
router.post('/:slug/session/:token/step/business-bureau', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'SME only' });

    const { cacNumber, businessName } = session.data?.business || {};
    if (!cacNumber) return res.status(400).json({ error: 'Complete business step first' });

    let upstreamData;
    try {
      const matchResult = await matchCommercial({ cacNumber, businessName });
      const matched = matchResult?.MatchedCommercial?.[0] ?? matchResult?.MatchedConsumer?.[0] ?? matchResult;
      const commercialID = matched?.CommercialID ?? matched?.commercialID ?? '0';
      const commercialMergeList = matched?.CommercialMergeList ?? matched?.ConsumerMergeList ?? '';
      const subscriberEnquiryEngineID = matched?.MatchingEngineID ?? matched?.SubscriberEnquiryEngineID ?? '';
      const enquiryID = matched?.EnquiryID ?? matched?.SubscriberEnquiryID ?? '';
      const matchingRate = parseFloat(matched?.MatchingRate ?? 0);

      if (parseInt(commercialID, 10) === 0 && matchingRate === 0) {
        upstreamData = { noRecord: true, message: 'No business credit record found.' };
      } else {
        upstreamData = await getCommercialFullCreditReport({ commercialID, commercialMergeList, subscriberEnquiryEngineID, enquiryID });
      }
    } catch (upstreamErr) {
      const errBody = upstreamErr.response?.data || { message: upstreamErr.message };
      await BureauResult.create({
        client: client._id, customer: session.customer, bvn: cacNumber,
        result: errBody, status: 'failed', meta: { type: 'business' },
      }).catch(() => {});
      await session.updateOne({ 'verifications.businessBureau': { status: 'failed' } });
      return res.status(502).json({ error: 'Business bureau check failed. Please try again.' });
    }

    const saved = await BureauResult.create({
      client: client._id, customer: session.customer, bvn: cacNumber,
      result: upstreamData, status: 'success', meta: { type: 'business' },
    });

    session.verifications = {
      ...session.verifications,
      businessBureau: { status: 'success', resultId: saved._id },
    };
    if (!session.completedSteps.includes(2)) session.completedSteps.push(2);
    session.currentStep = Math.max(session.currentStep, 3);
    await session.save();

    res.json({ success: true, resultId: saved._id, noRecord: upstreamData?.noRecord });
  } catch (err) {
    console.error('[onboard] business-bureau error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/directors (SME only) ────────────────────────────────────────
router.post('/:slug/session/:token/step/directors', upload.array('idCards', 10), async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
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
      const dirResult = { name: dir.name, bvnStatus: null, ninStatus: null, bureauStatus: null, idCardKey: null };

      // Upload ID card if provided
      const idCardFile = req.files?.[i];
      if (idCardFile) {
        dirResult.idCardKey = await uploadDocument(idCardFile.buffer, {
          clientId: client._id, sessionToken: session.sessionToken,
          filename: `director-${i}-id.${idCardFile.originalname.split('.').pop()}`,
          mimetype: idCardFile.mimetype, folder: 'onboarding/director-ids',
        }).catch(() => null);
      }

      // BVN check
      if (dir.bvn) {
        try {
          await deductCharge(client._id, 'BVN_CHECK', { customerName: dir.name }).catch(() => {});
          const { data } = await dojahApi.get('/api/v1/kyc/bvn/advance', { params: { bvn: dir.bvn } });
          const e = data.entity || {};
          const normalized = { isValid: true, bvn: dir.bvn, firstName: e.first_name, lastName: e.last_name };
          await BVNResult.create({ client: client._id, customer: session.customer, bvn: dir.bvn, result: normalized, status: 'success' });
          dirResult.bvnStatus = 'success';
        } catch {
          await BVNResult.create({ client: client._id, customer: session.customer, bvn: dir.bvn, result: {}, status: 'failed' }).catch(() => {});
          dirResult.bvnStatus = 'failed';
        }

        // NIN check for director
        if (dir.nin) {
          try {
            await deductCharge(client._id, 'NIN_CHECK', { customerName: dir.name }).catch(() => {});
            const { data: ninData } = await dojahApi.get('/api/v1/kyc/nin', { params: { nin: dir.nin } });
            const ne = ninData.entity || {};
            await NINResult.create({ client: client._id, customer: session.customer, nin: dir.nin, result: ne, status: 'success', meta: { type: 'director', directorName: dir.name } });
            dirResult.ninStatus = 'success';
          } catch {
            await NINResult.create({ client: client._id, customer: session.customer, nin: dir.nin, result: {}, status: 'failed', meta: { type: 'director', directorName: dir.name } }).catch(() => {});
            dirResult.ninStatus = 'failed';
          }
        }

        // Bureau check for director
        try {
          const matchResult = await matchConsumer({ bvn: dir.bvn, name: dir.name });
          const matched = matchResult?.MatchedConsumer?.[0] ?? matchResult;
          const consumerID = matched?.ConsumerID ?? '0';
          const enquiryID = matched?.EnquiryID ?? '';
          const matchingRate = parseFloat(matched?.MatchingRate ?? 0);
          if (parseInt(consumerID, 10) !== 0 || matchingRate !== 0) {
            const consumerMergeList = matched?.ConsumerMergeList ?? '';
            const subscriberEnquiryEngineID = matched?.MatchingEngineID ?? '';
            const bureauData = await getXScoreConsumerReport({ consumerID, consumerMergeList, subscriberEnquiryEngineID, enquiryID });
            await BureauResult.create({ client: client._id, customer: session.customer, bvn: dir.bvn, result: bureauData, status: 'success', meta: { type: 'director', directorName: dir.name } });
            dirResult.bureauStatus = 'success';
          } else {
            dirResult.bureauStatus = 'no_record';
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

    notify(client._id, {
      type: 'onboarding',
      title: 'Directors submitted',
      body: `${directors.length} director(s) submitted for ${session.data?.business?.businessName}`,
      meta: { sessionToken: session.sessionToken },
    });

    res.json({ success: true, results });
  } catch (err) {
    console.error('[onboard] directors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/financials (SME optional) ───────────────────────────────────
router.post('/:slug/session/:token/step/financials', upload.array('documents', 10), async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'SME only' });

    const uploaded = [];
    for (const file of (req.files || [])) {
      const key = await uploadDocument(file.buffer, {
        clientId: client._id, sessionToken: session.sessionToken,
        filename: file.originalname, mimetype: file.mimetype,
        folder: 'onboarding/financials',
      }).catch(() => null);
      uploaded.push({ filename: file.originalname, size: file.size, uploadedAt: new Date(), s3Key: key });
    }

    session.data = { ...session.data, financials: uploaded };
    if (!session.completedSteps.includes(4)) session.completedSteps.push(4);
    session.currentStep = Math.max(session.currentStep, 5);
    await session.save();

    res.json({ success: true, uploaded: uploaded.length });
  } catch (err) {
    console.error('[onboard] financials error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../step/guarantor (SME optional) ────────────────────────────────────
router.post('/:slug/session/:token/step/guarantor', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.type !== 'sme') return res.status(400).json({ error: 'SME only' });

    const { name, phone, email, address, relationship } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

    session.data = { ...session.data, guarantor: { name, phone, email, address, relationship } };
    if (!session.completedSteps.includes(5)) session.completedSteps.push(5);
    session.currentStep = Math.max(session.currentStep, 6);
    await session.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST .../complete ─────────────────────────────────────────────────────────
router.post('/:slug/session/:token/complete', async (req, res) => {
  try {
    const client = await resolveClient(req.params.slug);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const session = await resolveSession(client._id, req.params.token);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.status = 'complete';
    await session.save();

    const customerName = session.data?.personal?.name || session.data?.business?.businessName || 'A customer';
    const customerEmail = session.data?.personal?.email || session.data?.business?.email || null;
    const customerType = session.type === 'sme' ? 'business' : 'individual';
    const dashboardUrl = `https://engine.lucred.co/dashboard/customers/${session.customer || ''}`;

    notify(client._id, {
      type: 'onboarding',
      title: 'Onboarding complete',
      body: `${customerName} completed the onboarding form`,
      meta: { sessionToken: session.sessionToken, customerId: session.customer },
    });

    // Email the client
    if (client.email) {
      sendOnboardingCompleteToClient(client.email, {
        organizationName: client.organizationName,
        customerName, customerType, dashboardUrl,
      }).catch(() => {});
    }

    // Email the customer if they provided an email
    if (customerEmail) {
      sendOnboardingCompleteToCustomer(customerEmail, {
        customerName,
        organizationName: client.organizationName,
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Onboarding complete. Thank you!' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
