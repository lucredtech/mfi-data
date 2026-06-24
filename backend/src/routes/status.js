const router = require('express').Router();
const UsageLog = require('../models/UsageLog');

// Public — no auth required
// Returns uptime %, p50/p95 latency, daily call volume for last 30 days
router.get('/', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalCalls, successCalls, latencyStats, dailyVolume] = await Promise.all([
      UsageLog.countDocuments({ createdAt: { $gte: since } }),
      UsageLog.countDocuments({ createdAt: { $gte: since }, statusCode: { $gte: 200, $lt: 500 } }),

      // p50 / p95 over last 30 days
      UsageLog.aggregate([
        { $match: { createdAt: { $gte: since }, responseTimeMs: { $exists: true } } },
        { $sort: { responseTimeMs: 1 } },
        { $group: {
          _id: null,
          values: { $push: '$responseTimeMs' },
          count: { $sum: 1 },
        }},
        { $project: {
          p50: { $arrayElemAt: ['$values', { $floor: { $multiply: [0.50, { $subtract: ['$count', 1] }] } }] },
          p95: { $arrayElemAt: ['$values', { $floor: { $multiply: [0.95, { $subtract: ['$count', 1] }] } }] },
        }},
      ]),

      // Daily call volume with success/fail split
      UsageLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          success: { $sum: { $cond: [{ $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 500] }] }, 1, 0] } },
          p50: { $avg: '$responseTimeMs' },
        }},
        { $sort: { _id: 1 } },
      ]),
    ]);

    const uptime = totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(2) : '100.00';
    const lat = latencyStats[0] || {};

    // Fill missing days with zero
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const found = dailyVolume.find(r => r._id === key);
      days.push({
        date: key,
        label: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        total: found?.total || 0,
        success: found?.success || 0,
        p50: found?.p50 ? Math.round(found.p50) : null,
      });
    }

    // System components — extend when real checks exist
    const components = [
      { name: 'API', status: 'operational' },
      { name: 'BVN / NIN Verification', status: 'operational' },
      { name: 'Statement Analysis', status: 'operational' },
      { name: 'Credit Bureau', status: 'operational' },
      { name: 'Webhooks', status: 'operational' },
    ];

    res.json({
      uptime: parseFloat(uptime),
      totalCalls,
      p50: lat.p50 ?? null,
      p95: lat.p95 ?? null,
      days,
      components,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[status]', err);
    res.status(500).json({ error: 'Failed to compute status' });
  }
});

module.exports = router;
