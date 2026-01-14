-- MIGRATION: 20251225000127_fix_kitchen_realtime_rls.sql
-- Fix RLS policies for task_claims and task_progress tables for local dev
--
-- Problem:
--   task_claims and task_progress tables use auth.jwt() ->> 'tenant_id' which fails
--   in Supabase Local where auth hooks don't run
--
-- Solution:
--   Update RLS policies to use core.fn_get_jwt_tenant_id() which falls back to
--   app_metadata.tenant_id when the auth hook hasn't injected tenant_id
--
-- Note:
--   core.fn_get_jwt_tenant_id() was created in migration 20251225000121
--   This migration applies the same fix to task_claims and task_progress

-- ============================================
-- TASK_CLAIMS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS task_claims_select ON tenant_kitchen.task_claims;
DROP POLICY IF EXISTS task_claims_insert ON tenant_kitchen.task_claims;
DROP POLICY IF EXISTS task_claims_update ON tenant_kitchen.task_claims;
DROP POLICY IF EXISTS task_claims_delete ON tenant_kitchen.task_claims;
DROP POLICY IF EXISTS task_claims_service ON tenant_kitchen.task_claims;

-- Re-create policies with fallback tenant_id extraction
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
  FOR DELETE USING (false);

CREATE POLICY task_claims_service ON tenant_kitchen.task_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TASK_PROGRESS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS task_progress_select ON tenant_kitchen.task_progress;
DROP POLICY IF EXISTS task_progress_insert ON tenant_kitchen.task_progress;
DROP POLICY IF EXISTS task_progress_update ON tenant_kitchen.task_progress;
DROP POLICY IF EXISTS task_progress_delete ON tenant_kitchen.task_progress;
DROP POLICY IF EXISTS task_progress_service ON tenant_kitchen.task_progress;

-- Re-create policies with fallback tenant_id extraction
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
  FOR UPDATE USING (false);

CREATE POLICY task_progress_delete ON tenant_kitchen.task_progress
  FOR DELETE USING (false);

CREATE POLICY task_progress_service ON tenant_kitchen.task_progress
  FOR ALL TO service_role USING (true) WITH CHECK (true);
