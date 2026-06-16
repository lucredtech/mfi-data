const router = require('express').Router();
const ApiKey = require('../models/ApiKey');
const { requireJWT } = require('../middleware/auth');

router.use(requireJWT);

// List all keys for the authenticated client
router.get('/', async (req, res) => {
  const keys = await ApiKey.find({ client: req.client.id }).sort({ createdAt: -1 });
  res.json(keys);
});

// Generate a new key
router.post('/', async (req, res) => {
  const { label } = req.body;
  const key = await ApiKey.create({ client: req.client.id, label: label || 'New Key' });
  res.status(201).json(key);
});

// Revoke a key
router.delete('/:id', async (req, res) => {
  const key = await ApiKey.findOneAndUpdate(
    { _id: req.params.id, client: req.client.id },
    { isActive: false },
    { new: true }
  );
  if (!key) return res.status(404).json({ error: 'Key not found' });
  res.json({ message: 'Key revoked', key });
});

module.exports = router;
