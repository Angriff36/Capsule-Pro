-- MIGRATION: 20251222000108_kitchen_tasks.sql
-- Kitchen tasks table: Simple CRUD tasks for the Tasks CRUD vertical slice feature
-- This is a standalone task management table, separate from the complex event-driven prep_tasks system
-- Used for general task tracking (projects, reminders, operational tasks)

-- ============================================
-- HELPER FUNCTION: Handle completed_at lifecycle
-- ============================================

CREATE OR REPLACE FUNCTION tenant_kitchen.fn_kitchen_task_completed_handler()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''  -- Immutable, prevents search_path injection
AS $$
BEGIN
  -- Set completed_at when transitioning to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  -- Clear completed_at when transitioning away from completed
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- TENANT_KITCHEN.KITCHEN_TASKS
-- ============================================

CREATE TABLE tenant_kitchen.kitchen_tasks (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority smallint NOT NULL DEFAULT 5,
  complexity smallint NOT NULL DEFAULT 5,
  tags text[],
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  -- Title length validation (3-200 characters)
  CHECK (length(trim(title)) >= 3 AND length(trim(title)) <= 200),
  -- Summary length validation (10-5000 characters)
  CHECK (length(trim(summary)) >= 10 AND length(trim(summary)) <= 5000),
  -- Priority validation (1=highest, 10=lowest - matches prep_tasks pattern)
  CHECK (priority >= 1 AND priority <= 10),
  -- Complexity validation (1-10 scale)
  CHECK (complexity >= 1 AND complexity <= 10),
  -- completed_at must be null unless status is completed
  CHECK (status = 'completed' OR completed_at IS NULL)
);

-- NOTE: Status validation should be enforced via core.status_types with category='kitchen_task'
-- For this migration, status is validated at application layer.
-- TODO: Add 'kitchen_task' status types to core.status_types seed data.

-- ============================================
-- INDEXES
-- ============================================

-- Partial index for active records (tenant + soft delete filtering)
CREATE INDEX kitchen_tasks_tenant_active_idx
  ON tenant_kitchen.kitchen_tasks(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Status + priority composite index (for dashboard sorting)
CREATE INDEX kitchen_tasks_tenant_status_priority_idx
  ON tenant_kitchen.kitchen_tasks(tenant_id, status, priority)
  WHERE deleted_at IS NULL;

-- Due date index (for upcoming deadlines - excludes NULL dates)
CREATE INDEX kitchen_tasks_tenant_due_date_idx
  ON tenant_kitchen.kitchen_tasks(tenant_id, due_date)
  WHERE deleted_at IS NULL AND due_date IS NOT NULL;

-- GIN index for tag searching
CREATE INDEX kitchen_tasks_tags_idx
  ON tenant_kitchen.kitchen_tasks USING GIN (tags);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger (standard pattern)
CREATE TRIGGER kitchen_tasks_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.kitchen_tasks
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- Prevent tenant mutation trigger (security pattern)
CREATE TRIGGER kitchen_tasks_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.kitchen_tasks
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger (full audit for tasks table)
CREATE TRIGGER kitchen_tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.kitchen_tasks
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- completed_at lifecycle handler (auto-set/clear based on status)
CREATE TRIGGER kitchen_tasks_completed_handler
  BEFORE UPDATE ON tenant_kitchen.kitchen_tasks
  FOR EACH ROW EXECUTE FUNCTION tenant_kitchen.fn_kitchen_task_completed_handler();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE tenant_kitchen.kitchen_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.kitchen_tasks FORCE ROW LEVEL SECURITY;

-- SELECT policy - see only non-deleted tasks from your tenant
CREATE POLICY kitchen_tasks_select ON tenant_kitchen.kitchen_tasks
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- INSERT policy - can only insert for your tenant
CREATE POLICY kitchen_tasks_insert ON tenant_kitchen.kitchen_tasks
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- UPDATE policy - can update own tenant's tasks, cannot change tenant_id
CREATE POLICY kitchen_tasks_update ON tenant_kitchen.kitchen_tasks
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- DELETE policy - soft delete only (hard DELETE blocked at RLS level)
CREATE POLICY kitchen_tasks_delete ON tenant_kitchen.kitchen_tasks
  FOR DELETE USING (false);

-- Service role bypass (for migrations, admin operations)
CREATE POLICY kitchen_tasks_service ON tenant_kitchen.kitchen_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify table created
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'tenant_kitchen' AND tablename = 'kitchen_tasks';

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'tenant_kitchen' AND tablename = 'kitchen_tasks'
ORDER BY indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'tenant_kitchen' AND tablename = 'kitchen_tasks';

-- Verify CHECK constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'tenant_kitchen.kitchen_tasks'::regclass
  AND contype = 'c'
ORDER BY conname;
