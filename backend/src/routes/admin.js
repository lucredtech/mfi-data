const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const MFIClient = require('../models/MFIClient');
const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');
const Customer = require('../models/Customer');
const StatementResult = require('../models/StatementResult');
const BVNResult = require('../models/BVNResult');
const NINResult = require('../models/NINResult');
const BureauResult = require('../models/BureauResult');
const AuditLog = require('../models/AuditLog');
const FeatureRequest = require('../models/FeatureRequest');
const Webhook = require('../models/Webhook');

const PLAN_PRICE = { free: 0, growth: 50000, scale: 200000 };

// Admin JWT middleware
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, admin: { id: admin._id, name: admin.name, email: admin.email } });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Seed first admin (call once, then disable or protect)
router.post('/seed', async (req, res) => {
  try {
    const existing = await Admin.countDocuments();
    if (existing > 0) return res.status(403).json({ error: 'Admin already exists' });
    const { name, email, password } = req.body;
    const admin = await Admin.create({ name, email, password });
    res.status(201).json({ message: 'Admin created', email: admin.email });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.use(requireAdmin);

// Get all MFI clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await MFIClient.find().sort({ createdAt: -1 }).lean();
    const withStats = await Promise.all(
      clients.map(async (c) => {
        const [keyCount, requestCount] = await Promise.all([
          ApiKey.countDocuments({ client: c._id, isActive: true }),
          UsageLog.countDocuments({ client: c._id }),
        ]);
        return { ...c, keyCount, requestCount };
      })
    );
    res.json(withStats);
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single client details
router.get('/clients/:id', async (req, res) => {
  try {
    const client = await MFIClient.findById(req.params.id).populate('referredBy', 'organizationName email').lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const [keys, recentLogs, totalRequests, referrals] = await Promise.all([
      ApiKey.find({ client: client._id }).sort({ createdAt: -1 }),
      UsageLog.find({ client: client._id }).sort({ createdAt: -1 }).limit(20),
      UsageLog.countDocuments({ client: client._id }),
      MFIClient.find({ referredBy: client._id }).select('organizationName email createdAt plan').lean(),
    ]);
    res.json({ ...client, keys, recentLogs, totalRequests, referrals });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update client plan
router.patch('/clients/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'growth', 'scale'].includes(plan))
      return res.status(400).json({ error: 'Plan must be free, growth, or scale' });
    const client = await MFIClient.findByIdAndUpdate(req.params.id, { plan }, { new: true });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: `Plan updated to ${plan}`, client });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client status (active / suspended)
router.patch('/clients/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status))
      return res.status(400).json({ error: 'Status must be active or suspended' });
    const client = await MFIClient.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: `Client ${status}`, client });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Platform-wide usage stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalClients, activeClients, totalRequests, byEndpoint, recentLogs,
      totalCustomers, totalStatements, failedStatements,
      totalBVN, failedBVN, totalNIN, failedNIN, totalBureau, failedBureau,
    ] = await Promise.all([
      MFIClient.countDocuments(),
      MFIClient.countDocuments({ status: 'active' }),
      UsageLog.countDocuments(),
      UsageLog.aggregate([
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      UsageLog.find().sort({ createdAt: -1 }).limit(30).populate('client', 'organizationName').lean(),
      Customer.countDocuments(),
      StatementResult.countDocuments(),
      StatementResult.countDocuments({ status: 'failed' }),
      BVNResult.countDocuments(),
      BVNResult.countDocuments({ status: 'failed' }),
      NINResult.countDocuments(),
      NINResult.countDocuments({ status: 'failed' }),
      BureauResult.countDocuments(),
      BureauResult.countDocuments({ status: 'failed' }),
    ]);

    res.json({
      totalClients, activeClients, totalRequests, byEndpoint, recentLogs,
      totalCustomers,
      statements: { total: totalStatements, failed: failedStatements },
      bvn: { total: totalBVN, failed: failedBVN },
      nin: { total: totalNIN, failed: failedNIN },
      bureau: { total: totalBureau, failed: failedBureau },
    });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Analytics — daily call volumes, service breakdown, top clients (last 30 days)
router.get('/analytics', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [dailyVolume, serviceBreakdown, topClients, successRate, auditActions,
      thisMonthCalls, lastMonthCalls, planBreakdown, webhookFailures] = await Promise.all([
      // Daily call volumes for last 30 days
      UsageLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
        }},
        { $sort: { _id: 1 } },
      ]),
      // Breakdown by service (endpoint grouping)
      UsageLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      // Top 5 clients by usage (last 30 days)
      UsageLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$client', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'mficlients', localField: '_id', foreignField: '_id', as: 'client' } },
        { $unwind: '$client' },
        { $project: { organizationName: '$client.organizationName', email: '$client.email', count: 1 } },
      ]),
      // Overall success rate last 30 days
      UsageLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
        }},
      ]),
      // Audit action counts (platform-wide)
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // This calendar month API calls
      UsageLog.countDocuments({ createdAt: { $gte: startOfMonth } }),
      // Last calendar month API calls
      UsageLog.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }),
      // Plan breakdown
      MFIClient.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),
      // Webhook failure count (last fired with non-2xx status)
      Webhook.countDocuments({ lastStatus: { $exists: true, $not: { $gte: 200, $lte: 299 } }, lastFiredAt: { $exists: true } }),
    ]);

    const sr = successRate[0] || { total: 0, success: 0 };

    // Calculate MRR from plan breakdown
    const planCounts = {};
    planBreakdown.forEach(p => { planCounts[p._id || 'free'] = p.count; });
    const mrr = Object.entries(PLAN_PRICE).reduce((sum, [plan, price]) => sum + (planCounts[plan] || 0) * price, 0);

    res.json({
      dailyVolume,
      serviceBreakdown,
      topClients,
      successRate: sr.total > 0 ? Math.round((sr.success / sr.total) * 100) : 100,
      totalLast30Days: sr.total,
      auditActions,
      thisMonthCalls,
      lastMonthCalls,
      planBreakdown: planCounts,
      mrr,
      webhookFailures,
    });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin audit log (all clients)
router.get('/audit', async (req, res) => {
  try {
    const { clientId, action, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (clientId) filter.client = clientId;
    if (action) filter.action = action;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip))
        .populate('client', 'organizationName email').lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ total, logs });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Per-client analysis breakdown (for client detail view)
router.get('/clients/:id/analyses', async (req, res) => {
  try {
    const clientId = req.params.id;
    const [customers, statements, failedStatements, bvn, failedBVN, nin, failedNIN, bureau, failedBureau] = await Promise.all([
      Customer.countDocuments({ client: clientId }),
      StatementResult.countDocuments({ client: clientId }),
      StatementResult.countDocuments({ client: clientId, status: 'failed' }),
      BVNResult.countDocuments({ client: clientId }),
      BVNResult.countDocuments({ client: clientId, status: 'failed' }),
      NINResult.countDocuments({ client: clientId }),
      NINResult.countDocuments({ client: clientId, status: 'failed' }),
      BureauResult.countDocuments({ client: clientId }),
      BureauResult.countDocuments({ client: clientId, status: 'failed' }),
    ]);
    res.json({
      customers,
      statements: { total: statements, failed: failedStatements },
      bvn: { total: bvn, failed: failedBVN },
      nin: { total: nin, failed: failedNIN },
      bureau: { total: bureau, failed: failedBureau },
    });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Feature requests — admin view
router.get('/feature-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await FeatureRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('client', 'organizationName email')
      .lean();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/feature-requests/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ['pending', 'reviewed', 'planned', 'shipped'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const request = await FeatureRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json({ request });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
