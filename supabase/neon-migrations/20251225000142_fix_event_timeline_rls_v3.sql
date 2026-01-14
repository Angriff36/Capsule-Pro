-- MIGRATION: 20251225000142_fix_event_timeline_rls_v3.sql
-- Relax RLS update policy to allow soft deletes more easily.

DROP POLICY IF EXISTS event_timeline_update ON tenant_events.event_timeline;

-- Allow update on any row owned by tenant (service layer handles active row filtering)
CREATE POLICY event_timeline_update ON tenant_events.event_timeline
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );









