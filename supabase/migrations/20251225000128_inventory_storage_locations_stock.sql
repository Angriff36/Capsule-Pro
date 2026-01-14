-- MIGRATION: 20251225000128_inventory_storage_locations_stock.sql
-- Adds storage_locations and inventory_stock tables for "Track Stock by Storage Location" feature
-- Follows Schema Contract v2 patterns with composite PKs and RLS policies

-- ============================================
-- TENANT_INVENTORY.STORAGE_LOCATIONS
-- ============================================
-- Physical storage locations within a tenant's site (refrigerated, frozen, dry storage)
CREATE TABLE tenant_inventory.storage_locations (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,  -- Physical site from tenant.locations
  name text NOT NULL,  -- "Walk-in Cooler", "Dry Storage Room A"
  storage_type text NOT NULL CHECK (storage_type IN ('refrigerated', 'frozen', 'dry', 'ambient')),
  temperature_min numeric(5,1),
  temperature_max numeric(5,1),
  temperature_unit char(1) DEFAULT 'F' CHECK (temperature_unit IN ('F', 'C')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  CONSTRAINT storage_locations_temp_both CHECK (
    (temperature_min IS NULL) = (temperature_max IS NULL)
  )
);

-- Partial unique index for active locations
CREATE UNIQUE INDEX storage_locations_tenant_location_name_active_idx
  ON tenant_inventory.storage_locations (tenant_id, location_id, name)
  WHERE deleted_at IS NULL;

-- Indexes for filtering by storage type and active status
CREATE INDEX storage_locations_tenant_type_idx
  ON tenant_inventory.storage_locations (tenant_id, storage_type) WHERE deleted_at IS NULL;

CREATE INDEX storage_locations_tenant_active_idx
  ON tenant_inventory.storage_locations (tenant_id) WHERE deleted_at IS NULL AND is_active = true;

-- Trigger for updated_at timestamp
CREATE TRIGGER storage_locations_timestamp_trigger
  BEFORE UPDATE ON tenant_inventory.storage_locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- Tenant mutation prevention trigger
CREATE TRIGGER storage_locations_tenant_mutation_trigger
  BEFORE UPDATE OR INSERT ON tenant_inventory.storage_locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger
CREATE TRIGGER storage_locations_audit_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON tenant_inventory.storage_locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger('tenant_inventory', 'storage_locations');

-- ============================================
-- TENANT_INVENTORY.INVENTORY_STOCK
-- ============================================
-- Current stock levels per item per storage location (immutable ledger, no deleted_at)
CREATE TABLE tenant_inventory.inventory_stock (
  tenant_id uuid NOT NULL,
  id uuid DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,  -- Reference to inventory_items (FK added in phase 2)
  storage_location_id uuid NOT NULL,  -- Reference to storage_locations (FK added in phase 2)
  quantity_on_hand numeric(10,2) NOT NULL DEFAULT 0,
  unit_id smallint NOT NULL,  -- Reference to core.units (FK added in phase 2)
  last_counted_at timestamptz,
  last_counted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, item_id, storage_location_id),
  CHECK (tenant_id IS NOT NULL),  -- Phase 1 FK pattern
  CHECK (item_id IS NOT NULL),
  CHECK (storage_location_id IS NOT NULL),
  CHECK (quantity_on_hand >= 0)
);

-- Indexes for stock queries
CREATE INDEX inventory_stock_tenant_item_idx
  ON tenant_inventory.inventory_stock (tenant_id, item_id);

CREATE INDEX inventory_stock_tenant_location_idx
  ON tenant_inventory.inventory_stock (tenant_id, storage_location_id);

CREATE INDEX inventory_stock_tenant_item_location_idx
  ON tenant_inventory.inventory_stock (tenant_id, item_id, storage_location_id);

-- Partial index for low stock alerts (quantity < 10 or NULL)
CREATE INDEX inventory_stock_low_stock_idx
  ON tenant_inventory.inventory_stock (tenant_id, item_id, storage_location_id)
  WHERE quantity_on_hand < 10 OR quantity_on_hand IS NULL;

-- Trigger for updated_at timestamp
CREATE TRIGGER inventory_stock_timestamp_trigger
  BEFORE UPDATE ON tenant_inventory.inventory_stock
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- Tenant mutation prevention trigger
CREATE TRIGGER inventory_stock_tenant_mutation_trigger
  BEFORE UPDATE OR INSERT ON tenant_inventory.inventory_stock
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- ============================================
-- RLS POLICIES
-- ============================================

-- storage_locations RLS policies
ALTER TABLE tenant_inventory.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.storage_locations FORCE ROW LEVEL SECURITY;

CREATE POLICY storage_locations_select ON tenant_inventory.storage_locations
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY storage_locations_insert ON tenant_inventory.storage_locations
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY storage_locations_update ON tenant_inventory.storage_locations
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY storage_locations_delete ON tenant_inventory.storage_locations
  FOR DELETE USING (false);

CREATE POLICY storage_locations_service ON tenant_inventory.storage_locations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inventory_stock RLS policies
ALTER TABLE tenant_inventory.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.inventory_stock FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_stock_select ON tenant_inventory.inventory_stock
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY inventory_stock_insert ON tenant_inventory.inventory_stock
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY inventory_stock_update ON tenant_inventory.inventory_stock
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY inventory_stock_delete ON tenant_inventory.inventory_stock
  FOR DELETE USING (false);

CREATE POLICY inventory_stock_service ON tenant_inventory.inventory_stock
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check that all tables were created successfully
SELECT
  schemaname as schema_name,
  tablename as table_name
FROM pg_tables
WHERE schemaname = 'tenant_inventory'
  AND tablename IN ('storage_locations', 'inventory_stock')
ORDER BY tablename;

-- Check that all indexes were created
SELECT
  schemaname as schema_name,
  tablename as table_name,
  indexname as index_name
FROM pg_indexes
WHERE schemaname = 'tenant_inventory'
  AND tablename IN ('storage_locations', 'inventory_stock')
ORDER BY tablename, indexname;

-- Check RLS is enabled
SELECT
  schemaname as schema_name,
  tablename as table_name,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'tenant_inventory'
  AND tablename IN ('storage_locations', 'inventory_stock')
ORDER BY tablename;
