'use strict';

const { z } = require('zod');

const nonNegativeMoney = z.number().finite().int().min(0).max(100000000000);
const optionalPhone = z.string().trim().min(7).max(25).regex(/^[0-9+()\-\s]+$/);
const httpUrl = z.string().trim().url().max(2048).refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, 'Enter a valid http or https video URL.');

const hostelSchema = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(5000),
  location: z.string().trim().min(2).max(180),
  address: z.string().trim().max(1000).optional().or(z.literal('')),
  priceNgn: nonNegativeMoney,
  roomType: z.string().trim().min(2).max(80),
  unitsAvailable: z.number().int().min(1).max(10000),
  distanceFromCampus: z.string().trim().max(100).optional().or(z.literal('')),
  cautionFeeNgn: nonNegativeMoney.default(0),
  agencyFeeNgn: nonNegativeMoney.default(0),
  agreementFeeNgn: nonNegativeMoney.default(0),
  serviceChargeNgn: nonNegativeMoney.default(0),
  facilities: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  videoUrl: httpUrl,
  availabilityStatus: z.enum(['available', 'limited', 'unavailable']).default('available')
}).strict();

const inspectionSchema = z.object({
  hostelId: z.string().uuid(),
  studentName: z.string().trim().min(2).max(120),
  studentPhone: optionalPhone,
  studentEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional().or(z.literal('')),
  preferredDate: z.string().date(),
  preferredTime: z.string().trim().min(1).max(30),
  message: z.string().trim().max(2000).optional().or(z.literal(''))
}).strict();

const inspectionStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled'])
}).strict();

module.exports = { hostelSchema, inspectionSchema, inspectionStatusSchema };
