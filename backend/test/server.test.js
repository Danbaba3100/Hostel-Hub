'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

test('API root returns service information', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.name, 'Hostel Hub API');
    assert.equal(body.health, '/api/health');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('unknown routes return a safe JSON 404', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/does-not-exist`);
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.error.code, 'NOT_FOUND');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('admin statistics endpoint requires authentication', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/stats`);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error.code, 'AUTH_REQUIRED');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('admin agent management endpoints require authentication', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const listResponse = await fetch(`http://127.0.0.1:${address.port}/api/admin/agents`);
    assert.equal(listResponse.status, 401);
    assert.equal((await listResponse.json()).error.code, 'AUTH_REQUIRED');

    const statusResponse = await fetch(`http://127.0.0.1:${address.port}/api/admin/agents/00000000-0000-4000-8000-000000000000/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false })
    });
    assert.equal(statusResponse.status, 401);
    assert.equal((await statusResponse.json()).error.code, 'AUTH_REQUIRED');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('admin hostel review endpoints require authentication', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/hostels`);
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error.code, 'AUTH_REQUIRED');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('agent application and invitation administration endpoints require authentication', async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const applications = await fetch(`http://127.0.0.1:${address.port}/api/admin/agent-applications`);
    assert.equal(applications.status, 401);
    assert.equal((await applications.json()).error.code, 'AUTH_REQUIRED');

    const invitation = await fetch(`http://127.0.0.1:${address.port}/api/admin/agents/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Example Agent', email: 'agent@example.com' })
    });
    assert.equal(invitation.status, 401);
    assert.equal((await invitation.json()).error.code, 'AUTH_REQUIRED');

    const review = await fetch(`http://127.0.0.1:${address.port}/api/admin/agent-applications/00000000-0000-4000-8000-000000000000/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    assert.equal(review.status, 401);
    assert.equal((await review.json()).error.code, 'AUTH_REQUIRED');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
