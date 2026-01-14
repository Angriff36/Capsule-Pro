-- MIGRATION: 20251225000135_event_dishes.sql
-- Create event_dishes table for linking dishes to events with quantities.
-- Follows Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_EVENTS.EVENT_DISHES
-- ============================================

CREATE TABLE tenant_events.event_dishes (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  dish_id uuid NOT NULL,
  course text, -- 'appetizer', 'main', 'dessert', etc.
  quantity_servings integer NOT NULL DEFAULT 1,
  service_style text, -- Override dish default
  special_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  -- Phase 1 FK columns (REFERENCES in Phase 2)
  -- FOREIGN KEY (tenant_id, event_id) REFERENCES tenant_events.events(tenant_id, id) ON DELETE CASCADE
  -- FOREIGN KEY (tenant_id, dish_id) REFERENCES tenant_kitchen.dishes(tenant_id, id) ON DELETE RESTRICT
  CHECK (quantity_servings >= 1),
  CHECK (length(trim(coalesce(course, ''))) <= 50),
  CHECK (length(trim(coalesce(service_style, ''))) <= 50),
  CHECK (length(trim(coalesce(special_instructions, ''))) <= 1000)
);

-- Indexes
CREATE UNIQUE INDEX event_dishes_unique_idx
  ON tenant_events.event_dishes (tenant_id, event_id, dish_id)
  WHERE deleted_at IS NULL;

CREATE INDEX event_dishes_tenant_event_idx
  ON tenant_events.event_dishes(tenant_id, event_id) WHERE deleted_at IS NULL;

CREATE INDEX event_dishes_tenant_dish_idx
  ON tenant_events.event_dishes(tenant_id, dish_id) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER event_dishes_update_timestamp
  BEFORE UPDATE ON tenant_events.event_dishes
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER event_dishes_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.event_dishes
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER event_dishes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.event_dishes
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_events.event_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.event_dishes FORCE ROW LEVEL SECURITY;

CREATE POLICY event_dishes_select ON tenant_events.event_dishes
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY event_dishes_insert ON tenant_events.event_dishes
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY event_dishes_update ON tenant_events.event_dishes
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY event_dishes_delete ON tenant_events.event_dishes
  FOR DELETE USING (false);

CREATE POLICY event_dishes_service ON tenant_events.event_dishes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Phase 2 FK Constraints
ALTER TABLE tenant_events.event_dishes
  ADD CONSTRAINT event_dishes_event_fk
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES tenant_events.events (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE tenant_events.event_dishes
  ADD CONSTRAINT event_dishes_dish_fk
  FOREIGN KEY (tenant_id, dish_id)
  REFERENCES tenant_kitchen.dishes (tenant_id, id)
  ON DELETE RESTRICT;

