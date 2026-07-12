/*
  Warnings:

  - The `status` column on the `knowledge_base_entries` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "KnowledgeBaseEntryStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterTable
ALTER TABLE "tenant"."knowledge_base_entries" DROP COLUMN "status",
ADD COLUMN     "status" "KnowledgeBaseEntryStatus" NOT NULL DEFAULT 'draft';

-- CreateIndex
CREATE INDEX "knowledge_base_entries_tenant_id_status_idx" ON "tenant"."knowledge_base_entries"("tenant_id", "status");
