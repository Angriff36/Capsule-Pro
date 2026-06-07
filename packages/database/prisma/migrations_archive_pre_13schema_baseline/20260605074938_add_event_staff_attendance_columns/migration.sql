-- AlterTable
ALTER TABLE "tenant_events"."event_staff" ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "checkedOutAt" TIMESTAMP(3),
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "noShowReason" TEXT;
