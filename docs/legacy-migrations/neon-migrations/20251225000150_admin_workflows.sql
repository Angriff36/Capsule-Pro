-- MIGRATION: 20251225000150_admin_workflows.sql
-- Admin module: workflows, workflow_steps, workflow_executions, reports, report_schedules, report_history
-- All tables follow Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_ADMIN.WORKFLOWS
-- ============================================

CREATE TABLE tenant_admin.workflows (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- 'manual', 'schedule', 'event', 'threshold'
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (length(trim(name)) >= 3 AND length(trim(name)) <= 255),
  CHECK (jsonb_typeof(trigger_config) = 'object')
);

-- Partial unique index for workflow name per tenant
CREATE UNIQUE INDEX workflows_tenant_name_active_idx ON tenant_admin.workflows(tenant_id, name) WHERE deleted_at IS NULL;

-- Indexes
CREATE INDEX workflows_tenant_idx ON tenant_admin.workflows(tenant_id);
CREATE INDEX workflows_active_idx ON tenant_admin.workflows(tenant_id) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER workflows_update_timestamp
  BEFORE UPDATE ON tenant_admin.workflows
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER workflows_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_admin.workflows
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER workflows_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_admin.workflows
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_admin.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.workflows FORCE ROW LEVEL SECURITY;

CREATE POLICY workflows_select ON tenant_admin.workflows
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY workflows_insert ON tenant_admin.workflows
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY workflows_update ON tenant_admin.workflows
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY workflows_delete ON tenant_admin.workflows
  FOR DELETE USING (false);

CREATE POLICY workflows_service ON tenant_admin.workflows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TENANT_ADMIN.WORKFLOW_STEPS
-- ============================================

CREATE TABLE tenant_admin.workflow_steps (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  step_number smallint NOT NULL,
  step_type text NOT NULL, -- 'action', 'condition', 'delay', 'notification'
  step_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  on_success_step_id uuid, -- NULL = next step or end
  on_failure_step_id uuid, -- NULL = abort
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (step_number > 0),
  CHECK (jsonb_typeof(step_config) = 'object')
);

-- Partial unique index for step number per workflow
CREATE UNIQUE INDEX workflow_steps_workflow_number_idx ON tenant_admin.workflow_steps(tenant_id, workflow_id, step_number);

-- Indexes
CREATE INDEX workflow_steps_workflow_idx ON tenant_admin.workflow_steps(tenant_id, workflow_id);

-- Triggers
CREATE TRIGGER workflow_steps_update_timestamp
  BEFORE UPDATE ON tenant_admin.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER workflow_steps_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_admin.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- RLS Policies
ALTER TABLE tenant_admin.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.workflow_steps FORCE ROW LEVEL SECURITY;

CREATE POLICY workflow_steps_select ON tenant_admin.workflow_steps
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY workflow_steps_insert ON tenant_admin.workflow_steps
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY workflow_steps_update ON tenant_admin.workflow_steps
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY workflow_steps_delete ON tenant_admin.workflow_steps
  FOR DELETE USING (false);

CREATE POLICY workflow_steps_service ON tenant_admin.workflow_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TENANT_ADMIN.WORKFLOW_EXECUTIONS
-- ============================================

CREATE TABLE tenant_admin.workflow_executions (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  triggered_by uuid, -- employee_id or NULL for automatic
  trigger_data jsonb,
  status text NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  current_step_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  execution_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  CHECK (jsonb_typeof(execution_log) = 'array')
);

-- Indexes
CREATE INDEX workflow_executions_workflow_idx ON tenant_admin.workflow_executions(tenant_id, workflow_id);
CREATE INDEX workflow_executions_status_idx ON tenant_admin.workflow_executions(tenant_id, status);

-- RLS Policies
ALTER TABLE tenant_admin.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.workflow_executions FORCE ROW LEVEL SECURITY;

CREATE POLICY workflow_executions_select ON tenant_admin.workflow_executions
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY workflow_executions_insert ON tenant_admin.workflow_executions
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY workflow_executions_update ON tenant_admin.workflow_executions
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY workflow_executions_delete ON tenant_admin.workflow_executions
  FOR DELETE USING (false);

CREATE POLICY workflow_executions_service ON tenant_admin.workflow_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TENANT_ADMIN.REPORTS
-- ============================================

CREATE TABLE tenant_admin.reports (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL, -- 'financial', 'operational', 'inventory', 'staff', 'custom'
  query_config jsonb NOT NULL, -- Defines what data to pull
  display_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id)
);

-- Partial unique index for report name per tenant
CREATE UNIQUE INDEX reports_tenant_name_active_idx ON tenant_admin.reports(tenant_id, name) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE tenant_admin.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.reports FORCE ROW LEVEL SECURITY;

CREATE POLICY reports_select ON tenant_admin.reports
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY reports_insert ON tenant_admin.reports
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY reports_update ON tenant_admin.reports
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY reports_delete ON tenant_admin.reports
  FOR DELETE USING (false);

CREATE POLICY reports_service ON tenant_admin.reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verification
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'tenant_admin';
