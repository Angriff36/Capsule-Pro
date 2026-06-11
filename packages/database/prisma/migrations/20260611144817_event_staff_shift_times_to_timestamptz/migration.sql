/*
  Warnings:

  - The `shiftStart` column on the `event_staff` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `shiftEnd` column on the `event_staff` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "tenant_accounting"."invoices" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "versionAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenant_events"."event_staff" DROP COLUMN "shiftStart",
ADD COLUMN     "shiftStart" TIMESTAMPTZ(6),
DROP COLUMN "shiftEnd",
ADD COLUMN     "shiftEnd" TIMESTAMPTZ(6);
