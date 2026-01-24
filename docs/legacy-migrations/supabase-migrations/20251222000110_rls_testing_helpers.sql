-- MIGRATION: 20251222000110_rls_testing_helpers.sql
-- Testing helper functions for RLS adversarial security tests
-- Purpose: Allow tests to simulate different auth contexts without real JWT tokens
--
-- These functions are SECURITY DEFINER and should only be used in testing environments.
-- They set Postgres session variables that auth.jwt() reads, allowing tests to verify
-- RLS policies work correctly under different tenant contexts.

-- ============================================
-- TESTING SCHEMA
-- ============================================

-- Create testing schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS testing;

-- ============================================
-- HELPER FUNCTION: Execute SQL as specific tenant
-- ============================================

-- This function sets Postgres session variables to simulate a user's JWT claims,
-- then executes SQL with that auth context. This allows testing RLS policies
-- without creating real auth users.
--
-- Parameters:
--   p_tenant_id: The tenant_id to set in the JWT context
--   p_user_id: The user ID (sub claim) to set in the JWT context
--   p_sql: The SQL to execute with the simulated auth context
--
-- Returns: setof jsonb - allows returning multiple rows or single values
CREATE OR REPLACE FUNCTION testing.exec_sql_as_tenant(
  p_tenant_id uuid,
  p_user_id uuid,
  p_sql text
)
RETURNS setof jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claims jsonb;
  v_result jsonb;
BEGIN
  -- Build mock JWT claims with tenant_id
  -- This matches the structure Supabase uses in real JWTs
  -- IMPORTANT: tenant_id must be a UUID string (not json type) for RLS comparison
  v_claims = jsonb_build_object(
    'iss', 'supabase',
    'aud', 'authenticated',
    'sub', p_user_id::text,
    'role', 'authenticated',
    'tenant_id', p_tenant_id::text,  -- UUID as string for auth.jwt() ->> 'tenant_id'
    'app_metadata', jsonb_build_object(
      'tenant_id', p_tenant_id::text,
      'provider', 'email'
    ),
    'user_metadata', jsonb_build_object(),
    'email', '',
    'phone', '',
    'is_anonymous', false
  );

  -- Set the JWT claims in the session variable
  -- This is what auth.jwt() reads in RLS policies
  -- The third parameter 'true' means it's local to the transaction
  PERFORM set_config('request.jwt.claims', v_claims::text, true);

  -- Set request.jwt.claim.sub as well (some RLS policies might use this)
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);

  -- Execute the SQL with our simulated auth context
  -- Using RETURN QUERY EXECUTE allows returning multiple rows
  RETURN QUERY EXECUTE p_sql;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error information for debugging
    RETURN QUERY SELECT jsonb_build_object(
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'context', 'Error executing SQL with simulated auth context'
    )::jsonb;
END;
$$;

-- Grant execute to service_role only (for testing)
GRANT EXECUTE ON FUNCTION testing.exec_sql_as_tenant TO service_role;

-- Revoke from all other roles for security
REVOKE EXECUTE ON FUNCTION testing.exec_sql_as_tenant FROM authenticated, anon, public;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify function created
SELECT proname as function_name
FROM pg_proc
WHERE pronamespace = 'testing'::regnamespace
  AND proname = 'exec_sql_as_tenant';

-- Verify permissions
SELECT grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema = 'testing'
  AND routine_name = 'exec_sql_as_tenant';
