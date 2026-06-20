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
    const client = await MFIClient.findById(req.params.id).lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const [keys, recentLogs, totalRequests] = await Promise.all([
      ApiKey.find({ client: client._id }).sort({ createdAt: -1 }),
      UsageLog.find({ client: client._id }).sort({ createdAt: -1 }).limit(20),
      UsageLog.countDocuments({ client: client._id }),
    ]);
    res.json({ ...client, keys, recentLogs, totalRequests });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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

module.exports = router;
