-- MIGRATION: 20251226003000_kitchen_phase_2.sql
-- Phase 2: Comments/Questions, "Do Not Complete Until" fields, and Time Tracking support

BEGIN;

-- 1. Create prep_comments table
CREATE TABLE IF NOT EXISTS tenant_kitchen.prep_comments (
  tenant_id uuid NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  comment_text text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT prep_comments_pkey PRIMARY KEY (tenant_id, id)
);

-- 2. Add "do_not_complete_until" fields
ALTER TABLE tenant_kitchen.prep_tasks 
  ADD COLUMN IF NOT EXISTS do_not_complete_until timestamptz;

ALTER TABLE tenant_events.events 
  ADD COLUMN IF NOT EXISTS do_not_complete_until timestamptz;

-- 3. Add audit and tenant mutation triggers for prep_comments
CREATE TRIGGER prep_comments_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.prep_comments
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER prep_comments_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.prep_comments
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER prep_comments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.prep_comments
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- 4. Set up RLS for prep_comments
ALTER TABLE tenant_kitchen.prep_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.prep_comments FORCE ROW LEVEL SECURITY;

-- SELECT: Same tenant, not deleted
CREATE POLICY prep_comments_select ON tenant_kitchen.prep_comments
  FOR SELECT
  USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- INSERT: Same tenant
CREATE POLICY prep_comments_insert ON tenant_kitchen.prep_comments
  FOR INSERT
  WITH CHECK (tenant_id = core.fn_get_jwt_tenant_id());

-- UPDATE: Same tenant
CREATE POLICY prep_comments_update ON tenant_kitchen.prep_comments
  FOR UPDATE
  USING (tenant_id = core.fn_get_jwt_tenant_id())
  WITH CHECK (tenant_id = core.fn_get_jwt_tenant_id());

-- DELETE: Blocked (use soft delete)
CREATE POLICY prep_comments_delete ON tenant_kitchen.prep_comments
  FOR DELETE
  USING (false);

-- SERVICE ROLE: Bypass
CREATE POLICY prep_comments_service ON tenant_kitchen.prep_comments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Add Indexes
CREATE INDEX IF NOT EXISTS prep_comments_task_idx ON tenant_kitchen.prep_comments (tenant_id, task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS prep_comments_employee_idx ON tenant_kitchen.prep_comments (tenant_id, employee_id) WHERE deleted_at IS NULL;

-- 6. Add Foreign Keys (Cross-module FK pattern: no REFERENCES until 090_cross_module_fks.sql or similar)
-- But since we are in Phase 2, we can add them if they are in the same schema or already established.
-- For now, we follow the Phase 1 pattern: NOT NULL columns, no hard FKs across schemas yet.
-- Actually, prep_tasks is in tenant_kitchen, same as prep_comments.
ALTER TABLE tenant_kitchen.prep_comments
  ADD CONSTRAINT prep_comments_task_fk
  FOREIGN KEY (tenant_id, task_id) REFERENCES tenant_kitchen.prep_tasks(tenant_id, id);

-- employee_id is in tenant_staff, so we skip the hard FK for now as per project convention.

COMMIT;








