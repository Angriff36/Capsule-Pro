-- Add lead scoring fields to leads table
ALTER TABLE "tenant_crm"."leads"
  ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "score_breakdown" JSONB NOT NULL DEFAULT '{}';

-- Create crm_scoring_rules table
CREATE TABLE IF NOT EXISTS "tenant_crm"."crm_scoring_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid()::uuid,
    "rule_name" VARCHAR(255) NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "condition" VARCHAR(50) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT "crm_scoring_rules_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "crm_scoring_rules_tenant_active_idx"
  ON "tenant_crm"."crm_scoring_rules" ("tenant_id", "is_active")
  WHERE "is_active" = true;

CREATE INDEX IF NOT EXISTS "crm_scoring_rules_tenant_priority_idx"
  ON "tenant_crm"."crm_scoring_rules" ("tenant_id", "priority");
