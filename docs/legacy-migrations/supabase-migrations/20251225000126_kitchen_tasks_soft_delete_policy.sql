-- MIGRATION: 20251225000126_kitchen_tasks_soft_delete_policy.sql
-- Allow soft deletes while keeping updates blocked for already-deleted rows.

DROP POLICY IF EXISTS kitchen_tasks_update ON tenant_kitchen.kitchen_tasks;

-- Normal updates (deleted_at stays NULL)
CREATE POLICY kitchen_tasks_update_active ON tenant_kitchen.kitchen_tasks
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- Soft delete updates (deleted_at becomes non-NULL)
CREATE POLICY kitchen_tasks_soft_delete ON tenant_kitchen.kitchen_tasks
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NOT NULL
  );
