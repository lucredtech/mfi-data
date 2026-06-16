const router = require('express').Router();
const jwt = require('jsonwebtoken');
const MFIClient = require('../models/MFIClient');
const ApiKey = require('../models/ApiKey');

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
