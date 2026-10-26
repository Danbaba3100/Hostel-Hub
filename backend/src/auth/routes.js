'use strict';

const express = require('express');
const crypto = require('node:crypto');
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
  message: { error: { code: 'AUTH_RATE_LIMITED', message: 'Too many account requests. Please wait and try again.' } }
});

// Login has a stricter limit to slow password guessing and automated credential attacks.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many sign-in attempts. Please wait 15 minutes before trying again.' } }
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
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active, agent_application_status)
       VALUES ($1, $2, $3, $4, 'agent', false, 'pending')
       RETURNING id`,
      [fullName, email, phone || null, passwordHash]
    );
    await client.query(
      `INSERT INTO agent_applications (user_id, status) VALUES ($1, 'pending')`,
      [result.rows[0].id]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      applicationPending: true,
      message: 'Your agent application has been submitted. You can sign in after an administrator approves it.'
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      return res.status(409).json({
        error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'An account with this email already exists.' }
      });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.post('/accept-invitation', authLimiter, async (req, res, next) => {
  const parsed = require('zod').z.object({
    token: require('zod').z.string().min(32).max(256),
    password: require('zod').z.string().min(12).max(128)
      .refine((value) => /[a-z]/.test(value), 'Password must include a lowercase letter.')
      .refine((value) => /[A-Z]/.test(value), 'Password must include an uppercase letter.')
      .refine((value) => /\d/.test(value), 'Password must include a number.')
  }).strict().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);

  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inviteResult = await client.query(
      `SELECT id, full_name, email, phone
       FROM agent_invitations
       WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [tokenHash]
    );
    const invitation = inviteResult.rows[0];
    if (!invitation) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: { code: 'INVITATION_INVALID', message: 'This invitation is invalid, expired, or has already been used. Ask the administrator for a new invitation.' }
      });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_active, agent_application_status)
       VALUES ($1, $2, $3, $4, 'agent', true, 'approved')
       RETURNING id, full_name, email, phone, role, is_active, created_at`,
      [invitation.full_name, invitation.email, invitation.phone, passwordHash]
    );
    await client.query(
      'UPDATE agent_invitations SET accepted_at = now() WHERE id = $1',
      [invitation.id]
    );
    await client.query('COMMIT');
    const user = userResult.rows[0];
    return res.status(201).json({
      user: publicUser(user),
      accessToken: createAccessToken(user),
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_ACCESS_TTL || '15m'
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      return res.status(409).json({
        error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'An account with this email already exists.' }
      });
    }
    return next(error);
  } finally {
    client.release();
  }
});

router.post('/login', authLimiter, loginLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);

  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, password_hash, role, is_active, agent_application_status, created_at FROM users WHERE email = $1 LIMIT 1',
      [parsed.data.email]
    );
    const user = result.rows[0];
    const passwordMatches = user
      ? await bcrypt.compare(parsed.data.password, user.password_hash)
      : await bcrypt.compare(parsed.data.password, '$2a$12$C6UzMDM.H6dfI/f/IKcEe.1dQyQ4pQ3x3M6Bv0j9p8uKqzjZp7y7K');

    if (user && passwordMatches && user.agent_application_status === 'pending') {
      return res.status(403).json({
        error: { code: 'AGENT_APPLICATION_PENDING', message: 'Your agent application is awaiting administrator approval. You can sign in after it is approved.' }
      });
    }

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