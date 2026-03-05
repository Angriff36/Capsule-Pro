-- Migration: add_manifest_command_telemetry
-- Description: Add table for detailed manifest command execution metrics

-- Create ManifestCommandTelemetry table
CREATE TABLE "tenant"."manifest_command_telemetry" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "command_name" TEXT NOT NULL,
    "entity_name" TEXT,
    "instance_id" UUID,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_code" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "guard_eval_ms" INTEGER,
    "action_exec_ms" INTEGER,
    "guards_evaluated" INTEGER NOT NULL DEFAULT 0,
    "guards_passed" INTEGER NOT NULL DEFAULT 0,
    "guards_failed" INTEGER NOT NULL DEFAULT 0,
    "failed_guards" JSONB,
    "idempotency_key" TEXT,
    "was_idempotent_hit" BOOLEAN,
    "events_emitted" INTEGER NOT NULL DEFAULT 0,
    "performed_by" UUID,
    "correlation_id" UUID,
    "causation_id" UUID,
    "request_id" TEXT,
    "ip_address" INET,
    "executed_at" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_command_telemetry_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Create indexes for querying
CREATE INDEX "manifest_command_telemetry_command_name_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "command_name", "executed_at" DESC);
CREATE INDEX "manifest_command_telemetry_entity_name_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "entity_name", "executed_at" DESC);
CREATE INDEX "manifest_command_telemetry_status_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "status", "executed_at" DESC);
CREATE INDEX "manifest_command_telemetry_performed_by_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "performed_by", "executed_at" DESC);
CREATE INDEX "manifest_command_telemetry_correlation_id_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "correlation_id");
CREATE INDEX "manifest_command_telemetry_executed_at_idx" ON "tenant"."manifest_command_telemetry"("executed_at" DESC);

-- Add foreign key to Account
ALTER TABLE "tenant"."manifest_command_telemetry"
ADD CONSTRAINT "manifest_command_telemetry_tenant_id_fkey"
FOREIGN KEY ("tenant_id")
REFERENCES "platform"."accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add the relation to Account model
ALTER TABLE "platform"."accounts"
ADD COLUMN IF NOT EXISTS "manifest_command_telemetry_id" UUID;
-- Note: The relation is virtual, handled by Prisma through the foreign key above
