-- Fix OutboxEvent id column type: text → UUID
-- The column was originally created as text (cuid) but schema now requires UUID

ALTER TABLE "tenant"."OutboxEvent" DROP COLUMN "id";
ALTER TABLE "tenant"."OutboxEvent" ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid();
