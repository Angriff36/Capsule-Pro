-- CreateTable
CREATE TABLE "tenant_staff"."employee_seniority" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_seniority_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "employee_seniority_employee_idx" ON "tenant_staff"."employee_seniority"("employee_id");

-- CreateIndex
CREATE INDEX "employee_seniority_current_idx" ON "tenant_staff"."employee_seniority"("tenant_id", "employee_id", "effective_at" DESC);
