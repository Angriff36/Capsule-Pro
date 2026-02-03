-- AlterTable
ALTER TABLE "tenant_kitchen"."recipe_versions"
  ADD COLUMN IF NOT EXISTS "instructions" TEXT;
