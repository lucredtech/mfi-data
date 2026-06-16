const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');
const rateLimit = require('express-rate-limit');
const { requireApiKey, logUsage } = require('../middleware/auth');
const lucredApi = require('../config/lucredApi');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPEG, and PNG files are accepted'));
  },
});

const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, keyGenerator: (req) => req.apiKey?.key });

router.use(requireApiKey, limiter);

// Upload bank statement PDF and run transaction analysis
router.post(
  '/statement/upload-analyze',
  logUsage('/v1/statement/upload-analyze'),
  upload.single('statement'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Send file as multipart field named "statement"' });

    try {
      const form = new FormData();
      form.append('statement', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      // Forward any extra metadata the MFI sends (e.g. borrower email, accountName)
      const { email, accountName, bankName } = req.body;
      if (email) form.append('email', email);
      if (accountName) form.append('accountName', accountName);
      if (bankName) form.append('bankName', bankName);
      form.append('userType', 'user');

      const { data } = await lucredApi.post(
        process.env.LUCRED_STATEMENT_ANALYZE_PATH || '/api/v1/agentai/analyse-transaction?userType=merchant',
        form,
        { headers: form.getHeaders() }
      );

      res.json({ success: true, data });
    } catch (err) {
      const status = err.response?.status || 502;
      res.status(status).json({ error: err.response?.data || err.message || 'Upstream error' });
    }
  }
);

// Multer error handler
router.use((err, req, res, next) => {
  if (err.message) return res.status(400).json({ error: err.message });
  next(err);
});

module.exports = router;
