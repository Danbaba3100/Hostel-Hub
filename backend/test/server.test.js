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
