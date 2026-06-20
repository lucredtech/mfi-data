const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const { requireApiKey, requireJWT, logUsage } = require('../middleware/auth');
const lucredApi = require('../config/lucredApi');
const StatementResult = require('../models/StatementResult');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPEG, and PNG files are accepted'));
  },
});

const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, keyGenerator: (req) => req.apiKey?.key });

// Upload bank statement and run transaction analysis
router.post(
  '/v1/statement/upload-analyze',
  requireApiKey,
  limiter,
  logUsage('/v1/statement/upload-analyze'),
  upload.single('statement'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Send file as multipart field named "statement"' });

    const { email, accountName, bankName, password, customerId } = req.body;

    try {
      const form = new FormData();
      form.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      if (bankName) form.append('bank', bankName);
      if (password) form.append('password', password);

      const { data } = await lucredApi.post(
        process.env.LUCRED_STATEMENT_ANALYZE_PATH || '/metrics/file_transactions',
        form,
        { headers: form.getHeaders() }
      );

      // Persist result for history
      await StatementResult.create({
        client: req.client._id,
        customer: customerId || undefined,
        email,
        accountName,
        bankName,
        filename: req.file.originalname,
        result: data,
        status: 'success',
      });

      res.json({ success: true, data });
    } catch (err) {
      // Save failed attempt too
      await StatementResult.create({
        client: req.client._id,
        customer: customerId || undefined,
        email,
        accountName,
        bankName,
        filename: req.file?.originalname,
        status: 'failed',
      }).catch(() => {});

      const status = err.response?.status || 502;
      res.status(status).json({ error: err.response?.data || err.message || 'Upstream error' });
    }
  }
);

// List statement analyses for the authenticated MFI (JWT protected — dashboard use)
router.get('/api/statements', requireJWT, async (req, res) => {
  try {
    const { q } = req.query;
    const filter = { client: req.client.id };
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { accountName: { $regex: q, $options: 'i' } },
        { bankName: { $regex: q, $options: 'i' } },
        { filename: { $regex: q, $options: 'i' } },
      ];
    }
    const statements = await StatementResult.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    const total = await StatementResult.countDocuments({ client: req.client.id });
    res.json({ total, statements });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single statement analysis
router.get('/api/statements/:id', requireJWT, async (req, res) => {
  try {
    const statement = await StatementResult.findOne({ _id: req.params.id, client: req.client.id });
    if (!statement) return res.status(404).json({ error: 'Not found' });
    res.json(statement);
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.message) return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
