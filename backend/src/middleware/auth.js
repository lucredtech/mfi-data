const jwt = require('jsonwebtoken');
const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');

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
