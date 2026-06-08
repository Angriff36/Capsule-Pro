-- AlterTable
ALTER TABLE "tenant_crm"."leads" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score_breakdown" JSONB NOT NULL DEFAULT '{}';
