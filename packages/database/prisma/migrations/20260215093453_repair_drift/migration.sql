ALTER TABLE "tenant"."OutboxEvent" ADD COLUMN IF NOT EXISTS "id" UUID NOT NULL DEFAULT gen_random_uuid();
