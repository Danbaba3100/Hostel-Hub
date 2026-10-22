'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { registerAgentSchema, loginSchema } = require('../src/auth/validation');

test('agent registration normalizes email and accepts valid input', () => {
  const parsed = registerAgentSchema.safeParse({
    fullName: 'Sample Agent',
    email: '  AGENT@example.com ',
    phone: '+234 801 234 5678',
    password: 'Strong-Password-123'
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.email, 'agent@example.com');
});

test('public agent registration rejects attempts to assign an admin role', () => {
  const parsed = registerAgentSchema.safeParse({
    fullName: 'Sample Agent',
    email: 'agent@example.com',
    password: 'Strong-Password-123',
    role: 'admin'
  });
  assert.equal(parsed.success, false);
});

test('registration rejects weak passwords', () => {
  const parsed = registerAgentSchema.safeParse({
    fullName: 'Sample Agent',
    email: 'agent@example.com',
    password: 'short'
  });
  assert.equal(parsed.success, false);
});

test('login rejects unexpected fields', () => {
  const parsed = loginSchema.safeParse({
    email: 'agent@example.com',
    password: 'some-password',
    role: 'admin'
  });
  assert.equal(parsed.success, false);
});