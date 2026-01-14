-- MIGRATION: 20251225000140_fix_event_timeline_rls.sql
-- Allow soft deletes while keeping updates blocked for already-deleted rows.

DROP POLICY IF EXISTS event_timeline_update ON tenant_events.event_timeline;

-- Normal updates (deleted_at stays NULL)
CREATE POLICY event_timeline_update_active ON tenant_events.event_timeline
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- Soft delete updates (deleted_at becomes non-NULL)
CREATE POLICY event_timeline_soft_delete ON tenant_events.event_timeline
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NOT NULL
  );









