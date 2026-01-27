-- CreateEnum
CREATE TYPE "tenant_kitchen"."menu_category" AS ENUM ('breakfast', 'lunch', 'dinner', 'appetizer', 'dessert', 'beverage', 'custom');

-- CreateTable
CREATE TABLE "tenant_kitchen"."menus" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "tenant_kitchen"."menu_category",
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

-- CreateTable
CREATE TABLE "tenant_kitchen"."menu_dishes" (
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

-- CreateIndex
CREATE UNIQUE INDEX "menu_dishes_tenant_id_menu_id_dish_id_key" ON "tenant_kitchen"."menu_dishes"("tenant_id", "menu_id", "dish_id");

-- CreateIndex
CREATE INDEX "menu_dishes_menu_id_idx" ON "tenant_kitchen"."menu_dishes"("menu_id");

-- CreateIndex
CREATE INDEX "menu_dishes_dish_id_idx" ON "tenant_kitchen"."menu_dishes"("dish_id");

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."menus" ADD CONSTRAINT "menus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."menu_dishes" ADD CONSTRAINT "menu_dishes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."menu_dishes" ADD CONSTRAINT "menu_dishes_menu_id_fkey" FOREIGN KEY ("tenant_id", "menu_id") REFERENCES "tenant_kitchen"."menus"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."menu_dishes" ADD CONSTRAINT "menu_dishes_dish_id_fkey" FOREIGN KEY ("tenant_id", "dish_id") REFERENCES "tenant_kitchen"."dishes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
