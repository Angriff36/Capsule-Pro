-- MIGRATION: 20251225000120_tenant_schema_privileges.sql
-- Grant USAGE and table privileges on tenant_* schemas to service_role and authenticated roles
-- This enables the API and authenticated users to access tenant-scoped tables while RLS policies enforce isolation

-- NOTE: These grants DO NOT bypass RLS. RLS policies (created in each schema's migration)
-- still enforce tenant isolation. These grants simply allow the roles to CONNECT to the schemas
-- and ACCESS the tables - RLS policies determine what DATA they can see/modify.

-- ============================================
-- SCHEMA USAGE PRIVILEGES
-- ============================================

-- Grant USAGE on all tenant_* schemas to service_role (for admin operations)
GRANT USAGE ON SCHEMA tenant TO service_role;
GRANT USAGE ON SCHEMA tenant_kitchen TO service_role;
GRANT USAGE ON SCHEMA tenant_staff TO service_role;
GRANT USAGE ON SCHEMA tenant_crm TO service_role;
GRANT USAGE ON SCHEMA tenant_admin TO service_role;
GRANT USAGE ON SCHEMA tenant_events TO service_role;
GRANT USAGE ON SCHEMA tenant_inventory TO service_role;

-- Grant USAGE on all tenant_* schemas to authenticated (for user operations)
GRANT USAGE ON SCHEMA tenant TO authenticated;
GRANT USAGE ON SCHEMA tenant_kitchen TO authenticated;
GRANT USAGE ON SCHEMA tenant_staff TO authenticated;
GRANT USAGE ON SCHEMA tenant_crm TO authenticated;
GRANT USAGE ON SCHEMA tenant_admin TO authenticated;
GRANT USAGE ON SCHEMA tenant_events TO authenticated;
GRANT USAGE ON SCHEMA tenant_inventory TO authenticated;

-- Grant USAGE on platform schema to authenticated (needed for accounts reference in some queries)
GRANT USAGE ON SCHEMA platform TO authenticated;
GRANT USAGE ON SCHEMA core TO authenticated;

-- ============================================
-- TABLE PRIVILEGES (Minimal - RLS enforces isolation)
-- ============================================

-- Grant ALL PRIVILEGES on all tenant_* tables to service_role
-- service_role bypasses RLS via the policies, but needs table access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_kitchen TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_staff TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_crm TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_admin TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_events TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant_inventory TO service_role;

-- Grant SELECT, INSERT, UPDATE on all tenant_* tables to authenticated
-- RLS policies will enforce:
-- - SELECT: only user's tenant_id
-- - INSERT: only user's tenant_id
-- - UPDATE: only user's tenant_id, deleted_at IS NULL
-- - DELETE: blocked by RLS policies (soft delete via UPDATE)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA tenant TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA tenant_kitchen TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA tenant_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA tenant_crm TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA tenant_admin TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA tenant_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA tenant_inventory TO authenticated;

-- Grant SELECT on platform.accounts to authenticated (for tenant reference)
GRANT SELECT ON ALL TABLES IN SCHEMA platform TO authenticated;

-- ============================================
-- SEQUENCE PRIVILEGES (for auto-increment IDs)
-- ============================================

-- Grant USAGE on all sequences in tenant_* schemas to service_role and authenticated
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant TO service_role, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant_kitchen TO service_role, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant_staff TO service_role, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant_crm TO service_role, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant_admin TO service_role, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant_events TO service_role, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA tenant_inventory TO service_role, authenticated;

-- ============================================
-- FUNCTION PRIVILEGES (for utility functions)
-- ============================================

-- Grant EXECUTE on core functions to authenticated and service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA core TO authenticated, service_role;

-- ============================================
-- DEFAULT PRIVILEGES (for future tables)
-- ============================================

-- Set default privileges for service_role on tenant_* schemas
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_kitchen GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_staff GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_crm GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_admin GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_events GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_inventory GRANT ALL PRIVILEGES ON TABLES TO service_role;

-- Set default privileges for authenticated on tenant_* schemas
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_kitchen GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_staff GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_crm GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_admin GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_events GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_inventory GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;

-- Set default privileges on sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant GRANT USAGE ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_kitchen GRANT USAGE ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_staff GRANT USAGE ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_crm GRANT USAGE ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_admin GRANT USAGE ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_events GRANT USAGE ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA tenant_inventory GRANT USAGE ON SEQUENCES TO authenticated, service_role;
