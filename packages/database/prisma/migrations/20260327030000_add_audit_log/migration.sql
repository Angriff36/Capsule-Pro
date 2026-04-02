-- Create audit_log table in tenant_admin schema
CREATE TABLE IF NOT EXISTS "tenant_admin"."audit_log" (
    "tenant_id" TEXT NOT NULL,
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" TEXT,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS "audit_log_tenant_created_at_idx" ON "tenant_admin"."audit_log" ("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_log_tenant_user_id_idx" ON "tenant_admin"."audit_log" ("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "audit_log_tenant_entity_type_idx" ON "tenant_admin"."audit_log" ("tenant_id", "entity_type");
CREATE INDEX IF NOT EXISTS "audit_log_tenant_action_idx" ON "tenant_admin"."audit_log" ("tenant_id", "action");
