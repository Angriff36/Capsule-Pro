-- MIGRATION: 20251225000133_prep_tasks_soft_delete_policy.sql
-- Allow soft deletes while keeping updates blocked for already-deleted rows.

-- Drop the single update policy
DROP POLICY IF EXISTS prep_tasks_update ON tenant_kitchen.prep_tasks;

-- Normal updates (deleted_at stays NULL)
CREATE POLICY prep_tasks_update_active ON tenant_kitchen.prep_tasks
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- Soft delete updates (deleted_at becomes non-NULL)
CREATE POLICY prep_tasks_soft_delete ON tenant_kitchen.prep_tasks
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NOT NULL
  );

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'tenant_kitchen'
  AND tablename = 'prep_tasks'
  AND cmd = 'UPDATE'
ORDER BY policyname;
