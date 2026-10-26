-- Track admin removals separately from agent-deactivated listings so only admin-removed hostels can be restored with the admin action.
ALTER TABLE hostels
  ADD COLUMN IF NOT EXISTS admin_removed_at timestamptz;
