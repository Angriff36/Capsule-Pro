-- MIGRATION: 20251225000141_fix_event_timeline_triggers_and_rls.sql
-- Fix incorrect trigger function and ensure RLS allows soft deletes.

-- 1. Fix trigger
DROP TRIGGER IF EXISTS event_timeline_prevent_tenant_mutation ON tenant_events.event_timeline;
CREATE TRIGGER event_timeline_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.event_timeline
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- 2. Simplify RLS update policy (trigger handles tenant mutation prevention)
DROP POLICY IF EXISTS event_timeline_update_active ON tenant_events.event_timeline;
DROP POLICY IF EXISTS event_timeline_soft_delete ON tenant_events.event_timeline;
DROP POLICY IF EXISTS event_timeline_update ON tenant_events.event_timeline;

CREATE POLICY event_timeline_update ON tenant_events.event_timeline
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );









