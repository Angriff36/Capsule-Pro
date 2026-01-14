-- MIGRATION: 20251225000145_fix_employees_rls.sql
-- Fix RLS policies for tenant_staff.employees to use core.fn_get_jwt_tenant_id()

DROP POLICY IF EXISTS employees_select ON tenant_staff.employees;
DROP POLICY IF EXISTS employees_insert ON tenant_staff.employees;
DROP POLICY IF EXISTS employees_update ON tenant_staff.employees;

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









