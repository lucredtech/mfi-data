require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiKeyRoutes = require('./routes/apiKeys');
const creditRoutes = require('./routes/credit');
const statementRoutes = require('./routes/statement');
const usageRoutes = require('./routes/usage');
const customerRoutes = require('./routes/customers');
const v1CustomerRoutes = require('./routes/v1Customers');
const { requireJWT } = require('./middleware/auth');
const FeatureRequest = require('./models/FeatureRequest');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    'https://mfi-data.vercel.app',
    /\.vercel\.app$/,
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Log requests without exposing sensitive body fields
morgan.token('safe-body', (req) => {
  const { password, bvn, nin, ...safe } = req.body || {};
  return JSON.stringify(safe);
});
app.use(morgan(':method :url :status :response-time ms - body::safe-body'));

// Brute-force protection on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);

// Protected dashboard routes
app.use('/api/keys', apiKeyRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/customers', customerRoutes);

// Feature requests (JWT protected)
app.post('/api/feature-requests', requireJWT, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'title and description are required' });
    const request = await FeatureRequest.create({ client: req.client.id, title, description });
    res.status(201).json({ request });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/feature-requests', requireJWT, async (req, res) => {
  try {
    const requests = await FeatureRequest.find({ client: req.client.id }).sort({ createdAt: -1 }).lean();
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// B2B credit engine routes (API key protected)
app.use('/v1/customers', v1CustomerRoutes);
app.use('/v1', creditRoutes);
app.use(statementRoutes);

let dbConnected = false;

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'lucred-b2b', db: dbConnected ? 'connected' : 'connecting' }));

// Start server immediately so healthcheck passes
app.listen(process.env.PORT || 5000, () =>
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);

// Connect to MongoDB in background
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    dbConnected = true;
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
