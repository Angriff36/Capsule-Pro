-- MIGRATION: 20260120000000_auth_user_id_text.sql
-- Purpose: Allow Clerk user IDs (text strings) in the staff auth_user_id column.

ALTER TABLE tenant_staff.employees
  ALTER COLUMN auth_user_id
    SET DATA TYPE text
    USING auth_user_id::text;

