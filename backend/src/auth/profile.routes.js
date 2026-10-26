'use strict';

const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('./middleware');

const router = express.Router();

const phoneSchema = z.string().trim().min(7).max(25)
  .regex(/^[0-9+()\-\s]+$/, 'Enter a valid phone number.');
const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  whatsappPhone: phoneSchema,
  businessAddress: z.string().trim().max(180).default(''),
  bio: z.string().trim().max(600).default(''),
  agencyName: z.string().trim().max(120).default(''),
  agencyType: z.enum(['Independent Agent', 'Registered Agency', 'Property Manager', 'Landlord']),
  agencyWebsite: z.string().trim().max(250).default('')
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
      } catch {
        return false;
      }
    }, 'Enter a valid website beginning with http:// or https://.')
}).strict();

function publicProfile(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone || '',
    whatsappPhone: user.whatsapp_phone || '',
    businessAddress: user.business_address || '',
    bio: user.bio || '',
    agencyName: user.agency_name || '',
    agencyType: user.agency_type || 'Independent Agent',
    agencyWebsite: user.agency_website || '',
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

router.get('/', requireAuth, requireRole('agent'), (req, res) => {
  return res.json({ profile: publicProfile(req.user) });
});

router.patch('/', requireAuth, requireRole('agent'), async (req, res, next) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  const value = parsed.data;

  try {
    const result = await pool.query(
      `UPDATE users SET
         full_name = $1,
         email = $2,
         phone = $3,
         whatsapp_phone = $4,
         business_address = $5,
         bio = $6,
         agency_name = $7,
         agency_type = $8,
         agency_website = $9,
         updated_at = now()
       WHERE id = $10 AND role = 'agent' AND is_active = true
       RETURNING id, full_name, email, phone, whatsapp_phone, business_address,
                 bio, agency_name, agency_type, agency_website, role, is_active, created_at`,
      [
        value.fullName, value.email, value.phone, value.whatsappPhone,
        value.businessAddress || null, value.bio || null, value.agencyName || null,
        value.agencyType, value.agencyWebsite || null, req.user.id
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: { code: 'AGENT_NOT_FOUND', message: 'The agent account could not be found.' }
      });
    }

    return res.json({
      profile: publicProfile(result.rows[0]),
      message: 'Your profile has been saved successfully.'
    });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'users_email_unique') {
      return res.status(409).json({
        error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'That email address is already used by another account.' }
      });
    }
    return next(error);
  }
});

module.exports = router;
