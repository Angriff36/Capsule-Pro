-- MIGRATION: 20251222000116_tenant_inventory_fixed.sql
-- Inventory module: inventory_items, inventory_transactions, inventory_alerts, inventory_suppliers
-- Follows Schema Contract v2 patterns with composite PKs and RLS policies

-- Ensure uuid-ossp extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TENANT_INVENTORY.INVENTORY_ITEMS
-- ============================================
-- Master inventory item catalog with auto-generated item numbers
CREATE TABLE tenant_inventory.inventory_items (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  item_number text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  unit_cost numeric(10,2) NOT NULL DEFAULT 0.00,
  quantity_on_hand numeric(12,3) NOT NULL DEFAULT 0.000,
  reorder_level numeric(12,3) NOT NULL DEFAULT 0.000,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id)
);

-- Standard indexes for inventory_items
CREATE INDEX inventory_items_tenant_active_idx
  ON tenant_inventory.inventory_items (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX inventory_items_tenant_category_idx
  ON tenant_inventory.inventory_items (tenant_id, category) WHERE deleted_at IS NULL;

CREATE INDEX inventory_items_tenant_reorder_idx
  ON tenant_inventory.inventory_items (tenant_id)
  WHERE deleted_at IS NULL AND quantity_on_hand <= reorder_level AND reorder_level > 0;

-- Partial unique index after table creation
CREATE UNIQUE INDEX inventory_items_tenant_number_active_idx
  ON tenant_inventory.inventory_items (tenant_id, item_number)
  WHERE deleted_at IS NULL;

-- Add trigger for updated_at timestamp
CREATE TRIGGER inventory_items_timestamp_trigger
  BEFORE UPDATE ON tenant_inventory.inventory_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- ============================================
-- TENANT_INVENTORY.INVENTORY_TRANSACTIONS
-- ============================================
-- Immutable ledger of all inventory movements
CREATE TABLE tenant_inventory.inventory_transactions (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
  quantity numeric(12,3) NOT NULL,
  unit_cost numeric(10,2) NOT NULL DEFAULT 0.00,
  total_cost numeric(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  reference text,
  notes text,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (tenant_id, id),
  CHECK (tenant_id IS NOT NULL)  -- Phase 1 FK pattern
);

-- Standard indexes for inventory_transactions
CREATE INDEX inventory_transactions_tenant_item_idx
  ON tenant_inventory.inventory_transactions (tenant_id, item_id);

CREATE INDEX inventory_transactions_tenant_date_idx
  ON tenant_inventory.inventory_transactions (tenant_id, transaction_date);

CREATE INDEX inventory_transactions_tenant_type_idx
  ON tenant_inventory.inventory_transactions (tenant_id, transaction_type);

-- ============================================
-- TENANT_INVENTORY.INVENTORY_ALERTS
-- ============================================
-- System alerts for inventory thresholds and issues
CREATE TABLE tenant_inventory.inventory_alerts (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('LOW_STOCK', 'EXPIRED', 'REORDER')),
  threshold_value numeric(12,3) NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  PRIMARY KEY (tenant_id, id),
  CHECK (tenant_id IS NOT NULL)  -- Phase 1 FK pattern
);

-- Standard indexes for inventory_alerts
CREATE INDEX inventory_alerts_tenant_item_idx
  ON tenant_inventory.inventory_alerts (tenant_id, item_id);

CREATE INDEX inventory_alerts_tenant_type_idx
  ON tenant_inventory.inventory_alerts (tenant_id, alert_type);

CREATE INDEX inventory_alerts_tenant_triggered_idx
  ON tenant_inventory.inventory_alerts (tenant_id, triggered_at);

CREATE INDEX inventory_alerts_tenant_active_idx
  ON tenant_inventory.inventory_alerts (tenant_id)
  WHERE deleted_at IS NULL AND resolved_at IS NULL;

-- Add triggers for updated_at timestamp and status management
CREATE TRIGGER inventory_alerts_timestamp_trigger
  BEFORE UPDATE ON tenant_inventory.inventory_alerts
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- ============================================
-- TENANT_INVENTORY.INVENTORY_SUPPLIERS
-- ============================================
-- Master supplier catalog with auto-generated supplier numbers
CREATE TABLE tenant_inventory.inventory_suppliers (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  supplier_number text NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  payment_terms text NOT NULL DEFAULT 'NET_30',
  notes text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, supplier_number),
  CONSTRAINT suppliers_email_check CHECK (
    (email IS NULL) OR (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
  )
);

-- Standard indexes for inventory_suppliers
CREATE INDEX inventory_suppliers_tenant_active_idx
  ON tenant_inventory.inventory_suppliers (tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX inventory_suppliers_tenant_name_idx
  ON tenant_inventory.inventory_suppliers (tenant_id, name) WHERE deleted_at IS NULL;

CREATE INDEX inventory_suppliers_tenant_contact_idx
  ON tenant_inventory.inventory_suppliers (tenant_id, contact_person) WHERE deleted_at IS NULL AND contact_person IS NOT NULL;

-- Partial unique index after table creation
CREATE UNIQUE INDEX inventory_suppliers_tenant_number_active_idx
  ON tenant_inventory.inventory_suppliers (tenant_id, supplier_number)
  WHERE deleted_at IS NULL;

-- Add trigger for updated_at timestamp
CREATE TRIGGER inventory_suppliers_timestamp_trigger
  BEFORE UPDATE ON tenant_inventory.inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
-- All tables follow the 5-policy RLS pattern from Schema Contract v2

-- inventory_items RLS policies
ALTER TABLE tenant_inventory.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.inventory_items FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_items_select ON tenant_inventory.inventory_items
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY inventory_items_insert ON tenant_inventory.inventory_items
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY inventory_items_update ON tenant_inventory.inventory_items
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY inventory_items_delete ON tenant_inventory.inventory_items
  FOR DELETE USING (false);

CREATE POLICY inventory_items_service ON tenant_inventory.inventory_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inventory_transactions RLS policies
ALTER TABLE tenant_inventory.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.inventory_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_transactions_select ON tenant_inventory.inventory_transactions
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY inventory_transactions_insert ON tenant_inventory.inventory_transactions
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY inventory_transactions_update ON tenant_inventory.inventory_transactions
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY inventory_transactions_delete ON tenant_inventory.inventory_transactions
  FOR DELETE USING (false);

CREATE POLICY inventory_transactions_service ON tenant_inventory.inventory_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inventory_alerts RLS policies
ALTER TABLE tenant_inventory.inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.inventory_alerts FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_alerts_select ON tenant_inventory.inventory_alerts
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY inventory_alerts_insert ON tenant_inventory.inventory_alerts
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY inventory_alerts_update ON tenant_inventory.inventory_alerts
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY inventory_alerts_delete ON tenant_inventory.inventory_alerts
  FOR DELETE USING (false);

CREATE POLICY inventory_alerts_service ON tenant_inventory.inventory_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- inventory_suppliers RLS policies
ALTER TABLE tenant_inventory.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.inventory_suppliers FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_suppliers_select ON tenant_inventory.inventory_suppliers
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY inventory_suppliers_insert ON tenant_inventory.inventory_suppliers
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY inventory_suppliers_update ON tenant_inventory.inventory_suppliers
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY inventory_suppliers_delete ON tenant_inventory.inventory_suppliers
  FOR DELETE USING (false);

CREATE POLICY inventory_suppliers_service ON tenant_inventory.inventory_suppliers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================
-- Core functions must exist from previous migrations (tenant_base.sql)

-- Prevent tenant_id mutation on sensitive tables
CREATE TRIGGER inventory_items_tenant_mutation_trigger
  BEFORE UPDATE OR INSERT ON tenant_inventory.inventory_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER inventory_transactions_tenant_mutation_trigger
  BEFORE UPDATE OR INSERT ON tenant_inventory.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER inventory_alerts_tenant_mutation_trigger
  BEFORE UPDATE OR INSERT ON tenant_inventory.inventory_alerts
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER inventory_suppliers_tenant_mutation_trigger
  BEFORE UPDATE OR INSERT ON tenant_inventory.inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Add audit trigger for inventory_items (high-value table)
CREATE TRIGGER inventory_items_audit_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON tenant_inventory.inventory_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger('tenant_inventory', 'inventory_items');

-- Add audit trigger for inventory_transactions (immutable ledger)
CREATE TRIGGER inventory_transactions_audit_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON tenant_inventory.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger('tenant_inventory', 'inventory_transactions');

-- Add audit trigger for inventory_suppliers
CREATE TRIGGER inventory_suppliers_audit_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON tenant_inventory.inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger('tenant_inventory', 'inventory_suppliers');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check that all tables were created successfully
SELECT
  schemaname as schema_name,
  tablename as table_name
FROM pg_tables
WHERE schemaname = 'tenant_inventory'
ORDER BY tablename;

-- Check that all indexes were created
SELECT
  schemaname as schema_name,
  tablename as table_name,
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes
WHERE schemaname = 'tenant_inventory'
ORDER BY tablename, indexname;

-- Check that RLS is enabled on all tables
SELECT
  schemaname as schema_name,
  tablename as table_name,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'tenant_inventory'
ORDER BY tablename;

-- Check that all expected columns exist in inventory_items
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'tenant_inventory'
  AND table_name = 'inventory_items'
  AND column_name NOT IN ('tenant_id', 'id', 'created_at', 'updated_at', 'deleted_at')
ORDER BY ordinal_position;
