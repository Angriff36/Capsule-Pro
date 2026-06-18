-- Prod parity: 0_init created JSON-ish columns as TEXT; schema expects JSONB (matches dev).
-- Safe cast: empty strings become NULL before ::jsonb.

ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows"
  ALTER COLUMN "generation_options" TYPE JSONB USING (
    CASE WHEN "generation_options" IS NULL OR btrim("generation_options") = '' THEN NULL ELSE "generation_options"::jsonb END
  ),
  ALTER COLUMN "errors" TYPE JSONB USING (
    CASE WHEN "errors" IS NULL OR btrim("errors") = '' THEN NULL ELSE "errors"::jsonb END
  ),
  ALTER COLUMN "generated_tasks" TYPE JSONB USING (
    CASE WHEN "generated_tasks" IS NULL OR btrim("generated_tasks") = '' THEN NULL ELSE "generated_tasks"::jsonb END
  ),
  ALTER COLUMN "reviewed_tasks" TYPE JSONB USING (
    CASE WHEN "reviewed_tasks" IS NULL OR btrim("reviewed_tasks") = '' THEN NULL ELSE "reviewed_tasks"::jsonb END
  ),
  ALTER COLUMN "approved_task_ids" TYPE JSONB USING (
    CASE WHEN "approved_task_ids" IS NULL OR btrim("approved_task_ids") = '' THEN NULL ELSE "approved_task_ids"::jsonb END
  ),
  ALTER COLUMN "rejected_task_ids" TYPE JSONB USING (
    CASE WHEN "rejected_task_ids" IS NULL OR btrim("rejected_task_ids") = '' THEN NULL ELSE "rejected_task_ids"::jsonb END
  ),
  ALTER COLUMN "instantiated_task_ids" TYPE JSONB USING (
    CASE WHEN "instantiated_task_ids" IS NULL OR btrim("instantiated_task_ids") = '' THEN NULL ELSE "instantiated_task_ids"::jsonb END
  ),
  ALTER COLUMN "scheduled_windows" TYPE JSONB USING (
    CASE WHEN "scheduled_windows" IS NULL OR btrim("scheduled_windows") = '' THEN NULL ELSE "scheduled_windows"::jsonb END
  ),
  ALTER COLUMN "constraint_outcomes" TYPE JSONB USING (
    CASE WHEN "constraint_outcomes" IS NULL OR btrim("constraint_outcomes") = '' THEN NULL ELSE "constraint_outcomes"::jsonb END
  ),
  ALTER COLUMN "warnings" TYPE JSONB USING (
    CASE WHEN "warnings" IS NULL OR btrim("warnings") = '' THEN NULL ELSE "warnings"::jsonb END
  );

DROP INDEX IF EXISTS "public"."idx_manifest_audit_command_occurred";
DROP INDEX IF EXISTS "public"."idx_manifest_audit_tenant_occurred";

CREATE INDEX IF NOT EXISTS "idx_manifest_audit_command_occurred"
  ON "public"."manifest_audit_records"("command_id", "occurred_at");

CREATE INDEX IF NOT EXISTS "idx_manifest_audit_tenant_occurred"
  ON "public"."manifest_audit_records"("tenant_id", "occurred_at");
