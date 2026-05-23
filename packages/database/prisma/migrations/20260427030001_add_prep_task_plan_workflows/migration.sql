-- Migration: Add prep_task_plan_workflows table
-- Date: 2026-04-27
-- Description: Backs the PrepTaskPlanWorkflow entity that's already exposed via the
--              Manifest IR (16 command routes + list + detail). Closes the typecheck
--              gap where database.prepTaskPlanWorkflow was referenced by auto-generated
--              read routes but had no corresponding Prisma model.
--              Mutations flow through manifest runtime commands; this table backs reads.

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."prep_task_plan_workflows" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" TEXT NOT NULL,
    "generation_options" TEXT,
    "error_list" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "prep_task_plan_workflows_pkey" PRIMARY KEY ("tenant_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_idempotency_key"
    ON "tenant_kitchen"."prep_task_plan_workflows" ("tenant_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_event_idx"
    ON "tenant_kitchen"."prep_task_plan_workflows" ("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_status_idx"
    ON "tenant_kitchen"."prep_task_plan_workflows" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_created_at_idx"
    ON "tenant_kitchen"."prep_task_plan_workflows" ("tenant_id", "created_at" DESC);

-- Row Level Security: standard tenant scoping
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prep_task_plan_workflows_select" ON "tenant_kitchen"."prep_task_plan_workflows";
CREATE POLICY "prep_task_plan_workflows_select" ON "tenant_kitchen"."prep_task_plan_workflows"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "prep_task_plan_workflows_insert" ON "tenant_kitchen"."prep_task_plan_workflows";
CREATE POLICY "prep_task_plan_workflows_insert" ON "tenant_kitchen"."prep_task_plan_workflows"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "prep_task_plan_workflows_update" ON "tenant_kitchen"."prep_task_plan_workflows";
CREATE POLICY "prep_task_plan_workflows_update" ON "tenant_kitchen"."prep_task_plan_workflows"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "prep_task_plan_workflows_delete" ON "tenant_kitchen"."prep_task_plan_workflows";
CREATE POLICY "prep_task_plan_workflows_delete" ON "tenant_kitchen"."prep_task_plan_workflows"
    FOR DELETE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "prep_task_plan_workflows_service" ON "tenant_kitchen"."prep_task_plan_workflows";
CREATE POLICY "prep_task_plan_workflows_service" ON "tenant_kitchen"."prep_task_plan_workflows"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Tenant immutability trigger: tenant_id cannot be mutated.
DROP TRIGGER IF EXISTS "prep_task_plan_workflows_prevent_tenant_mutation"
    ON "tenant_kitchen"."prep_task_plan_workflows";
CREATE TRIGGER "prep_task_plan_workflows_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."prep_task_plan_workflows"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
