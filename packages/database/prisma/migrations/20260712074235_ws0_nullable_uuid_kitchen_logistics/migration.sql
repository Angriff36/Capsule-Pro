-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "location_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenant_kitchen"."qa_corrective_actions" ALTER COLUMN "related_check_id" DROP NOT NULL,
ALTER COLUMN "escalated_to" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenant_logistics"."logistics_routes" ALTER COLUMN "vehicle_id" DROP NOT NULL,
ALTER COLUMN "driver_id" DROP NOT NULL;
