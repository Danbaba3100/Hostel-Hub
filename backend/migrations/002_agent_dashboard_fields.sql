-- Additional fields used by the agent listing form.
ALTER TABLE hostels
  ADD COLUMN IF NOT EXISTS caution_fee_ngn bigint NOT NULL DEFAULT 0 CHECK (caution_fee_ngn >= 0),
  ADD COLUMN IF NOT EXISTS agency_fee_ngn bigint NOT NULL DEFAULT 0 CHECK (agency_fee_ngn >= 0),
  ADD COLUMN IF NOT EXISTS agreement_fee_ngn bigint NOT NULL DEFAULT 0 CHECK (agreement_fee_ngn >= 0),
  ADD COLUMN IF NOT EXISTS service_charge_ngn bigint NOT NULL DEFAULT 0 CHECK (service_charge_ngn >= 0),
  ADD COLUMN IF NOT EXISTS distance_from_campus varchar(100),
  ADD COLUMN IF NOT EXISTS units_available smallint CHECK (units_available IS NULL OR units_available > 0);
