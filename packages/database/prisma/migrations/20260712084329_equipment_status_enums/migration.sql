/*
  Hand-rewritten 2026-07-12 (REVIEW-2): Prisma generated destructive
  DROP COLUMN + ADD COLUMN conversions that reset rows to their defaults.
  Rewritten to in-place ALTER ... USING casts — values preserved, out-of-vocab
  values fail loudly at deploy.
  Pre-flight before deploy:
    SELECT DISTINCT status FROM tenant_facilities.maintenance_work_orders;
    SELECT DISTINCT status FROM tenant_kitchen.equipment;
*/
-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('active', 'maintenance', 'out_of_service', 'retired');

-- CreateEnum
CREATE TYPE "MaintenanceWorkOrderStatus" AS ENUM ('open', 'assigned', 'in_progress', 'awaiting_parts', 'completed', 'cancelled');

-- AlterTable (in-place, value-preserving)
ALTER TABLE "tenant_facilities"."maintenance_work_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_facilities"."maintenance_work_orders" ALTER COLUMN "status" TYPE "MaintenanceWorkOrderStatus" USING "status"::text::"MaintenanceWorkOrderStatus";
ALTER TABLE "tenant_facilities"."maintenance_work_orders" ALTER COLUMN "status" SET DEFAULT 'open';
ALTER TABLE "tenant_facilities"."maintenance_work_orders" ALTER COLUMN "status" SET NOT NULL;

-- AlterTable (in-place, value-preserving)
ALTER TABLE "tenant_kitchen"."equipment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."equipment" ALTER COLUMN "status" TYPE "EquipmentStatus" USING "status"::text::"EquipmentStatus";
ALTER TABLE "tenant_kitchen"."equipment" ALTER COLUMN "status" SET DEFAULT 'active';
ALTER TABLE "tenant_kitchen"."equipment" ALTER COLUMN "status" SET NOT NULL;

-- CreateIndex
CREATE INDEX "maintenance_work_orders_tenant_id_status_idx" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_status_idx" ON "tenant_kitchen"."equipment"("tenant_id", "status");
