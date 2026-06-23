const router = require('express').Router();
const axios = require('axios');
const crypto = require('crypto');
const Webhook = require('../models/Webhook');
const { requireJWT } = require('../middleware/auth');

router.use(requireJWT);

const ALL_EVENTS = ['bvn.verified', 'nin.verified', 'bureau.pulled', 'statement.analysed', 'loan_review.created', 'customer.created'];

// List webhooks
router.get('/', async (req, res) => {
  const hooks = await Webhook.find({ client: req.client.id }).sort({ createdAt: -1 }).lean();
  res.json({ webhooks: hooks });
});

// Create webhook
router.post('/', async (req, res) => {
  const { url, events } = req.body;
  if (!url || !events?.length) return res.status(400).json({ error: 'url and events are required' });
  const invalid = events.filter(e => !ALL_EVENTS.includes(e));
  if (invalid.length) return res.status(400).json({ error: `Invalid events: ${invalid.join(', ')}` });
  try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  const hook = await Webhook.create({ client: req.client.id, url, events });
  res.status(201).json({ webhook: hook });
});

// Update webhook (toggle active, change events/url)
router.patch('/:id', async (req, res) => {
  const { url, events, isActive } = req.body;
  const update = {};
  if (url !== undefined) update.url = url;
  if (events !== undefined) update.events = events;
  if (isActive !== undefined) update.isActive = isActive;
  const hook = await Webhook.findOneAndUpdate({ _id: req.params.id, client: req.client.id }, update, { new: true });
  if (!hook) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ webhook: hook });
});

// Delete webhook
router.delete('/:id', async (req, res) => {
  const hook = await Webhook.findOneAndDelete({ _id: req.params.id, client: req.client.id });
  if (!hook) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ message: 'Deleted' });
});

// Test webhook — fires a ping event
router.post('/:id/test', async (req, res) => {
  const hook = await Webhook.findOne({ _id: req.params.id, client: req.client.id });
  if (!hook) return res.status(404).json({ error: 'Webhook not found' });
  const payload = { event: 'ping', timestamp: new Date().toISOString(), data: { message: 'Test from Lucred' } };
  const result = await fireWebhook(hook, payload);
  res.json(result);
});

module.exports = router;
module.exports.ALL_EVENTS = ALL_EVENTS;

// Fire a single webhook — exported for use in other routes
async function fireWebhook(hook, payload) {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
  try {
    const resp = await axios.post(hook.url, payload, {
      headers: { 'Content-Type': 'application/json', 'X-Lucred-Signature': `sha256=${sig}`, 'X-Lucred-Event': payload.event },
      timeout: 5000,
    });
    await Webhook.findByIdAndUpdate(hook._id, { lastFiredAt: new Date(), lastStatus: resp.status });
    return { ok: true, status: resp.status };
  } catch (err) {
    const status = err.response?.status ?? 0;
    await Webhook.findByIdAndUpdate(hook._id, { lastFiredAt: new Date(), lastStatus: status });
    return { ok: false, status, error: err.message };
  }
}

// Dispatch event to all active webhooks for a client
module.exports.dispatchWebhook = async (clientId, event, data) => {
  try {
    const hooks = await Webhook.find({ client: clientId, isActive: true, events: event });
    const payload = { event, timestamp: new Date().toISOString(), data };
    await Promise.allSettled(hooks.map(h => fireWebhook(h, payload)));
  } catch { /* non-critical */ }
};
