-- AlterTable
ALTER TABLE "tenant"."OutboxEvent" ADD COLUMN IF NOT EXISTS "correlation_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutboxEvent_tenantId_correlationId_idx" ON "tenant"."OutboxEvent"("tenantId", "correlation_id");
