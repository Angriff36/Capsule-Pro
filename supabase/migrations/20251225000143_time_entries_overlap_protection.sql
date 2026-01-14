-- MIGRATION: 20251225000143_time_entries_overlap_protection.sql
-- Implement overlap detection for time entries using EXCLUDE constraints.

-- Ensure btree_gist extension is available (should be from 00104)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add the exclusion constraint to prevent overlapping time entries for the same employee within a tenant.
-- We use tstzrange(clock_in, COALESCE(clock_out, 'infinity'), '[)') to handle open shifts (NULL clock_out).
-- [) means inclusive start, exclusive end.
ALTER TABLE tenant_staff.time_entries
  ADD CONSTRAINT time_entries_no_overlap_excl
  EXCLUDE USING GIST (
    tenant_id WITH =,
    employee_id WITH =,
    tstzrange(clock_in, COALESCE(clock_out, 'infinity'), '[)') WITH &&
  ) WHERE (deleted_at IS NULL);

-- Add index for the tstzrange to speed up overlap checks
CREATE INDEX IF NOT EXISTS time_entries_range_idx 
  ON tenant_staff.time_entries USING GIST (
    tenant_id, 
    employee_id, 
    tstzrange(clock_in, COALESCE(clock_out, 'infinity'), '[)')
  ) WHERE (deleted_at IS NULL);

