'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  application_name: 'hostel-hub-api'
});

pool.on('error', (error) => {
  // Never log connection strings or other secret configuration.
  console.error(JSON.stringify({
    level: 'error',
    message: 'Unexpected idle PostgreSQL client error',
    code: error.code || 'UNKNOWN',
    timestamp: new Date().toISOString()
  }));
});

module.exports = { pool };