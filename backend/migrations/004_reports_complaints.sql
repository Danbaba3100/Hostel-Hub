-- Persistent public reports and complaints reviewed by Hostel Hub administrators.
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code varchar(20) NOT NULL UNIQUE
    DEFAULT ('RPT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  subject varchar(180) NOT NULL,
  description varchar(4000) NOT NULL,
  target_type varchar(20) NOT NULL CHECK (target_type IN ('hostel', 'agent', 'other')),
  target_id varchar(180),
  reported_against varchar(180) NOT NULL,
  category varchar(20) NOT NULL CHECK (category IN ('hostel', 'agent', 'payment', 'fraud', 'other')),
  priority varchar(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  reporter_name varchar(120),
  reporter_email varchar(254),
  reporter_phone varchar(25),
  admin_note varchar(2000),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_reporter_contact CHECK (
    reporter_email IS NULL OR reporter_email = lower(reporter_email)
  )
);
CREATE INDEX IF NOT EXISTS reports_status_created_idx ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_category_idx ON reports (category, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_target_idx ON reports (target_type, target_id);
