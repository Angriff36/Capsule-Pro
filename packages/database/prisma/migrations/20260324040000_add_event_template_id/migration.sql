-- Add template_id column to events table
-- This field was added to the Prisma schema but the migration was missing

ALTER TABLE "tenant_events"."events" ADD COLUMN IF NOT EXISTS "template_id" UUID;
