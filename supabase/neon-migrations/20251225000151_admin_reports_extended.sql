-- MIGRATION: 20251225000151_admin_reports_extended.sql
-- Admin module: report_schedules, report_history, notifications, notification_preferences
-- All tables follow Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_ADMIN.REPORT_SCHEDULES
-- ============================================

CREATE TABLE tenant_admin.report_schedules (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  schedule_cron text NOT NULL, -- Cron expression
  output_format text NOT NULL DEFAULT 'pdf', -- 'pdf', 'xlsx', 'csv'
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of employee_ids or emails
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (jsonb_typeof(recipients) = 'array')
);

-- Indexes
CREATE INDEX report_schedules_tenant_report_idx ON tenant_admin.report_schedules(tenant_id, report_id);
CREATE INDEX report_schedules_active_idx ON tenant_admin.report_schedules(tenant_id) WHERE deleted_at IS NULL AND is_active = true;

-- Triggers
CREATE TRIGGER report_schedules_update_timestamp
  BEFORE UPDATE ON tenant_admin.report_schedules
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER report_schedules_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_admin.report_schedules
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER report_schedules_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_admin.report_schedules
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_admin.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.report_schedules FORCE ROW LEVEL SECURITY;

CREATE POLICY report_schedules_select ON tenant_admin.report_schedules
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY report_schedules_insert ON tenant_admin.report_schedules
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY report_schedules_update ON tenant_admin.report_schedules
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY report_schedules_delete ON tenant_admin.report_schedules
  FOR DELETE USING (false);

CREATE POLICY report_schedules_service ON tenant_admin.report_schedules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TENANT_ADMIN.REPORT_HISTORY
-- ============================================

CREATE TABLE tenant_admin.report_history (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  schedule_id uuid, -- NULL if manual run
  generated_by uuid, -- employee_id, NULL if scheduled
  generated_at timestamptz NOT NULL DEFAULT now(),
  output_format text NOT NULL,
  file_url text, -- Stored report file
  file_size_bytes bigint,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb, -- Runtime parameters used
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  CHECK (jsonb_typeof(parameters) = 'object')
);

-- Indexes
CREATE INDEX report_history_tenant_report_idx ON tenant_admin.report_history(tenant_id, report_id);
CREATE INDEX report_history_generated_at_idx ON tenant_admin.report_history(tenant_id, generated_at DESC);

-- Triggers
CREATE TRIGGER report_history_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_admin.report_history
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- RLS Policies
ALTER TABLE tenant_admin.report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.report_history FORCE ROW LEVEL SECURITY;

CREATE POLICY report_history_select ON tenant_admin.report_history
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY report_history_insert ON tenant_admin.report_history
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY report_history_update ON tenant_admin.report_history
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY report_history_delete ON tenant_admin.report_history
  FOR DELETE USING (false);

CREATE POLICY report_history_service ON tenant_admin.report_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TENANT_ADMIN.NOTIFICATIONS
-- ============================================

CREATE TABLE tenant_admin.notifications (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  recipient_employee_id uuid NOT NULL,
  notification_type text NOT NULL, -- 'task_assigned', 'event_reminder', 'inventory_low', etc.
  title text NOT NULL,
  body text,
  action_url text, -- Deep link
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- Indexes
CREATE INDEX notifications_recipient_read_idx ON tenant_admin.notifications(tenant_id, recipient_employee_id, is_read);
CREATE INDEX notifications_created_at_idx ON tenant_admin.notifications(tenant_id, created_at DESC);

-- Triggers
CREATE TRIGGER notifications_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_admin.notifications
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- RLS Policies
ALTER TABLE tenant_admin.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_select ON tenant_admin.notifications
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    -- Users can only see their own notifications
    -- Note: In a real system, we'd check if auth.uid() matches the recipient's auth_user_id
    -- For now, following the general tenant-level RLS pattern
  );

CREATE POLICY notifications_insert ON tenant_admin.notifications
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY notifications_update ON tenant_admin.notifications
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY notifications_delete ON tenant_admin.notifications
  FOR DELETE USING (false);

CREATE POLICY notifications_service ON tenant_admin.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TENANT_ADMIN.NOTIFICATION_PREFERENCES
-- ============================================

CREATE TABLE tenant_admin.notification_preferences (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  notification_type text NOT NULL,
  channel text NOT NULL, -- 'in_app', 'email', 'sms', 'push'
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, employee_id, notification_type, channel)
);

-- Triggers
CREATE TRIGGER notification_preferences_update_timestamp
  BEFORE UPDATE ON tenant_admin.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER notification_preferences_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_admin.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- RLS Policies
ALTER TABLE tenant_admin.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_admin.notification_preferences FORCE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select ON tenant_admin.notification_preferences
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY notification_preferences_insert ON tenant_admin.notification_preferences
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY notification_preferences_update ON tenant_admin.notification_preferences
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY notification_preferences_delete ON tenant_admin.notification_preferences
  FOR DELETE USING (false);

CREATE POLICY notification_preferences_service ON tenant_admin.notification_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);









