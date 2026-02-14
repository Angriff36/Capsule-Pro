ALTER TABLE "tenant_inventory"."inventory_forecasts" ADD COLUMN IF NOT EXISTS "accuracy_tracked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "actual_depletion_date" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "error_days" INTEGER;
