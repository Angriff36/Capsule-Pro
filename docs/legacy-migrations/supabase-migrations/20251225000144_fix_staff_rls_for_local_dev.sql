-- MIGRATION: 20251225000144_fix_staff_rls_for_local_dev.sql
-- Fix RLS policies for staff-related tables to use core.fn_get_jwt_tenant_id()
-- for local development compatibility and allow soft deletes.

-- ============================================
-- EMPLOYEE_LOCATIONS
-- ============================================
DROP POLICY IF EXISTS employee_locations_select ON tenant_staff.employee_locations;
DROP POLICY IF EXISTS employee_locations_insert ON tenant_staff.employee_locations;
DROP POLICY IF EXISTS employee_locations_update ON tenant_staff.employee_locations;

CREATE POLICY employee_locations_select ON tenant_staff.employee_locations
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY employee_locations_insert ON tenant_staff.employee_locations
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employee_locations_update ON tenant_staff.employee_locations
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- EMPLOYEE_CERTIFICATIONS
-- ============================================
DROP POLICY IF EXISTS employee_certifications_select ON tenant_staff.employee_certifications;
DROP POLICY IF EXISTS employee_certifications_insert ON tenant_staff.employee_certifications;
DROP POLICY IF EXISTS employee_certifications_update ON tenant_staff.employee_certifications;

CREATE POLICY employee_certifications_select ON tenant_staff.employee_certifications
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY employee_certifications_insert ON tenant_staff.employee_certifications
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employee_certifications_update ON tenant_staff.employee_certifications
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- EMPLOYEE_AVAILABILITY
-- ============================================
DROP POLICY IF EXISTS employee_availability_select ON tenant_staff.employee_availability;
DROP POLICY IF EXISTS employee_availability_insert ON tenant_staff.employee_availability;
DROP POLICY IF EXISTS employee_availability_update ON tenant_staff.employee_availability;

CREATE POLICY employee_availability_select ON tenant_staff.employee_availability
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY employee_availability_insert ON tenant_staff.employee_availability
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employee_availability_update ON tenant_staff.employee_availability
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- SCHEDULES
-- ============================================
DROP POLICY IF EXISTS schedules_select ON tenant_staff.schedules;
DROP POLICY IF EXISTS schedules_insert ON tenant_staff.schedules;
DROP POLICY IF EXISTS schedules_update ON tenant_staff.schedules;

CREATE POLICY schedules_select ON tenant_staff.schedules
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY schedules_insert ON tenant_staff.schedules
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY schedules_update ON tenant_staff.schedules
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- SCHEDULE_SHIFTS
-- ============================================
DROP POLICY IF EXISTS schedule_shifts_select ON tenant_staff.schedule_shifts;
DROP POLICY IF EXISTS schedule_shifts_insert ON tenant_staff.schedule_shifts;
DROP POLICY IF EXISTS schedule_shifts_update ON tenant_staff.schedule_shifts;

CREATE POLICY schedule_shifts_select ON tenant_staff.schedule_shifts
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY schedule_shifts_insert ON tenant_staff.schedule_shifts
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY schedule_shifts_update ON tenant_staff.schedule_shifts
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- TIME_ENTRIES
-- ============================================
DROP POLICY IF EXISTS time_entries_select ON tenant_staff.time_entries;
DROP POLICY IF EXISTS time_entries_insert ON tenant_staff.time_entries;
DROP POLICY IF EXISTS time_entries_update ON tenant_staff.time_entries;
DROP POLICY IF EXISTS time_entries_update_active ON tenant_staff.time_entries;
DROP POLICY IF EXISTS time_entries_soft_delete ON tenant_staff.time_entries;

CREATE POLICY time_entries_select ON tenant_staff.time_entries
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    -- Allow selecting deleted records if we need to verify deletion
  );

CREATE POLICY time_entries_insert ON tenant_staff.time_entries
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

-- Single update policy that handles both active updates and soft deletes
CREATE POLICY time_entries_update ON tenant_staff.time_entries
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    -- We allow updating the row as long as it belonged to us and wasn't deleted.
    -- The new state can have deleted_at set.
  );

-- ============================================
-- PAYROLL_PERIODS
-- ============================================
DROP POLICY IF EXISTS payroll_periods_select ON tenant_staff.payroll_periods;
DROP POLICY IF EXISTS payroll_periods_insert ON tenant_staff.payroll_periods;
DROP POLICY IF EXISTS payroll_periods_update ON tenant_staff.payroll_periods;

CREATE POLICY payroll_periods_select ON tenant_staff.payroll_periods
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY payroll_periods_insert ON tenant_staff.payroll_periods
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY payroll_periods_update ON tenant_staff.payroll_periods
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- PAYROLL_RUNS
-- ============================================
DROP POLICY IF EXISTS payroll_runs_select ON tenant_staff.payroll_runs;
DROP POLICY IF EXISTS payroll_runs_insert ON tenant_staff.payroll_runs;
DROP POLICY IF EXISTS payroll_runs_update ON tenant_staff.payroll_runs;

CREATE POLICY payroll_runs_select ON tenant_staff.payroll_runs
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY payroll_runs_insert ON tenant_staff.payroll_runs
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY payroll_runs_update ON tenant_staff.payroll_runs
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- ============================================
-- PAYROLL_LINE_ITEMS
-- ============================================
DROP POLICY IF EXISTS payroll_line_items_select ON tenant_staff.payroll_line_items;
DROP POLICY IF EXISTS payroll_line_items_insert ON tenant_staff.payroll_line_items;
DROP POLICY IF EXISTS payroll_line_items_update ON tenant_staff.payroll_line_items;

CREATE POLICY payroll_line_items_select ON tenant_staff.payroll_line_items
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY payroll_line_items_insert ON tenant_staff.payroll_line_items
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY payroll_line_items_update ON tenant_staff.payroll_line_items
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );
