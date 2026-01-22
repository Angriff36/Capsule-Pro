-- =====================================================================
-- ALLERGEN AND DIETARY TRACKING
-- =====================================================================
-- Purpose: Track guest dietary restrictions and allergen conflicts. Enable
--   allergen warnings during event planning and production to prevent
--   safety issues.
-- Schema: tenant_events.event_guests, tenant_kitchen.allergen_warnings
-- Follows: Schema Contract v2 (composite PK, RLS, triggers, indexes)
-- Spec: specs/kitchen-allergen-tracking.md
-- =====================================================================

-- =====================================================================
-- TABLE: event_guests
-- =====================================================================
CREATE TABLE tenant_events.event_guests (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Event reference
  event_id uuid NOT NULL,

  -- Guest information
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,

  -- Contact flag
  is_primary_contact boolean NOT NULL DEFAULT false,

  -- Dietary restrictions (vegan, vegetarian, kosher, halal, etc.)
  dietary_restrictions text[],

  -- Allergen restrictions (peanuts, dairy, gluten, shellfish, etc.)
  allergen_restrictions text[],

  -- Special meal requirements
  special_meal_required boolean NOT NULL DEFAULT false,
  special_meal_notes text,
  meal_preference text,

  -- Table assignment
  table_assignment text,

  -- Additional notes
  notes text,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (guest_name IS NOT NULL AND length(trim(guest_name)) > 0)
);

-- =====================================================================
-- TABLE: allergen_warnings
-- =====================================================================
CREATE TABLE tenant_kitchen.allergen_warnings (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Event reference
  event_id uuid NOT NULL,

  -- Dish reference (NULL for general menu warnings)
  dish_id uuid,

  -- Warning details
  warning_type text NOT NULL,  -- 'allergen_conflict', 'dietary_restriction', 'cross_contamination'
  allergens text[],
  severity text NOT NULL DEFAULT 'warning',  -- 'info', 'warning', 'critical'
  affected_guests text[],  -- Array of guest names or IDs

  -- Acknowledgment tracking
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  override_reason text,

  -- Resolution tracking
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,

  -- Additional notes
  notes text,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (warning_type IN ('allergen_conflict', 'dietary_restriction', 'cross_contamination')),
  CHECK (severity IN ('info', 'warning', 'critical'))
);

-- =====================================================================
-- INDEXES (per Schema Contract v2, Section L)
-- =====================================================================

-- event_guests indexes
CREATE INDEX event_guests_tenant_idx ON tenant_events.event_guests(tenant_id);
CREATE INDEX event_guests_tenant_active_idx ON tenant_events.event_guests(tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX event_guests_event_idx ON tenant_events.event_guests(event_id) WHERE deleted_at IS NULL;
CREATE INDEX event_guests_dietary_idx ON tenant_events.event_guests USING GIN (dietary_restrictions) WHERE deleted_at IS NULL;
CREATE INDEX event_guests_allergen_idx ON tenant_events.event_guests USING GIN (allergen_restrictions) WHERE deleted_at IS NULL;

-- allergen_warnings indexes
CREATE INDEX allergen_warnings_tenant_idx ON tenant_kitchen.allergen_warnings(tenant_id);
CREATE INDEX allergen_warnings_tenant_active_idx ON tenant_kitchen.allergen_warnings(tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX allergen_warnings_event_idx ON tenant_kitchen.allergen_warnings(event_id) WHERE deleted_at IS NULL;
CREATE INDEX allergen_warnings_dish_idx ON tenant_kitchen.allergen_warnings(dish_id) WHERE deleted_at IS NULL;
CREATE INDEX allergen_warnings_type_idx ON tenant_kitchen.allergen_warnings(warning_type) WHERE deleted_at IS NULL;
CREATE INDEX allergen_warnings_acknowledged_idx ON tenant_kitchen.allergen_warnings(is_acknowledged) WHERE deleted_at IS NULL;
CREATE INDEX allergen_warnings_allergens_idx ON tenant_kitchen.allergen_warnings USING GIN (allergens) WHERE deleted_at IS NULL;

-- =====================================================================
-- TRIGGERS (per Schema Contract v2, Section E)
-- =====================================================================

-- Triggers for event_guests
CREATE TRIGGER event_guests_update_timestamp
  BEFORE UPDATE ON tenant_events.event_guests
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER event_guests_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.event_guests
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER event_guests_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.event_guests
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- Triggers for allergen_warnings
CREATE TRIGGER allergen_warnings_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.allergen_warnings
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER allergen_warnings_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.allergen_warnings
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER allergen_warnings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.allergen_warnings
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- =====================================================================
-- ROW LEVEL SECURITY (per Schema Contract v2, Section D)
-- =====================================================================

-- RLS for event_guests
ALTER TABLE tenant_events.event_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.event_guests FORCE ROW LEVEL SECURITY;

CREATE POLICY "event_guests_select" ON tenant_events.event_guests
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY "event_guests_insert" ON tenant_events.event_guests
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY "event_guests_update" ON tenant_events.event_guests
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "event_guests_delete" ON tenant_events.event_guests
  FOR DELETE USING (false);

CREATE POLICY "event_guests_service" ON tenant_events.event_guests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS for allergen_warnings
ALTER TABLE tenant_kitchen.allergen_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.allergen_warnings FORCE ROW LEVEL SECURITY;

CREATE POLICY "allergen_warnings_select" ON tenant_kitchen.allergen_warnings
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY "allergen_warnings_insert" ON tenant_kitchen.allergen_warnings
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY "allergen_warnings_update" ON tenant_kitchen.allergen_warnings
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "allergen_warnings_delete" ON tenant_kitchen.allergen_warnings
  FOR DELETE USING (false);

CREATE POLICY "allergen_warnings_service" ON tenant_kitchen.allergen_warnings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- REAL-TIME SUPPORT (per Schema Contract v2, Section K)
-- =====================================================================

ALTER TABLE tenant_events.event_guests REPLICA IDENTITY FULL;
ALTER TABLE tenant_kitchen.allergen_warnings REPLICA IDENTITY FULL;

-- =====================================================================
-- FOREIGN KEYS (PHASE 2: AFTER TABLES EXIST)
-- =====================================================================

-- FK to events for event_id in event_guests
ALTER TABLE tenant_events.event_guests
  ADD CONSTRAINT event_guests_event_fk
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES tenant_events.events(tenant_id, id)
  ON DELETE CASCADE;

-- FK to events for event_id in allergen_warnings
ALTER TABLE tenant_kitchen.allergen_warnings
  ADD CONSTRAINT allergen_warnings_event_fk
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES tenant_events.events(tenant_id, id)
  ON DELETE CASCADE;

-- FK to dishes for dish_id in allergen_warnings
ALTER TABLE tenant_kitchen.allergen_warnings
  ADD CONSTRAINT allergen_warnings_dish_fk
  FOREIGN KEY (tenant_id, dish_id)
  REFERENCES tenant_kitchen.dishes(tenant_id, id)
  ON DELETE SET NULL;

-- FK to employees for acknowledged_by in allergen_warnings
ALTER TABLE tenant_kitchen.allergen_warnings
  ADD CONSTRAINT allergen_warnings_acknowledged_by_fk
  FOREIGN KEY (tenant_id, acknowledged_by)
  REFERENCES tenant_staff.employees(tenant_id, id)
  ON DELETE SET NULL;

-- =====================================================================
-- COMPLETED
-- =====================================================================
