ALTER TABLE "tenant_inventory"."inventory_items" ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "par_level" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
ADD COLUMN IF NOT EXISTS "supplier_id" UUID,
ADD COLUMN IF NOT EXISTS "unit_of_measure" TEXT NOT NULL DEFAULT 'each';

CREATE INDEX IF NOT EXISTS "inventory_items_supplier_id_idx" ON "tenant_inventory"."inventory_items"("supplier_id");
