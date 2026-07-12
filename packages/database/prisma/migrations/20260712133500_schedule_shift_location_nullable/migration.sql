/*
  Hand-authored 2026-07-12 (audit fix): ScheduleShift.locationId required NOT NULL
  but create never supplied it and parent Schedule.locationId is nullable — every
  bootstrap INSERT failed. Source now declares `locationId: uuid?`; this aligns
  the column. (prisma migrate dev --create-only was blocked by the interactive
  drift-residual prompt; SQL reviewed by hand — single nullability alter.)
*/
-- AlterTable
ALTER TABLE "tenant_staff"."schedule_shifts" ALTER COLUMN "location_id" DROP NOT NULL;
