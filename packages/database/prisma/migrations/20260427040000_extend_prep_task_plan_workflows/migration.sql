-- Migration: Extend prep_task_plan_workflows with full manifest property set
-- Date: 2026-04-27
-- Description: The original migration (20260427030000_add_prep_task_plan_workflows)
--              created an 11-column table covering only a subset of the manifest
--              properties. The PrepTaskPlanWorkflow manifest defines 27 persisted
--              properties; this migration adds the missing 17 columns so that the
--              dedicated Prisma store (PrepTaskPlanWorkflowPrismaStore) can persist
--              the full lifecycle state (review, approve, instantiate, schedule).
--              The previous `error_list JSONB` column is replaced by `errors TEXT`
--              to match the manifest contract (errors is typed as a JSON-serialized
--              string, not a structured JSON column). Default `status` is also
--              changed from "pending" to "created" to align with manifest defaults.
--
-- Idempotency: All operations use IF EXISTS / IF NOT EXISTS guards so the migration
--              is safe to re-run. The prior migration may not have been applied to
--              every environment yet — that one already uses CREATE TABLE IF NOT EXISTS.

-- 1. Replace error_list (JSONB) with errors (TEXT) to match manifest contract.
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows"
    DROP COLUMN IF EXISTS "error_list";

ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows"
    ADD COLUMN IF NOT EXISTS "errors" TEXT;

-- 2. Adjust status default to match manifest ("created" replaces "pending").
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows"
    ALTER COLUMN "status" SET DEFAULT 'created';

-- 3. Add the 17 missing columns from the manifest spec.
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows"
    ADD COLUMN IF NOT EXISTS "total_steps"          INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS "generated_tasks"      TEXT,
    ADD COLUMN IF NOT EXISTS "reviewed_tasks"       TEXT,
    ADD COLUMN IF NOT EXISTS "approved_task_ids"    TEXT,
    ADD COLUMN IF NOT EXISTS "rejected_task_ids"    TEXT,
    ADD COLUMN IF NOT EXISTS "instantiated_task_ids" TEXT,
    ADD COLUMN IF NOT EXISTS "scheduled_windows"    TEXT,
    ADD COLUMN IF NOT EXISTS "constraint_outcomes"  TEXT,
    ADD COLUMN IF NOT EXISTS "warnings"             TEXT,
    ADD COLUMN IF NOT EXISTS "generated_count"      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "approved_count"       INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "instantiated_count"   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "reviewed_by"          TEXT,
    ADD COLUMN IF NOT EXISTS "reviewed_at"          TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "approved_by"          TEXT,
    ADD COLUMN IF NOT EXISTS "approved_at"          TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "started_at"           TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "completed_at"         TIMESTAMPTZ(6);

-- 4. generation_options was originally TEXT — keep as TEXT (matches manifest "string").
--    No change required; included here for documentation.

-- 5. RLS policies / tenant immutability trigger from the prior migration cover
--    these new columns automatically — no policy changes needed.
