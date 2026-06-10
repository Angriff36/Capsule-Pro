ALTER TABLE "tenant_events"."event_followups" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."qa_checks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location" TEXT NOT NULL DEFAULT '',
    "check_type" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'pass',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inspector" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "reinspected_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "qa_checks_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "qa_checks_tenant_id_status_idx" ON "tenant_kitchen"."qa_checks"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "qa_checks_tenant_id_check_type_idx" ON "tenant_kitchen"."qa_checks"("tenant_id", "check_type");
