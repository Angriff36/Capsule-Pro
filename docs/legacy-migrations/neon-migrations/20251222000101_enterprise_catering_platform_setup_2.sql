-- Schemas
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS tenant;
CREATE SCHEMA IF NOT EXISTS tenant_staff;
CREATE SCHEMA IF NOT EXISTS tenant_crm;
CREATE SCHEMA IF NOT EXISTS tenant_kitchen;
CREATE SCHEMA IF NOT EXISTS tenant_events;
CREATE SCHEMA IF NOT EXISTS tenant_inventory;
CREATE SCHEMA IF NOT EXISTS tenant_admin;

-- Core enums
DO $$ BEGIN
  CREATE TYPE core.action_type AS ENUM ('insert', 'update', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE core.employment_type AS ENUM ('full_time', 'part_time', 'contractor', 'temp');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE core.unit_system AS ENUM ('metric', 'imperial', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE core.unit_type AS ENUM ('volume', 'weight', 'count', 'length', 'temperature', 'time');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS core.status_types (
  id smallint PRIMARY KEY,
  category text NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  description text,
  color_hex char(7),
  sort_order smallint NOT NULL DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (category, code)
);

CREATE TABLE IF NOT EXISTS core.status_transitions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category text NOT NULL,
  from_status_code text,
  to_status_code text NOT NULL,
  requires_role text[],
  is_automatic boolean NOT NULL DEFAULT false,
  UNIQUE (category, from_status_code, to_status_code)
);

CREATE TABLE IF NOT EXISTS core.units (
  id smallint PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_plural text NOT NULL,
  unit_system core.unit_system NOT NULL,
  unit_type core.unit_type NOT NULL,
  is_base_unit boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS core.unit_conversions (
  from_unit_id smallint NOT NULL REFERENCES core.units,
  to_unit_id smallint NOT NULL REFERENCES core.units,
  multiplier numeric(20,10) NOT NULL,
  PRIMARY KEY (from_unit_id, to_unit_id),
  CHECK (from_unit_id != to_unit_id)
);

CREATE TABLE IF NOT EXISTS core.audit_config (
  table_schema text NOT NULL,
  table_name text NOT NULL,
  audit_level text NOT NULL DEFAULT 'full',
  excluded_columns text[],
  PRIMARY KEY (table_schema, table_name)
);

-- Core functions
CREATE OR REPLACE FUNCTION core.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION core.fn_prevent_tenant_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'tenant_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE platform.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  default_timezone text NOT NULL DEFAULT 'UTC',
  week_start smallint NOT NULL DEFAULT 1,
  subscription_tier text NOT NULL DEFAULT 'trial',
  subscription_status text NOT NULL DEFAULT 'active',
  max_locations smallint NOT NULL DEFAULT 1,
  max_employees smallint NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX accounts_slug_idx ON platform.accounts (slug) WHERE deleted_at IS NULL;
CREATE INDEX accounts_subscription_idx ON platform.accounts (subscription_status, subscription_tier) WHERE deleted_at IS NULL;

CREATE TRIGGER accounts_update_timestamp
  BEFORE UPDATE ON platform.accounts
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

  CREATE TABLE platform.audit_log (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  table_schema text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action core.action_type NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE platform.audit_log_2025_01 PARTITION OF platform.audit_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE platform.audit_log_2025_02 PARTITION OF platform.audit_log
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE platform.audit_log_2025_03 PARTITION OF platform.audit_log
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE platform.audit_log_2025_04 PARTITION OF platform.audit_log
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE platform.audit_log_2025_05 PARTITION OF platform.audit_log
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE platform.audit_log_2025_06 PARTITION OF platform.audit_log
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE platform.audit_log_default PARTITION OF platform.audit_log DEFAULT;

CREATE INDEX audit_log_tenant_created_idx ON platform.audit_log (tenant_id, created_at);
CREATE INDEX audit_log_table_record_idx ON platform.audit_log (table_name, record_id);

CREATE TABLE platform.audit_archive (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  table_schema text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action core.action_type NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE platform.audit_archive_2024 PARTITION OF platform.audit_archive
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE platform.audit_archive_2025 PARTITION OF platform.audit_archive
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE platform.audit_archive_default PARTITION OF platform.audit_archive DEFAULT;

CREATE INDEX audit_archive_tenant_idx ON platform.audit_archive (tenant_id);

-- Enable RLS on all platform tables
ALTER TABLE platform.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE platform.audit_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.audit_archive FORCE ROW LEVEL SECURITY;

-- platform.accounts: users see only their tenant
CREATE POLICY accounts_select ON platform.accounts
  FOR SELECT USING (id = (auth.jwt() ->> 'tenant_id')::uuid AND deleted_at IS NULL);
CREATE POLICY accounts_insert ON platform.accounts
  FOR INSERT WITH CHECK (false);
CREATE POLICY accounts_update ON platform.accounts
  FOR UPDATE USING (false);
CREATE POLICY accounts_delete ON platform.accounts
  FOR DELETE USING (false);
CREATE POLICY accounts_service ON platform.accounts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- platform.audit_log: users see their tenant's logs
CREATE POLICY audit_log_select ON platform.audit_log
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid OR tenant_id IS NULL);
CREATE POLICY audit_log_insert ON platform.audit_log
  FOR INSERT WITH CHECK (false);
CREATE POLICY audit_log_update ON platform.audit_log
  FOR UPDATE USING (false);
CREATE POLICY audit_log_delete ON platform.audit_log
  FOR DELETE USING (false);
CREATE POLICY audit_log_service ON platform.audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

  -- platform.audit_archive
CREATE POLICY audit_archive_select ON platform.audit_archive
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY audit_archive_service ON platform.audit_archive
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Core Functions (updated)
CREATE OR REPLACE FUNCTION core.fn_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_audit_level text;
  v_old_values jsonb;
  v_new_values jsonb;
  v_tenant_id uuid;
  v_record_id uuid;
BEGIN
  SELECT audit_level INTO v_audit_level
  FROM core.audit_config
  WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME;
  
  IF v_audit_level IS NULL THEN v_audit_level := 'full'; END IF;
  IF v_audit_level = 'none' THEN RETURN COALESCE(NEW, OLD); END IF;
  
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_old_values := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_tenant_id := NEW.tenant_id;
    v_new_values := to_jsonb(NEW);
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  END IF;

  v_record_id := COALESCE(
    NULLIF((to_jsonb(NEW) ->> 'id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
    NULLIF((to_jsonb(OLD) ->> 'id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
    gen_random_uuid()
  );

  INSERT INTO platform.audit_log (tenant_id, table_schema, table_name, record_id, action, old_values, new_values, performed_by)
  VALUES (v_tenant_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, lower(TG_OP)::core.action_type, v_old_values, v_new_values, auth.uid());
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- fn_to_tenant_time stays as stub until tenant.locations exists
CREATE OR REPLACE FUNCTION core.fn_to_tenant_time(ts timestamptz, p_tenant_id uuid, p_location_id uuid DEFAULT NULL)
RETURNS timestamptz AS $$
DECLARE
  v_timezone text;
BEGIN
  SELECT default_timezone INTO v_timezone FROM platform.accounts WHERE id = p_tenant_id;
  IF v_timezone IS NULL THEN v_timezone := 'UTC'; END IF;
  RETURN ts AT TIME ZONE v_timezone;
END;
$$ LANGUAGE plpgsql STABLE;

-- Seed status types if empty
INSERT INTO core.status_types (id, category, code, label, sort_order, is_terminal, is_default) VALUES
  (1, 'task', 'pending', 'Pending', 10, false, true),
  (2, 'task', 'assigned', 'Assigned', 20, false, false),
  (3, 'task', 'in_progress', 'In Progress', 30, false, false),
  (4, 'task', 'completed', 'Completed', 50, true, false),
  (5, 'task', 'cancelled', 'Cancelled', 60, true, false),
  (10, 'event', 'draft', 'Draft', 10, false, true),
  (11, 'event', 'confirmed', 'Confirmed', 20, false, false),
  (12, 'event', 'in_progress', 'In Progress', 30, false, false),
  (13, 'event', 'completed', 'Completed', 40, true, false),
  (14, 'event', 'cancelled', 'Cancelled', 50, true, false)
ON CONFLICT (category, code) DO NOTHING;

-- Seed units
INSERT INTO core.units (id, code, name, name_plural, unit_system, unit_type, is_base_unit) VALUES
  (1, 'ml', 'milliliter', 'milliliters', 'metric', 'volume', true),
  (2, 'l', 'liter', 'liters', 'metric', 'volume', false),
  (10, 'cup', 'cup', 'cups', 'imperial', 'volume', false),
  (20, 'g', 'gram', 'grams', 'metric', 'weight', true),
  (21, 'kg', 'kilogram', 'kilograms', 'metric', 'weight', false),
  (30, 'oz', 'ounce', 'ounces', 'imperial', 'weight', false),
  (31, 'lb', 'pound', 'pounds', 'imperial', 'weight', false),
  (40, 'each', 'each', 'each', 'custom', 'count', true)
ON CONFLICT (id) DO NOTHING;
