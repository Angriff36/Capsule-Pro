-- Migration: Add Audit Log Table
-- Date: 2026-03-27
-- Description: Create audit_log table for tracking settings and administrative changes

-- Create audit_log table in tenant_admin schema
CREATE TABLE IF NOT EXISTS "tenant_admin"."audit_log" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("tenant_id", "id")
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS "audit_log_tenant_idx"
    ON "tenant_admin"."audit_log"("tenant_id");

CREATE INDEX IF NOT EXISTS "audit_log_tenant_created_idx"
    ON "tenant_admin"."audit_log"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "audit_log_tenant_user_idx"
    ON "tenant_admin"."audit_log"("tenant_id", "user_id");

CREATE INDEX IF NOT EXISTS "audit_log_tenant_entity_type_idx"
    ON "tenant_admin"."audit_log"("tenant_id", "entity_type");

CREATE INDEX IF NOT EXISTS "audit_log_tenant_action_idx"
    ON "tenant_admin"."audit_log"("tenant_id", "action");

-- Add foreign key constraint to accounts (platform schema)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_tenant_fkey'
    ) THEN
        ALTER TABLE "tenant_admin"."audit_log"
            ADD CONSTRAINT "audit_log_tenant_fkey"
            FOREIGN KEY ("tenant_id")
            REFERENCES "platform"."accounts"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE "tenant_admin"."audit_log" IS 'Audit trail for settings and administrative changes';
COMMENT ON COLUMN "tenant_admin"."audit_log"."action" IS 'Action type: CREATE, UPDATE, DELETE';
COMMENT ON COLUMN "tenant_admin"."audit_log"."entity_type" IS 'Type of entity changed: settings, user, role, integration, etc.';
COMMENT ON COLUMN "tenant_admin"."audit_log"."before_value" IS 'JSON snapshot of entity state before change';
COMMENT ON COLUMN "tenant_admin"."audit_log"."after_value" IS 'JSON snapshot of entity state after change';
