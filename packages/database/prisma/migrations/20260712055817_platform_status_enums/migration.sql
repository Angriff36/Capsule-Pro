/*
  Warnings:

  - The `status` column on the `document_versions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `VersionApproval` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('draft', 'approved', 'published', 'superseded');

-- CreateEnum
CREATE TYPE "VersionApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- AlterTable
ALTER TABLE "VersionApproval" DROP COLUMN "status",
ADD COLUMN     "status" "VersionApprovalStatus" NOT NULL;

-- AlterTable
ALTER TABLE "tenant_events"."document_versions" DROP COLUMN "status",
ADD COLUMN     "status" "DocumentVersionStatus" DEFAULT 'draft';
