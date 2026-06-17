const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireApiKey, logUsage } = require('../middleware/auth');
const lucredApi = require('../config/lucredApi');
const BVNResult = require('../models/BVNResult');
const BureauResult = require('../models/BureauResult');

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

// Credit bureau check — saves result, accepts optional customerId
router.post('/credit-bureau/check', logUsage('/v1/credit-bureau/check'), async (req, res) => {
  try {
    const { bvn, firstName, lastName, dateOfBirth, customerId } = req.body;
    if (!bvn) return res.status(400).json({ error: 'bvn is required' });

    let upstreamData;
    try {
      const { data } = await lucredApi.post('/api/v1/verifications/credit-bureau', {
        bvn, firstName, lastName, dateOfBirth,
      });
      upstreamData = data;
    } catch (upstreamErr) {
      await BureauResult.create({
        client: req.apiKey.client,
        customer: customerId || undefined,
        bvn,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data || 'Upstream error' });
    }

    const saved = await BureauResult.create({
      client: req.apiKey.client,
      customer: customerId || undefined,
      bvn,
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

    let upstreamData;
    try {
      const { data } = await lucredApi.post('/api/v1/verifications/verifybvn', { bvn });
      upstreamData = data;
    } catch (upstreamErr) {
      await BVNResult.create({
        client: req.apiKey.client,
        customer: customerId || undefined,
        bvn,
        result: upstreamErr.response?.data || {},
        status: 'failed',
      }).catch(() => {});
      const status = upstreamErr.response?.status || 502;
      return res.status(status).json({ error: upstreamErr.response?.data || 'Upstream error' });
    }

    const saved = await BVNResult.create({
      client: req.apiKey.client,
      customer: customerId || undefined,
      bvn,
      result: upstreamData,
      status: 'success',
    });

    res.json({ success: true, data: upstreamData, resultId: saved._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
