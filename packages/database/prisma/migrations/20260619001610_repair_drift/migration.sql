CREATE TABLE IF NOT EXISTS "tenant_admin"."reaction_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity" TEXT,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "emitted_events" TEXT[],
    "reactions" TEXT[],
    "error_message" TEXT,
    "payload_keys" TEXT[],
    "duration_ms" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "source" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reaction_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "reaction_logs_tenant_id_created_at_idx" ON "tenant_admin"."reaction_logs"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "reaction_logs_tenant_id_status_created_at_idx" ON "tenant_admin"."reaction_logs"("tenant_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "reaction_logs_tenant_id_correlation_id_idx" ON "tenant_admin"."reaction_logs"("tenant_id", "correlation_id");

CREATE INDEX IF NOT EXISTS "reaction_logs_tenant_id_entity_command_created_at_idx" ON "tenant_admin"."reaction_logs"("tenant_id", "entity", "command", "created_at");;
