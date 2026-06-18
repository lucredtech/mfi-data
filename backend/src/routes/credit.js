const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireApiKey, logUsage } = require('../middleware/auth');
const lucredApi = require('../config/lucredApi');
const dojahApi = require('../config/dojahApi');
const { matchConsumer, getXScoreConsumerReport } = require('../config/firstCentralApi');
const BVNResult = require('../models/BVNResult');
const BureauResult = require('../models/BureauResult');
const NINResult = require('../models/NINResult');

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, keyGenerator: (req) => req.apiKey?.key });

router.use(requireApiKey, limiter);

// Bank statement analysis (legacy mono endpoint)
router.post('/statement/analyze', logUsage('/v1/statement/analyze'), async (req, res) => {
  try {
    const { monoId, email } = req.body;
    if (!monoId || !email)
      return res.status(400).json({ error: 'monoId and email are required' });

    const { data } = await lucredApi.get('/api/v1/users/analyzed/statement', {
      params: { monoId, email },
    });
    res.json({ success: true, data });
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.response?.data || 'Upstream error' });
  }
});

// Credit bureau check via FirstCentral XScore Consumer Full Credit Report
router.post('/credit-bureau/check', logUsage('/v1/credit-bureau/check'), async (req, res) => {
  try {
    const { bvn, firstName, lastName, dateOfBirth, phone, customerId } = req.body;
    if (!bvn && !phone) return res.status(400).json({ error: 'bvn or phone is required' });

    const name = [firstName, lastName].filter(Boolean).join(' ');

    let upstreamData;
    try {
      // Step 1: match consumer to get consumerID / mergeList
      const matchResult = await matchConsumer({ bvn, name, dateOfBirth, phone });

      const consumerID = matchResult?.consumerID ?? matchResult?.ConsumerID ?? '';
      const consumerMergeList = matchResult?.consumerMergeList ?? matchResult?.ConsumerMergeList ?? '';

      // Step 2: pull full XScore report
      upstreamData = await getXScoreConsumerReport({ consumerID, consumerMergeList });
    } catch (upstreamErr) {
      const errBody = upstreamErr.response?.data || { message: upstreamErr.message };
      await BureauResult.create({
        client: req.apiKey.client,
        customer: customerId || undefined,
        bvn: bvn || '',
        result: errBody,
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: errBody?.Message || errBody?.message || 'Bureau check failed' });
    }

    const saved = await BureauResult.create({
      client: req.apiKey.client,
      customer: customerId || undefined,
      bvn: bvn || '',
      result: upstreamData,
      status: 'success',
    });

    res.json({ success: true, data: upstreamData, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Credit score / decision
router.post('/credit/score', logUsage('/v1/credit/score'), async (req, res) => {
  try {
    const { bvn, monoId, email } = req.body;
    if (!bvn && !monoId)
      return res.status(400).json({ error: 'bvn or monoId is required' });

    const { data } = await lucredApi.post('/api/v1/verifications/getUserCreditData', {
      bvn, monoId, email,
    });
    res.json({ success: true, data });
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.response?.data || 'Upstream error' });
  }
});

// BVN verification — saves result, accepts optional customerId
router.post('/identity/verify-bvn', logUsage('/v1/identity/verify-bvn'), async (req, res) => {
  try {
    const { bvn, customerId } = req.body;
    if (!bvn) return res.status(400).json({ error: 'bvn is required' });

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
        image: e.image,
      };
    } catch (upstreamErr) {
      await BVNResult.create({
        client: req.apiKey.client,
        customer: customerId || undefined,
        bvn,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data?.error || 'BVN verification failed' });
    }

    const saved = await BVNResult.create({
      client: req.apiKey.client,
      customer: customerId || undefined,
      bvn,
      result: normalized,
      status: 'success',
    });

    res.json({ success: true, data: normalized, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NIN verification — saves result, accepts optional customerId
router.post('/identity/verify-nin', logUsage('/v1/identity/verify-nin'), async (req, res) => {
  try {
    const { nin, customerId } = req.body;
    if (!nin) return res.status(400).json({ error: 'nin is required' });

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
        photo: e.photo,
      };
    } catch (upstreamErr) {
      await NINResult.create({
        client: req.apiKey.client,
        customer: customerId || undefined,
        nin,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data?.error || 'NIN verification failed' });
    }

    const saved = await NINResult.create({
      client: req.apiKey.client,
      customer: customerId || undefined,
      nin,
      result: normalized,
      status: 'success',
    });

    res.json({ success: true, data: normalized, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
