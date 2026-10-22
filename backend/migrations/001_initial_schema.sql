-- Hostel Hub initial schema.
-- Students do not need accounts; users are agents and administrators only.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(120) NOT NULL,
  email varchar(254) NOT NULL,
  phone varchar(25),
  password_hash text NOT NULL,
  role varchar(20) NOT NULL CHECK (role IN ('agent', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE INDEX IF NOT EXISTS users_role_active_idx ON users (role, is_active);

CREATE TABLE IF NOT EXISTS hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(140) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  description text NOT NULL,
  location varchar(180) NOT NULL,
  address text,
  price_ngn bigint NOT NULL CHECK (price_ngn >= 0),
  price_period varchar(20) NOT NULL DEFAULT 'year'
    CHECK (price_period IN ('year', 'month', 'semester', 'one_time')),
  room_type varchar(80) NOT NULL,
  occupancy smallint CHECK (occupancy IS NULL OR occupancy > 0),
  facilities text[] NOT NULL DEFAULT '{}',
  video_url text NOT NULL,
  availability_status varchar(20) NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'unavailable', 'limited')),
  approval_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  is_active boolean NOT NULL DEFAULT true,
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT hostel_video_required CHECK (length(trim(video_url)) > 0)
);

CREATE INDEX IF NOT EXISTS hostels_public_listing_idx
  ON hostels (approval_status, is_active, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS hostels_agent_idx ON hostels (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hostels_location_idx ON hostels (lower(location));
CREATE INDEX IF NOT EXISTS hostels_price_idx ON hostels (price_ngn);

CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code varchar(20) NOT NULL UNIQUE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT,
  agent_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  student_name varchar(120) NOT NULL,
  student_phone varchar(25) NOT NULL,
  student_email varchar(254),
  preferred_date date NOT NULL,
  preferred_time varchar(30) NOT NULL,
  message varchar(2000),
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notification_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending', 'sent', 'failed', 'not_configured')),
  notification_error text,
  notification_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inspections_agent_status_idx
  ON inspections (agent_id, status, preferred_date);
CREATE INDEX IF NOT EXISTS inspections_hostel_idx
  ON inspections (hostel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inspections_created_idx
  ON inspections (created_at DESC);

CREATE TABLE IF NOT EXISTS listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid REFERENCES hostels(id) ON DELETE SET NULL,
  hostel_id_submitted varchar(140),
  hostel_name_submitted varchar(180),
  hostel_location_submitted varchar(180),
  reason varchar(50) NOT NULL CHECK (reason IN (
    'incorrect-information', 'fake-listing', 'wrong-price',
    'hostel-unavailable', 'misleading-video', 'agent-issue', 'other'
  )),
  details varchar(5000) NOT NULL,
  reporter_name varchar(120) NOT NULL,
  reporter_phone varchar(25) NOT NULL,
  reporter_email varchar(254),
  status varchar(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_reports_status_idx
  ON listing_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS listing_reports_hostel_idx
  ON listing_reports (hostel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(60) NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);