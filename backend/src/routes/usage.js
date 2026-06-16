const router = require('express').Router();
const UsageLog = require('../models/UsageLog');
const { requireJWT } = require('../middleware/auth');

router.use(requireJWT);

// Summary stats
router.get('/summary', async (req, res) => {
  const clientId = req.client.id;
  const [total, byEndpoint, recent] = await Promise.all([
    UsageLog.countDocuments({ client: clientId }),
    UsageLog.aggregate([
      { $match: { client: require('mongoose').Types.ObjectId.createFromHexString(clientId) } },
      { $group: { _id: '$endpoint', count: { $sum: 1 }, avgResponseMs: { $avg: '$responseTimeMs' } } },
      { $sort: { count: -1 } },
    ]),
    UsageLog.find({ client: clientId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  res.json({ total, byEndpoint, recent });
});

module.exports = router;
