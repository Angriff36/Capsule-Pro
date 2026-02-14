-- CreateTable
CREATE TABLE "tenant_staff"."labor_budgets" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID,
    "event_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budget_type" TEXT NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "budget_target" NUMERIC(10,2) NOT NULL,
    "budget_unit" TEXT NOT NULL,
    "actual_spend" NUMERIC(10,2),
    "threshold_80_pct" BOOLEAN NOT NULL DEFAULT true,
    "threshold_90_pct" BOOLEAN NOT NULL DEFAULT true,
    "threshold_100_pct" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "override_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "labor_budgets_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "labor_budgets_location_idx" ON "tenant_staff"."labor_budgets"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "labor_budgets_event_idx" ON "tenant_staff"."labor_budgets"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "labor_budgets_period_idx" ON "tenant_staff"."labor_budgets"("tenant_id", "period_start", "period_end");

-- CreateTable
CREATE TABLE "tenant_staff"."budget_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "utilization" NUMERIC(5,2) NOT NULL,
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

-- CreateIndex
CREATE INDEX "budget_alerts_budget_idx" ON "tenant_staff"."budget_alerts"("tenant_id", "budget_id");

-- CreateIndex
CREATE INDEX "budget_alerts_type_idx" ON "tenant_staff"."budget_alerts"("tenant_id", "alert_type");

-- CreateIndex
CREATE INDEX "budget_alerts_acknowledged_idx" ON "tenant_staff"."budget_alerts"("is_acknowledged");

-- AlterEnum
-- No existing enum to alter

-- RLS Policies for labor_budgets
ALTER TABLE "tenant_staff"."labor_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."labor_budgets" FORCE ROW LEVEL SECURITY;

CREATE POLICY "labor_budgets_select" ON "tenant_staff"."labor_budgets"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "labor_budgets_insert" ON "tenant_staff"."labor_budgets"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "labor_budgets_update" ON "tenant_staff"."labor_budgets"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "labor_budgets_delete" ON "tenant_staff"."labor_budgets"
    FOR DELETE USING (false);

CREATE POLICY "labor_budgets_service" ON "tenant_staff"."labor_budgets"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for budget_alerts
ALTER TABLE "tenant_staff"."budget_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."budget_alerts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "budget_alerts_select" ON "tenant_staff"."budget_alerts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "budget_alerts_insert" ON "tenant_staff"."budget_alerts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "budget_alerts_update" ON "tenant_staff"."budget_alerts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "budget_alerts_delete" ON "tenant_staff"."budget_alerts"
    FOR DELETE USING (false);

CREATE POLICY "budget_alerts_service" ON "tenant_staff"."budget_alerts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for labor_budgets
CREATE TRIGGER "labor_budgets_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."labor_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "labor_budgets_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."labor_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- Triggers for budget_alerts
CREATE TRIGGER "budget_alerts_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "budget_alerts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_staff"."labor_budgets" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_staff"."budget_alerts" REPLICA IDENTITY FULL;

-- CHECK constraints for data integrity
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "labor_budgets_budget_target_positive" CHECK ("budget_target" > 0);
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "labor_budgets_event_type_validation" CHECK (
    ("budget_type" = 'event' AND "event_id" IS NOT NULL) OR
    ("budget_type" IN ('week', 'month') AND "period_start" IS NOT NULL AND "period_end" IS NOT NULL)
);
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "labor_budgets_period_end_after_start" CHECK (
    "period_end" IS NULL OR "period_start" IS NULL OR "period_end" >= "period_start"
);
