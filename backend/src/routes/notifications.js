const router = require('express').Router();
const { requireJWT } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.use(requireJWT);

// GET /api/notifications — last 30, unread count
router.get('/', async (req, res) => {
  try {
    const [notifications, unread] = await Promise.all([
      Notification.find({ client: req.client.id }).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ client: req.client.id, read: false }),
    ]);
    res.json({ notifications, unread });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ client: req.client.id, read: false }, { read: true });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, client: req.client.id }, { read: true });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
