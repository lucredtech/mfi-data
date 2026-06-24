const jwt = require('jsonwebtoken');
const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');

const PLAN_LIMITS = { free: 200, growth: 5000, scale: Infinity };

// JWT auth for dashboard
const requireJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.client = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// API key auth for B2B credit endpoints
const requireApiKey = async (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-Api-Key header' });

  const apiKey = await ApiKey.findOne({ key, isActive: true }).populate('client');
  if (!apiKey) return res.status(401).json({ error: 'Invalid or inactive API key' });
  if (apiKey.client.status !== 'active')
    return res.status(403).json({ error: 'Account suspended' });

  // Per-plan monthly rate limit
  const plan = apiKey.client.plan || 'free';
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (limit !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const usedThisMonth = await UsageLog.countDocuments({
      client: apiKey.client._id,
      createdAt: { $gte: startOfMonth },
    });
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - usedThisMonth));
    res.setHeader('X-RateLimit-Reset', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());

    if (usedThisMonth >= limit) {
      return res.status(429).json({
        error: 'Monthly API limit reached',
        plan,
        limit,
        used: usedThisMonth,
        upgradeUrl: 'https://mfi-data.vercel.app/pricing',
      });
    }

    // Fire 90% warning once per month — tracked in quotaWarningsSent
    const threshold = Math.floor(limit * 0.9);
    const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    if (usedThisMonth >= threshold && !apiKey.client.quotaWarningsSent?.includes(monthKey)) {
      const MFIClient = require('../models/MFIClient');
      MFIClient.findByIdAndUpdate(apiKey.client._id, { $addToSet: { quotaWarningsSent: monthKey } }).catch(() => {});
      const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const payload = { organizationName: apiKey.client.organizationName, used: usedThisMonth, limit, plan, resetDate };
      const { sendPlanLimitWarning } = require('../utils/mailer');
      const { smsPlanLimitWarning } = require('../utils/sms');
      if (apiKey.client.email) sendPlanLimitWarning(apiKey.client.email, payload).catch(() => {});
      if (apiKey.client.phone) smsPlanLimitWarning(apiKey.client.phone, payload).catch(() => {});
    }
  }

  // Sandbox mode — return mock response, skip usage logging
  if (apiKey.mode === 'test') {
    req.apiKey = apiKey;
    req.client = apiKey.client;
    req._sandbox = true;
    res.setHeader('X-Lucred-Mode', 'test');
    return next();
  }

  apiKey.lastUsedAt = new Date();
  await apiKey.save();

  req.apiKey = apiKey;
  req.client = apiKey.client;
  req._startTime = Date.now();
  next();
};

// Log usage after response
const logUsage = (endpoint) => async (req, res, next) => {
  res.on('finish', async () => {
    if (!req.client || !req.apiKey) return;
    await UsageLog.create({
      client: req.client._id,
      apiKey: req.apiKey._id,
      endpoint,
      method: req.method,
      statusCode: res.statusCode,
      responseTimeMs: Date.now() - req._startTime,
    }).catch(() => {});
  });
  next();
};

module.exports = { requireJWT, requireApiKey, logUsage };
