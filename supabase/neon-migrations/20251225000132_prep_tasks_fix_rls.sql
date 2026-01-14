-- MIGRATION: 20251225000132_prep_tasks_fix_rls.sql
-- Fix RLS policies for prep_tasks, task_claims, task_progress to use fn_get_jwt_tenant_id
-- This ensures compatibility with local dev (app_metadata fallback)

-- ============================================
-- FIX PREP_TASKS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS prep_tasks_select ON tenant_kitchen.prep_tasks;
DROP POLICY IF EXISTS prep_tasks_insert ON tenant_kitchen.prep_tasks;
DROP POLICY IF EXISTS prep_tasks_update ON tenant_kitchen.prep_tasks;
DROP POLICY IF EXISTS prep_tasks_delete ON tenant_kitchen.prep_tasks;

-- Recreate with fn_get_jwt_tenant_id for local dev compatibility
CREATE POLICY prep_tasks_select ON tenant_kitchen.prep_tasks
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY prep_tasks_insert ON tenant_kitchen.prep_tasks
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY prep_tasks_update ON tenant_kitchen.prep_tasks
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY prep_tasks_delete ON tenant_kitchen.prep_tasks
  FOR DELETE USING (false);

-- ============================================
-- FIX TASK_CLAIMS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS task_claims_select ON tenant_kitchen.task_claims;
DROP POLICY IF EXISTS task_claims_insert ON tenant_kitchen.task_claims;
DROP POLICY IF EXISTS task_claims_update ON tenant_kitchen.task_claims;
DROP POLICY IF EXISTS task_claims_delete ON tenant_kitchen.task_claims;

-- Recreate with fn_get_jwt_tenant_id for local dev compatibility
CREATE POLICY task_claims_select ON tenant_kitchen.task_claims
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY task_claims_insert ON tenant_kitchen.task_claims
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY task_claims_update ON tenant_kitchen.task_claims
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY task_claims_delete ON tenant_kitchen.task_claims
  FOR DELETE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- FIX TASK_PROGRESS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS task_progress_select ON tenant_kitchen.task_progress;
DROP POLICY IF EXISTS task_progress_insert ON tenant_kitchen.task_progress;
DROP POLICY IF EXISTS task_progress_update ON tenant_kitchen.task_progress;
DROP POLICY IF EXISTS task_progress_delete ON tenant_kitchen.task_progress;

-- Recreate with fn_get_jwt_tenant_id for local dev compatibility
CREATE POLICY task_progress_select ON tenant_kitchen.task_progress
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY task_progress_insert ON tenant_kitchen.task_progress
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY task_progress_update ON tenant_kitchen.task_progress
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY task_progress_delete ON tenant_kitchen.task_progress
  FOR DELETE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- ENABLE REALTIME FOR PREP_TASKS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'tenant_kitchen'
      AND tablename = 'prep_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tenant_kitchen.prep_tasks;
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'tenant_kitchen'
  AND tablename IN ('prep_tasks', 'task_claims', 'task_progress')
ORDER BY tablename, policyname;
