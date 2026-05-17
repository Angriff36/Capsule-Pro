-- Fix OutboxEvent columns: add snake_case mappings, correct tenantId to UUID, add updatedAt

-- Rename camelCase columns to snake_case
ALTER TABLE "tenant"."OutboxEvent" RENAME COLUMN "tenantId" TO "tenant_id";
ALTER TABLE "tenant"."OutboxEvent" RENAME COLUMN "eventType" TO "event_type";
ALTER TABLE "tenant"."OutboxEvent" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tenant"."OutboxEvent" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "tenant"."OutboxEvent" RENAME COLUMN "aggregateId" TO "aggregate_id";
ALTER TABLE "tenant"."OutboxEvent" RENAME COLUMN "aggregateType" TO "aggregate_type";

-- Change tenant_id from TEXT to UUID (data should already be valid UUIDs referencing Account.id)
ALTER TABLE "tenant"."OutboxEvent" ALTER COLUMN "tenant_id" TYPE UUID USING "tenant_id"::UUID;

-- Upgrade timestamps from TIMESTAMP(3) to TIMESTAMPTZ(6)
ALTER TABLE "tenant"."OutboxEvent" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at"::TIMESTAMPTZ;
ALTER TABLE "tenant"."OutboxEvent" ALTER COLUMN "published_at" TYPE TIMESTAMPTZ(6) USING "published_at"::TIMESTAMPTZ;

-- Add updatedAt column
ALTER TABLE "tenant"."OutboxEvent" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Recreate indexes with new column names
DROP INDEX IF EXISTS "tenant"."OutboxEvent_tenantId_idx";
CREATE INDEX "OutboxEvent_tenant_id_idx" ON "tenant"."OutboxEvent"("tenant_id");
