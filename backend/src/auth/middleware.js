'use strict';

const { pool } = require('../db');
const { verifyAccessToken } = require('./tokens');

async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({
      error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' }
    });
  }

  try {
    const claims = verifyAccessToken(match[1]);
    const result = await pool.query(
      'SELECT id, full_name, email, phone, role, is_active, created_at FROM users WHERE id = $1 LIMIT 1',
      [claims.sub]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: { code: 'ACCOUNT_UNAVAILABLE', message: 'This account is unavailable.' }
      });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Your session is invalid or expired. Please sign in again.' }
      });
    }
    return next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' }
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' }
      });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };