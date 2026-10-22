'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { registerAgentSchema, loginSchema } = require('./validation');
const { createAccessToken } = require('./tokens');
const { requireAuth } = require('./middleware');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'AUTH_RATE_LIMITED', message: 'Too many sign-in attempts. Please wait and try again.' } }
});

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.is_active,
    createdAt: user.created_at
  };
}

function validationError(res, parsed) {
  return res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Please check the submitted fields.',
      fields: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    }
  });
}

// Public registration can only create agent accounts. Admin accounts are provisioned separately.
router.post('/register', authLimiter, async (req, res, next) => {
  const parsed = registerAgentSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);

  const { fullName, email, phone, password } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'agent')
       RETURNING id, full_name, email, phone, role, is_active, created_at`,
      [fullName, email, phone || null, passwordHash]
    );
    const user = result.rows[0];
    return res.status(201).json({
      user: publicUser(user),
      accessToken: createAccessToken(user),
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_ACCESS_TTL || '15m'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'An account with this email already exists.' }
      });
    }
    return next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);

  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, password_hash, role, is_active, created_at FROM users WHERE email = $1 LIMIT 1',
      [parsed.data.email]
    );
    const user = result.rows[0];
    const passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.password_hash)
      : await bcrypt.compare(parsed.data.password, '$2a$12$C6UzMDM.H6dfI/f/IKcEe.1dQyQ4pQ3x3M6Bv0j9p8uKqzjZp7y7K');

    if (!user || !passwordMatches || !user.is_active) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' }
      });
    }

    return res.status(200).json({
      user: publicUser(user),
      accessToken: createAccessToken(user),
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_ACCESS_TTL || '15m'
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({ user: publicUser(req.user) });
});

module.exports = router;