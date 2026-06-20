const router = require('express').Router();
const jwt = require('jsonwebtoken');
const MFIClient = require('../models/MFIClient');
const ApiKey = require('../models/ApiKey');
const Customer = require('../models/Customer');
const BVNResult = require('../models/BVNResult');
const NINResult = require('../models/NINResult');
const BureauResult = require('../models/BureauResult');
const StatementResult = require('../models/StatementResult');
const UsageLog = require('../models/UsageLog');
const { requireJWT } = require('../middleware/auth');

// Register a new MFI client
router.post('/register', async (req, res) => {
  try {
    const { organizationName, email, password, contactPerson, phone } = req.body;
    if (!organizationName || !email || !password || !contactPerson)
      return res.status(400).json({ error: 'organizationName, email, password, contactPerson are required' });

    const existing = await MFIClient.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const client = await MFIClient.create({ organizationName, email, password, contactPerson, phone });

    // Auto-generate a first API key
    const apiKey = await ApiKey.create({ client: client._id, label: 'Default Key' });

    const token = jwt.sign({ id: client._id, email: client.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      client: { id: client._id, organizationName: client.organizationName, email: client.email },
      apiKey: apiKey.key,
    });
  } catch (err) {
    console.error('[auth] register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const client = await MFIClient.findOne({ email });
    if (!client || !(await client.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    if (client.status === 'suspended')
      return res.status(403).json({ error: 'Account suspended' });

    const token = jwt.sign({ id: client._id, email: client.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      client: { id: client._id, organizationName: client.organizationName, email: client.email },
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Delete account — permanently erases all data for this MFI (NDPR right to erasure)
// Requires password confirmation
router.delete('/account', requireJWT, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password is required to confirm account deletion' });

    const client = await MFIClient.findById(req.client.id);
    if (!client) return res.status(404).json({ error: 'Account not found' });

    const passwordOk = await client.comparePassword(password);
    if (!passwordOk) return res.status(401).json({ error: 'Incorrect password' });

    const clientId = client._id;

    // Delete all customer data, analysis records, API keys and usage logs
    await Promise.all([
      Customer.deleteMany({ client: clientId }),
      BVNResult.deleteMany({ client: clientId }),
      NINResult.deleteMany({ client: clientId }),
      BureauResult.deleteMany({ client: clientId }),
      StatementResult.deleteMany({ client: clientId }),
      ApiKey.deleteMany({ client: clientId }),
      UsageLog.deleteMany({ client: clientId }),
    ]);

    await MFIClient.findByIdAndDelete(clientId);

    res.json({ success: true, message: 'Account and all associated data have been permanently deleted.' });
  } catch (err) {
    console.error('[auth] account deletion error:', err);
    res.status(500).json({ error: 'Account deletion failed. Please try again.' });
  }
});

module.exports = router;
