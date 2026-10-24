'use strict';

const express = require('express');
const { z } = require('zod');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');
const { inspectionStatusSchema } = require('../hostels/validation');

const router = express.Router();
const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(1000).optional().default('')
}).strict();

function toAdminHostel(row) {
  const status = ({
    approved: 'Approved',
    pending: 'Under Review',
    rejected: 'Rejected'
  })[row.approval_status] || 'Under Review';

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    location: row.location,
    address: row.address,
    price: Number(row.price_ngn),
    type: row.room_type,
    rooms: row.units_available == null ? row.occupancy : row.units_available,
    distance: row.distance_from_campus || '',
    facilities: row.facilities || [],
    videoUrl: row.video_url,
    availability: row.availability_status,
    status,
    approvalStatus: row.approval_status,
    agent: row.agent_name,
    agentEmail: row.agent_email,
    agentPhone: row.agent_phone || '',
    submitted: row.created_at,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    isActive: row.is_active
  };
}


function toAdminInspection(row) {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    hostelId: row.hostel_id,
    hostel: row.hostel_name,
    location: row.hostel_location || '',
    student: row.student_name,
    email: row.student_email || '',
    phone: row.student_phone || '',
    date: row.preferred_date instanceof Date ? row.preferred_date.toISOString().slice(0, 10) : String(row.preferred_date).slice(0, 10),
    time: row.preferred_time || '',
    status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    note: row.message || '',
    createdAt: row.created_at
  };
}

router.get('/inspections', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.reference_code, i.hostel_id, h.name AS hostel_name,
              h.location AS hostel_location, i.student_name, i.student_email,
              i.student_phone, i.preferred_date, i.preferred_time, i.status,
              i.message, i.created_at
       FROM inspections i
       JOIN hostels h ON h.id = i.hostel_id
       ORDER BY i.created_at DESC
       LIMIT 500`
    );
    return res.json({ bookings: result.rows.map(toAdminInspection) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/inspections/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The inspection ID is invalid.' } });
  }
  const parsed = inspectionStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a valid inspection status.' } });
  }
  try {
    const updated = await pool.query(
      `UPDATE inspections SET status = $1, updated_at = now()
       WHERE id = $2 RETURNING id`,
      [parsed.data.status, req.params.id]
    );
    if (!updated.rowCount) {
      return res.status(404).json({ error: { code: 'INSPECTION_NOT_FOUND', message: 'That inspection request was not found.' } });
    }
    const result = await pool.query(
      `SELECT i.id, i.reference_code, i.hostel_id, h.name AS hostel_name,
              h.location AS hostel_location, i.student_name, i.student_email,
              i.student_phone, i.preferred_date, i.preferred_time, i.status,
              i.message, i.created_at
       FROM inspections i JOIN hostels h ON h.id = i.hostel_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    return res.json({ booking: toAdminInspection(result.rows[0]), message: 'Inspection status updated.' });
  } catch (error) {
    return next(error);
  }
});

router.get('/hostels', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT h.id, h.slug, h.name, h.description, h.location, h.address,
              h.price_ngn, h.room_type, h.occupancy, h.units_available,
              h.distance_from_campus, h.facilities, h.video_url,
              h.availability_status, h.approval_status, h.is_active,
              h.reviewed_at, h.rejection_reason, h.created_at,
              u.full_name AS agent_name, u.email AS agent_email, u.phone AS agent_phone
       FROM hostels h
       JOIN users u ON u.id = h.agent_id
       WHERE h.deleted_at IS NULL
       ORDER BY
         CASE h.approval_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
         h.created_at DESC
       LIMIT 500`
    );
    return res.json({ hostels: result.rows.map(toAdminHostel) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/hostels/:id/review', requireAuth, requireRole('admin'), async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return res.status(400).json({
      error: { code: 'INVALID_ID', message: 'The hostel ID is invalid.' }
    });
  }

  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Choose approve or reject and check the review note.',
        fields: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT id, name, approval_status FROM hostels WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [req.params.id]
    );

    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: { code: 'HOSTEL_NOT_FOUND', message: 'That hostel listing was not found.' }
      });
    }

    if (current.rows[0].approval_status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: { code: 'LISTING_ALREADY_REVIEWED', message: 'Only pending listings can be approved or rejected.' }
      });
    }

    const { status, note } = parsed.data;
    const updated = await client.query(
      `UPDATE hostels
       SET approval_status = $1::varchar,
           reviewed_by = $2,
           reviewed_at = now(),
           rejection_reason = CASE WHEN $1::text = 'rejected' THEN NULLIF($3, '') ELSE NULL END,
           updated_at = now()
       WHERE id = $4
       RETURNING id, slug, name, description, location, address, price_ngn,
                 room_type, occupancy, units_available, distance_from_campus,
                 facilities, video_url, availability_status, approval_status,
                 is_active, reviewed_at, rejection_reason, created_at`,
      [status, req.user.id, note, req.params.id]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'hostel', $3, $4::jsonb)`,
      [
        req.user.id,
        status === 'approved' ? 'hostel.approved' : 'hostel.rejected',
        req.params.id,
        JSON.stringify({ name: current.rows[0].name, note })
      ]
    );

    await client.query('COMMIT');

    const agent = await pool.query(
      'SELECT full_name AS agent_name, email AS agent_email, phone AS agent_phone FROM users WHERE id = (SELECT agent_id FROM hostels WHERE id = $1)',
      [req.params.id]
    );
    return res.json({
      hostel: toAdminHostel({ ...updated.rows[0], ...agent.rows[0] }),
      message: status === 'approved'
        ? 'Hostel approved and now eligible to appear publicly.'
        : 'Hostel rejected. It will remain hidden from public listings.'
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
