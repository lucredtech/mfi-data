require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const apiKeyRoutes = require('./routes/apiKeys');
const creditRoutes = require('./routes/credit');
const statementRoutes = require('./routes/statement');
const usageRoutes = require('./routes/usage');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Public routes
app.use('/api/auth', authRoutes);

// Protected dashboard routes
app.use('/api/keys', apiKeyRoutes);
app.use('/api/usage', usageRoutes);

// B2B credit engine routes (API key protected)
app.use('/v1', creditRoutes);
app.use('/v1', statementRoutes);

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
