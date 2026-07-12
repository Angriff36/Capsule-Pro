/*
  Warnings:

  - The `status` column on the `maintenance_work_orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `equipment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('active', 'maintenance', 'out_of_service', 'retired');

-- CreateEnum
CREATE TYPE "MaintenanceWorkOrderStatus" AS ENUM ('open', 'assigned', 'in_progress', 'awaiting_parts', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "tenant_facilities"."maintenance_work_orders" DROP COLUMN "status",
ADD COLUMN     "status" "MaintenanceWorkOrderStatus" NOT NULL DEFAULT 'open';

-- AlterTable
ALTER TABLE "tenant_kitchen"."equipment" DROP COLUMN "status",
ADD COLUMN     "status" "EquipmentStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "maintenance_work_orders_tenant_id_status_idx" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_status_idx" ON "tenant_kitchen"."equipment"("tenant_id", "status");
