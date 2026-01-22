-- =====================================================================
-- KITCHEN: PREP LISTS
-- =====================================================================
-- Purpose: Persist prep lists generated from event menus. Enable
--   viewing, editing, and tracking prep list items by station.
--   Supports manual quantity adjustments and completion tracking.
-- Schema: tenant_kitchen.prep_lists, tenant_kitchen.prep_list_items
-- Follows: Schema Contract v2 (composite PK, RLS, triggers, indexes)
-- Spec: specs/kitchen-prep-list-generation.md
-- =====================================================================

-- =====================================================================
-- TABLE: prep_lists
-- =====================================================================
CREATE TABLE tenant_kitchen.prep_lists (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Event association
  event_id uuid NOT NULL,

  -- Prep list details
  name text NOT NULL,
  batch_multiplier numeric(10,2) NOT NULL DEFAULT 1,
  dietary_restrictions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  total_items integer NOT NULL DEFAULT 0,
  total_estimated_time integer NOT NULL DEFAULT 0,

  -- Additional notes
  notes text,

  -- Timestamps
  generated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (batch_multiplier > 0),
  CHECK (total_items >= 0),
  CHECK (total_estimated_time >= 0),
  CHECK (status IN ('draft', 'finalized', 'in_progress', 'completed'))
);

-- =====================================================================
-- TABLE: prep_list_items
-- =====================================================================
CREATE TABLE tenant_kitchen.prep_list_items (
  -- Multi-tenant composite PK pattern
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (tenant_id, id),

  -- Unique constraint for composite FK safety
  UNIQUE (tenant_id, id),

  -- Prep list association
  prep_list_id uuid NOT NULL,

  -- Station assignment
  station_id text NOT NULL,
  station_name text NOT NULL,

  -- Ingredient details
  ingredient_id uuid NOT NULL,
  ingredient_name text NOT NULL,
  category text,

  -- Quantity details (base and scaled)
  base_quantity numeric(10,2) NOT NULL,
  base_unit text NOT NULL,
  scaled_quantity numeric(10,2) NOT NULL,
  scaled_unit text NOT NULL,

  -- Flags and notes
  is_optional boolean NOT NULL DEFAULT false,
  preparation_notes text,

  -- Allergens and dietary info
  allergens text[] NOT NULL DEFAULT '{}',
  dietary_substitutions text[] NOT NULL DEFAULT '{}',

  -- Recipe/dish context
  dish_id uuid,
  dish_name text,
  recipe_version_id uuid,

  -- Sorting and completion
  sort_order integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,

  -- Standard timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  -- Constraints
  CHECK (base_quantity > 0),
  CHECK (scaled_quantity > 0),
  CHECK (sort_order >= 0)
);

-- =====================================================================
-- INDEXES (per Schema Contract v2, Section L)
-- =====================================================================

-- PREP_LISTS indexes
-- --------------------
-- Standard tenant index for prep_lists
CREATE INDEX prep_lists_tenant_idx ON tenant_kitchen.prep_lists(tenant_id);

-- Active records index (with soft delete filter)
CREATE INDEX prep_lists_tenant_active_idx ON tenant_kitchen.prep_lists(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Event lookup index
CREATE INDEX prep_lists_event_idx ON tenant_kitchen.prep_lists(event_id) WHERE deleted_at IS NULL;

-- Status filter index
CREATE INDEX prep_lists_status_idx ON tenant_kitchen.prep_lists(status) WHERE deleted_at IS NULL;

-- Generated at index (for sorting by recency)
CREATE INDEX prep_lists_generated_at_idx ON tenant_kitchen.prep_lists(generated_at DESC) WHERE deleted_at IS NULL;

-- PREP_LIST_ITEMS indexes
-- -----------------------
-- Standard tenant index for prep_list_items
CREATE INDEX prep_list_items_tenant_idx ON tenant_kitchen.prep_list_items(tenant_id);

-- Active records index (with soft delete filter)
CREATE INDEX prep_list_items_tenant_active_idx ON tenant_kitchen.prep_list_items(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Prep list lookup index
CREATE INDEX prep_list_items_prep_list_idx ON tenant_kitchen.prep_list_items(prep_list_id) WHERE deleted_at IS NULL;

-- Station filter index
CREATE INDEX prep_list_items_station_idx ON tenant_kitchen.prep_list_items(station_id) WHERE deleted_at IS NULL;

-- Ingredient lookup index
CREATE INDEX prep_list_items_ingredient_idx ON tenant_kitchen.prep_list_items(ingredient_id) WHERE deleted_at IS NULL;

-- Completion status index
CREATE INDEX prep_list_items_completed_idx ON tenant_kitchen.prep_list_items(is_completed) WHERE deleted_at IS NULL;

-- Composite index for station completion queries
CREATE INDEX prep_list_items_station_completed_idx ON tenant_kitchen.prep_list_items(station_id, is_completed) WHERE deleted_at IS NULL;

-- =====================================================================
-- TRIGGERS (per Schema Contract v2, Section E)
-- =====================================================================

-- Trigger: Update timestamp for prep_lists
CREATE TRIGGER prep_lists_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.prep_lists
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

-- Trigger: Prevent tenant_id mutation for prep_lists
CREATE TRIGGER prep_lists_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.prep_lists
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Trigger: Audit trail for prep_lists
CREATE TRIGGER prep_lists_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.prep_lists
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- Trigger: Update timestamp for prep_list_items
CREATE TRIGGER prep_list_items_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.prep_list_items
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

-- Trigger: Prevent tenant_id mutation for prep_list_items
CREATE TRIGGER prep_list_items_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.prep_list_items
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Trigger: Audit trail for prep_list_items
CREATE TRIGGER prep_list_items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.prep_list_items
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- =====================================================================
-- ROW LEVEL SECURITY (per Schema Contract v2, Section D)
-- =====================================================================

ALTER TABLE tenant_kitchen.prep_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.prep_lists FORCE ROW LEVEL SECURITY;

-- 1. SELECT - Tenant isolation + soft delete filter for prep_lists
CREATE POLICY "prep_lists_select" ON tenant_kitchen.prep_lists
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- 2. INSERT - Tenant isolation with NOT NULL enforcement for prep_lists
CREATE POLICY "prep_lists_insert" ON tenant_kitchen.prep_lists
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- 3. UPDATE - Prevent tenant_id mutation for prep_lists
CREATE POLICY "prep_lists_update" ON tenant_kitchen.prep_lists
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 4. DELETE - Blocked (soft delete only via UPDATE) for prep_lists
CREATE POLICY "prep_lists_delete" ON tenant_kitchen.prep_lists
  FOR DELETE USING (false);

-- 5. SERVICE ROLE - Bypass for admin/background jobs for prep_lists
CREATE POLICY "prep_lists_service" ON tenant_kitchen.prep_lists
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE tenant_kitchen.prep_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.prep_list_items FORCE ROW LEVEL SECURITY;

-- 1. SELECT - Tenant isolation + soft delete filter for prep_list_items
CREATE POLICY "prep_list_items_select" ON tenant_kitchen.prep_list_items
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- 2. INSERT - Tenant isolation with NOT NULL enforcement for prep_list_items
CREATE POLICY "prep_list_items_insert" ON tenant_kitchen.prep_list_items
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- 3. UPDATE - Prevent tenant_id mutation for prep_list_items
CREATE POLICY "prep_list_items_update" ON tenant_kitchen.prep_list_items
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- 4. DELETE - Blocked (soft delete only via UPDATE) for prep_list_items
CREATE POLICY "prep_list_items_delete" ON tenant_kitchen.prep_list_items
  FOR DELETE USING (false);

-- 5. SERVICE ROLE - Bypass for admin/background jobs for prep_list_items
CREATE POLICY "prep_list_items_service" ON tenant_kitchen.prep_list_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- REAL-TIME SUPPORT (per Schema Contract v2, Section K)
-- =====================================================================

-- Enable REPLICA IDENTITY for real-time subscriptions
ALTER TABLE tenant_kitchen.prep_lists REPLICA IDENTITY FULL;
ALTER TABLE tenant_kitchen.prep_list_items REPLICA IDENTITY FULL;

-- =====================================================================
-- FOREIGN KEYS (PHASE 2: AFTER TABLES EXIST)
-- =====================================================================

-- FK to events for prep_lists.event_id (composite FK)
ALTER TABLE tenant_kitchen.prep_lists
  ADD CONSTRAINT prep_lists_event_fk
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES tenant_events.events(tenant_id, id)
  ON DELETE CASCADE;

-- FK to prep_lists for prep_list_items.prep_list_id (composite FK)
ALTER TABLE tenant_kitchen.prep_list_items
  ADD CONSTRAINT prep_list_items_prep_list_fk
  FOREIGN KEY (tenant_id, prep_list_id)
  REFERENCES tenant_kitchen.prep_lists(tenant_id, id)
  ON DELETE CASCADE;

-- FK to ingredients for prep_list_items.ingredient_id (composite FK)
ALTER TABLE tenant_kitchen.prep_list_items
  ADD CONSTRAINT prep_list_items_ingredient_fk
  FOREIGN KEY (tenant_id, ingredient_id)
  REFERENCES tenant_kitchen.ingredients(tenant_id, id)
  ON DELETE RESTRICT;

-- FK to employees for prep_list_items.completed_by (composite FK)
ALTER TABLE tenant_kitchen.prep_list_items
  ADD CONSTRAINT prep_list_items_completed_by_fk
  FOREIGN KEY (tenant_id, completed_by)
  REFERENCES tenant_staff.employees(tenant_id, id)
  ON DELETE SET NULL;

-- =====================================================================
-- COMPLETED
-- =====================================================================
