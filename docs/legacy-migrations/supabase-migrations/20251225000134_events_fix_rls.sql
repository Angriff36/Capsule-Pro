-- MIGRATION: 20251225000134_events_fix_rls.sql
-- Fixes RLS policies for events to use core.fn_get_jwt_tenant_id()
-- This enables local development testing with app_metadata fallback

-- Drop existing policies
DROP POLICY IF EXISTS events_select ON tenant_events.events;
DROP POLICY IF EXISTS events_insert ON tenant_events.events;
DROP POLICY IF EXISTS events_update ON tenant_events.events;
DROP POLICY IF EXISTS events_delete ON tenant_events.events;
DROP POLICY IF EXISTS events_service ON tenant_events.events;

-- Recreate policies with correct tenant_id function
CREATE POLICY events_select ON tenant_events.events
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY events_insert ON tenant_events.events
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY events_update ON tenant_events.events
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY events_delete ON tenant_events.events
  FOR DELETE USING (false);

-- Add service role policy for admin bypass
CREATE POLICY events_service ON tenant_events.events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'tenant_events'
  AND tablename = 'events'
ORDER BY policyname;

