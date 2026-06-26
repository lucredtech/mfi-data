const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const { requireApiKey, requireJWT, logUsage } = require('../middleware/auth');
const lucredApi = require('../config/lucredApi');
const StatementResult = require('../models/StatementResult');
const AuditLog = require('../models/AuditLog');
const Customer = require('../models/Customer');
const { deductCharge, refundCharge } = require('../utils/wallet');
const { uploadStatement } = require('../utils/s3');

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

    const clientId = req.client?._id ?? req.client?.id;
    const customer = customerId ? await Customer.findById(customerId).select('name').lean() : null;
    const charge = await deductCharge(clientId, 'STATEMENT_ANALYSIS', { customerName: customer?.name || accountName, customerId });
    if (!charge.ok) return res.status(402).json({ error: charge.error, required: charge.required, balance: charge.balance });

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
      const saved = await StatementResult.create({
        client: req.client._id,
        customer: customerId || undefined,
        email,
        accountName,
        bankName,
        filename: req.file.originalname,
        result: data,
        status: 'success',
      });

      // Upload file to S3 (fire-and-forget — don't block response)
      uploadStatement(req.file.buffer, {
        clientId: req.client._id,
        resultId: saved._id,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
      }).then(s3Key => StatementResult.findByIdAndUpdate(saved._id, { s3Key }).catch(() => {}))
        .catch(err => console.error('[s3] upload failed:', err.message));

      AuditLog.create({ client: req.client._id, action: 'STATEMENT_ANALYSIS', entityType: 'StatementResult', entityId: saved._id, label: `Statement analysis: ${accountName || email || req.file.originalname}`, meta: { bankName, filename: req.file.originalname, customerId } }).catch(() => {});
      res.json({ success: true, data });
    } catch (err) {
      // Save failed attempt and upload file for debugging
      const failed = await StatementResult.create({
        client: req.client._id,
        customer: customerId || undefined,
        email,
        accountName,
        bankName,
        filename: req.file?.originalname,
        status: 'failed',
      }).catch(() => null);
      if (failed && req.file?.buffer) {
        uploadStatement(req.file.buffer, {
          clientId: req.client._id,
          resultId: failed._id,
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
        }).then(s3Key => StatementResult.findByIdAndUpdate(failed._id, { s3Key }).catch(() => {}))
          .catch(err => console.error('[s3] upload failed:', err.message));
      }

      if (!charge.freeQuota) refundCharge(clientId, 'STATEMENT_ANALYSIS', { customerName: customer?.name || accountName, customerId }).catch(() => {});
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
    const statements = await StatementResult.find(filter).select('-s3Key').sort({ createdAt: -1 }).limit(50).lean();
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
    const statement = await StatementResult.findOne({ _id: req.params.id, client: req.client.id }).select('-s3Key').lean();
    if (!statement) return res.status(404).json({ error: 'Not found' });
    res.json(statement);
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Re-analyse a statement — re-run the same file through the upstream engine
// Only works for statements that were originally file-uploaded (not monoId)
const reanalyzeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPEG, and PNG files are accepted'));
  },
});

router.post('/api/statements/:id/reanalyze', requireJWT, reanalyzeUpload.single('statement'), async (req, res) => {
  try {
    const existing = await StatementResult.findOne({ _id: req.params.id, client: req.client.id });
    if (!existing) return res.status(404).json({ error: 'Statement not found' });
    if (!req.file) return res.status(400).json({ error: 'Upload a new statement file to re-analyse' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    if (existing.bankName) form.append('bank', existing.bankName);
    if (req.body.password) form.append('password', req.body.password);

    const { data } = await lucredApi.post(
      process.env.LUCRED_STATEMENT_ANALYZE_PATH || '/metrics/file_transactions',
      form,
      { headers: form.getHeaders() }
    );

    existing.result = data;
    existing.status = 'success';
    existing.filename = req.file.originalname;
    existing.updatedAt = new Date();
    await existing.save();

    AuditLog.create({ client: req.client.id, action: 'STATEMENT_REANALYSIS', entityType: 'StatementResult', entityId: existing._id, label: `Re-analysed statement: ${existing.accountName || existing.email}`, meta: { bankName: existing.bankName, filename: req.file.originalname } }).catch(() => {});
    res.json({ success: true, data });
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.response?.data || err.message || 'Upstream error' });
  }
});

// Audit log for this MFI client (dashboard)
router.get('/api/audit', requireJWT, async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const { action, limit = 100, skip = 0, dateFrom, dateTo } = req.query;
    const filter = { client: req.client.id };
    if (action) filter.action = action;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip)).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ total, logs });
  } catch (err) {
    console.error("[route] unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.message) return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
