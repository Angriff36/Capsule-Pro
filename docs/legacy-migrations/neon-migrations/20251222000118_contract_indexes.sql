-- MIGRATION: 20251222000118_contract_indexes.sql
-- Add missing (tenant_id, deleted_at) indexes and service_role policies

-- ============================================
-- SOFT DELETE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS locations_tenant_deleted_idx
  ON tenant.locations (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ingredients_tenant_deleted_idx
  ON tenant_kitchen.ingredients (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS containers_tenant_deleted_idx
  ON tenant_kitchen.containers (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employees_tenant_deleted_idx
  ON tenant_staff.employees (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS prep_methods_tenant_deleted_idx
  ON tenant_kitchen.prep_methods (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS method_videos_tenant_deleted_idx
  ON tenant_kitchen.method_videos (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employee_locations_tenant_deleted_idx
  ON tenant_staff.employee_locations (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employee_certifications_tenant_deleted_idx
  ON tenant_staff.employee_certifications (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employee_availability_tenant_deleted_idx
  ON tenant_staff.employee_availability (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS schedules_tenant_deleted_idx
  ON tenant_staff.schedules (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS schedule_shifts_tenant_deleted_idx
  ON tenant_staff.schedule_shifts (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS time_entries_tenant_deleted_idx
  ON tenant_staff.time_entries (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS payroll_periods_tenant_deleted_idx
  ON tenant_staff.payroll_periods (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS payroll_runs_tenant_deleted_idx
  ON tenant_staff.payroll_runs (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS payroll_line_items_tenant_deleted_idx
  ON tenant_staff.payroll_line_items (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS recipes_tenant_deleted_idx
  ON tenant_kitchen.recipes (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS recipe_versions_tenant_deleted_idx
  ON tenant_kitchen.recipe_versions (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS recipe_ingredients_tenant_deleted_idx
  ON tenant_kitchen.recipe_ingredients (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS recipe_steps_tenant_deleted_idx
  ON tenant_kitchen.recipe_steps (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS dishes_tenant_deleted_idx
  ON tenant_kitchen.dishes (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS task_bundles_tenant_deleted_idx
  ON tenant_kitchen.task_bundles (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS prep_tasks_tenant_deleted_idx
  ON tenant_kitchen.prep_tasks (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS kitchen_tasks_tenant_deleted_idx
  ON tenant_kitchen.kitchen_tasks (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS clients_tenant_deleted_idx
  ON tenant_crm.clients (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS client_contacts_tenant_deleted_idx
  ON tenant_crm.client_contacts (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS client_preferences_tenant_deleted_idx
  ON tenant_crm.client_preferences (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS leads_tenant_deleted_idx
  ON tenant_crm.leads (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS client_interactions_tenant_deleted_idx
  ON tenant_crm.client_interactions (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS proposals_tenant_deleted_idx
  ON tenant_crm.proposals (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS proposal_line_items_tenant_deleted_idx
  ON tenant_crm.proposal_line_items (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_roles_tenant_deleted_idx
  ON tenant_admin.admin_roles (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_permissions_tenant_deleted_idx
  ON tenant_admin.admin_permissions (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_users_tenant_deleted_idx
  ON tenant_admin.admin_users (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS admin_audit_trail_tenant_deleted_idx
  ON tenant_admin.admin_audit_trail (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS events_tenant_deleted_idx
  ON tenant_events.events (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS inventory_items_tenant_deleted_idx
  ON tenant_inventory.inventory_items (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS inventory_alerts_tenant_deleted_idx
  ON tenant_inventory.inventory_alerts (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS inventory_suppliers_tenant_deleted_idx
  ON tenant_inventory.inventory_suppliers (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- ============================================
-- SERVICE ROLE POLICIES (missing tables)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'tenant_admin' AND tablename = 'admin_roles'
      AND policyname = 'admin_roles_service'
  ) THEN
    EXECUTE 'CREATE POLICY admin_roles_service ON tenant_admin.admin_roles FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'tenant_admin' AND tablename = 'admin_permissions'
      AND policyname = 'admin_permissions_service'
  ) THEN
    EXECUTE 'CREATE POLICY admin_permissions_service ON tenant_admin.admin_permissions FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'tenant_admin' AND tablename = 'admin_audit_trail'
      AND policyname = 'admin_audit_trail_service'
  ) THEN
    EXECUTE 'CREATE POLICY admin_audit_trail_service ON tenant_admin.admin_audit_trail FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'tenant_events' AND tablename = 'events'
      AND policyname = 'events_service'
  ) THEN
    EXECUTE 'CREATE POLICY events_service ON tenant_events.events FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname IN (
  'tenant', 'tenant_crm', 'tenant_staff', 'tenant_kitchen',
  'tenant_inventory', 'tenant_admin', 'tenant_events'
)
AND indexdef LIKE '%(tenant_id, deleted_at)%'
ORDER BY schemaname, tablename, indexname;
