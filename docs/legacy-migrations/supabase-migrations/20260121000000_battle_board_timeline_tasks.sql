-- =====================================================================
-- BATTLE BOARD: TIMELINE TASKS
-- =====================================================================
-- Purpose: Event-specific tactical planning board with minute-by-minute
--   precision, staff coordination, and critical path tracking
-- Schema: tenant_events.timeline_tasks
-- Follows: Schema Contract v2 (composite PK, RLS, triggers, indexes)
-- =====================================================================

CREATE TABLE tenant_events.timeline_tasks (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Event association (FK added in Phase 2 after events table exists)
  event_id uuid NOT NULL,

  -- Task details
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,

  -- Task status and priority
  status text NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'completed', 'delayed', 'blocked')
  ),
  priority text NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  category text NOT NULL,

  -- Assignment
  assignee_id uuid,

  -- Progress tracking
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Dependencies and critical path
  dependencies text[] NOT NULL DEFAULT '{}',
  is_on_critical_path boolean NOT NULL DEFAULT false,
  slack_minutes integer NOT NULL DEFAULT 0,

  -- Additional notes
  notes text,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (end_time > start_time),
  CHECK (title IS NOT NULL AND length(trim(title)) > 0),
  CHECK (description IS NULL OR length(trim(description)) <= 2000),
  CHECK (notes IS NULL OR length(trim(notes)) <= 2000),
  CHECK (slack_minutes >= 0)
);

-- =====================================================================
-- INDEXES (per Schema Contract v2, Section L)
-- =====================================================================

-- Standard index: tenant_id (always present)
CREATE INDEX idx_timeline_tasks_tenant
  ON tenant_events.timeline_tasks(tenant_id)
  WHERE deleted_at IS NULL;

-- Active records index (tenant_id, deleted_at)
CREATE INDEX idx_timeline_tasks_active
  ON tenant_events.timeline_tasks(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Event queries (tenant_id, event_id)
CREATE INDEX idx_timeline_tasks_event
  ON tenant_events.timeline_tasks(tenant_id, event_id)
  WHERE deleted_at IS NULL;

-- Assignee queries (tenant_id, assignee_id)
CREATE INDEX idx_timeline_tasks_assignee
  ON tenant_events.timeline_tasks(tenant_id, assignee_id)
  WHERE deleted_at IS NULL AND assignee_id IS NOT NULL;

-- Status filtering (tenant_id, status)
CREATE INDEX idx_timeline_tasks_status
  ON tenant_events.timeline_tasks(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Priority filtering (tenant_id, priority)
CREATE INDEX idx_timeline_tasks_priority
  ON tenant_events.timeline_tasks(tenant_id, priority)
  WHERE deleted_at IS NULL;

-- Start time queries (tenant_id, start_time)
CREATE INDEX idx_timeline_tasks_start_time
  ON tenant_events.timeline_tasks(tenant_id, start_time)
  WHERE deleted_at IS NULL;

-- Critical path queries (tenant_id, is_on_critical_path)
CREATE INDEX idx_timeline_tasks_critical_path
  ON tenant_events.timeline_tasks(tenant_id, is_on_critical_path)
  WHERE deleted_at IS NULL;

-- GIN index for dependencies array search (performance)
CREATE INDEX idx_timeline_tasks_dependencies_gin
  ON tenant_events.timeline_tasks USING gin(dependencies)
  WHERE deleted_at IS NULL;

-- =====================================================================
-- TRIGGERS (per Schema Contract v2, Section F)
-- =====================================================================

-- Trigger: Update timestamp on UPDATE
CREATE TRIGGER timeline_tasks_update_timestamp
  BEFORE UPDATE ON tenant_events.timeline_tasks
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

-- Trigger: Prevent tenant_id mutation
CREATE TRIGGER timeline_tasks_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.timeline_tasks
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Trigger: Audit trail
CREATE TRIGGER timeline_tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.timeline_tasks
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- =====================================================================
-- ROW LEVEL SECURITY (per Schema Contract v2, Section D)
-- =====================================================================

ALTER TABLE tenant_events.timeline_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.timeline_tasks FORCE ROW LEVEL SECURITY;

-- 1. SELECT - Tenant isolation + soft delete filter
CREATE POLICY "timeline_tasks_select" ON tenant_events.timeline_tasks
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- 2. INSERT - Tenant isolation with NOT NULL enforcement
CREATE POLICY "timeline_tasks_insert" ON tenant_events.timeline_tasks
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- 3. UPDATE - Prevent tenant_id mutation
CREATE POLICY "timeline_tasks_update" ON tenant_events.timeline_tasks
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 4. DELETE - Blocked (soft delete only via UPDATE)
CREATE POLICY "timeline_tasks_delete" ON tenant_events.timeline_tasks
  FOR DELETE USING (false);

-- 5. SERVICE ROLE - Bypass for admin/background jobs
CREATE POLICY "timeline_tasks_service" ON tenant_events.timeline_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- REAL-TIME SUPPORT (per Schema Contract v2, Section K)
-- =====================================================================

ALTER TABLE tenant_events.timeline_tasks REPLICA IDENTITY FULL;

-- =====================================================================
-- PHASE 2: FOREIGN KEY TO EVENTS TABLE
-- =====================================================================

-- This FK is added after events table is confirmed to exist
ALTER TABLE tenant_events.timeline_tasks
  ADD CONSTRAINT timeline_tasks_event_fk
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES tenant_events.events(tenant_id, id)
  ON DELETE CASCADE;

-- FK to employees table for assignee
ALTER TABLE tenant_events.timeline_tasks
  ADD CONSTRAINT timeline_tasks_assignee_fk
  FOREIGN KEY (tenant_id, assignee_id)
  REFERENCES tenant_staff.employees(tenant_id, id)
  ON DELETE SET NULL;

-- =====================================================================
-- COMMENTS (for schema documentation)
-- =====================================================================

COMMENT ON TABLE tenant_events.timeline_tasks IS
  'Event-specific tactical planning tasks with time tracking, dependencies, and critical path analysis.';

COMMENT ON COLUMN tenant_events.timeline_tasks.status IS
  'Task execution status: not_started, in_progress, completed, delayed, blocked';

COMMENT ON COLUMN tenant_events.timeline_tasks.priority IS
  'Task priority level: low, medium, high, critical';

COMMENT ON COLUMN tenant_events.timeline_tasks.dependencies IS
  'Array of task IDs that this task depends on (blocking dependencies)';

COMMENT ON COLUMN tenant_events.timeline_tasks.is_on_critical_path IS
  'True if task is on the critical path (zero slack, affects event completion)';

COMMENT ON COLUMN tenant_events.timeline_tasks.slack_minutes IS
  'Amount of time task can be delayed without affecting overall event timeline';

-- =====================================================================
-- VALIDATION QUERIES (for testing)
-- =====================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'tenant_events'
    AND tablename = 'timeline_tasks'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on tenant_events.timeline_tasks';
  END IF;
END $$;

-- Verify required indexes exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_events'
    AND tablename = 'timeline_tasks'
    AND indexname = 'idx_timeline_tasks_tenant'
  ) THEN
    RAISE EXCEPTION 'Missing index: idx_timeline_tasks_tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_events'
    AND tablename = 'timeline_tasks'
    AND indexname = 'idx_timeline_tasks_event'
  ) THEN
    RAISE EXCEPTION 'Missing index: idx_timeline_tasks_event';
  END IF;
END $$;
