const router = require('express').Router();
const UsageLog = require('../models/UsageLog');
const MFIClient = require('../models/MFIClient');
const { requireJWT } = require('../middleware/auth');

const PLAN_LIMITS = { free: 200, growth: 5000, scale: null };

router.use(requireJWT);

// Summary stats
router.get('/summary', async (req, res) => {
  const clientId = req.client.id;
  const startOfMonth = new Date();
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

  const [total, byEndpoint, recent, thisMonth, client] = await Promise.all([
    UsageLog.countDocuments({ client: clientId }),
    UsageLog.aggregate([
      { $match: { client: require('mongoose').Types.ObjectId.createFromHexString(clientId) } },
      { $group: { _id: '$endpoint', count: { $sum: 1 }, avgResponseMs: { $avg: '$responseTimeMs' } } },
      { $sort: { count: -1 } },
    ]),
    UsageLog.find({ client: clientId }).sort({ createdAt: -1 }).limit(20).lean(),
    UsageLog.countDocuments({ client: clientId, createdAt: { $gte: startOfMonth } }),
    MFIClient.findById(clientId).select('plan').lean(),
  ]);

  const plan = client?.plan || 'free';
  const limit = PLAN_LIMITS[plan];

  res.json({ total, byEndpoint, recent, thisMonth, plan, limit });
});

module.exports = router;
