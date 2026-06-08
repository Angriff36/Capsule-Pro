-- CreateTable (Manifest runtime tables — managed by Manifest engine, not Prisma)
-- These tables already exist in the live database; this migration records them
-- so that prisma migrate dev does not detect drift.

CREATE TABLE IF NOT EXISTS "public"."manifest_approval_requests" (
    "request_key" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "approval_name" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "required_stages" JSONB NOT NULL DEFAULT '[]',
    "grants" JSONB NOT NULL DEFAULT '[]',
    "requested_at" BIGINT NOT NULL,
    "expires_at" BIGINT,
    "denied_by" TEXT,
    "denied_reason" TEXT,
    "inserted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "manifest_approval_requests_pkey" PRIMARY KEY ("request_key")
);

CREATE INDEX IF NOT EXISTS "idx_manifest_approval_expires" ON "public"."manifest_approval_requests" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_manifest_approval_status" ON "public"."manifest_approval_requests" ("status");

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."manifest_audit_records" (
    "record_id" TEXT NOT NULL,
    "occurred_at" BIGINT NOT NULL,
    "tenant_id" TEXT,
    "org_id" TEXT,
    "actor_id" TEXT,
    "request_id" TEXT,
    "source" TEXT,
    "entity" TEXT,
    "command" TEXT NOT NULL,
    "command_id" TEXT,
    "outcome" TEXT NOT NULL,
    "emitted_event_names" TEXT[],
    "ir_hash" TEXT,
    "diagnostics" JSONB,
    "inserted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "manifest_audit_records_pkey" PRIMARY KEY ("record_id")
);

CREATE INDEX IF NOT EXISTS "idx_manifest_audit_command_occurred" ON "public"."manifest_audit_records" ("command_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_manifest_audit_outcome" ON "public"."manifest_audit_records" ("outcome");
CREATE INDEX IF NOT EXISTS "idx_manifest_audit_tenant_occurred" ON "public"."manifest_audit_records" ("tenant_id", "occurred_at");

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."manifest_outbox_entries" (
    "entry_id" TEXT NOT NULL,
    "enqueued_at" BIGINT NOT NULL,
    "event" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "claimed_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "inserted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "subject_entity" TEXT,
    "subject_id" TEXT,

    CONSTRAINT "manifest_outbox_entries_pkey" PRIMARY KEY ("entry_id")
);

CREATE INDEX IF NOT EXISTS "idx_manifest_outbox_pending_unclaimed" ON "public"."manifest_outbox_entries" ("enqueued_at");
CREATE INDEX IF NOT EXISTS "idx_manifest_outbox_status" ON "public"."manifest_outbox_entries" ("status");
CREATE INDEX IF NOT EXISTS "idx_manifest_outbox_subject_entity" ON "public"."manifest_outbox_entries" ("subject_entity");
CREATE INDEX IF NOT EXISTS "idx_manifest_outbox_subject_id" ON "public"."manifest_outbox_entries" ("subject_id");

ALTER TABLE "public"."manifest_outbox_entries" ADD CONSTRAINT "manifest_outbox_entries_status_check" CHECK ("status" IN ('pending', 'delivered', 'failed'));
