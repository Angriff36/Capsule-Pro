-- AlterTable
ALTER TABLE "tenant_events"."event_guests" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "versionAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_items" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "versionAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_staff"."schedule_shifts" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "versionAt" TIMESTAMP(3);
