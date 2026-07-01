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
const Payment = require('../models/Payment');
const WalletTransaction = require('../models/WalletTransaction');
const Wallet = require('../models/Wallet');
const { creditWallet } = require('../utils/wallet');
const { sendTopupConfirmation, sendApprovalNotification, sendSLARequest } = require('../utils/mailer');
const Notification = require('../models/Notification');

const PLAN_PRICE = { free: 0, starter: 25000, growth: 50000, scale: 100000 };
const PLAN_CREDITS = { starter: 32500, growth: 70000, scale: 150000 };

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

// Approve a pending client — activate + fire approval email + in-app notification
router.post('/clients/:id/approve', async (req, res) => {
  try {
    const { adminName = 'Lucred Team', kybNotes } = req.body;
    const client = await MFIClient.findByIdAndUpdate(
      req.params.id,
      { status: 'active', approvedAt: new Date(), approvedBy: adminName, ...(kybNotes ? { kybNotes, kybCompletedAt: new Date() } : {}) },
      { new: true }
    ).lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    sendApprovalNotification(client.email, { organizationName: client.organizationName }).catch(() => {});
    Notification.create({ client: client._id, type: 'plan_upgraded', title: 'Account approved!', body: 'Your account has been reviewed and activated. You can now create API keys and start using the platform.' }).catch(() => {});
    res.json({ message: 'Client approved and notified', client });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send SLA agreement email to a client
router.post('/clients/:id/send-sla', async (req, res) => {
  try {
    const client = await MFIClient.findByIdAndUpdate(req.params.id, { slaSentAt: new Date() }, { new: true }).lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    sendSLARequest(client.email, { organizationName: client.organizationName }).catch(() => {});
    res.json({ message: 'SLA email sent', slaSentAt: client.slaSentAt });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update KYB notes for a client
router.patch('/clients/:id/kyb', async (req, res) => {
  try {
    const { kybNotes, kybCompleted } = req.body;
    const update = {};
    if (kybNotes !== undefined) update.kybNotes = kybNotes;
    if (kybCompleted) update.kybCompletedAt = new Date();
    const client = await MFIClient.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ client });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set / clear custom pricing rates for a client
router.patch('/clients/:id/rates', async (req, res) => {
  try {
    const { RATES } = require('../utils/wallet');
    const allowed = ['BVN_CHECK', 'NIN_CHECK', 'BUREAU_CHECK', 'STATEMENT_ANALYSIS'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] === null || req.body[key] === '') {
        update[`customRates.${key}`] = undefined; // clear — use global
      } else if (typeof req.body[key] === 'number' && req.body[key] >= 0) {
        update[`customRates.${key}`] = req.body[key];
      }
    }
    const client = await MFIClient.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('customRates organizationName').lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ customRates: client.customRates, globalRates: RATES });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
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
      AuditLog.find().sort({ createdAt: -1 }).limit(30).populate('client', 'organizationName').lean(),
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
      Webhook.countDocuments({ lastStatus: { $exists: true }, $nor: [{ lastStatus: { $gte: 200, $lte: 299 } }], lastFiredAt: { $exists: true } }),
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

// Record a manual payment, upgrade plan, and load wallet credits
router.post('/clients/:id/payments', async (req, res) => {
  try {
    const { plan, amount, method = 'manual', reference, note, months = 1 } = req.body;
    if (!['starter', 'growth', 'scale'].includes(plan)) return res.status(400).json({ error: 'Plan must be starter, growth, or scale' });
    if (!amount) return res.status(400).json({ error: 'amount is required' });

    const client = await MFIClient.findByIdAndUpdate(req.params.id, { plan }, { new: true });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const payment = await Payment.create({
      client: client._id, plan, amount, method, reference, note,
      months: Number(months),
      recordedBy: req.admin?.email || 'admin',
    });

    // Load wallet credits: base credits × months × loyalty bonus
    const baseCredits = PLAN_CREDITS[plan] || 0;
    const loyaltyTiers = [{ min: 12, bonus: 0.20 }, { min: 9, bonus: 0.15 }, { min: 6, bonus: 0.10 }, { min: 3, bonus: 0.05 }];
    const loyalty = loyaltyTiers.find(t => Number(months) >= t.min)?.bonus ?? 0;
    const totalCredits = Math.round(baseCredits * Number(months) * (1 + loyalty));

    if (totalCredits > 0) {
      await creditWallet(client._id, totalCredits, {
        type: 'subscription_credit',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan — ${months} month${months > 1 ? 's' : ''}${loyalty > 0 ? ` (+${loyalty * 100}% loyalty bonus)` : ''}`,
        ref: reference,
      });
    }

    res.status(201).json({ payment, client, creditsLoaded: totalCredits });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: manually credit a client's wallet (e.g. bank transfer top-up)
router.post('/clients/:id/wallet/credit', async (req, res) => {
  try {
    const { amount, description = 'Manual top-up', ref } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be a positive number' });
    const client = await MFIClient.findById(req.params.id).select('_id email organizationName').lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const wallet = await creditWallet(client._id, Number(amount), { type: 'topup', description, ref });
    // Email + in-app notification (fire and forget)
    sendTopupConfirmation(client.email, { organizationName: client.organizationName, amount: Number(amount), balance: wallet.balance, description }).catch(() => {});
    Notification.create({ client: client._id, type: 'general', title: 'Wallet credited', body: `₦${Number(amount).toLocaleString()} has been added to your wallet. New balance: ₦${wallet.balance.toLocaleString()}.` }).catch(() => {});
    res.json({ balance: wallet.balance, credited: Number(amount) });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: wallet transaction history for a client
router.get('/clients/:id/wallet/transactions', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const [wallet, transactions, total] = await Promise.all([
      Wallet.findOne({ client: req.params.id }).lean(),
      WalletTransaction.find({ client: req.params.id }).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip)).lean(),
      WalletTransaction.countDocuments({ client: req.params.id }),
    ]);
    res.json({ wallet, transactions, total });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List payments for a client
router.get('/clients/:id/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ client: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revenue chart — last 12 months: subscription payments + PAYG top-ups
// Export all wallet transactions as CSV
router.get('/wallet-transactions/export', async (req, res) => {
  try {
    const { from, to, clientId } = req.query;
    const filter = { type: { $in: ['topup', 'charge', 'refund'] } };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    if (clientId) filter.client = clientId;
    const txs = await WalletTransaction.find(filter).populate('client', 'organizationName email').sort({ createdAt: -1 }).limit(5000).lean();
    const rows = txs.map(t => [
      new Date(t.createdAt).toISOString(),
      `"${(t.client?.organizationName || '').replace(/"/g, '""')}"`,
      t.client?.email || '',
      t.type,
      t.amount,
      t.balanceAfter,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.service || '',
    ]);
    const csv = [
      ['Date','Organisation','Email','Type','Amount','Balance After','Description','Service'].join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="wallet-transactions-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Platform revenue totals
router.get('/revenue/totals', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to)   dateFilter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    const [subAgg, topupAgg, chargeAgg] = await Promise.all([
      Payment.aggregate([{ $match: dateFilter }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      WalletTransaction.aggregate([{ $match: { ...dateFilter, type: 'topup' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      WalletTransaction.aggregate([{ $match: { ...dateFilter, type: 'charge', freeQuota: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    res.json({
      subscriptions: { total: subAgg[0]?.total || 0, count: subAgg[0]?.count || 0 },
      walletTopups:  { total: topupAgg[0]?.total || 0, count: topupAgg[0]?.count || 0 },
      walletCharges: { total: chargeAgg[0]?.total || 0, count: chargeAgg[0]?.count || 0 },
      grandTotal:    (subAgg[0]?.total || 0) + (topupAgg[0]?.total || 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/mrr', async (req, res) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1); since.setHours(0, 0, 0, 0);

    // Subscription revenue from Payment records
    const subRows = await Payment.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        subscriptionRevenue: { $sum: '$amount' },
        subscriptionCount: { $sum: 1 },
      }},
    ]);

    // PAYG top-up revenue from WalletTransactions
    const topupRows = await WalletTransaction.aggregate([
      { $match: { type: 'topup', createdAt: { $gte: since } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        topupRevenue: { $sum: '$amount' },
        topupCount: { $sum: 1 },
      }},
    ]);

    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const sub = subRows.find(r => r._id.year === year && r._id.month === month);
      const topup = topupRows.find(r => r._id.year === year && r._id.month === month);
      const subscriptionRevenue = sub?.subscriptionRevenue || 0;
      const topupRevenue = topup?.topupRevenue || 0;
      result.push({
        label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
        revenue: subscriptionRevenue + topupRevenue,
        subscriptionRevenue,
        topupRevenue,
        count: (sub?.subscriptionCount || 0) + (topup?.topupCount || 0),
      });
    }
    res.json({ mrr: result });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// One-time trigger: send monthly summary emails for a given month
// POST /api/admin/send-monthly-summaries?month=2026-06
router.post('/send-monthly-summaries', async (req, res) => {
  try {
    const MFIClient = require('../models/MFIClient');
    const WalletTransaction = require('../models/WalletTransaction');
    const { sendMonthlySummary } = require('../utils/mailer');

    const SERVICE_LABEL = {
      BVN_CHECK: 'BVN verification',
      NIN_CHECK: 'NIN verification',
      BUREAU_CHECK: 'Credit bureau check',
      STATEMENT_ANALYSIS: 'Statement analysis',
    };

    // Default to last month, or accept ?month=YYYY-MM
    let monthStart;
    if (req.query.month) {
      monthStart = new Date(`${req.query.month}-01T00:00:00.000Z`);
    } else {
      monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - 1);
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    }
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const rows = await WalletTransaction.aggregate([
      { $match: { type: 'charge', freeQuota: false, createdAt: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: { client: '$client', service: '$service' }, count: { $sum: 1 }, spent: { $sum: '$amount' } } },
    ]);
    const freeRows = await WalletTransaction.aggregate([
      { $match: { type: 'charge', freeQuota: true, createdAt: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: { client: '$client', service: '$service' }, count: { $sum: 1 } } },
    ]);

    const byClient = {};
    for (const row of rows) {
      const cid = String(row._id.client);
      if (!byClient[cid]) byClient[cid] = {};
      byClient[cid][row._id.service] = { count: row.count, spent: row.spent };
    }
    for (const row of freeRows) {
      const cid = String(row._id.client);
      if (!byClient[cid]) byClient[cid] = {};
      if (!byClient[cid][row._id.service]) byClient[cid][row._id.service] = { count: 0, spent: 0 };
      byClient[cid][row._id.service].count += row.count;
    }

    const clientIds = Object.keys(byClient);
    if (!clientIds.length) return res.json({ sent: 0, month: monthLabel, message: 'No activity found for this month.' });

    const clients = await MFIClient.find({ _id: { $in: clientIds } }).select('email organizationName plan').lean();
    const results = [];

    for (const client of clients) {
      const cid = String(client._id);
      const services = byClient[cid] || {};
      const totalSpent = Object.values(services).reduce((s, v) => s + (v.spent || 0), 0);
      const PLAN_DISCOUNT = { starter: 0.30, growth: 0.40, scale: 0.50 };
      const discount = PLAN_DISCOUNT[client.plan] || 0;
      const savedVsPayg = Math.round(totalSpent * discount / (1 - discount));
      const analyses = {};
      for (const [service, label] of Object.entries(SERVICE_LABEL)) {
        analyses[service] = { label, count: services[service]?.count || 0, spent: services[service]?.spent || 0 };
      }
      try {
        await sendMonthlySummary(client.email, { organizationName: client.organizationName, month: monthLabel, analyses, totalSpent, savedVsPayg, plan: client.plan });
        results.push({ email: client.email, status: 'sent' });
      } catch (e) {
        results.push({ email: client.email, status: 'failed', error: e.message });
      }
    }

    res.json({ sent: results.filter(r => r.status === 'sent').length, failed: results.filter(r => r.status === 'failed').length, month: monthLabel, results });
  } catch (err) {
    console.error('[admin] send-monthly-summaries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
