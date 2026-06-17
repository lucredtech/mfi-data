const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const MFIClient = require('../models/MFIClient');
const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// Platform-wide usage stats
router.get('/stats', async (req, res) => {
  try {
    const [totalClients, activeClients, totalRequests, byEndpoint, recentLogs] = await Promise.all([
      MFIClient.countDocuments(),
      MFIClient.countDocuments({ status: 'active' }),
      UsageLog.countDocuments(),
      UsageLog.aggregate([
        { $group: { _id: '$endpoint', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      UsageLog.find().sort({ createdAt: -1 }).limit(30).populate('client', 'organizationName').lean(),
    ]);
    res.json({ totalClients, activeClients, totalRequests, byEndpoint, recentLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
