-- Migration: Add Revenue Recognition tables
-- Date: 2026-04-26
-- Description: Create revenue_recognition_schedules and revenue_recognition_lines
--              tables in tenant_accounting schema for deferred/milestone-based
--              revenue recognition on invoices.

-- ============================================================
-- CreateTable: tenant_accounting.revenue_recognition_schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant_accounting"."revenue_recognition_schedules" (
    "tenant_id"               UUID            NOT NULL,
    "id"                      UUID            NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id"              UUID            NOT NULL,
    "event_id"                UUID,
    "client_id"               UUID            NOT NULL,
    "total_amount"            NUMERIC         NOT NULL,
    "recognized_amount"       NUMERIC         NOT NULL DEFAULT 0,
    "remaining_amount"        NUMERIC         NOT NULL,
    "recognition_method"      TEXT            NOT NULL DEFAULT 'IMMEDIATE',
    "status"                  TEXT            NOT NULL DEFAULT 'PENDING',
    "start_date"              TIMESTAMPTZ(6)  NOT NULL,
    "end_date"                TIMESTAMPTZ(6),
    "total_milestones"        INT             NOT NULL DEFAULT 0,
    "completed_milestones"    INT             NOT NULL DEFAULT 0,
    "recognition_percentage"  NUMERIC         NOT NULL DEFAULT 0,
    "currency"                CHAR(3)         NOT NULL DEFAULT 'USD',
    "metadata"                JSONB           NOT NULL DEFAULT '{}',
    "completed_at"            TIMESTAMPTZ(6),
    "cancelled_at"            TIMESTAMPTZ(6),
    "paused_at"               TIMESTAMPTZ(6),
    "created_at"              TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"              TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"              TIMESTAMPTZ(6),

    CONSTRAINT "revenue_recognition_schedules_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Indexes: revenue_recognition_schedules
CREATE INDEX IF NOT EXISTS "rev_recog_schedules_tenant_id_idx"
    ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id");
CREATE INDEX IF NOT EXISTS "rev_recog_schedules_tenant_invoice_idx"
    ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "invoice_id");
CREATE INDEX IF NOT EXISTS "rev_recog_schedules_tenant_client_idx"
    ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "client_id");
CREATE INDEX IF NOT EXISTS "rev_recog_schedules_tenant_status_idx"
    ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "status");

-- ============================================================
-- CreateTable: tenant_accounting.revenue_recognition_lines
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant_accounting"."revenue_recognition_lines" (
    "tenant_id"         UUID            NOT NULL,
    "id"                UUID            NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id"       UUID            NOT NULL,
    "amount"            NUMERIC         NOT NULL,
    "recognition_date"  TIMESTAMPTZ(6)  NOT NULL,
    "status"            TEXT            NOT NULL DEFAULT 'PENDING',
    "milestone_label"   TEXT,
    "percentage"        NUMERIC,
    "recognized_at"     TIMESTAMPTZ(6),
    "skipped_at"        TIMESTAMPTZ(6),
    "cancelled_at"      TIMESTAMPTZ(6),
    "created_at"        TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_recognition_lines_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Indexes: revenue_recognition_lines
CREATE INDEX IF NOT EXISTS "rev_recog_lines_tenant_id_idx"
    ON "tenant_accounting"."revenue_recognition_lines"("tenant_id");
CREATE INDEX IF NOT EXISTS "rev_recog_lines_tenant_schedule_idx"
    ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "schedule_id");
CREATE INDEX IF NOT EXISTS "rev_recog_lines_tenant_status_idx"
    ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "status");

-- ============================================================
-- Foreign Keys
-- ============================================================

-- schedules.tenant_id -> platform.accounts.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rev_recog_schedules_tenant_id_fkey'
    ) THEN
        ALTER TABLE "tenant_accounting"."revenue_recognition_schedules"
            ADD CONSTRAINT "rev_recog_schedules_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- schedules.invoice_id -> tenant_accounting.invoices (composite with tenant_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rev_recog_schedules_invoice_id_fkey'
    ) THEN
        ALTER TABLE "tenant_accounting"."revenue_recognition_schedules"
            ADD CONSTRAINT "rev_recog_schedules_invoice_id_fkey"
            FOREIGN KEY ("tenant_id", "invoice_id")
            REFERENCES "tenant_accounting"."invoices"("tenant_id", "id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- lines.tenant_id -> platform.accounts.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rev_recog_lines_tenant_id_fkey'
    ) THEN
        ALTER TABLE "tenant_accounting"."revenue_recognition_lines"
            ADD CONSTRAINT "rev_recog_lines_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- lines.schedule_id -> revenue_recognition_schedules (composite with tenant_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'rev_recog_lines_schedule_id_fkey'
    ) THEN
        ALTER TABLE "tenant_accounting"."revenue_recognition_lines"
            ADD CONSTRAINT "rev_recog_lines_schedule_id_fkey"
            FOREIGN KEY ("tenant_id", "schedule_id")
            REFERENCES "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "id")
            ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================
-- RLS: tenant_accounting.revenue_recognition_schedules
-- ============================================================
ALTER TABLE "tenant_accounting"."revenue_recognition_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."revenue_recognition_schedules" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_recognition_schedules_select" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_select" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "revenue_recognition_schedules_insert" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_insert" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "revenue_recognition_schedules_update" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_update" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "revenue_recognition_schedules_delete" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_delete" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "revenue_recognition_schedules_service" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_service" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- RLS: tenant_accounting.revenue_recognition_lines
-- ============================================================
ALTER TABLE "tenant_accounting"."revenue_recognition_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."revenue_recognition_lines" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_recognition_lines_select" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_select" ON "tenant_accounting"."revenue_recognition_lines"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "revenue_recognition_lines_insert" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_insert" ON "tenant_accounting"."revenue_recognition_lines"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "revenue_recognition_lines_update" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_update" ON "tenant_accounting"."revenue_recognition_lines"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "revenue_recognition_lines_delete" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_delete" ON "tenant_accounting"."revenue_recognition_lines"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "revenue_recognition_lines_service" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_service" ON "tenant_accounting"."revenue_recognition_lines"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Triggers
-- ============================================================

-- revenue_recognition_schedules
DROP TRIGGER IF EXISTS "revenue_recognition_schedules_update_timestamp" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE TRIGGER "revenue_recognition_schedules_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "revenue_recognition_schedules_prevent_tenant_mutation" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE TRIGGER "revenue_recognition_schedules_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- revenue_recognition_lines
DROP TRIGGER IF EXISTS "revenue_recognition_lines_update_timestamp" ON "tenant_accounting"."revenue_recognition_lines";
CREATE TRIGGER "revenue_recognition_lines_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_lines"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "revenue_recognition_lines_prevent_tenant_mutation" ON "tenant_accounting"."revenue_recognition_lines";
CREATE TRIGGER "revenue_recognition_lines_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_lines"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================
-- REPLICA IDENTITY for real-time support
-- ============================================================
ALTER TABLE "tenant_accounting"."revenue_recognition_schedules" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_accounting"."revenue_recognition_lines" REPLICA IDENTITY FULL;

-- ============================================================
-- Column comments
-- ============================================================
COMMENT ON TABLE "tenant_accounting"."revenue_recognition_schedules" IS 'Revenue recognition schedules for invoices supporting deferred, milestone-based, and proportional recognition';
COMMENT ON COLUMN "tenant_accounting"."revenue_recognition_schedules"."recognition_method" IS 'Recognition method: IMMEDIATE, PROPORTIONAL, MILESTONE_BASED, PERCENTAGE_COMPLETE, STRAIGHT_LINE, SERVICE_PERIOD';
COMMENT ON COLUMN "tenant_accounting"."revenue_recognition_schedules"."status" IS 'Schedule status: PENDING, IN_PROGRESS, COMPLETED, CANCELLED, PAUSED';
COMMENT ON COLUMN "tenant_accounting"."revenue_recognition_schedules"."recognition_percentage" IS 'Percentage of total amount recognized so far (stored as decimal, e.g. 0.75 = 75%)';

COMMENT ON TABLE "tenant_accounting"."revenue_recognition_lines" IS 'Individual revenue recognition line items within a schedule';
COMMENT ON COLUMN "tenant_accounting"."revenue_recognition_lines"."status" IS 'Line status: PENDING, RECOGNIZED, SKIPPED, CANCELLED';
COMMENT ON COLUMN "tenant_accounting"."revenue_recognition_lines"."percentage" IS 'Percentage of total schedule amount this line represents (stored as decimal)';
