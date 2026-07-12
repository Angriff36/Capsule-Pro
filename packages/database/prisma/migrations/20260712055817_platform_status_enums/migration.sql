/*
  Hand-rewritten 2026-07-12 (REVIEW-2): Prisma generated destructive
  DROP COLUMN + ADD COLUMN conversions — document_versions rows would reset to
  'draft' and VersionApproval (NOT NULL, no default) would fail outright on any
  rows. Rewritten to in-place ALTER ... USING casts.
  Pre-flight before deploy:
    SELECT DISTINCT status FROM "VersionApproval";
    SELECT DISTINCT status FROM tenant_events.document_versions;
*/
-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('draft', 'approved', 'published', 'superseded');

-- CreateEnum
CREATE TYPE "VersionApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- AlterTable (in-place, value-preserving; NOT NULL, no default)
ALTER TABLE "VersionApproval" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VersionApproval" ALTER COLUMN "status" TYPE "VersionApprovalStatus" USING "status"::text::"VersionApprovalStatus";
ALTER TABLE "VersionApproval" ALTER COLUMN "status" SET NOT NULL;

-- AlterTable (in-place, value-preserving; nullable with default)
ALTER TABLE "tenant_events"."document_versions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_events"."document_versions" ALTER COLUMN "status" TYPE "DocumentVersionStatus" USING "status"::text::"DocumentVersionStatus";
ALTER TABLE "tenant_events"."document_versions" ALTER COLUMN "status" SET DEFAULT 'draft';
