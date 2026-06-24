const router = require('express').Router();
const ApiKey = require('../models/ApiKey');
const { requireJWT } = require('../middleware/auth');

router.use(requireJWT);

const viewerBlocked = (req, res, next) => {
  if (req.client._type === 'member' && req.client.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required to manage API keys' });
  next();
};

// List all keys for the authenticated client
router.get('/', async (req, res) => {
  const keys = await ApiKey.find({ client: req.client.id }).sort({ createdAt: -1 });
  res.json(keys);
});

// Generate a new key
router.post('/', viewerBlocked, async (req, res) => {
  const { label, mode } = req.body;
  const key = await ApiKey.create({
    client: req.client.id,
    label: label || 'New Key',
    mode: mode === 'test' ? 'test' : 'live',
  });
  res.status(201).json(key);
});

// Revoke a key
router.delete('/:id', viewerBlocked, async (req, res) => {
  const key = await ApiKey.findOneAndUpdate(
    { _id: req.params.id, client: req.client.id },
    { isActive: false },
    { new: true }
  );
  if (!key) return res.status(404).json({ error: 'Key not found' });
  res.json({ message: 'Key revoked', key });
});

module.exports = router;
