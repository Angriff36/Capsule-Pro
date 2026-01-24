-- =====================================================================
-- WAREHOUSE: PURCHASE ORDERS AND RECEIVING WORKFLOW
-- =====================================================================
-- Purpose: Mobile-friendly receiving interface with PO matching, quality
--   checks, discrepancy reporting, and automatic stock level updates
-- Schema: tenant_inventory.purchase_orders, tenant_inventory.purchase_order_items
-- Follows: Schema Contract v2 (composite PK, RLS, triggers, indexes)
-- =====================================================================

-- =====================================================================
-- TABLE: purchase_orders
-- =====================================================================
CREATE TABLE tenant_inventory.purchase_orders (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- PO identification
  po_number text NOT NULL,
  UNIQUE (tenant_id, po_number),

  -- Relationships
  vendor_id uuid NOT NULL,
  location_id uuid NOT NULL,

  -- Dates
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,

  -- Status workflow
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'confirmed', 'received', 'cancelled')
  ),

  -- Financials
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  shipping_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,

  -- Additional details
  notes text,

  -- Workflow tracking
  submitted_by uuid,
  submitted_at timestamptz,
  received_by uuid,
  received_at timestamptz,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (subtotal >= 0),
  CHECK (tax_amount >= 0),
  CHECK (shipping_amount >= 0),
  CHECK (total >= 0),
  CHECK (po_number IS NOT NULL AND length(trim(po_number)) > 0)
);

-- =====================================================================
-- TABLE: purchase_order_items
-- =====================================================================
CREATE TABLE tenant_inventory.purchase_order_items (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Relationships
  purchase_order_id uuid NOT NULL,
  item_id uuid NOT NULL,
  unit_id smallint NOT NULL,

  -- Quantities and costs
  quantity_ordered numeric(10,2) NOT NULL,
  quantity_received numeric(10,2) NOT NULL DEFAULT 0,
  unit_cost numeric(10,4) NOT NULL,
  total_cost numeric(12,2) NOT NULL,

  -- Quality and receiving
  quality_status text DEFAULT 'pending' CHECK (
    quality_status IN ('pending', 'approved', 'rejected', 'needs_inspection')
  ),
  discrepancy_type text CHECK (
    discrepancy_type IN ('shortage', 'overage', 'damaged', 'wrong_item', 'none')
  ),
  discrepancy_amount numeric(10,2),

  -- Additional details
  notes text,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (quantity_ordered > 0),
  CHECK (quantity_received >= 0),
  CHECK (quantity_received <= quantity_ordered),
  CHECK (unit_cost >= 0),
  CHECK (total_cost >= 0),
  CHECK (discrepancy_amount IS NULL OR discrepancy_amount >= 0)
);

-- =====================================================================
-- INDEXES (per Schema Contract v2, Section L)
-- =====================================================================

-- Standard index: tenant_id (always present)
CREATE INDEX idx_purchase_orders_tenant
  ON tenant_inventory.purchase_orders(tenant_id)
  WHERE deleted_at IS NULL;

-- Active records index (tenant_id, deleted_at)
CREATE INDEX idx_purchase_orders_active
  ON tenant_inventory.purchase_orders(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Vendor queries (tenant_id, vendor_id)
CREATE INDEX idx_purchase_orders_vendor
  ON tenant_inventory.purchase_orders(tenant_id, vendor_id)
  WHERE deleted_at IS NULL;

-- Status filtering (tenant_id, status)
CREATE INDEX idx_purchase_orders_status
  ON tenant_inventory.purchase_orders(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Date queries (tenant_id, order_date)
CREATE INDEX idx_purchase_orders_date
  ON tenant_inventory.purchase_orders(tenant_id, order_date)
  WHERE deleted_at IS NULL;

-- PO number lookup (tenant_id, po_number)
CREATE INDEX idx_purchase_orders_number
  ON tenant_inventory.purchase_orders(tenant_id, po_number)
  WHERE deleted_at IS NULL;

-- Standard index: tenant_id (always present) for items
CREATE INDEX idx_purchase_order_items_tenant
  ON tenant_inventory.purchase_order_items(tenant_id)
  WHERE deleted_at IS NULL;

-- Active records index (tenant_id, deleted_at) for items
CREATE INDEX idx_purchase_order_items_active
  ON tenant_inventory.purchase_order_items(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- PO queries (tenant_id, purchase_order_id)
CREATE INDEX idx_purchase_order_items_po
  ON tenant_inventory.purchase_order_items(tenant_id, purchase_order_id)
  WHERE deleted_at IS NULL;

-- Item queries (tenant_id, item_id)
CREATE INDEX idx_purchase_order_items_item
  ON tenant_inventory.purchase_order_items(tenant_id, item_id)
  WHERE deleted_at IS NULL;

-- Quality status filtering (tenant_id, quality_status)
CREATE INDEX idx_purchase_order_items_quality
  ON tenant_inventory.purchase_order_items(tenant_id, quality_status)
  WHERE deleted_at IS NULL;

-- =====================================================================
-- TRIGGERS (per Schema Contract v2, Section F)
-- =====================================================================

-- Trigger: Update timestamp on UPDATE for purchase_orders
CREATE TRIGGER purchase_orders_update_timestamp
  BEFORE UPDATE ON tenant_inventory.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

-- Trigger: Prevent tenant_id mutation for purchase_orders
CREATE TRIGGER purchase_orders_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_inventory.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Trigger: Audit trail for purchase_orders
CREATE TRIGGER purchase_orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_inventory.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- Trigger: Update timestamp on UPDATE for purchase_order_items
CREATE TRIGGER purchase_order_items_update_timestamp
  BEFORE UPDATE ON tenant_inventory.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

-- Trigger: Prevent tenant_id mutation for purchase_order_items
CREATE TRIGGER purchase_order_items_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_inventory.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Trigger: Audit trail for purchase_order_items
CREATE TRIGGER purchase_order_items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_inventory.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- =====================================================================
-- ROW LEVEL SECURITY (per Schema Contract v2, Section D)
-- =====================================================================

ALTER TABLE tenant_inventory.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.purchase_orders FORCE ROW LEVEL SECURITY;

-- 1. SELECT - Tenant isolation + soft delete filter for purchase_orders
CREATE POLICY "purchase_orders_select" ON tenant_inventory.purchase_orders
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- 2. INSERT - Tenant isolation with NOT NULL enforcement for purchase_orders
CREATE POLICY "purchase_orders_insert" ON tenant_inventory.purchase_orders
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- 3. UPDATE - Prevent tenant_id mutation for purchase_orders
CREATE POLICY "purchase_orders_update" ON tenant_inventory.purchase_orders
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 4. DELETE - Blocked (soft delete only via UPDATE) for purchase_orders
CREATE POLICY "purchase_orders_delete" ON tenant_inventory.purchase_orders
  FOR DELETE USING (false);

-- 5. SERVICE ROLE - Bypass for admin/background jobs for purchase_orders
CREATE POLICY "purchase_orders_service" ON tenant_inventory.purchase_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE tenant_inventory.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_inventory.purchase_order_items FORCE ROW LEVEL SECURITY;

-- 1. SELECT - Tenant isolation + soft delete filter for purchase_order_items
CREATE POLICY "purchase_order_items_select" ON tenant_inventory.purchase_order_items
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- 2. INSERT - Tenant isolation with NOT NULL enforcement for purchase_order_items
CREATE POLICY "purchase_order_items_insert" ON tenant_inventory.purchase_order_items
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- 3. UPDATE - Prevent tenant_id mutation for purchase_order_items
CREATE POLICY "purchase_order_items_update" ON tenant_inventory.purchase_order_items
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 4. DELETE - Blocked (soft delete only via UPDATE) for purchase_order_items
CREATE POLICY "purchase_order_items_delete" ON tenant_inventory.purchase_order_items
  FOR DELETE USING (false);

-- 5. SERVICE ROLE - Bypass for admin/background jobs for purchase_order_items
CREATE POLICY "purchase_order_items_service" ON tenant_inventory.purchase_order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- REAL-TIME SUPPORT (per Schema Contract v2, Section K)
-- =====================================================================

ALTER TABLE tenant_inventory.purchase_orders REPLICA IDENTITY FULL;
ALTER TABLE tenant_inventory.purchase_order_items REPLICA IDENTITY FULL;

-- =====================================================================
-- FOREIGN KEYS (PHASE 2: AFTER TABLES EXIST)
-- =====================================================================

-- FK to inventory_suppliers for vendor_id
ALTER TABLE tenant_inventory.purchase_orders
  ADD CONSTRAINT purchase_orders_vendor_fk
  FOREIGN KEY (tenant_id, vendor_id)
  REFERENCES tenant_inventory.inventory_suppliers(tenant_id, id)
  ON DELETE RESTRICT;

-- FK to locations for location_id
ALTER TABLE tenant_inventory.purchase_orders
  ADD CONSTRAINT purchase_orders_location_fk
  FOREIGN KEY (tenant_id, location_id)
  REFERENCES tenant.locations(tenant_id, id)
  ON DELETE RESTRICT;

-- FK to purchase_orders for purchase_order_items
ALTER TABLE tenant_inventory.purchase_order_items
  ADD CONSTRAINT purchase_order_items_po_fk
  FOREIGN KEY (tenant_id, purchase_order_id)
  REFERENCES tenant_inventory.purchase_orders(tenant_id, id)
  ON DELETE CASCADE;

-- FK to inventory_items for item_id
ALTER TABLE tenant_inventory.purchase_order_items
  ADD CONSTRAINT purchase_order_items_item_fk
  FOREIGN KEY (tenant_id, item_id)
  REFERENCES tenant_inventory.inventory_items(tenant_id, id)
  ON DELETE RESTRICT;

-- FK to core.units for unit_id
ALTER TABLE tenant_inventory.purchase_order_items
  ADD CONSTRAINT purchase_order_items_unit_fk
  FOREIGN KEY (unit_id)
  REFERENCES core.units(id)
  ON DELETE RESTRICT;

-- =====================================================================
-- COMPLETED
-- =====================================================================
