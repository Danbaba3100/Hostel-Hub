'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool } = require('./src/db');
const authRoutes = require('./src/auth/routes');
const hostelRoutes = require('./src/hostels/routes');
const adminHostelRoutes = require('./src/admin/hostel-routes');
const uploadRoutes = require('./src/uploads/routes');
const reportRoutes = require('./src/reports/routes');
const { assertJwtSecret } = require('./src/auth/tokens');

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } }
}));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      service: 'hostel-hub-api',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'hostel-hub-api',
      database: 'unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api', reportRoutes);
app.use('/api', hostelRoutes);
app.use('/api/admin', adminHostelRoutes);

app.get('/', (req, res) => {
  res.json({ name: 'Hostel Hub API', version: '0.2.0', health: '/api/health' });
});

app.use((req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested API route was not found.' }
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({
      error: { code: 'CORS_ORIGIN_DENIED', message: 'This website is not allowed to access the API.' }
    });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' }
    });
  }
  // Keep detailed diagnostics in the local server terminal; never send them to the browser.
  console.error('Unhandled API error:', {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    error: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    stack: error.stack
  });
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }
  });
});

let server;
if (require.main === module) {
  try {
    assertJwtSecret();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  server = app.listen(port, () => {
    console.log(`Hostel Hub API listening on port ${port}`);
  });
}

async function shutdown() {
  if (server) server.close();
  await pool.end();
}

process.on('SIGINT', () => shutdown().finally(() => process.exit(0)));
process.on('SIGTERM', () => shutdown().finally(() => process.exit(0)));

module.exports = { app, shutdown };