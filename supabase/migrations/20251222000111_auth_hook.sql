-- MIGRATION: 20251222000111_auth_hook.sql
-- Custom Access Token Hook for injecting tenant_id into JWT claims
--
-- CRITICAL SECURITY: This hook enables RLS enforcement by injecting tenant_id
-- from employees table into JWT claims before token issuance.
--
-- Problem Without Hook:
--   - API middleware reads: user.app_metadata?.tenant_id (from Supabase getUser())
--   - RLS policies read: (auth.jwt() ->> 'tenant_id')::uuid (from JWT claims)
--   - These are DIFFERENT sources - RLS silently fails without this hook
--
-- Solution:
--   - Supabase Auth calls this function BEFORE issuing every JWT
--   - Function looks up employee by auth_user_id to get tenant_id
--   - Injects tenant_id, employee_role, employee_id into JWT claims
--   - RLS policies can now enforce tenant isolation at database level
--
-- NOTE: Function is created in 'public' schema because 'auth' schema is
-- managed by Supabase and cannot be modified via migrations. The hook URI
-- in config.toml points to: pg-functions://postgres/public/custom_access_token_hook

-- ============================================
-- PUBLIC SCHEMA HOOK FUNCTION
-- ============================================

-- Create custom_access_token_hook function in public schema
-- This function is called by Supabase Auth before token issuance
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_employee_record RECORD;
  v_claims jsonb := '{}'::jsonb;
  v_existing_claims jsonb;
BEGIN
  -- Extract user_id from event
  -- Event structure: {"user_id": "...", "claims": {...}}
  v_user_id := (event ->> 'user_id')::uuid;

  -- If no user_id, return empty claims (should not happen in normal flow)
  IF v_user_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Look up employee record by auth_user_id
  -- Must find active, non-deleted employee record
  SELECT
    e.tenant_id,
    e.id AS employee_id,
    e.role AS employee_role,
    e.is_active,
    e.deleted_at
  INTO v_employee_record
  FROM tenant_staff.employees e
  WHERE e.auth_user_id = v_user_id
    AND e.deleted_at IS NULL
  LIMIT 1;

  -- If employee record exists and is active, inject claims into JWT
  IF FOUND AND v_employee_record.is_active THEN
    -- Build claims object with tenant_id, employee_id, and role
    v_claims := jsonb_build_object(
      'tenant_id', v_employee_record.tenant_id::text,
      'employee_id', v_employee_record.employee_id::text,
      'employee_role', v_employee_record.employee_role
    );

    -- Get any existing claims from event
    v_existing_claims := (event ->> 'claims')::jsonb;

    -- Return existing claims merged with our injected claims
    RETURN coalesce(v_existing_claims, '{}'::jsonb) || v_claims;
  END IF;

  -- Edge case: No employee record OR employee is not active
  -- Return empty claims - user will get 403 when RLS checks tenant_id
  -- This prevents enumeration attacks by not revealing why auth failed
  RETURN '{}'::jsonb;
END;
$$;

-- ============================================
-- GRANTS FOR SUPABASE AUTH
-- ============================================

-- Grant supabase_auth_admin role permission to execute the hook
-- This role is used by Supabase Auth internally
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(event jsonb) TO supabase_auth_admin;

-- Grant supabase_auth_admin read access to tenant_staff.employees
-- Required for hook to look up employee by auth_user_id
GRANT SELECT ON tenant_staff.employees TO supabase_auth_admin;

-- ============================================
-- AUTH USER BOOTSTRAP (AUTO-CREATE EMPLOYEE)
-- ============================================

/**
 * @module Auth
 * @intent Bootstrap staff records for new auth users.
 * @responsibility Create tenant_staff.employees rows on auth.users insert.
 * @domain Auth
 * @tags auth, staff, bootstrap
 * @canonical true
 */

CREATE OR REPLACE FUNCTION public.handle_auth_user_bootstrap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
  v_employee_role text;
  v_first_name text;
  v_last_name text;
  v_tenant_count integer;
BEGIN
  -- Prefer app_metadata tenant_id set by trusted admin workflows.
  v_tenant_id := NULLIF(NEW.raw_app_meta_data ->> 'tenant_id', '')::uuid;

  -- If only one tenant exists, auto-assign for local/dev convenience.
  IF v_tenant_id IS NULL THEN
    SELECT COUNT(*), MIN(id)
    INTO v_tenant_count, v_tenant_id
    FROM platform.accounts
    WHERE deleted_at IS NULL;

    IF v_tenant_count != 1 THEN
      RETURN NEW;
    END IF;
  END IF;

  v_employee_role := NULLIF(NEW.raw_app_meta_data ->> 'employee_role', '');
  v_first_name := NULLIF(NEW.raw_user_meta_data ->> 'first_name', '');
  v_last_name := NULLIF(NEW.raw_user_meta_data ->> 'last_name', '');

  IF v_employee_role IS NULL THEN
    SELECT COUNT(*) INTO v_tenant_count
    FROM tenant_staff.employees
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL;

    v_employee_role := CASE WHEN v_tenant_count = 0 THEN 'admin' ELSE 'staff' END;
  END IF;

  INSERT INTO tenant_staff.employees (
    tenant_id,
    auth_user_id,
    email,
    first_name,
    last_name,
    role,
    employment_type,
    hourly_rate
  ) VALUES (
    v_tenant_id,
    NEW.id,
    NEW.email,
    COALESCE(v_first_name, 'Test'),
    COALESCE(v_last_name, 'User'),
    v_employee_role,
    'full_time',
    0
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_bootstrap ON auth.users;
CREATE TRIGGER on_auth_user_bootstrap
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_bootstrap();

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify hook function was created
DO $$
DECLARE
  v_function_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'custom_access_token_hook'
      AND n.nspname = 'public'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE 'Hook function created successfully';
  ELSE
    RAISE EXCEPTION 'Hook function not found';
  END IF;
END $$;

-- Verify grants on hook function
DO $$
DECLARE
  v_grants_exist integer;
BEGIN
  SELECT count(*) INTO v_grants_exist
  FROM information_schema.role_routine_grants
  WHERE routine_schema = 'public'
    AND routine_name = 'custom_access_token_hook'
    AND grantee = 'supabase_auth_admin';

  IF v_grants_exist > 0 THEN
    RAISE NOTICE 'Hook function grants verified';
  ELSE
    RAISE EXCEPTION 'Hook function grants missing';
  END IF;
END $$;

-- Verify grants on employees table
DO $$
DECLARE
  v_grants_exist integer;
BEGIN
  SELECT count(*) INTO v_grants_exist
  FROM information_schema.role_table_grants
  WHERE table_schema = 'tenant_staff'
    AND table_name = 'employees'
    AND grantee = 'supabase_auth_admin'
    AND privilege_type = 'SELECT';

  IF v_grants_exist > 0 THEN
    RAISE NOTICE 'Employees table grants verified';
  ELSE
    RAISE EXCEPTION 'Employees table grants missing';
  END IF;
END $$;

-- ============================================
-- DOCUMENTATION
-- ============================================

/*
 * Claims Injected Into JWT:
 *   - tenant_id (text): UUID of tenant from employees.tenant_id
 *   - employee_id (text): UUID of employee from employees.id
 *   - employee_role (text): Employee role from employees.role
 *
 * Edge Cases Handled:
 *   1. User without employee record:
 *      - Returns empty claims '{}'
 *      - User receives 403 Forbidden on API requests
 *      - No error message (prevents enumeration attacks)
 *
 *   2. Deactivated employee (is_active = false):
 *      - Returns empty claims '{}'
 *      - User is locked out until reactivated
 *      - Prevents terminated employee access
 *
 *   3. Soft-deleted employee (deleted_at IS NOT NULL):
 *      - Not found by SELECT query
 *      - Returns empty claims '{}'
 *      - User is locked out
 *
 *   4. Token refresh:
 *      - Hook runs again on refresh
 *      - Picks up current employee state
 *      - Allows immediate lockout on deactivation
 *
 * Security Considerations:
 *   - SECURITY DEFINER: Runs with database owner privileges
 *   - SET search_path = '': Prevents SQL injection via search path
 *   - No dynamic SQL: All queries are static and parameterized
 *   - Minimal grants: Only SELECT on employees table
 *   - Silent failures: Returns empty claims, no error messages
 *
 * RLS Integration:
 *   All RLS policies read tenant_id from JWT claims:
 *     tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
 *
 *   With this hook enabled:
 *     - JWT contains tenant_id injected by hook
 *     - RLS policies can filter by tenant
 *     - Cross-tenant queries return EMPTY results
 *     - Service role still bypasses RLS for admin operations
 *
 * Config Integration:
 *   The hook is enabled in supabase/config.toml:
 *   [auth.hook.custom_access_token]
 *   enabled = true
 *   uri = "pg-functions://postgres/public/custom_access_token_hook"
 *
 * Testing:
 *   1. Create test tenant and employee
 *   2. Sign in as employee via Supabase Auth
 *   3. Inspect JWT claims: should contain tenant_id
 *   4. Query with user token: should only see tenant's data
 *   5. Query with service_role: should see all data (bypasses RLS)
 */
