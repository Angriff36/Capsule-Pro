-- MIGRATION: 20251226004000_kitchen_registry_additions.sql
-- Prep list imports, bulk combine rules, and staff skills

BEGIN;

-- 1. tenant_kitchen.prep_list_imports
CREATE TABLE IF NOT EXISTS tenant_kitchen.prep_list_imports (
  tenant_id uuid NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  external_id text,
  import_metadata jsonb DEFAULT '{}',
  imported_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prep_list_imports_pkey PRIMARY KEY (tenant_id, id)
);

-- Add import_id to prep_tasks
ALTER TABLE tenant_kitchen.prep_tasks 
  ADD COLUMN IF NOT EXISTS import_id uuid;

-- 2. tenant_kitchen.bulk_combine_rules
CREATE TABLE IF NOT EXISTS tenant_kitchen.bulk_combine_rules (
  tenant_id uuid NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  match_criteria jsonb NOT NULL,
  is_automatic boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT bulk_combine_rules_pkey PRIMARY KEY (tenant_id, id)
);

-- 3. tenant_staff.skills
CREATE TABLE IF NOT EXISTS tenant_staff.skills (
  tenant_id uuid NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT skills_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT skills_name_unique UNIQUE (tenant_id, name)
);

-- 4. tenant_staff.employee_skills
CREATE TABLE IF NOT EXISTS tenant_staff.employee_skills (
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  proficiency_level smallint NOT NULL DEFAULT 1 CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_skills_pkey PRIMARY KEY (tenant_id, employee_id, skill_id)
);

-- Triggers for timestamps and tenant mutation
CREATE TRIGGER prep_list_imports_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.prep_list_imports
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER bulk_combine_rules_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.bulk_combine_rules
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER bulk_combine_rules_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.bulk_combine_rules
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER skills_update_timestamp
  BEFORE UPDATE ON tenant_staff.skills
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER skills_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.skills
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER employee_skills_update_timestamp
  BEFORE UPDATE ON tenant_staff.employee_skills
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER employee_skills_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.employee_skills
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- RLS
ALTER TABLE tenant_kitchen.prep_list_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.prep_list_imports FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.bulk_combine_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.bulk_combine_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.skills FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.employee_skills FORCE ROW LEVEL SECURITY;

-- Policies (Simplified for local dev fallback support)
CREATE POLICY prep_list_imports_select ON tenant_kitchen.prep_list_imports FOR SELECT USING (tenant_id = core.fn_get_jwt_tenant_id());
CREATE POLICY prep_list_imports_insert ON tenant_kitchen.prep_list_imports FOR INSERT WITH CHECK (tenant_id = core.fn_get_jwt_tenant_id());

CREATE POLICY bulk_combine_rules_select ON tenant_kitchen.bulk_combine_rules FOR SELECT USING (tenant_id = core.fn_get_jwt_tenant_id() AND deleted_at IS NULL);
CREATE POLICY bulk_combine_rules_insert ON tenant_kitchen.bulk_combine_rules FOR INSERT WITH CHECK (tenant_id = core.fn_get_jwt_tenant_id());
CREATE POLICY bulk_combine_rules_update ON tenant_kitchen.bulk_combine_rules FOR UPDATE USING (tenant_id = core.fn_get_jwt_tenant_id());

CREATE POLICY skills_select ON tenant_staff.skills FOR SELECT USING (tenant_id = core.fn_get_jwt_tenant_id() AND deleted_at IS NULL);
CREATE POLICY skills_insert ON tenant_staff.skills FOR INSERT WITH CHECK (tenant_id = core.fn_get_jwt_tenant_id());
CREATE POLICY skills_update ON tenant_staff.skills FOR UPDATE USING (tenant_id = core.fn_get_jwt_tenant_id());

CREATE POLICY employee_skills_select ON tenant_staff.employee_skills FOR SELECT USING (tenant_id = core.fn_get_jwt_tenant_id());
CREATE POLICY employee_skills_insert ON tenant_staff.employee_skills FOR INSERT WITH CHECK (tenant_id = core.fn_get_jwt_tenant_id());
CREATE POLICY employee_skills_update ON tenant_staff.employee_skills FOR UPDATE USING (tenant_id = core.fn_get_jwt_tenant_id());

-- Audit triggers (only for significant tables)
CREATE TRIGGER bulk_combine_rules_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.bulk_combine_rules FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();
CREATE TRIGGER skills_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.skills FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

COMMIT;








