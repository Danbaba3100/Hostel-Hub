'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hostelSchema, inspectionSchema, inspectionStatusSchema } = require('../src/hostels/validation');

const validHostel = {
  name: 'Sample Student Hostel',
  description: 'A student hostel with water and electricity near campus.',
  location: 'Oke-Baale, Osogbo',
  priceNgn: 180000,
  roomType: 'Self-contained',
  unitsAvailable: 8,
  facilities: ['Water supply', 'Electricity'],
  videoUrl: 'https://example.com/hostel-tour.mp4',
  availabilityStatus: 'available'
};

test('hostel schema accepts valid video-only listing and defaults fees', () => {
  const parsed = hostelSchema.safeParse(validHostel);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.cautionFeeNgn, 0);
  assert.equal(parsed.data.facilities.length, 2);
});

test('hostel schema rejects a missing or invalid video URL', () => {
  assert.equal(hostelSchema.safeParse({ ...validHostel, videoUrl: '' }).success, false);
  assert.equal(hostelSchema.safeParse({ ...validHostel, videoUrl: 'javascript:alert(1)' }).success, false);
});

test('hostel schema rejects negative rent and unknown fields', () => {
  assert.equal(hostelSchema.safeParse({ ...validHostel, priceNgn: -10 }).success, false);
  assert.equal(hostelSchema.safeParse({ ...validHostel, agentId: 'someone-else' }).success, false);
});

test('public inspection request requires valid contact and date details', () => {
  const parsed = inspectionSchema.safeParse({
    hostelId: '2f1c4a4c-8e8e-4d4e-a3d7-1a9bfc3f4c77',
    studentName: 'Sample Student',
    studentPhone: '08012345678',
    studentEmail: 'student@example.com',
    preferredDate: '2026-11-10',
    preferredTime: '10:00 AM',
    message: 'I would like to inspect this hostel.'
  });
  assert.equal(parsed.success, true);
});

test('inspection status only accepts supported values', () => {
  assert.equal(inspectionStatusSchema.safeParse({ status: 'completed' }).success, true);
  assert.equal(inspectionStatusSchema.safeParse({ status: 'approved' }).success, false);
});
