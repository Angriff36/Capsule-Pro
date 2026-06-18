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
