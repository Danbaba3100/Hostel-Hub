'use strict';

const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../auth/middleware');

const router = express.Router();

const publicReportLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'REPORT_RATE_LIMITED', message: 'Too many reports have been submitted from this connection. Please try again later.' } }
});

const createReportSchema = z.object({
  subject: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(4000),
  targetType: z.enum(['hostel', 'agent', 'other']),
  targetId: z.string().uuid().optional().or(z.literal('')),
  reportedAgainst: z.string().trim().min(2).max(180),
  category: z.enum(['hostel', 'agent', 'payment', 'fraud', 'other']),
  reporterName: z.string().trim().max(120).optional().or(z.literal('')),
  reporterEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional().or(z.literal('')),
  reporterPhone: z.string().trim().max(25).optional().or(z.literal(''))
}).strict();

const updateReportSchema = z.object({
  status: z.enum(['pending', 'under_review', 'resolved', 'dismissed']),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  adminNote: z.string().trim().max(2000).optional().default('')
}).strict();

function toReport(row) {
  const statusLabels = { pending: 'Pending', under_review: 'Under Review', resolved: 'Resolved', dismissed: 'Dismissed' };
  const priorityLabels = { high: 'High', medium: 'Medium', low: 'Low' };
  return {
    id: row.id,
    referenceCode: row.reference_code,
    subject: row.subject,
    description: row.description,
    targetType: row.target_type.charAt(0).toUpperCase() + row.target_type.slice(1),
    targetTypeKey: row.target_type,
    targetId: row.target_id || '',
    reportedAgainst: row.reported_against,
    category: row.category.charAt(0).toUpperCase() + row.category.slice(1),
    categoryKey: row.category,
    priority: priorityLabels[row.priority] || 'Medium',
    priorityKey: row.priority,
    status: statusLabels[row.status] || 'Pending',
    statusKey: row.status,
    reporter: row.reporter_name || 'Anonymous Visitor',
    reporterEmail: row.reporter_email || '',
    reporterPhone: row.reporter_phone || '',
    adminNote: row.admin_note || '',
    reviewedAt: row.reviewed_at,
    date: row.created_at,
    updatedAt: row.updated_at
  };
}

// Public report endpoint. The form can be used by visitors without an account.
router.post('/reports', publicReportLimiter, async (req, res, next) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please provide a subject, description, reported item, and valid report category.',
        fields: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
      }
    });
  }
  const data = parsed.data;
  if (data.targetType === 'hostel' && !data.targetId) {
    return res.status(400).json({
      error: { code: 'LISTING_REQUIRED', message: 'Select a specific hostel listing before submitting this report.' }
    });
  }
  const priority = ['fraud', 'payment'].includes(data.category) ? 'high' : 'medium';
  try {
    if (data.targetType === 'hostel') {
      const listing = await pool.query(
        `SELECT id, name FROM hostels
         WHERE id = $1 AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL`,
        [data.targetId]
      );
      if (!listing.rowCount) {
        return res.status(404).json({
          error: { code: 'LISTING_NOT_FOUND', message: 'The selected hostel listing could not be verified.' }
        });
      }
    }
    const result = await pool.query(
      `INSERT INTO reports
        (subject, description, target_type, target_id, reported_against, category, priority,
         reporter_name, reporter_email, reporter_phone)
       VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7, NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, ''))
       RETURNING id, reference_code, status, created_at`,
      [data.subject, data.description, data.targetType, data.targetId || '', data.reportedAgainst,
        data.category, priority, data.reporterName || '', data.reporterEmail || '', data.reporterPhone || '']
    );
    return res.status(201).json({
      message: 'Your report has been submitted. Please keep the reference code for follow-up.',
      report: {
        id: result.rows[0].id,
        referenceCode: result.rows[0].reference_code,
        status: result.rows[0].status,
        submittedAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    return next(error);
  }
});

// Administrators can view all reports and update their review state.
router.get('/admin/complaints', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, reference_code, subject, description, target_type, target_id, reported_against,
              category, priority, status, reporter_name, reporter_email, reporter_phone, admin_note,
              reviewed_at, created_at, updated_at
       FROM reports
       ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'under_review' THEN 1 ELSE 2 END, created_at DESC
       LIMIT 1000`
    );
    const reports = result.rows.map(toReport);
    return res.json({
      reports,
      stats: {
        total: reports.length,
        pending: reports.filter((report) => report.statusKey === 'pending').length,
        underReview: reports.filter((report) => report.statusKey === 'under_review').length,
        resolved: reports.filter((report) => report.statusKey === 'resolved').length,
        dismissed: reports.filter((report) => report.statusKey === 'dismissed').length
      }
    });
  } catch (error) {
    return next(error);
  }
});

// Live platform analytics for the Reports & Analytics page.
router.get('/admin/reports/analytics', requireAuth, requireRole('admin'), async (req, res, next) => {
  const requestedDays = String(req.query.days || '30');
  if (!['7', '30', '90', 'all'].includes(requestedDays)) {
    return res.status(400).json({ error: { code: 'INVALID_PERIOD', message: 'Choose 7, 30, 90, or all days.' } });
  }
  try {
    const [hostels, agents, bookings] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM hostels WHERE deleted_at IS NULL'),
      pool.query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'agent'"),
      pool.query(
        `SELECT id, reference_code, status, created_at
         FROM inspections
         WHERE ($1 = 'all' OR created_at >= now() - (CASE WHEN $1 = 'all' THEN 0 ELSE $1::int END * interval '1 day'))
         ORDER BY created_at DESC
         LIMIT 5000`,
        [requestedDays]
      )
    ]);
    const statusLabels = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
    const rows = bookings.rows.map((row) => ({
      id: row.reference_code || row.id,
      status: statusLabels[row.status] || row.status,
      createdAt: row.created_at
    }));
    return res.json({
      period: requestedDays,
      totalHostels: hostels.rows[0].total,
      totalAgents: agents.rows[0].total,
      totalBookings: rows.length,
      completedBookings: rows.filter((row) => row.status === 'Completed').length,
      bookings: rows
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/admin/complaints/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  if (!z.string().uuid().safeParse(req.params.id).success) {
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'The report ID is invalid.' } });
  }
  const parsed = updateReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a valid status and priority.' } });
  }
  const { status, priority, adminNote } = parsed.data;
  try {
    const result = await pool.query(
      `UPDATE reports
       SET status = $1, priority = COALESCE($2, priority), admin_note = NULLIF($3, ''),
           reviewed_by = $4, reviewed_at = now(), updated_at = now()
       WHERE id = $5
       RETURNING id, reference_code, subject, description, target_type, target_id, reported_against,
                 category, priority, status, reporter_name, reporter_email, reporter_phone, admin_note,
                 reviewed_at, created_at, updated_at`,
      [status, priority || null, adminNote || '', req.user.id, req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'This report could not be found.' } });
    }
    return res.json({ report: toReport(result.rows[0]), message: 'Report updated successfully.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
