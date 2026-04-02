-- Migration: Add Procurement Budget Tracking
-- Date: 2026-03-27
-- Description: Create procurement_budgets and procurement_budget_alerts tables
--              for budget allocation, spend tracking, and over-budget alerts.

-- Create procurement_budgets table
CREATE TABLE IF NOT EXISTS "tenant_inventory"."procurement_budgets" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "fiscal_year" INTEGER NOT NULL,
    "period_type" TEXT NOT NULL DEFAULT 'annual',
    "period_start" DATE,
    "period_end" DATE,
    "budget_amount" DECIMAL(12,2) NOT NULL,
    "spent_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "committed_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "threshold_warning_pct" SMALLINT NOT NULL DEFAULT 80,
    "threshold_critical_pct" SMALLINT NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

CREATE INDEX IF NOT EXISTS "procurement_budgets_tenant_status_idx"
    ON "tenant_inventory"."procurement_budgets"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "procurement_budgets_tenant_category_idx"
    ON "tenant_inventory"."procurement_budgets"("tenant_id", "category");
CREATE INDEX IF NOT EXISTS "procurement_budgets_tenant_year_idx"
    ON "tenant_inventory"."procurement_budgets"("tenant_id", "fiscal_year");

-- Create procurement_budget_alerts table
CREATE TABLE IF NOT EXISTS "tenant_inventory"."procurement_budget_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "utilization_pct" DECIMAL(5,2) NOT NULL,
    "message" TEXT NOT NULL,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

CREATE INDEX IF NOT EXISTS "procurement_budget_alerts_budget_idx"
    ON "tenant_inventory"."procurement_budget_alerts"("tenant_id", "budget_id");
CREATE INDEX IF NOT EXISTS "procurement_budget_alerts_ack_idx"
    ON "tenant_inventory"."procurement_budget_alerts"("tenant_id", "is_acknowledged");

-- Foreign key
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'proc_budget_alerts_budget_fkey'
    ) THEN
        ALTER TABLE "tenant_inventory"."procurement_budget_alerts"
            ADD CONSTRAINT "proc_budget_alerts_budget_fkey"
            FOREIGN KEY ("budget_id", "tenant_id")
            REFERENCES "tenant_inventory"."procurement_budgets"("id", "tenant_id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Check constraints
ALTER TABLE "tenant_inventory"."procurement_budgets"
    ADD CONSTRAINT "proc_budgets_amount_positive" CHECK ("budget_amount" > 0);
ALTER TABLE "tenant_inventory"."procurement_budgets"
    ADD CONSTRAINT "proc_budgets_thresholds_valid" CHECK (
        "threshold_warning_pct" > 0
        AND "threshold_critical_pct" > "threshold_warning_pct"
    );
