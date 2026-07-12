/*
  Hand-rewritten 2026-07-12 (REVIEW-2): Prisma generated a destructive
  DROP COLUMN + ADD COLUMN conversion that reset every row to 'draft'.
  Rewritten to an in-place ALTER ... USING cast — values are preserved, and a
  value outside the enum fails the migration loudly instead of losing data.
  Pre-flight before deploy: SELECT DISTINCT status FROM tenant.knowledge_base_entries;
*/
-- CreateEnum
CREATE TYPE "KnowledgeBaseEntryStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterTable (in-place, value-preserving)
ALTER TABLE "tenant"."knowledge_base_entries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant"."knowledge_base_entries" ALTER COLUMN "status" TYPE "KnowledgeBaseEntryStatus" USING "status"::text::"KnowledgeBaseEntryStatus";
ALTER TABLE "tenant"."knowledge_base_entries" ALTER COLUMN "status" SET DEFAULT 'draft';
ALTER TABLE "tenant"."knowledge_base_entries" ALTER COLUMN "status" SET NOT NULL;

-- CreateIndex
CREATE INDEX "knowledge_base_entries_tenant_id_status_idx" ON "tenant"."knowledge_base_entries"("tenant_id", "status");
