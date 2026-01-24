-- MIGRATION: 20251222000106_kitchen_recipes.sql
-- Kitchen recipes + prep workflow tables (aligned to Schema Registry v2 / Contract v2)

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-increment version number for new recipe versions
CREATE OR REPLACE FUNCTION tenant_kitchen.fn_next_recipe_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  next_version int;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
  FROM tenant_kitchen.recipe_versions
  WHERE tenant_id = NEW.tenant_id
    AND recipe_id = NEW.recipe_id;

  NEW.version_number := next_version;
  RETURN NEW;
END;
$$;

-- Prevent updates to locked recipe versions (except initial lock)
CREATE OR REPLACE FUNCTION tenant_kitchen.fn_prevent_locked_recipe_version_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_locked THEN
    RAISE EXCEPTION 'Cannot modify locked recipe version (id: %)', OLD.id
      USING ERRCODE = 'restrict_violation',
            HINT = 'Create a new version to make changes';
  END IF;

  RETURN NEW;
END;
$$;

-- Prevent modifying ingredients/steps on locked recipe versions
CREATE OR REPLACE FUNCTION tenant_kitchen.fn_prevent_locked_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.recipe_version_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM tenant_kitchen.recipe_versions
    WHERE tenant_id = NEW.tenant_id
      AND id = NEW.recipe_version_id
      AND is_locked = true
  ) THEN
    RAISE EXCEPTION 'Cannot modify locked recipe version (id: %)', NEW.recipe_version_id
      USING ERRCODE = 'restrict_violation',
            HINT = 'Create a new version to make changes';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure prep tasks reference locked recipe versions and auto-lock on first use
CREATE OR REPLACE FUNCTION tenant_kitchen.fn_prepare_prep_task_recipe_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.recipe_version_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE tenant_kitchen.recipe_versions
  SET is_locked = true,
      locked_at = COALESCE(locked_at, now())
  WHERE tenant_id = NEW.tenant_id
    AND id = NEW.recipe_version_id
    AND is_locked = false;

  IF NOT EXISTS (
    SELECT 1
    FROM tenant_kitchen.recipe_versions
    WHERE tenant_id = NEW.tenant_id
      AND id = NEW.recipe_version_id
      AND is_locked = true
  ) THEN
    RAISE EXCEPTION 'Prep tasks must reference a locked recipe version (id: %)', NEW.recipe_version_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- TENANT_KITCHEN.RECIPES
-- ============================================

CREATE TABLE tenant_kitchen.recipes (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  cuisine_type text,
  description text,
  tags text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (length(trim(name)) >= 3 AND length(trim(name)) <= 200),
  CHECK (length(trim(description)) <= 5000)
);

CREATE UNIQUE INDEX recipes_tenant_name_active_idx
  ON tenant_kitchen.recipes (tenant_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX recipes_tenant_active_idx
  ON tenant_kitchen.recipes (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX recipes_tenant_is_active_idx
  ON tenant_kitchen.recipes (tenant_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX recipes_tags_idx
  ON tenant_kitchen.recipes USING GIN (tags);

CREATE TRIGGER recipes_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.recipes
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER recipes_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.recipes
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER recipes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.recipes
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

ALTER TABLE tenant_kitchen.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.recipes FORCE ROW LEVEL SECURITY;

CREATE POLICY recipes_select ON tenant_kitchen.recipes
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY recipes_insert ON tenant_kitchen.recipes
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY recipes_update ON tenant_kitchen.recipes
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY recipes_delete ON tenant_kitchen.recipes
  FOR DELETE USING (false);

CREATE POLICY recipes_service ON tenant_kitchen.recipes
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.RECIPE_VERSIONS
-- ============================================

CREATE TABLE tenant_kitchen.recipe_versions (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  version_number int NOT NULL,
  yield_quantity numeric(10,2) NOT NULL,
  yield_unit_id smallint NOT NULL REFERENCES core.units(id),
  yield_description text,
  prep_time_minutes int,
  cook_time_minutes int,
  rest_time_minutes int,
  difficulty_level smallint,
  notes text,
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, recipe_id, version_number),
  FOREIGN KEY (tenant_id, recipe_id) REFERENCES tenant_kitchen.recipes(tenant_id, id) ON DELETE RESTRICT,
  CHECK (version_number > 0),
  CHECK (yield_quantity > 0),
  CHECK (prep_time_minutes IS NULL OR prep_time_minutes >= 0),
  CHECK (cook_time_minutes IS NULL OR cook_time_minutes >= 0),
  CHECK (rest_time_minutes IS NULL OR rest_time_minutes >= 0),
  CHECK (difficulty_level IS NULL OR (difficulty_level >= 1 AND difficulty_level <= 5))
);

CREATE INDEX recipe_versions_tenant_recipe_idx
  ON tenant_kitchen.recipe_versions (tenant_id, recipe_id)
  WHERE deleted_at IS NULL;

CREATE INDEX recipe_versions_tenant_locked_idx
  ON tenant_kitchen.recipe_versions (tenant_id, is_locked)
  WHERE deleted_at IS NULL;

CREATE INDEX recipe_versions_tenant_active_idx
  ON tenant_kitchen.recipe_versions (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX recipe_versions_locked_by_idx
  ON tenant_kitchen.recipe_versions (locked_by);

CREATE TRIGGER recipe_versions_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.recipe_versions
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER recipe_versions_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.recipe_versions
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER recipe_versions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.recipe_versions
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

CREATE TRIGGER recipe_versions_set_version_number
  BEFORE INSERT ON tenant_kitchen.recipe_versions
  FOR EACH ROW EXECUTE FUNCTION tenant_kitchen.fn_next_recipe_version_number();

CREATE TRIGGER recipe_versions_prevent_locked_update
  BEFORE UPDATE ON tenant_kitchen.recipe_versions
  FOR EACH ROW EXECUTE FUNCTION tenant_kitchen.fn_prevent_locked_recipe_version_update();

ALTER TABLE tenant_kitchen.recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.recipe_versions FORCE ROW LEVEL SECURITY;

CREATE POLICY recipe_versions_select ON tenant_kitchen.recipe_versions
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY recipe_versions_insert ON tenant_kitchen.recipe_versions
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY recipe_versions_update ON tenant_kitchen.recipe_versions
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
    AND is_locked = false
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY recipe_versions_delete ON tenant_kitchen.recipe_versions
  FOR DELETE USING (false);

CREATE POLICY recipe_versions_service ON tenant_kitchen.recipe_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.RECIPE_INGREDIENTS
-- ============================================

CREATE TABLE tenant_kitchen.recipe_ingredients (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  recipe_version_id uuid NOT NULL,
  ingredient_id uuid NOT NULL,
  quantity numeric(10,4) NOT NULL,
  unit_id smallint NOT NULL REFERENCES core.units(id),
  preparation_notes text,
  is_optional boolean NOT NULL DEFAULT false,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, recipe_version_id) REFERENCES tenant_kitchen.recipe_versions(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, ingredient_id) REFERENCES tenant_kitchen.ingredients(tenant_id, id) ON DELETE RESTRICT,
  CHECK (quantity > 0),
  CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX recipe_ingredients_version_ingredient_active_idx
  ON tenant_kitchen.recipe_ingredients (tenant_id, recipe_version_id, ingredient_id)
  WHERE deleted_at IS NULL;

CREATE INDEX recipe_ingredients_tenant_version_idx
  ON tenant_kitchen.recipe_ingredients (tenant_id, recipe_version_id)
  WHERE deleted_at IS NULL;

CREATE INDEX recipe_ingredients_tenant_active_idx
  ON tenant_kitchen.recipe_ingredients (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX recipe_ingredients_ingredient_id_idx
  ON tenant_kitchen.recipe_ingredients (ingredient_id);

CREATE TRIGGER recipe_ingredients_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER recipe_ingredients_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER recipe_ingredients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

CREATE TRIGGER recipe_ingredients_prevent_locked_mutation
  BEFORE INSERT OR UPDATE ON tenant_kitchen.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION tenant_kitchen.fn_prevent_locked_version_mutation();

ALTER TABLE tenant_kitchen.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.recipe_ingredients FORCE ROW LEVEL SECURITY;

CREATE POLICY recipe_ingredients_select ON tenant_kitchen.recipe_ingredients
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY recipe_ingredients_insert ON tenant_kitchen.recipe_ingredients
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY recipe_ingredients_update ON tenant_kitchen.recipe_ingredients
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY recipe_ingredients_delete ON tenant_kitchen.recipe_ingredients
  FOR DELETE USING (false);

CREATE POLICY recipe_ingredients_service ON tenant_kitchen.recipe_ingredients
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.RECIPE_STEPS
-- ============================================

CREATE TABLE tenant_kitchen.recipe_steps (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  recipe_version_id uuid NOT NULL,
  step_number smallint NOT NULL,
  instruction text NOT NULL,
  duration_minutes int,
  temperature_value numeric(5,1),
  temperature_unit char(1),
  equipment_needed text[],
  tips text,
  video_url text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, recipe_version_id, step_number),
  FOREIGN KEY (tenant_id, recipe_version_id) REFERENCES tenant_kitchen.recipe_versions(tenant_id, id) ON DELETE CASCADE,
  CHECK (step_number > 0),
  CHECK (length(trim(instruction)) >= 3 AND length(trim(instruction)) <= 2000),
  CHECK (temperature_unit IS NULL OR temperature_unit IN ('F', 'C'))
);

CREATE INDEX recipe_steps_tenant_version_idx
  ON tenant_kitchen.recipe_steps (tenant_id, recipe_version_id)
  WHERE deleted_at IS NULL;

CREATE INDEX recipe_steps_tenant_active_idx
  ON tenant_kitchen.recipe_steps (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE TRIGGER recipe_steps_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.recipe_steps
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER recipe_steps_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.recipe_steps
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER recipe_steps_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.recipe_steps
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

CREATE TRIGGER recipe_steps_prevent_locked_mutation
  BEFORE INSERT OR UPDATE ON tenant_kitchen.recipe_steps
  FOR EACH ROW EXECUTE FUNCTION tenant_kitchen.fn_prevent_locked_version_mutation();

ALTER TABLE tenant_kitchen.recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.recipe_steps FORCE ROW LEVEL SECURITY;

CREATE POLICY recipe_steps_select ON tenant_kitchen.recipe_steps
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY recipe_steps_insert ON tenant_kitchen.recipe_steps
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY recipe_steps_update ON tenant_kitchen.recipe_steps
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY recipe_steps_delete ON tenant_kitchen.recipe_steps
  FOR DELETE USING (false);

CREATE POLICY recipe_steps_service ON tenant_kitchen.recipe_steps
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.DISHES
-- ============================================

CREATE TABLE tenant_kitchen.dishes (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  service_style text,
  default_container_id uuid,
  presentation_image_url text,
  min_prep_lead_days smallint NOT NULL DEFAULT 0,
  max_prep_lead_days smallint,
  portion_size_description text,
  dietary_tags text[],
  allergens text[],
  price_per_person numeric(10,2),
  cost_per_person numeric(10,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, recipe_id) REFERENCES tenant_kitchen.recipes(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, default_container_id) REFERENCES tenant_kitchen.containers(tenant_id, id) ON DELETE RESTRICT,
  CHECK (min_prep_lead_days >= 0),
  CHECK (max_prep_lead_days IS NULL OR max_prep_lead_days >= min_prep_lead_days)
);

CREATE UNIQUE INDEX dishes_tenant_name_active_idx
  ON tenant_kitchen.dishes (tenant_id, name)
  WHERE deleted_at IS NULL;

CREATE INDEX dishes_tenant_active_idx
  ON tenant_kitchen.dishes (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX dishes_tenant_is_active_idx
  ON tenant_kitchen.dishes (tenant_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX dishes_recipe_id_idx
  ON tenant_kitchen.dishes (recipe_id);

CREATE TRIGGER dishes_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.dishes
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER dishes_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.dishes
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER dishes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.dishes
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

ALTER TABLE tenant_kitchen.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.dishes FORCE ROW LEVEL SECURITY;

CREATE POLICY dishes_select ON tenant_kitchen.dishes
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY dishes_insert ON tenant_kitchen.dishes
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY dishes_update ON tenant_kitchen.dishes
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY dishes_delete ON tenant_kitchen.dishes
  FOR DELETE USING (false);

CREATE POLICY dishes_service ON tenant_kitchen.dishes
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.PREP_TASKS
-- ============================================

CREATE TABLE tenant_kitchen.prep_tasks (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  dish_id uuid,
  recipe_version_id uuid,
  method_id uuid,
  container_id uuid,
  location_id uuid NOT NULL,
  task_type text NOT NULL DEFAULT 'prep',
  name text NOT NULL,
  quantity_total numeric(10,2) NOT NULL,
  quantity_unit_id smallint REFERENCES core.units(id),
  quantity_completed numeric(10,2) NOT NULL DEFAULT 0,
  servings_total int,
  start_by_date date NOT NULL,
  due_by_date date NOT NULL,
  due_by_time time,
  is_event_finish boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  priority smallint NOT NULL DEFAULT 5,
  estimated_minutes int,
  actual_minutes int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, dish_id) REFERENCES tenant_kitchen.dishes(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, recipe_version_id) REFERENCES tenant_kitchen.recipe_versions(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, method_id) REFERENCES tenant_kitchen.prep_methods(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, container_id) REFERENCES tenant_kitchen.containers(tenant_id, id) ON DELETE RESTRICT,
  CHECK (event_id IS NOT NULL),
  CHECK (location_id IS NOT NULL),
  CHECK (quantity_completed <= quantity_total),
  CHECK (due_by_date >= start_by_date),
  CHECK (priority >= 1 AND priority <= 10),
  CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  CHECK (actual_minutes IS NULL OR actual_minutes >= 0)
);

CREATE INDEX prep_tasks_tenant_active_idx
  ON tenant_kitchen.prep_tasks (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX prep_tasks_tenant_date_status_idx
  ON tenant_kitchen.prep_tasks (tenant_id, start_by_date, status)
  WHERE deleted_at IS NULL;

CREATE INDEX prep_tasks_tenant_due_idx
  ON tenant_kitchen.prep_tasks (tenant_id, due_by_date, status)
  WHERE deleted_at IS NULL;

CREATE INDEX prep_tasks_event_id_idx
  ON tenant_kitchen.prep_tasks (event_id);

CREATE INDEX prep_tasks_location_id_idx
  ON tenant_kitchen.prep_tasks (location_id);

CREATE INDEX prep_tasks_dish_id_idx
  ON tenant_kitchen.prep_tasks (dish_id);

CREATE INDEX prep_tasks_recipe_version_id_idx
  ON tenant_kitchen.prep_tasks (recipe_version_id);

CREATE INDEX prep_tasks_method_id_idx
  ON tenant_kitchen.prep_tasks (method_id);

CREATE INDEX prep_tasks_container_id_idx
  ON tenant_kitchen.prep_tasks (container_id);

CREATE TRIGGER prep_tasks_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.prep_tasks
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER prep_tasks_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.prep_tasks
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER prep_tasks_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.prep_tasks
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

CREATE TRIGGER prep_tasks_prepare_recipe_version
  BEFORE INSERT OR UPDATE ON tenant_kitchen.prep_tasks
  FOR EACH ROW EXECUTE FUNCTION tenant_kitchen.fn_prepare_prep_task_recipe_version();

ALTER TABLE tenant_kitchen.prep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.prep_tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY prep_tasks_select ON tenant_kitchen.prep_tasks
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY prep_tasks_insert ON tenant_kitchen.prep_tasks
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY prep_tasks_update ON tenant_kitchen.prep_tasks
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY prep_tasks_delete ON tenant_kitchen.prep_tasks
  FOR DELETE USING (false);

CREATE POLICY prep_tasks_service ON tenant_kitchen.prep_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.TASK_BUNDLES
-- ============================================

CREATE TABLE tenant_kitchen.task_bundles (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_id uuid,
  name text NOT NULL,
  description text,
  is_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CHECK (length(trim(name)) >= 3 AND length(trim(name)) <= 200)
);

CREATE INDEX task_bundles_tenant_active_idx
  ON tenant_kitchen.task_bundles (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX task_bundles_event_id_idx
  ON tenant_kitchen.task_bundles (event_id);

CREATE TRIGGER task_bundles_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.task_bundles
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER task_bundles_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.task_bundles
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER task_bundles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.task_bundles
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

ALTER TABLE tenant_kitchen.task_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.task_bundles FORCE ROW LEVEL SECURITY;

CREATE POLICY task_bundles_select ON tenant_kitchen.task_bundles
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY task_bundles_insert ON tenant_kitchen.task_bundles
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY task_bundles_update ON tenant_kitchen.task_bundles
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY task_bundles_delete ON tenant_kitchen.task_bundles
  FOR DELETE USING (false);

CREATE POLICY task_bundles_service ON tenant_kitchen.task_bundles
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.TASK_BUNDLE_ITEMS
-- ============================================

CREATE TABLE tenant_kitchen.task_bundle_items (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  bundle_id uuid NOT NULL,
  task_id uuid NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, bundle_id, task_id),
  FOREIGN KEY (tenant_id, bundle_id) REFERENCES tenant_kitchen.task_bundles(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, task_id) REFERENCES tenant_kitchen.prep_tasks(tenant_id, id) ON DELETE CASCADE,
  CHECK (sort_order >= 0)
);

CREATE INDEX task_bundle_items_tenant_bundle_idx
  ON tenant_kitchen.task_bundle_items (tenant_id, bundle_id);

CREATE INDEX task_bundle_items_tenant_task_idx
  ON tenant_kitchen.task_bundle_items (tenant_id, task_id);

ALTER TABLE tenant_kitchen.task_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.task_bundle_items FORCE ROW LEVEL SECURITY;

CREATE POLICY task_bundle_items_select ON tenant_kitchen.task_bundle_items
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY task_bundle_items_insert ON tenant_kitchen.task_bundle_items
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY task_bundle_items_update ON tenant_kitchen.task_bundle_items
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY task_bundle_items_delete ON tenant_kitchen.task_bundle_items
  FOR DELETE USING (false);

CREATE POLICY task_bundle_items_service ON tenant_kitchen.task_bundle_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.TASK_CLAIMS
-- ============================================

CREATE TABLE tenant_kitchen.task_claims (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tenant_kitchen.prep_tasks(tenant_id, id) ON DELETE CASCADE,
  CHECK (employee_id IS NOT NULL),
  CHECK (released_at IS NULL OR released_at >= claimed_at)
);

CREATE UNIQUE INDEX task_claims_active_idx
  ON tenant_kitchen.task_claims (tenant_id, task_id)
  WHERE released_at IS NULL;

CREATE INDEX task_claims_tenant_employee_idx
  ON tenant_kitchen.task_claims (tenant_id, employee_id)
  WHERE released_at IS NULL;

CREATE INDEX task_claims_task_id_idx
  ON tenant_kitchen.task_claims (task_id);

CREATE TRIGGER task_claims_update_timestamp
  BEFORE UPDATE ON tenant_kitchen.task_claims
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER task_claims_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_kitchen.task_claims
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER task_claims_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_kitchen.task_claims
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

ALTER TABLE tenant_kitchen.task_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.task_claims FORCE ROW LEVEL SECURITY;

CREATE POLICY task_claims_select ON tenant_kitchen.task_claims
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY task_claims_insert ON tenant_kitchen.task_claims
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY task_claims_update ON tenant_kitchen.task_claims
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY task_claims_delete ON tenant_kitchen.task_claims
  FOR DELETE USING (false);

CREATE POLICY task_claims_service ON tenant_kitchen.task_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_KITCHEN.TASK_PROGRESS
-- ============================================

CREATE TABLE tenant_kitchen.task_progress (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  progress_type text NOT NULL,
  old_status text,
  new_status text,
  quantity_completed numeric(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, task_id) REFERENCES tenant_kitchen.prep_tasks(tenant_id, id) ON DELETE CASCADE,
  CHECK (employee_id IS NOT NULL)
);

CREATE INDEX task_progress_tenant_task_created_idx
  ON tenant_kitchen.task_progress (tenant_id, task_id, created_at DESC);

CREATE INDEX task_progress_task_id_idx
  ON tenant_kitchen.task_progress (task_id);

CREATE INDEX task_progress_employee_id_idx
  ON tenant_kitchen.task_progress (employee_id);

ALTER TABLE tenant_kitchen.task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_kitchen.task_progress FORCE ROW LEVEL SECURITY;

CREATE POLICY task_progress_select ON tenant_kitchen.task_progress
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY task_progress_insert ON tenant_kitchen.task_progress
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY task_progress_update ON tenant_kitchen.task_progress
  FOR UPDATE USING (false);

CREATE POLICY task_progress_delete ON tenant_kitchen.task_progress
  FOR DELETE USING (false);

CREATE POLICY task_progress_service ON tenant_kitchen.task_progress
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- REALTIME SETTINGS
-- ============================================

ALTER TABLE tenant_kitchen.task_claims REPLICA IDENTITY FULL;
ALTER TABLE tenant_kitchen.task_progress REPLICA IDENTITY FULL;
ALTER TABLE tenant_kitchen.prep_tasks REPLICA IDENTITY FULL;


-- ============================================
-- VERIFICATION
-- ============================================

SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'tenant_kitchen'
ORDER BY tablename;

SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'tenant_kitchen'
ORDER BY tablename, indexname;

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'tenant_kitchen'
ORDER BY tablename;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid::regclass::text LIKE 'tenant_kitchen.%'
  AND contype IN ('c', 'f')
ORDER BY conrelid::regclass::text, conname;
