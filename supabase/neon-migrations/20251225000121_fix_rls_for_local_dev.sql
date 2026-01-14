-- MIGRATION: 20251225000121_fix_rls_for_local_dev.sql
-- Fix RLS policies to work in Supabase Local where auth hooks don't run
--
-- Problem:
--   Supabase Local does NOT support custom access token hooks
--   The auth hook (which injects tenant_id into JWT claims) only works in hosted Supabase
--   RLS policies that check auth.jwt() ->> 'tenant_id' fail in local development
--
-- Solution:
--   Modify RLS policies to fall back to auth.jwt() ->> 'app_metadata' ->> 'tenant_id'
--   This allows tests to work locally while maintaining production security
--
-- Production (hosted Supabase):
--   - Auth hook injects tenant_id at top level of JWT claims
--   - RLS uses: auth.jwt() ->> 'tenant_id'
--
-- Local (Supabase Local):
--   - Auth hook doesn't run, tenant_id is in app_metadata
--   - RLS uses: COALESCE(auth.jwt() ->> 'tenant_id', auth.jwt() ->> 'app_metadata' ->> 'tenant_id')
--
-- Security Note:
--   This fallback is SAFE because app_metadata is set by Supabase Auth admin
--   and cannot be modified by users. The tenant_id in app_metadata comes from
--   the same source (tenant_staff.employees) that the auth hook uses.

-- ============================================
-- KITCHEN TASKS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS kitchen_tasks_select ON tenant_kitchen.kitchen_tasks;
DROP POLICY IF EXISTS kitchen_tasks_insert ON tenant_kitchen.kitchen_tasks;
DROP POLICY IF EXISTS kitchen_tasks_update ON tenant_kitchen.kitchen_tasks;
DROP POLICY IF EXISTS kitchen_tasks_delete ON tenant_kitchen.kitchen_tasks;
DROP POLICY IF EXISTS kitchen_tasks_service ON tenant_kitchen.kitchen_tasks;

-- Create helper function to extract tenant_id from JWT
-- This function handles both production (with auth hook) and local (without auth hook) cases
CREATE OR REPLACE FUNCTION core.fn_get_jwt_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claims jsonb;
  v_tenant_id text;
BEGIN
  v_claims := auth.jwt();

  -- Try top-level tenant_id first (production auth hook), then fall back to app_metadata (local)
  v_tenant_id := v_claims ->> 'tenant_id';

  IF v_tenant_id IS NULL THEN
    v_tenant_id := v_claims #>> '{app_metadata,tenant_id}';
  END IF;

  -- Return null if neither exists (RLS will reject)
  RETURN v_tenant_id::uuid;
EXCEPTION
  WHEN OTHERS THEN
    -- If cast fails, return null
    RETURN NULL;
END;
$$;

-- Re-create policies with fallback tenant_id extraction
CREATE POLICY kitchen_tasks_select ON tenant_kitchen.kitchen_tasks
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY kitchen_tasks_insert ON tenant_kitchen.kitchen_tasks
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY kitchen_tasks_update ON tenant_kitchen.kitchen_tasks
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY kitchen_tasks_delete ON tenant_kitchen.kitchen_tasks
  FOR DELETE USING (false);

CREATE POLICY kitchen_tasks_service ON tenant_kitchen.kitchen_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- STAFF EMPLOYEES RLS POLICIES (for test user creation)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS employees_select ON tenant_staff.employees;
DROP POLICY IF EXISTS employees_insert ON tenant_staff.employees;
DROP POLICY IF EXISTS employees_update ON tenant_staff.employees;
DROP POLICY IF EXISTS employees_delete ON tenant_staff.employees;
DROP POLICY IF EXISTS employees_service ON tenant_staff.employees;

-- Re-create with fallback tenant_id extraction
CREATE POLICY employees_select ON tenant_staff.employees
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY employees_insert ON tenant_staff.employees
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employees_update ON tenant_staff.employees
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY employees_delete ON tenant_staff.employees
  FOR DELETE USING (false);

CREATE POLICY employees_service ON tenant_staff.employees
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- GRANT EXECUTE ON HELPER FUNCTION
-- ============================================

GRANT EXECUTE ON FUNCTION core.fn_get_jwt_tenant_id() TO authenticated, service_role;
