-- MIGRATION: 20251222000102_tenant_base.sql
-- Tenant base tables: locations, settings, plus stub tables for cross-module FKs
-- Also updates fn_to_tenant_time() to use real location data

-- ============================================
-- TENANT.LOCATIONS (location-aware multi-tenancy)
-- ============================================

CREATE TABLE tenant.locations (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country_code char(2),
  timezone text,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id)
);

-- Partial unique index for active location names
CREATE UNIQUE INDEX locations_tenant_name_active_idx
  ON tenant.locations (tenant_id, name) WHERE deleted_at IS NULL;

-- Standard indexes
CREATE INDEX locations_tenant_active_idx ON tenant.locations (tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX locations_tenant_primary_idx ON tenant.locations (tenant_id, is_primary) WHERE deleted_at IS NULL AND is_primary = true;

-- Triggers
CREATE TRIGGER locations_update_timestamp
  BEFORE UPDATE ON tenant.locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER locations_prevent_tenant_mutation
  BEFORE UPDATE ON tenant.locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger
CREATE TRIGGER locations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant.locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies (4-policy pattern + service)
ALTER TABLE tenant.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant.locations FORCE ROW LEVEL SECURITY;

CREATE POLICY locations_select ON tenant.locations
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY locations_insert ON tenant.locations
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY locations_update ON tenant.locations
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY locations_delete ON tenant.locations
  FOR DELETE USING (false);

CREATE POLICY locations_service ON tenant.locations
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT.SETTINGS (tenant key-value configuration)
-- ============================================

CREATE TABLE tenant.settings (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, setting_key)
);

-- Index
CREATE INDEX settings_tenant_key_idx ON tenant.settings (tenant_id, setting_key);

-- Triggers
CREATE TRIGGER settings_update_timestamp
  BEFORE UPDATE ON tenant.settings
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER settings_prevent_tenant_mutation
  BEFORE UPDATE ON tenant.settings
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger
CREATE TRIGGER settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant.settings
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant.settings FORCE ROW LEVEL SECURITY;

CREATE POLICY settings_select ON tenant.settings
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY settings_insert ON tenant.settings
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY settings_update ON tenant.settings
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY settings_delete ON tenant.settings
  FOR DELETE USING (false);

CREATE POLICY settings_service ON tenant.settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- STUB: TENANT_EVENTS.EVENTS (minimal for FKs)
-- ============================================
-- NOTE: This is a stub table. Full schema will be added in events module migration.
-- Current stub provides: tenant_id, id, event_name, event_date, status
-- Future migration will ALTER TABLE ADD COLUMN for remaining fields.

CREATE TABLE tenant_events.events (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_name text NOT NULL DEFAULT 'Placeholder Event',
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'confirmed',  -- References core.status_types category='event'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id)
);

-- UNIQUE (tenant_id, id) is implicit via PRIMARY KEY, documented for FK reference clarity

-- Index
CREATE INDEX events_tenant_status_idx ON tenant_events.events (tenant_id, status) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER events_update_timestamp
  BEFORE UPDATE ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER events_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger
CREATE TRIGGER events_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_events.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.events FORCE ROW LEVEL SECURITY;

CREATE POLICY events_select ON tenant_events.events
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY events_insert ON tenant_events.events
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY events_update ON tenant_events.events
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY events_delete ON tenant_events.events
  FOR DELETE USING (false);

CREATE POLICY events_service ON tenant_events.events
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- STUB: TENANT_STAFF.EMPLOYEES (minimal for FKs)
-- ============================================
-- NOTE: This is a stub table. Full schema will be added in staff module migration.
-- Current stub provides: tenant_id, id, email, names, role
-- Future migration will ALTER TABLE ADD COLUMN for remaining fields.

CREATE TABLE tenant_staff.employees (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL DEFAULT 'Test',
  last_name text NOT NULL DEFAULT 'User',
  role text NOT NULL DEFAULT 'staff',  -- 'admin', 'manager', 'lead', 'staff'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id)
);

-- Partial unique index for active employee emails
CREATE UNIQUE INDEX employees_tenant_email_active_idx
  ON tenant_staff.employees (tenant_id, email) WHERE deleted_at IS NULL;

-- Index
CREATE INDEX employees_tenant_role_idx ON tenant_staff.employees (tenant_id, role) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER employees_update_timestamp
  BEFORE UPDATE ON tenant_staff.employees
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER employees_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.employees
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger
CREATE TRIGGER employees_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.employees
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.employees FORCE ROW LEVEL SECURITY;

CREATE POLICY employees_select ON tenant_staff.employees
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY employees_insert ON tenant_staff.employees
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employees_update ON tenant_staff.employees
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY employees_delete ON tenant_staff.employees
  FOR DELETE USING (false);

CREATE POLICY employees_service ON tenant_staff.employees
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- UPDATE: fn_to_tenant_time() (now uses real location data)
-- ============================================

CREATE OR REPLACE FUNCTION core.fn_to_tenant_time(ts timestamptz, p_tenant_id uuid, p_location_id uuid DEFAULT NULL)
RETURNS timestamptz AS $$
DECLARE
  v_timezone text;
BEGIN
  -- 1. Check location-specific timezone first
  IF p_location_id IS NOT NULL THEN
    SELECT timezone INTO v_timezone
    FROM tenant.locations
    WHERE tenant_id = p_tenant_id AND id = p_location_id AND deleted_at IS NULL;

    IF v_timezone IS NOT NULL THEN
      RETURN ts AT TIME ZONE v_timezone;
    END IF;
  END IF;

  -- 2. Fall back to tenant default
  SELECT default_timezone INTO v_timezone
  FROM platform.accounts
  WHERE id = p_tenant_id;

  IF v_timezone IS NULL THEN
    v_timezone := 'UTC';
  END IF;

  RETURN ts AT TIME ZONE v_timezone;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables created
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname IN ('tenant', 'tenant_events', 'tenant_staff')
ORDER BY schemaname, tablename;

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname IN ('tenant', 'tenant_events', 'tenant_staff')
ORDER BY schemaname, tablename, indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname IN ('tenant', 'tenant_events', 'tenant_staff')
ORDER BY schemaname, tablename;
