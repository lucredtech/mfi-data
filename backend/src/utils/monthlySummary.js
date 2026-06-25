const cron = require('node-cron');
const MFIClient = require('../models/MFIClient');
const WalletTransaction = require('../models/WalletTransaction');
const { sendMonthlySummary } = require('./mailer');
const { RATES } = require('./wallet');

const SERVICE_LABEL = {
  BVN_CHECK:          'BVN verification',
  NIN_CHECK:          'NIN verification',
  BUREAU_CHECK:       'Credit bureau check',
  STATEMENT_ANALYSIS: 'Statement analysis',
};

// Runs at 08:00 on the 1st of every month
function startMonthlySummaryCron() {
  cron.schedule('0 8 1 * *', async () => {
    console.log('[cron] Sending monthly usage summaries…');
    try {
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1); lastMonthStart.setHours(0, 0, 0, 0);

      const lastMonthEnd = new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1, 1);

      const monthLabel = lastMonthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      // Aggregate charges per client per service for last month
      const rows = await WalletTransaction.aggregate([
        { $match: { type: 'charge', freeQuota: false, createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
        { $group: {
          _id: { client: '$client', service: '$service' },
          count: { $sum: 1 },
          spent: { $sum: '$amount' },
        }},
      ]);

      // Group by client
      const byClient = {};
      for (const row of rows) {
        const cid = String(row._id.client);
        if (!byClient[cid]) byClient[cid] = {};
        byClient[cid][row._id.service] = { count: row.count, spent: row.spent };
      }

      // Also include clients with free quota usage
      const freeRows = await WalletTransaction.aggregate([
        { $match: { type: 'charge', freeQuota: true, createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
        { $group: {
          _id: { client: '$client', service: '$service' },
          count: { $sum: 1 },
        }},
      ]);
      for (const row of freeRows) {
        const cid = String(row._id.client);
        if (!byClient[cid]) byClient[cid] = {};
        if (!byClient[cid][row._id.service]) byClient[cid][row._id.service] = { count: 0, spent: 0 };
        byClient[cid][row._id.service].count += row.count;
      }

      const clientIds = Object.keys(byClient);
      if (!clientIds.length) return;

      const clients = await MFIClient.find({ _id: { $in: clientIds } }).select('email organizationName plan').lean();

      for (const client of clients) {
        const cid = String(client._id);
        const services = byClient[cid] || {};

        const totalSpent = Object.values(services).reduce((s, v) => s + (v.spent || 0), 0);

        // Savings vs PAYG only applies to subscribers (their effective rate is lower)
        const PLAN_DISCOUNT = { starter: 0.30, growth: 0.40, scale: 0.50 };
        const discount = PLAN_DISCOUNT[client.plan] || 0;
        const savedVsPayg = Math.round(totalSpent * discount / (1 - discount));

        const analyses = {};
        for (const [service, label] of Object.entries(SERVICE_LABEL)) {
          analyses[service] = { label, count: services[service]?.count || 0, spent: services[service]?.spent || 0 };
        }

        try {
          await sendMonthlySummary(client.email, {
            organizationName: client.organizationName,
            month: monthLabel,
            analyses,
            totalSpent,
            savedVsPayg,
            plan: client.plan,
          });
        } catch (e) {
          console.error(`[cron] Failed to send summary to ${client.email}:`, e.message);
        }
      }

      console.log(`[cron] Sent ${clients.length} monthly summaries for ${monthLabel}`);
    } catch (err) {
      console.error('[cron] Monthly summary error:', err);
    }
  }, { timezone: 'Africa/Lagos' });
}

module.exports = { startMonthlySummaryCron };
