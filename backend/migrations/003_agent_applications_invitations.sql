-- Agent applications and secure, single-use agent invitations.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS agent_application_status varchar(20)
    CHECK (agent_application_status IS NULL OR agent_application_status IN ('pending', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note varchar(1000),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_applications_status_created_idx
  ON agent_applications (status, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(120) NOT NULL,
  email varchar(254) NOT NULL,
  phone varchar(25),
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_invitations_email_lowercase CHECK (email = lower(email))
);
CREATE INDEX IF NOT EXISTS agent_invitations_email_idx ON agent_invitations (email);
CREATE INDEX IF NOT EXISTS agent_invitations_expiry_idx ON agent_invitations (expires_at);
