-- CreateTable
CREATE TABLE "tenant_admin"."admin_tasks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'backlog',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT,
    "due_date" DATE,
    "assigned_to" UUID,
    "created_by" UUID,
    "source_type" TEXT,
    "source_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_tasks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "admin_tasks_tenant_idx" ON "tenant_admin"."admin_tasks"("tenant_id");

-- CreateIndex
CREATE INDEX "admin_tasks_status_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "admin_tasks_due_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "due_date");

-- CreateIndex
CREATE INDEX "admin_tasks_active_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "deleted_at") WHERE "deleted_at" IS NULL;

-- RLS Policies for admin_tasks
ALTER TABLE "tenant_admin"."admin_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."admin_tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY "admin_tasks_select" ON "tenant_admin"."admin_tasks"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "admin_tasks_insert" ON "tenant_admin"."admin_tasks"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "admin_tasks_update" ON "tenant_admin"."admin_tasks"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "admin_tasks_delete" ON "tenant_admin"."admin_tasks"
    FOR DELETE USING (false);

CREATE POLICY "admin_tasks_service" ON "tenant_admin"."admin_tasks"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for admin_tasks
CREATE TRIGGER "admin_tasks_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "admin_tasks_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
