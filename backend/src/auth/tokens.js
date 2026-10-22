'use strict';

const jwt = require('jsonwebtoken');

function assertJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes.');
  }
  return secret;
}

function createAccessToken(user) {
  return jwt.sign(
    { role: user.role },
    assertJwtSecret(),
    { subject: user.id, expiresIn: process.env.JWT_ACCESS_TTL || '15m', issuer: 'hostel-hub-api', audience: 'hostel-hub' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, assertJwtSecret(), {
    issuer: 'hostel-hub-api',
    audience: 'hostel-hub',
    algorithms: ['HS256']
  });
}

module.exports = { assertJwtSecret, createAccessToken, verifyAccessToken };