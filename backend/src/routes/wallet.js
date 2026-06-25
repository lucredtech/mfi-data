const router = require('express').Router();
const { requireJWT } = require('../middleware/auth');
const { getOrCreateWallet, creditWallet, RATES } = require('../utils/wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Wallet = require('../models/Wallet');

router.use(requireJWT);

// GET /api/wallet — balance + free quota
router.get('/', async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.client.id);
    // Reset quota if stale
    const now = new Date();
    if (wallet.freeQuota.resetAt <= now) {
      wallet.freeQuota.bvn = 3;
      wallet.freeQuota.nin = 3;
      wallet.freeQuota.statement = 3;
      wallet.freeQuota.resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await wallet.save();
    }
    res.json({ wallet, rates: RATES });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wallet/transactions — full transaction log
router.get('/transactions', async (req, res) => {
  try {
    const { limit = 50, skip = 0, type, dateFrom, dateTo } = req.query;
    const filter = { client: req.client.id };
    if (type) filter.type = type;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
    }
    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip)).lean(),
      WalletTransaction.countDocuments(filter),
    ]);
    res.json({ transactions, total });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
