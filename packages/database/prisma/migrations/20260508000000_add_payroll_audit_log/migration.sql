-- CreateTable
CREATE TABLE "tenant_staff"."payroll_audit_log" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "user_id" UUID,
    "input_snapshot" JSONB,
    "rules_version" TEXT,
    "result_summary" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "payroll_audit_log_pkey" PRIMARY KEY ("tenant_id","id"),
    CONSTRAINT "payroll_audit_log_tenant_id_id_key" UNIQUE ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_period_id_idx" ON "tenant_staff"."payroll_audit_log"("tenant_id", "period_id");

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_action_idx" ON "tenant_staff"."payroll_audit_log"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_created_at_idx" ON "tenant_staff"."payroll_audit_log"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "tenant_staff"."payroll_audit_log" ADD CONSTRAINT "payroll_audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS
ALTER TABLE "tenant_staff"."payroll_audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_staff"."payroll_audit_log" USING (tenant_id = current_setting('app.current_tenant')::uuid);
