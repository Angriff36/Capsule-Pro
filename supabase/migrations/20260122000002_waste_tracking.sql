-- =====================================================================
-- KITCHEN: WASTE TRACKING
-- =====================================================================
-- Purpose: Log food waste with reasons, quantities, and costs. Enable
--   waste analytics to identify reduction opportunities and cost savings.
-- Schema: core.waste_reasons (lookup), tenant_kitchen.waste_entries
-- Follows: Schema Contract v2 (composite PK, RLS, triggers, indexes)
-- Spec: specs/kitchen-waste-tracking.md
-- =====================================================================

-- =====================================================================
-- TABLE: waste_reasons (core lookup table)
-- =====================================================================
CREATE TABLE core.waste_reasons (
  -- Primary key
  id smallint PRIMARY KEY,

  -- Reason identification
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,

  -- UI hints
  color_hex char(7),

  -- Status
  is_active boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0
);

-- Seed standard waste reasons
INSERT INTO core.waste_reasons (id, code, name, description, color_hex, sort_order) VALUES
  (1, 'spoilage', 'Spoilage', 'Food that spoiled before use', '#ef4444', 1),
  (2, 'overproduction', 'Overproduction', 'Excess food prepared beyond needs', '#f59e0b', 2),
  (3, 'prep_error', 'Preparation Error', 'Mistakes during preparation', '#f97316', 3),
  (4, 'burnt', 'Burnt', 'Food that was burned during cooking', '#7c2d12', 4),
  (5, 'expired', 'Expired', 'Food past its expiration date', '#dc2626', 5),
  (6, 'quality', 'Quality Issues', 'Food that did not meet quality standards', '#eab308', 6),
  (7, 'dropped', 'Dropped/Spilled', 'Food that was dropped or spilled', '#84cc16', 7),
  (8, 'leftover', 'Leftovers', 'Uneaten food from events/service', '#22c55e', 8),
  (9, 'customer_return', 'Customer Return', 'Food returned by customer', '#06b6d4', 9),
  (10, 'other', 'Other', 'Other reasons not covered above', '#6b7280', 10);

-- =====================================================================
-- TABLE: waste_entries
-- =====================================================================
CREATE TABLE tenant_kitchen.waste_entries (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Item being wasted
  inventory_item_id uuid NOT NULL,

  -- Reason for waste
  reason_id smallint NOT NULL,

  -- Quantity details
  quantity numeric(10,3) NOT NULL,
  unit_id smallint,

  -- Location context
  location_id uuid,

  -- Event context (if waste occurred during an event)
  event_id uuid,

  -- Who logged the waste
  logged_by uuid NOT NULL,

  -- When waste occurred
  logged_at timestamptz NOT NULL DEFAULT now(),

  -- Cost tracking (calculated at time of entry)
  unit_cost numeric(10,2),
  total_cost numeric(10,2),

  -- Additional notes
  notes text,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (quantity > 0),
  CHECK (unit_cost IS NULL OR unit_cost >= 0),
  CHECK (total_cost IS NULL OR total_cost >= 0),
  CHECK (reason_id IN (SELECT id FROM core.waste_reasons WHERE is_active = true))
);

-- =====================================================================
-- INDEXES (per Schema Contract v2, Section L)
-- =====================================================================

-- Standard tenant index
CREATE INDEX waste_entries_tenant_idx ON tenant_kitchen.waste_entries(tenant_id);

-- Active records index (with soft delete filter)
CREATE INDEX waste_entries_tenant_active_idx ON tenant_kitchen.waste_entries(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Item lookup index
CREATE INDEX waste_entries_item_idx ON tenant_kitchen.waste_entries(inventory_item_id) WHERE deleted_at IS NULL;

-- Reason analysis index
CREATE INDEX waste_entries_reason_idx ON tenant_kitchen.waste_entries(reason_id) WHERE deleted_at IS NULL;

-- Location analysis index
CREATE INDEX waste_entries_location_idx ON tenant_kitchen.waste_entries(location_id) WHERE deleted_at IS NULL;

-- Event analysis index
CREATE INDEX waste_entries_event_idx ON tenant_kitchen.waste_entries(event_id) WHERE deleted_at IS NULL;

-- User activity index
CREATE INDEX waste_entries_logged_by_idx ON tenant_kitchen.waste_entries(logged_by) WHERE deleted_at IS NULL;

-- Time-based query index (for reports and trends)
CREATE INDEX waste_entries_logged_at_idx ON tenant_kitchen.waste_entries(tenant_id, logged_at DESC) WHERE deleted_at IS NULL;

-- =====================================================================
-- TRIGGERS (per Schema Contract v2, Section E)
-- =====================================================================

-- Trigger: Update timestamp for waste_entries
CREATE TRIGGER waste_entries_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.waste_entries
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

-- Trigger: Prevent tenant_id mutation for waste_entries
CREATE TRIGGER waste_entries_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.waste_entries
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Trigger: Audit trail for waste_entries
CREATE TRIGGER waste_entries_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.waste_entries
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- =====================================================================
-- ROW LEVEL SECURITY (per Schema Contract v2, Section D)
-- =====================================================================

ALTER TABLE tenant_kitchen.waste_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.waste_entries FORCE ROW LEVEL SECURITY;

-- 1. SELECT - Tenant isolation + soft delete filter for waste_entries
CREATE POLICY "waste_entries_select" ON tenant_kitchen.waste_entries
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- 2. INSERT - Tenant isolation with NOT NULL enforcement for waste_entries
CREATE POLICY "waste_entries_insert" ON tenant_kitchen.waste_entries
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- 3. UPDATE - Prevent tenant_id mutation for waste_entries
CREATE POLICY "waste_entries_update" ON tenant_kitchen.waste_entries
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 4. DELETE - Blocked (soft delete only via UPDATE) for waste_entries
CREATE POLICY "waste_entries_delete" ON tenant_kitchen.waste_entries
  FOR DELETE USING (false);

-- 5. SERVICE ROLE - Bypass for admin/background jobs for waste_entries
CREATE POLICY "waste_entries_service" ON tenant_kitchen.waste_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- REAL-TIME SUPPORT (per Schema Contract v2, Section K)
-- =====================================================================

ALTER TABLE tenant_kitchen.waste_entries REPLICA IDENTITY FULL;

-- =====================================================================
-- FOREIGN KEYS (PHASE 2: AFTER TABLES EXIST)
-- =====================================================================

-- FK to waste_reasons for reason_id
ALTER TABLE tenant_kitchen.waste_entries
  ADD CONSTRAINT waste_entries_reason_fk
  FOREIGN KEY (reason_id)
  REFERENCES core.waste_reasons(id)
  ON DELETE RESTRICT;

-- FK to inventory_items for inventory_item_id (composite FK)
ALTER TABLE tenant_kitchen.waste_entries
  ADD CONSTRAINT waste_entries_item_fk
  FOREIGN KEY (tenant_id, inventory_item_id)
  REFERENCES tenant_inventory.inventory_items(tenant_id, id)
  ON DELETE RESTRICT;

-- FK to locations for location_id (composite FK)
ALTER TABLE tenant_kitchen.waste_entries
  ADD CONSTRAINT waste_entries_location_fk
  FOREIGN KEY (tenant_id, location_id)
  REFERENCES tenant.locations(tenant_id, id)
  ON DELETE SET NULL;

-- FK to events for event_id (composite FK)
ALTER TABLE tenant_kitchen.waste_entries
  ADD CONSTRAINT waste_entries_event_fk
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES tenant_events.events(tenant_id, id)
  ON DELETE SET NULL;

-- FK to employees for logged_by (composite FK)
ALTER TABLE tenant_kitchen.waste_entries
  ADD CONSTRAINT waste_entries_logged_by_fk
  FOREIGN KEY (tenant_id, logged_by)
  REFERENCES tenant_staff.employees(tenant_id, id)
  ON DELETE RESTRICT;

-- FK to core.units for unit_id
ALTER TABLE tenant_kitchen.waste_entries
  ADD CONSTRAINT waste_entries_unit_fk
  FOREIGN KEY (unit_id)
  REFERENCES core.units(id)
  ON DELETE SET NULL;

-- =====================================================================
-- COMPLETED
-- =====================================================================
