-- MIGRATION: 20251225000136_event_staff_assignments.sql
-- Module: Events (Staff Assignments)
-- Follows Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_EVENTS.EVENT_STAFF_ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_events.event_staff_assignments (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  role text NOT NULL, -- 'chef', 'server', 'bartender', 'coordinator', etc.
  start_time timestamptz,
  end_time timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  -- Phase 1 FKs (no REFERENCES yet for cross-module tables)
  -- event_id -> tenant_events.events
  -- employee_id -> tenant_staff.employees
  CONSTRAINT event_staff_assignments_role_check CHECK (length(trim(role)) > 0),
  CONSTRAINT event_staff_assignments_times_check CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

-- Unique constraint: an employee can only be assigned to an event once (active record)
CREATE UNIQUE INDEX event_staff_assignments_unique_idx
  ON tenant_events.event_staff_assignments (tenant_id, event_id, employee_id)
  WHERE deleted_at IS NULL;

-- Indexes for performance
CREATE INDEX event_staff_assignments_event_idx
  ON tenant_events.event_staff_assignments (tenant_id, event_id) WHERE deleted_at IS NULL;

CREATE INDEX event_staff_assignments_employee_idx
  ON tenant_events.event_staff_assignments (tenant_id, employee_id) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER event_staff_assignments_update_timestamp
  BEFORE UPDATE ON tenant_events.event_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER event_staff_assignments_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.event_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER event_staff_assignments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.event_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_events.event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.event_staff_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY event_staff_assignments_select ON tenant_events.event_staff_assignments
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY event_staff_assignments_insert ON tenant_events.event_staff_assignments
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY event_staff_assignments_update ON tenant_events.event_staff_assignments
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY event_staff_assignments_delete ON tenant_events.event_staff_assignments
  FOR DELETE USING (false);

-- Grant privileges
GRANT USAGE ON SCHEMA tenant_events TO authenticated;
GRANT ALL ON tenant_events.event_staff_assignments TO authenticated;
GRANT ALL ON tenant_events.event_staff_assignments TO service_role;









