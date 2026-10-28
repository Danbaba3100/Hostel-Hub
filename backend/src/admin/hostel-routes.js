'use strict';

const express = require('express');
const crypto = require('node:crypto');
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
  const status = row.admin_removed_at
    ? 'Removed'
    : (!row.is_active || row.deleted_at)
      ? 'Inactive'
    : ({
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

const agentApplicationDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(1000).optional().default('')
}).strict();

const agentInvitationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(25).regex(/^[0-9+()\-\s]+$/).optional().or(z.literal(''))
}).strict();

router.get('/agent-applications', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.status, a.review_note, a.created_at, a.reviewed_at,
              u.full_name, u.email, u.phone
       FROM agent_applications a
       JOIN users u ON u.id = a.user_id
       ORDER BY CASE WHEN a.status = 'pending' THEN 0 ELSE 1 END, a.created_at DESC
       LIMIT 1000`
    );
    return res.json({
      applications: result.rows.map((row) => ({
        id: row.id, agentId: row.user_id, name: row.full_name,
        email: row.email, phone: row.phone || '', status: row.status,
        note: row.review_note || '', submittedAt: row.created_at, reviewedAt: row.reviewed_at
      }))
    });
  } catch (error) { return next(error); }
});

router.patch('/agent-applications/:id/review', requireAuth, requireRole('admin'), async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The application ID is invalid.' } });
  }
  const parsed = agentApplicationDecisionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose approve or reject and provide a valid review note.' } });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id, user_id, status FROM agent_applications WHERE id = $1 FOR UPDATE', [req.params.id]);
    const application = found.rows[0];
    if (!application) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'APPLICATION_NOT_FOUND', message: 'That agent application was not found.' } });
    }
    if (application.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { code: 'APPLICATION_ALREADY_REVIEWED', message: 'This application has already been reviewed.' } });
    }
    await client.query(
      `UPDATE agent_applications
       SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now()
       WHERE id = $4`,
      [parsed.data.status, parsed.data.note || null, req.user.id, application.id]
    );
    await client.query(
      `UPDATE users SET agent_application_status = $1, is_active = $2, updated_at = now()
       WHERE id = $3 AND role = 'agent'`,
      [parsed.data.status, parsed.data.status === 'approved', application.user_id]
    );
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'agent_application', $3, $4::jsonb)`,
      [req.user.id, parsed.data.status === 'approved' ? 'agent_application_approved' : 'agent_application_rejected',
        application.id, JSON.stringify({ agentId: application.user_id, note: parsed.data.note || '' })]
    );
    await client.query('COMMIT');
    return res.json({
      message: parsed.data.status === 'approved' ? 'Agent application approved. The agent can now sign in.' : 'Agent application rejected.',
      application: { id: application.id, agentId: application.user_id, status: parsed.data.status, note: parsed.data.note || '' }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally { client.release(); }
});

router.post('/agents/invitations', requireAuth, requireRole('admin'), async (req, res, next) => {
  const parsed = agentInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Enter a valid name, email address, and optional phone number.' } });
  }
  const { fullName, email, phone } = parsed.data;
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const existing = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rowCount) {
      return res.status(409).json({ error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'An account with this email already exists.' } });
    }
    const activeInvite = await pool.query(
      `SELECT 1 FROM agent_invitations WHERE email = $1 AND accepted_at IS NULL AND expires_at > now() LIMIT 1`,
      [email]
    );
    if (activeInvite.rowCount) {
      return res.status(409).json({ error: { code: 'INVITATION_ALREADY_EXISTS', message: 'There is already an active invitation for this email.' } });
    }
    const result = await pool.query(
      `INSERT INTO agent_invitations (full_name, email, phone, token_hash, expires_at, created_by)
       VALUES ($1, $2, $3, $4, now() + interval '48 hours', $5)
       RETURNING id, expires_at`,
      [fullName, email, phone || null, tokenHash, req.user.id]
    );
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'agent_invitation_created', 'agent_invitation', $2, $3::jsonb)`,
      [req.user.id, result.rows[0].id, JSON.stringify({ email })]
    );
    const frontendBase = (process.env.FRONTEND_BASE_URL || 'https://hostel-hub-frontend.onrender.com').replace(/\/$/, '');
    return res.status(201).json({
      message: 'Invitation created. Share this link privately with the intended agent; it expires in 48 hours and can be used once.',
      invitation: {
        id: result.rows[0].id, email, expiresAt: result.rows[0].expires_at,
        invitationUrl: `${frontendBase}/accept-agent-invitation.html?token=${token}`
      }
    });
  } catch (error) { return next(error); }
});

router.get('/agents', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
              a.status AS application_status
       FROM users u LEFT JOIN agent_applications a ON a.user_id = u.id
       WHERE u.role = 'agent' ORDER BY u.created_at DESC LIMIT 1000`
    );
    return res.json({
      agents: result.rows.map((row) => ({
        id: row.id,
        name: row.full_name,
        email: row.email,
        phone: row.phone || '',
        location: '',
        joined: row.created_at,
        status: row.application_status === 'pending' ? 'Pending' : row.application_status === 'rejected' ? 'Rejected' : row.is_active ? 'Active' : 'Suspended'
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/agents/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The agent ID is invalid.' } });
  }
  const parsed = z.object({ isActive: z.boolean() }).strict().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a valid agent account status.' } });
  }
  try {
    const result = await pool.query(
      `UPDATE users
       SET is_active = $1, updated_at = now()
       WHERE id = $2 AND role = 'agent'
       RETURNING id, full_name, email, phone, is_active, created_at`,
      [parsed.data.isActive, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: { code: 'AGENT_NOT_FOUND', message: 'That agent account was not found.' } });
    }
    const row = result.rows[0];
    return res.json({
      agent: {
        id: row.id,
        name: row.full_name,
        email: row.email,
        phone: row.phone || '',
        location: '',
        joined: row.created_at,
        status: row.is_active ? 'Active' : 'Suspended'
      },
      message: parsed.data.isActive ? 'Agent account reactivated.' : 'Agent account suspended.'
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/stats', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const agents = await pool.query(
      "SELECT COUNT(*)::int AS total FROM users WHERE role = 'agent'"
    );
    return res.json({
      stats: {
        totalAgents: agents.rows[0].total
      }
    });
  } catch (error) {
    return next(error);
  }
});

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
              h.availability_status, h.approval_status, h.is_active, h.admin_removed_at,
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


router.delete('/hostels/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return res.status(400).json({
      error: { code: 'INVALID_ID', message: 'The hostel ID is invalid.' }
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT id, name, is_active FROM hostels WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [req.params.id]
    );

    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: { code: 'HOSTEL_NOT_FOUND', message: 'That hostel listing was not found or has already been removed.' }
      });
    }

    if (!current.rows[0].is_active) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: { code: 'HOSTEL_ALREADY_REMOVED', message: 'This hostel has already been removed from public listings.' }
      });
    }

    await client.query(
      'UPDATE hostels SET is_active = false, admin_removed_at = now(), updated_at = now() WHERE id = $1',
      [req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'hostel.removed_from_public_listings', 'hostel', $2, $3::jsonb)`,
      [req.user.id, req.params.id, JSON.stringify({ name: current.rows[0].name })]
    );
    await client.query('COMMIT');

    return res.json({
      message: 'Hostel removed from public listings. Its record and inspection history have been preserved.'
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return next(error);
  } finally {
    client.release();
  }
});


router.patch('/hostels/:id/restore', requireAuth, requireRole('admin'), async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The hostel ID is invalid.' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT id, name, approval_status, is_active, admin_removed_at FROM hostels WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [req.params.id]
    );
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'HOSTEL_NOT_FOUND', message: 'That hostel listing was not found.' } });
    }
    const hostel = current.rows[0];
    if (hostel.admin_removed_at == null && hostel.is_active) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { code: 'HOSTEL_ALREADY_ACTIVE', message: 'This hostel is already active.' } });
    }

    // Restore the listing's active flag without changing approval_status.
    // Pending and rejected listings remain hidden publicly until separately approved.
    await client.query(
      'UPDATE hostels SET is_active = true, admin_removed_at = NULL, updated_at = now() WHERE id = $1',
      [req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'hostel.restored_to_public_listings', 'hostel', $2, $3::jsonb)`,
      [req.user.id, req.params.id, JSON.stringify({ name: hostel.name })]
    );
    await client.query('COMMIT');
    return res.json({ message: 'Hostel reactivated. Its existing approval status has been preserved.', hostelId: req.params.id });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
