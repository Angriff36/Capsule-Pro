-- MIGRATION: 20251225000137_event_staff_assignments_soft_delete.sql
-- Allow soft deletes while keeping updates blocked for already-deleted rows.

DROP POLICY IF EXISTS event_staff_assignments_update ON tenant_events.event_staff_assignments;

-- Normal updates (deleted_at stays NULL)
CREATE POLICY event_staff_assignments_update_active ON tenant_events.event_staff_assignments
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- Soft delete updates (deleted_at becomes non-NULL)
CREATE POLICY event_staff_assignments_soft_delete ON tenant_events.event_staff_assignments
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NOT NULL
  );









