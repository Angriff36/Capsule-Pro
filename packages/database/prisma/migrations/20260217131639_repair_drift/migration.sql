-- Create enum for Sentry fix job status
CREATE TYPE "core"."SentryFixJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

DROP INDEX IF EXISTS "tenant_events"."board_annotations_tenant_deleted_idx";

DROP INDEX IF EXISTS "tenant_events"."board_projections_tenant_deleted_idx";

DROP INDEX IF EXISTS "tenant_events"."notes_tenant_deleted_idx";

CREATE TABLE IF NOT EXISTS "platform"."sentry_fix_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sentry_issue_id" TEXT NOT NULL,
    "sentry_event_id" TEXT,
    "organization_slug" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "environment" TEXT,
    "release" TEXT,
    "issue_title" TEXT NOT NULL,
    "issue_url" TEXT NOT NULL,
    "status" "core"."SentryFixJobStatus" NOT NULL DEFAULT 'queued',
    "payload_snapshot" JSONB NOT NULL,
    "branch_name" TEXT,
    "pr_url" TEXT,
    "pr_number" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentry_fix_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sentry_fix_jobs_status_created_at_idx" ON "platform"."sentry_fix_jobs"("status", "created_at");

CREATE INDEX IF NOT EXISTS "sentry_fix_jobs_sentry_issue_id_created_at_idx" ON "platform"."sentry_fix_jobs"("sentry_issue_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "sentry_fix_jobs_sentry_issue_id_key" ON "platform"."sentry_fix_jobs"("sentry_issue_id");
