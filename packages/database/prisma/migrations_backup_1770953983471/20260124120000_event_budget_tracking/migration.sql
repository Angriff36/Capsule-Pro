-- Add venue_id column to events table
ALTER TABLE "tenant_events"."events" ADD COLUMN IF NOT EXISTS "venue_id" UUID;

-- Create index on venue_id
CREATE INDEX IF NOT EXISTS "idx_events_venue_id" ON "tenant_events"."events"("tenant_id", "venue_id");

-- Create unique index on events
CREATE UNIQUE INDEX IF NOT EXISTS "events_tenant_id_id_key" ON "tenant_events"."events"("tenant_id", "id");

-- CreateTable: event_budgets
CREATE TABLE IF NOT EXISTS "tenant_events"."event_budgets" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_budget_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_actual_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_budgets_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex: event_budgets_event_id_idx
CREATE INDEX IF NOT EXISTS "event_budgets_event_id_idx" ON "tenant_events"."event_budgets"("tenant_id", "event_id");

-- CreateIndex: event_budgets_status_idx
CREATE INDEX IF NOT EXISTS "event_budgets_status_idx" ON "tenant_events"."event_budgets"("tenant_id", "status");

-- CreateTable: budget_line_items
CREATE TABLE IF NOT EXISTS "tenant_events"."budget_line_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budgeted_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "budget_line_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex: budget_line_items_budget_id_idx
CREATE INDEX IF NOT EXISTS "budget_line_items_budget_id_idx" ON "tenant_events"."budget_line_items"("tenant_id", "budget_id");

-- CreateIndex: budget_line_items_category_idx
CREATE INDEX IF NOT EXISTS "budget_line_items_category_idx" ON "tenant_events"."budget_line_items"("tenant_id", "category");

-- CreateTable: budget_alerts
CREATE TABLE IF NOT EXISTS "tenant_staff"."budget_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "utilization" DECIMAL(5,2) NOT NULL,
    "message" TEXT NOT NULL,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex: budget_alerts_budget_idx
CREATE INDEX IF NOT EXISTS "budget_alerts_budget_idx" ON "tenant_staff"."budget_alerts"("tenant_id", "budget_id");

-- CreateIndex: budget_alerts_type_idx
CREATE INDEX IF NOT EXISTS "budget_alerts_type_idx" ON "tenant_staff"."budget_alerts"("tenant_id", "alert_type");

-- CreateIndex: budget_alerts_acknowledged_idx
CREATE INDEX IF NOT EXISTS "budget_alerts_acknowledged_idx" ON "tenant_staff"."budget_alerts"("is_acknowledged");

-- Foreign Keys for event_budgets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'event_budgets_tenant_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."event_budgets"
        ADD CONSTRAINT "event_budgets_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'event_budgets_event_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."event_budgets"
        ADD CONSTRAINT "event_budgets_event_tenant_id_event_id_foreign" FOREIGN KEY ("tenant_id","event_id") REFERENCES "tenant_events"."events"("tenant_id","id") ON DELETE CASCADE;
    END IF;
END $$;

-- Foreign Keys for budget_line_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_line_items_tenant_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."budget_line_items"
        ADD CONSTRAINT "budget_line_items_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_line_items_budget_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."budget_line_items"
        ADD CONSTRAINT "budget_line_items_tenant_id_budget_id_foreign" FOREIGN KEY ("tenant_id","budget_id") REFERENCES "tenant_events"."event_budgets"("tenant_id","id") ON DELETE CASCADE;
    END IF;
END $$;

-- Foreign Keys for budget_alerts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_alerts_tenant_id_foreign'
    ) THEN
        ALTER TABLE "tenant_staff"."budget_alerts"
        ADD CONSTRAINT "budget_alerts_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_alerts_budget_id_foreign'
    ) THEN
        ALTER TABLE "tenant_staff"."budget_alerts"
        ADD CONSTRAINT "budget_alerts_tenant_id_budget_id_foreign" FOREIGN KEY ("tenant_id","budget_id") REFERENCES "tenant_events"."event_budgets"("tenant_id","id") ON DELETE CASCADE;
    END IF;
END $$;

-- RLS Policies for event_budgets
ALTER TABLE "tenant_events"."event_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."event_budgets" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_budgets_select" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_select" ON "tenant_events"."event_budgets"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "event_budgets_insert" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_insert" ON "tenant_events"."event_budgets"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "event_budgets_update" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_update" ON "tenant_events"."event_budgets"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "event_budgets_delete" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_delete" ON "tenant_events"."event_budgets"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "event_budgets_service" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_service" ON "tenant_events"."event_budgets"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for budget_line_items
ALTER TABLE "tenant_events"."budget_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."budget_line_items" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_line_items_select" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_select" ON "tenant_events"."budget_line_items"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "budget_line_items_insert" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_insert" ON "tenant_events"."budget_line_items"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "budget_line_items_update" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_update" ON "tenant_events"."budget_line_items"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "budget_line_items_delete" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_delete" ON "tenant_events"."budget_line_items"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "budget_line_items_service" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_service" ON "tenant_events"."budget_line_items"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for budget_alerts
ALTER TABLE "tenant_staff"."budget_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."budget_alerts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_alerts_select" ON "tenant_staff"."budget_alerts";
CREATE POLICY "budget_alerts_select" ON "tenant_staff"."budget_alerts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "budget_alerts_insert" ON "tenant_staff"."budget_alerts";
CREATE POLICY "budget_alerts_insert" ON "tenant_staff"."budget_alerts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "budget_alerts_update" ON "tenant_staff"."budget_alerts";
CREATE POLICY "budget_alerts_update" ON "tenant_staff"."budget_alerts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "budget_alerts_delete" ON "tenant_staff"."budget_alerts";
CREATE POLICY "budget_alerts_delete" ON "tenant_staff"."budget_alerts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "budget_alerts_service" ON "tenant_staff"."budget_alerts";
CREATE POLICY "budget_alerts_service" ON "tenant_staff"."budget_alerts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for event_budgets
DROP TRIGGER IF EXISTS "event_budgets_update_timestamp" ON "tenant_events"."event_budgets";
CREATE TRIGGER "event_budgets_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."event_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "event_budgets_prevent_tenant_mutation" ON "tenant_events"."event_budgets";
CREATE TRIGGER "event_budgets_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."event_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- Triggers for budget_line_items
DROP TRIGGER IF EXISTS "budget_line_items_update_timestamp" ON "tenant_events"."budget_line_items";
CREATE TRIGGER "budget_line_items_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."budget_line_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "budget_line_items_prevent_tenant_mutation" ON "tenant_events"."budget_line_items";
CREATE TRIGGER "budget_line_items_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."budget_line_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- Triggers for budget_alerts
DROP TRIGGER IF EXISTS "budget_alerts_update_timestamp" ON "tenant_staff"."budget_alerts";
CREATE TRIGGER "budget_alerts_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "budget_alerts_prevent_tenant_mutation" ON "tenant_staff"."budget_alerts";
CREATE TRIGGER "budget_alerts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_events"."event_budgets" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_events"."budget_line_items" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_staff"."budget_alerts" REPLICA IDENTITY FULL;
