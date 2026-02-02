-- CreateTable: menus
CREATE TABLE IF NOT EXISTS "tenant_kitchen"."menus" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "base_price" DECIMAL(10,2),
    "price_per_person" DECIMAL(10,2),
    "min_guests" SMALLINT,
    "max_guests" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "menus_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable: menu_dishes
CREATE TABLE IF NOT EXISTS "tenant_kitchen"."menu_dishes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_id" UUID NOT NULL,
    "dish_id" UUID NOT NULL,
    "course" TEXT,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "menu_dishes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex: menu_dishes_menu_id_idx
CREATE INDEX IF NOT EXISTS "menu_dishes_menu_id_idx" ON "tenant_kitchen"."menu_dishes"("menu_id");

-- CreateIndex: menu_dishes_dish_id_idx
CREATE INDEX IF NOT EXISTS "menu_dishes_dish_id_idx" ON "tenant_kitchen"."menu_dishes"("dish_id");

-- CreateIndex: menu_dishes_tenant_menu_dish_unique
CREATE UNIQUE INDEX IF NOT EXISTS "menu_dishes_tenant_menu_dish_unique" ON "tenant_kitchen"."menu_dishes"("tenant_id", "menu_id", "dish_id");

-- Triggers for menus
DROP TRIGGER IF EXISTS "menus_update_timestamp" ON "tenant_kitchen"."menus";
CREATE TRIGGER "menus_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."menus"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "menus_prevent_tenant_mutation" ON "tenant_kitchen"."menus";
CREATE TRIGGER "menus_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."menus"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- Triggers for menu_dishes
DROP TRIGGER IF EXISTS "menu_dishes_update_timestamp" ON "tenant_kitchen"."menu_dishes";
CREATE TRIGGER "menu_dishes_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."menu_dishes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "menu_dishes_prevent_tenant_mutation" ON "tenant_kitchen"."menu_dishes";
CREATE TRIGGER "menu_dishes_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."menu_dishes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_kitchen"."menus" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_kitchen"."menu_dishes" REPLICA IDENTITY FULL;
