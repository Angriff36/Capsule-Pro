ALTER TABLE "tenant_events"."battle_boards" ADD COLUMN IF NOT EXISTS "client_id" TEXT,
ADD COLUMN IF NOT EXISTS "event_date" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "guest_count" INTEGER,
ADD COLUMN IF NOT EXISTS "inherited_context" TEXT,
ADD COLUMN IF NOT EXISTS "location_id" TEXT,
ADD COLUMN IF NOT EXISTS "venue_address" TEXT,
ADD COLUMN IF NOT EXISTS "venue_name" TEXT;

ALTER TABLE "tenant_events"."event_staff" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "checkedOutAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "noShowReason" TEXT DEFAULT '';

ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ADD COLUMN IF NOT EXISTS "generation_options" JSONB,
ADD COLUMN IF NOT EXISTS "errors" JSONB,
ADD COLUMN IF NOT EXISTS "generated_tasks" JSONB,
ADD COLUMN IF NOT EXISTS "reviewed_tasks" JSONB,
ADD COLUMN IF NOT EXISTS "approved_task_ids" JSONB,
ADD COLUMN IF NOT EXISTS "rejected_task_ids" JSONB,
ADD COLUMN IF NOT EXISTS "instantiated_task_ids" JSONB,
ADD COLUMN IF NOT EXISTS "scheduled_windows" JSONB,
ADD COLUMN IF NOT EXISTS "constraint_outcomes" JSONB,
ADD COLUMN IF NOT EXISTS "warnings" JSONB;

CREATE INDEX IF NOT EXISTS "idx_manifest_audit_command_occurred" ON "manifest_audit_records"("command_id", "occurred_at");

CREATE INDEX IF NOT EXISTS "idx_manifest_audit_tenant_occurred" ON "manifest_audit_records"("tenant_id", "occurred_at");
