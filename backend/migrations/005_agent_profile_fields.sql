-- Agent profile fields not covered by the original account schema.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whatsapp_phone varchar(25),
  ADD COLUMN IF NOT EXISTS business_address varchar(180),
  ADD COLUMN IF NOT EXISTS bio varchar(600),
  ADD COLUMN IF NOT EXISTS agency_name varchar(120),
  ADD COLUMN IF NOT EXISTS agency_type varchar(40) NOT NULL DEFAULT 'Independent Agent',
  ADD COLUMN IF NOT EXISTS agency_website varchar(250);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_agency_type_check;

ALTER TABLE users
  ADD CONSTRAINT users_agency_type_check
  CHECK (agency_type IN ('Independent Agent', 'Registered Agency', 'Property Manager', 'Landlord'));
