const router = require('express').Router();
const { requireJWT } = require('../middleware/auth');
const Customer = require('../models/Customer');
const StatementResult = require('../models/StatementResult');
const BVNResult = require('../models/BVNResult');
const BureauResult = require('../models/BureauResult');

router.use(requireJWT);

// List customers for the logged-in MFI client
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { bvn: new RegExp(q, 'i') },
      ];
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, email, bvn, nin, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const customer = await Customer.create({ client: req.client.id, name, email, bvn, nin, phone });
    res.status(201).json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single customer with all their analyses
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, client: req.client.id }).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const [statements, bvnResults, bureauResults] = await Promise.all([
      StatementResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BVNResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
      BureauResult.find({ customer: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    res.json({ customer, statements, bvnResults, bureauResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer
router.patch('/:id', async (req, res) => {
  try {
    const { name, email, bvn, nin, phone } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, client: req.client.id },
      { name, email, bvn, nin, phone },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, client: req.client.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Analysis history endpoints (flat, across all customers) ──────────────────

// List all BVN results for this MFI
router.get('/analyses/bvn', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(q, 'i');
    const results = await BVNResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BVNResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all bureau results for this MFI
router.get('/analyses/bureau', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) filter.bvn = new RegExp(q, 'i');
    const results = await BureauResult.find(filter)
      .populate('customer', 'name email')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const total = await BureauResult.countDocuments({ client: req.client.id });
    res.json({ total, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard-wide stats (all analysis types)
router.get('/analyses/stats', async (req, res) => {
  try {
    const clientId = req.client.id;
    const [statements, bvn, bureau, customers] = await Promise.all([
      StatementResult.countDocuments({ client: clientId }),
      BVNResult.countDocuments({ client: clientId }),
      BureauResult.countDocuments({ client: clientId }),
      Customer.countDocuments({ client: clientId }),
    ]);
    const [stFailed, bvnFailed, buFailed] = await Promise.all([
      StatementResult.countDocuments({ client: clientId, status: 'failed' }),
      BVNResult.countDocuments({ client: clientId, status: 'failed' }),
      BureauResult.countDocuments({ client: clientId, status: 'failed' }),
    ]);
    res.json({
      customers,
      statements: { total: statements, failed: stFailed },
      bvn: { total: bvn, failed: bvnFailed },
      bureau: { total: bureau, failed: buFailed },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
