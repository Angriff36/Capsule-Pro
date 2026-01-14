-- MIGRATION: 20251225000125_core_schema_privileges.sql
-- Allow service_role to use core schema functions invoked by triggers.

GRANT USAGE ON SCHEMA core TO service_role;
