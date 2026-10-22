'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function main() {
  if (process.env.CONFIRM_CREATE_ADMIN !== 'YES') {
    throw new Error('Set CONFIRM_CREATE_ADMIN=YES for this one-time administrative action.');
  }
  const fullName = (process.env.ADMIN_FULL_NAME || '').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const phone = (process.env.ADMIN_PHONE || '').trim() || null;
  const password = process.env.ADMIN_PASSWORD || '';

  if (fullName.length < 2 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set a valid ADMIN_FULL_NAME and ADMIN_EMAIL.');
  }
  if (Buffer.byteLength(password, 'utf8') < 12 || password.length > 128) {
    throw new Error('ADMIN_PASSWORD must be between 12 and 128 characters.');
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('ADMIN_PASSWORD must contain uppercase, lowercase, and numeric characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, role`,
    [fullName, email, phone, passwordHash]
  );
  if (!result.rowCount) {
    throw new Error('That email already exists. No account was changed.');
  }
  console.log(`Admin account created: ${result.rows[0].email} (${result.rows[0].id})`);
}

main()
  .catch((error) => {
    console.error('Admin provisioning failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());