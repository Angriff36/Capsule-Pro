-- MIGRATION: 20251222000103_kitchen_core.sql
-- Kitchen core tables: ingredients, containers, prep_methods, method_videos
-- These are foundational tables with no cross-module FK dependencies

-- ============================================
-- TENANT_KITCHEN.INGREDIENTS
-- ============================================

CREATE TABLE tenant_kitchen.ingredients (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,  -- 'produce', 'protein', 'dairy', 'dry_goods', etc.
  default_unit_id smallint NOT NULL REFERENCES core.units(id),
  density_g_per_ml numeric(10,4),  -- For volume<->weight conversion, NULL if not applicable
  shelf_life_days smallint,
  storage_instructions text,
  allergens text[],  -- 'gluten', 'dairy', 'nuts', 'shellfish', etc.
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (density_g_per_ml IS NULL OR density_g_per_ml > 0)
);

-- Partial unique index for active ingredient names
CREATE UNIQUE INDEX ingredients_tenant_name_active_idx
  ON tenant_kitchen.ingredients (tenant_id, name) WHERE deleted_at IS NULL;

-- GIN index for allergen searching
CREATE INDEX ingredients_allergens_idx ON tenant_kitchen.ingredients USING GIN (allergens);

-- Indexes
CREATE INDEX ingredients_tenant_category_idx ON tenant_kitchen.ingredients (tenant_id, lower(category)) WHERE deleted_at IS NULL;
CREATE INDEX ingredients_tenant_active_idx ON tenant_kitchen.ingredients (tenant_id, is_active) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER ingredients_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.ingredients
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER ingredients_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.ingredients
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER ingredients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.ingredients
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_kitchen.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.ingredients FORCE ROW LEVEL SECURITY;

CREATE POLICY ingredients_select ON tenant_kitchen.ingredients
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY ingredients_insert ON tenant_kitchen.ingredients
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY ingredients_update ON tenant_kitchen.ingredients
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY ingredients_delete ON tenant_kitchen.ingredients
  FOR DELETE USING (false);

CREATE POLICY ingredients_service ON tenant_kitchen.ingredients
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.CONTAINERS
-- ============================================

CREATE TABLE tenant_kitchen.containers (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  location_id uuid,  -- NULL = all locations (tenant-wide containers), FK added in cross_module_fks
  name text NOT NULL,
  container_type text NOT NULL,  -- 'hotel_pan', 'cambro', 'sheet_tray', etc.
  size_description text,  -- 'Full', 'Half', '1/3', etc.
  capacity_volume_ml numeric(10,2),
  capacity_weight_g numeric(10,2),
  capacity_portions int,
  is_reusable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (
    capacity_volume_ml IS NOT NULL OR
    capacity_weight_g IS NOT NULL OR
    capacity_portions IS NOT NULL
  ),
  CHECK (
    capacity_volume_ml IS NULL OR capacity_volume_ml > 0
  ),
  CHECK (
    capacity_weight_g IS NULL OR capacity_weight_g > 0
  ),
  CHECK (
    capacity_portions IS NULL OR capacity_portions > 0
  )
);

-- Partial unique index for active container names
CREATE UNIQUE INDEX containers_tenant_name_size_active_idx
  ON tenant_kitchen.containers (tenant_id, name, size_description) WHERE deleted_at IS NULL;

-- Index for future FK (Phase 1 - no REFERENCES yet)
CREATE INDEX containers_location_idx ON tenant_kitchen.containers(location_id);

-- Indexes
CREATE INDEX containers_tenant_type_idx ON tenant_kitchen.containers (tenant_id, lower(container_type)) WHERE deleted_at IS NULL;
CREATE INDEX containers_tenant_active_idx ON tenant_kitchen.containers (tenant_id, is_active) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER containers_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.containers
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER containers_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.containers
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER containers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.containers
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_kitchen.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.containers FORCE ROW LEVEL SECURITY;

CREATE POLICY containers_select ON tenant_kitchen.containers
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY containers_insert ON tenant_kitchen.containers
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY containers_update ON tenant_kitchen.containers
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY containers_delete ON tenant_kitchen.containers
  FOR DELETE USING (false);

CREATE POLICY containers_service ON tenant_kitchen.containers
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.PREP_METHODS
-- ============================================

CREATE TABLE tenant_kitchen.prep_methods (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,  -- 'storage', 'prep', 'cooking', 'plating', etc.
  description text,
  estimated_duration_minutes int,
  requires_certification text[],  -- Which certifications needed (e.g., 'food_safety', 'alcohol')
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (estimated_duration_minutes IS NULL OR (estimated_duration_minutes > 0 AND estimated_duration_minutes <= 1440))
);

-- Partial unique index for active method names
CREATE UNIQUE INDEX prep_methods_tenant_name_active_idx
  ON tenant_kitchen.prep_methods (tenant_id, name) WHERE deleted_at IS NULL;

-- GIN index for certification searching
CREATE INDEX prep_methods_certifications_idx ON tenant_kitchen.prep_methods USING GIN (requires_certification);

-- Indexes
CREATE INDEX prep_methods_tenant_category_idx ON tenant_kitchen.prep_methods (tenant_id, lower(category)) WHERE deleted_at IS NULL;
CREATE INDEX prep_methods_tenant_active_idx ON tenant_kitchen.prep_methods (tenant_id, is_active) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER prep_methods_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.prep_methods
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER prep_methods_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.prep_methods
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER prep_methods_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.prep_methods
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_kitchen.prep_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.prep_methods FORCE ROW LEVEL SECURITY;

CREATE POLICY prep_methods_select ON tenant_kitchen.prep_methods
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY prep_methods_insert ON tenant_kitchen.prep_methods
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY prep_methods_update ON tenant_kitchen.prep_methods
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY prep_methods_delete ON tenant_kitchen.prep_methods
  FOR DELETE USING (false);

CREATE POLICY prep_methods_service ON tenant_kitchen.prep_methods
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.METHOD_VIDEOS
-- ============================================

CREATE TABLE tenant_kitchen.method_videos (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  method_id uuid NOT NULL,
  title text NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds int,
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  -- Same-table FK (prep_methods exists in this migration)
  FOREIGN KEY (tenant_id, method_id) REFERENCES tenant_kitchen.prep_methods(tenant_id, id) ON DELETE CASCADE,
  CHECK (video_url ~ '^https?://'),
  CHECK (length(video_url) <= 2048),
  CHECK (duration_seconds IS NULL OR (duration_seconds > 0 AND duration_seconds <= 86400))
);

-- Unique sort order per method (no ties)
CREATE UNIQUE INDEX method_videos_tenant_method_sort_idx
  ON tenant_kitchen.method_videos (tenant_id, method_id, sort_order) WHERE deleted_at IS NULL;

-- Indexes
CREATE INDEX method_videos_tenant_method_idx ON tenant_kitchen.method_videos (tenant_id, method_id) WHERE deleted_at IS NULL;
CREATE INDEX method_videos_tenant_active_idx ON tenant_kitchen.method_videos (tenant_id, is_active) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER method_videos_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.method_videos
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER method_videos_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.method_videos
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER method_videos_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.method_videos
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_kitchen.method_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.method_videos FORCE ROW LEVEL SECURITY;

CREATE POLICY method_videos_select ON tenant_kitchen.method_videos
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY method_videos_insert ON tenant_kitchen.method_videos
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY method_videos_update ON tenant_kitchen.method_videos
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY method_videos_delete ON tenant_kitchen.method_videos
  FOR DELETE USING (false);

CREATE POLICY method_videos_service ON tenant_kitchen.method_videos
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables created
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'tenant_kitchen'
ORDER BY tablename;

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'tenant_kitchen'
ORDER BY tablename, indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'tenant_kitchen'
ORDER BY tablename;
