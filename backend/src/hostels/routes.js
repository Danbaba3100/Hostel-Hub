'use strict';

const express = require('express');
const { randomBytes } = require('node:crypto');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { hostelSchema, inspectionSchema, inspectionStatusSchema } = require('./validation');

const router = express.Router();

function sendValidationError(res, parsed) {
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

function toHostel(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    location: row.location,
    address: row.address,
    price: Number(row.price_ngn),
    cautionFee: Number(row.caution_fee_ngn || 0),
    agencyFee: Number(row.agency_fee_ngn || 0),
    agreementFee: Number(row.agreement_fee_ngn || 0),
    serviceCharge: Number(row.service_charge_ngn || 0),
    type: row.room_type,
    rooms: row.units_available == null ? row.occupancy : row.units_available,
    distance: row.distance_from_campus || '',
    availability: ({ available: 'Available', limited: 'Limited availability', unavailable: 'Fully occupied' })[row.availability_status] || 'Available',
    description: row.description,
    facilities: row.facilities || [],
    videoUrl: row.video_url,
    status: !row.is_active || row.deleted_at
      ? 'Inactive'
      : ({ approved: 'Published', pending: 'Pending Approval', rejected: 'Rejected' })[row.approval_status] || 'Pending Approval',
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toInspection(row) {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    hostelId: row.hostel_id,
    hostelName: row.hostel_name,
    studentName: row.student_name,
    email: row.student_email || '',
    phone: row.student_phone,
    preferredDate: row.preferred_date instanceof Date
      ? row.preferred_date.toISOString().slice(0, 10)
      : String(row.preferred_date).slice(0, 10),
    preferredTime: row.preferred_time,
    message: row.message || '',
    status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    createdAt: row.created_at
  };
}

function slugify(value) {
  const base = value.toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'hostel';
  return base + '-' + randomBytes(4).toString('hex');
}

const hostelSelect = `
  SELECT id, slug, name, description, location, address, price_ngn,
         caution_fee_ngn, agency_fee_ngn, agreement_fee_ngn, service_charge_ngn,
         room_type, occupancy, units_available, distance_from_campus, facilities,
         video_url, availability_status, approval_status, is_active, deleted_at,
         created_at, updated_at
  FROM hostels
`;

const inspectionSelect = `
  SELECT i.id, i.reference_code, i.hostel_id, h.name AS hostel_name,
         i.student_name, i.student_phone, i.student_email, i.preferred_date,
         i.preferred_time, i.message, i.status, i.created_at
  FROM inspections i
  JOIN hostels h ON h.id = i.hostel_id
`;

// Public users can browse only approved, active listings. No account is required.
router.get('/hostels', async (req, res, next) => {
  try {
    const result = await pool.query(
      hostelSelect + `
      WHERE approval_status = 'approved' AND is_active = true AND deleted_at IS NULL
        AND availability_status <> 'unavailable'
      ORDER BY created_at DESC
      LIMIT 100`
    );
    return res.json({ hostels: result.rows.map(toHostel) });
  } catch (error) {
    return next(error);
  }
});

// Authenticated agent's listings; the owner is always derived from the token.
router.get('/hostels/mine', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    const result = await pool.query(
      hostelSelect + ' WHERE agent_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json({ hostels: result.rows.map(toHostel) });
  } catch (error) {
    return next(error);
  }
});

router.post('/hostels', requireAuth, requireRole('agent'), async (req, res, next) => {
  const parsed = hostelSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);
  const value = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO hostels (
         slug, name, description, location, address, price_ngn,
         caution_fee_ngn, agency_fee_ngn, agreement_fee_ngn, service_charge_ngn,
         room_type, occupancy, units_available, distance_from_campus, facilities,
         video_url, availability_status, approval_status, is_active, agent_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,$15,'pending',true,$16
       )
       RETURNING id`,
      [
        slugify(value.name), value.name, value.description, value.location,
        value.address || null, value.priceNgn, value.cautionFeeNgn,
        value.agencyFeeNgn, value.agreementFeeNgn, value.serviceChargeNgn,
        value.roomType, value.unitsAvailable, value.distanceFromCampus || null,
        value.facilities, value.videoUrl, req.user.id
      ]
    );
    const created = await pool.query(
      hostelSelect + ' WHERE id = $1',
      [result.rows[0].id]
    );
    return res.status(201).json({ hostel: toHostel(created.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/hostels/:id', requireAuth, requireRole('agent'), async (req, res, next) => {
  const idSchema = require('zod').z.string().uuid();
  if (!idSchema.safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The hostel ID is invalid.' } });
  }
  const parsed = hostelSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);
  const value = parsed.data;

  try {
    const result = await pool.query(
      `UPDATE hostels SET
         name=$1, description=$2, location=$3, address=$4, price_ngn=$5,
         caution_fee_ngn=$6, agency_fee_ngn=$7, agreement_fee_ngn=$8,
         service_charge_ngn=$9, room_type=$10, occupancy=$11, units_available=$11,
         distance_from_campus=$12, facilities=$13, video_url=$14,
         availability_status=$15, approval_status='pending', reviewed_by=NULL,
         reviewed_at=NULL, rejection_reason=NULL, updated_at=now()
       WHERE id=$16 AND agent_id=$17 AND deleted_at IS NULL
       RETURNING id`,
      [
        value.name, value.description, value.location, value.address || null,
        value.priceNgn, value.cautionFeeNgn, value.agencyFeeNgn,
        value.agreementFeeNgn, value.serviceChargeNgn, value.roomType,
        value.unitsAvailable, value.distanceFromCampus || null, value.facilities,
        value.videoUrl, value.availabilityStatus, req.params.id, req.user.id
      ]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: { code: 'HOSTEL_NOT_FOUND', message: 'That hostel listing was not found.' } });
    }
    const updated = await pool.query(hostelSelect + ' WHERE id = $1', [req.params.id]);
    return res.json({ hostel: toHostel(updated.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/hostels/:id/availability', requireAuth, requireRole('agent'), async (req, res, next) => {
  const idSchema = require('zod').z.string().uuid();
  if (!idSchema.safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The hostel ID is invalid.' } });
  }
  const parsed = require('zod').z.object({ isActive: require('zod').z.boolean() }).strict().safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);
  try {
    const result = await pool.query(
      `UPDATE hostels SET is_active=$1, approval_status=CASE WHEN $1 THEN 'pending' ELSE approval_status END,
         reviewed_by=CASE WHEN $1 THEN NULL ELSE reviewed_by END,
         reviewed_at=CASE WHEN $1 THEN NULL ELSE reviewed_at END,
         updated_at=now()
       WHERE id=$2 AND agent_id=$3 AND deleted_at IS NULL RETURNING id`,
      [parsed.data.isActive, req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: { code: 'HOSTEL_NOT_FOUND', message: 'That hostel listing was not found.' } });
    const updated = await pool.query(hostelSelect + ' WHERE id = $1', [req.params.id]);
    return res.json({ hostel: toHostel(updated.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/hostels/:id', requireAuth, requireRole('agent'), async (req, res, next) => {
  const idSchema = require('zod').z.string().uuid();
  if (!idSchema.safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The hostel ID is invalid.' } });
  }
  try {
    const result = await pool.query(
      `UPDATE hostels SET is_active=false, deleted_at=now(), updated_at=now()
       WHERE id=$1 AND agent_id=$2 AND deleted_at IS NULL RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: { code: 'HOSTEL_NOT_FOUND', message: 'That hostel listing was not found.' } });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

// Public inspection request form; student accounts are intentionally not required.
router.post('/inspections', async (req, res, next) => {
  const parsed = inspectionSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);
  const value = parsed.data;
  try {
    const hostel = await pool.query(
      `SELECT id, agent_id FROM hostels
       WHERE id=$1 AND approval_status='approved' AND is_active=true
         AND deleted_at IS NULL AND availability_status <> 'unavailable'`,
      [value.hostelId]
    );
    if (!hostel.rowCount) {
      return res.status(404).json({ error: { code: 'HOSTEL_NOT_AVAILABLE', message: 'This hostel is not currently available for inspection requests.' } });
    }
    const referenceCode = 'HH-' + randomBytes(4).toString('hex').toUpperCase();
    const created = await pool.query(
      `INSERT INTO inspections (
         reference_code, hostel_id, agent_id, student_name, student_phone,
         student_email, preferred_date, preferred_time, message
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, reference_code`,
      [
        referenceCode, value.hostelId, hostel.rows[0].agent_id, value.studentName,
        value.studentPhone, value.studentEmail || null, value.preferredDate,
        value.preferredTime, value.message || null
      ]
    );
    return res.status(201).json({
      inspection: { id: created.rows[0].id, referenceCode: created.rows[0].reference_code },
      message: 'Your inspection request has been received.'
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/inspections/mine', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    const result = await pool.query(
      inspectionSelect + ' WHERE i.agent_id=$1 ORDER BY i.created_at DESC LIMIT 200',
      [req.user.id]
    );
    return res.json({ inspections: result.rows.map(toInspection) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/inspections/:id/status', requireAuth, requireRole('agent'), async (req, res, next) => {
  const idSchema = require('zod').z.string().uuid();
  if (!idSchema.safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The inspection ID is invalid.' } });
  }
  const parsed = inspectionStatusSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);
  try {
    const result = await pool.query(
      `UPDATE inspections SET status=$1, updated_at=now()
       WHERE id=$2 AND agent_id=$3 RETURNING id`,
      [parsed.data.status, req.params.id, req.user.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: { code: 'INSPECTION_NOT_FOUND', message: 'That inspection request was not found.' } });
    }
    const updated = await pool.query(
      inspectionSelect + ' WHERE i.id=$1',
      [req.params.id]
    );
    return res.json({ inspection: toInspection(updated.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.get('/hostels/:slug', async (req, res, next) => {
  try {
    const result = await pool.query(
      hostelSelect + ` WHERE slug=$1 AND approval_status='approved'
        AND is_active=true AND deleted_at IS NULL LIMIT 1`,
      [req.params.slug]
    );
    if (!result.rowCount) return res.status(404).json({ error: { code: 'HOSTEL_NOT_FOUND', message: 'This hostel listing was not found.' } });
    return res.json({ hostel: toHostel(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
