-- MIGRATION: 20251225000123_platform_schema_privileges.sql
-- Grant service_role access to platform schema for test setup and admin operations.

GRANT USAGE ON SCHEMA platform TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA platform TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform GRANT USAGE ON SEQUENCES TO service_role;
