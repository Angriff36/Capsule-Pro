ALTER TABLE "tenant"."documents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "tenant_crm"."proposal_line_items" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "total_price" DECIMAL(12,2) NOT NULL,
ADD COLUMN IF NOT EXISTS "unit_of_measure" TEXT,
ALTER COLUMN "sort_order" DROP NOT NULL,
ALTER COLUMN "sort_order" SET DATA TYPE INTEGER,
ALTER COLUMN "quantity" DROP DEFAULT;

ALTER TABLE "tenant_events"."event_imports" ADD COLUMN IF NOT EXISTS "battle_board_id" UUID,
ADD COLUMN IF NOT EXISTS "blob_url" TEXT,
ADD COLUMN IF NOT EXISTS "confidence" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "detected_format" TEXT,
ADD COLUMN IF NOT EXISTS "extracted_data" JSONB,
ADD COLUMN IF NOT EXISTS "file_type" TEXT NOT NULL DEFAULT 'pdf',
ADD COLUMN IF NOT EXISTS "parse_errors" TEXT[],
ADD COLUMN IF NOT EXISTS "parse_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "parsed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "report_id" UUID,
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "content" DROP NOT NULL;

ALTER TABLE "tenant_events"."event_reports" ADD COLUMN IF NOT EXISTS "checklist_data" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "parsed_event_data" JSONB,
ADD COLUMN IF NOT EXISTS "review_notes" TEXT,
ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "reviewed_by" UUID,
ADD COLUMN IF NOT EXISTS "version" TEXT NOT NULL DEFAULT '2025-01-01',
ALTER COLUMN "auto_fill_score" SET DATA TYPE INTEGER;

ALTER TABLE "tenant_inventory"."inventory_transactions" ALTER COLUMN "total_cost" DROP DEFAULT;

ALTER TABLE "tenant_inventory"."shipment_items" ALTER COLUMN "unit_cost" SET DEFAULT 0;

ALTER TABLE "tenant_inventory"."shipments" ADD COLUMN IF NOT EXISTS "internal_notes" TEXT,
ALTER COLUMN "shipping_cost" SET DEFAULT 0,
ALTER COLUMN "total_value" SET DEFAULT 0;

ALTER TABLE "tenant_kitchen"."menu_dishes" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "tenant_staff"."employee_seniority" ALTER COLUMN "effective_at" DROP DEFAULT;

ALTER TABLE "tenant_staff"."employees" ADD COLUMN IF NOT EXISTS "role_id" UUID;

CREATE TABLE IF NOT EXISTS "tenant_staff"."roles" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "overtime_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    "overtime_threshold_hours" SMALLINT NOT NULL DEFAULT 40,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_staff"."EmployeeDeduction" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "percentage" DECIMAL(5,2),
    "is_pre_tax" BOOLEAN NOT NULL DEFAULT false,
    "effective_date" DATE NOT NULL,
    "end_date" DATE,
    "max_annual_amount" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "EmployeeDeduction_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_unique" ON "tenant_staff"."roles"("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "employee_deductions_employee_idx" ON "tenant_staff"."EmployeeDeduction"("employee_id");

CREATE UNIQUE INDEX IF NOT EXISTS "locations_id_key" ON "tenant"."locations"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "locations_tenant_id_id_key" ON "tenant"."locations"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "clients_id_key" ON "tenant_crm"."clients"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "leads_id_key" ON "tenant_crm"."leads"("id");

CREATE INDEX IF NOT EXISTS "proposal_line_items_tenant_id_proposal_id_idx" ON "tenant_crm"."proposal_line_items"("tenant_id", "proposal_id");

CREATE UNIQUE INDEX IF NOT EXISTS "event_budgets_id_key" ON "tenant_events"."event_budgets"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "event_imports_id_key" ON "tenant_events"."event_imports"("id");

CREATE INDEX IF NOT EXISTS "event_imports_status_idx" ON "tenant_events"."event_imports"("tenant_id", "parse_status");

CREATE UNIQUE INDEX IF NOT EXISTS "event_reports_id_key" ON "tenant_events"."event_reports"("id");

CREATE INDEX IF NOT EXISTS "event_reports_event_id_idx" ON "tenant_events"."event_reports"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "event_reports_status_idx" ON "tenant_events"."event_reports"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "idx_event_reports_data_gin" ON "tenant_events"."event_reports" USING GIN ("checklist_data");

CREATE UNIQUE INDEX IF NOT EXISTS "events_id_key" ON "tenant_events"."events"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_id_key" ON "tenant_inventory"."inventory_items"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_tenant_id_id_key" ON "tenant_inventory"."inventory_items"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_suppliers_id_key" ON "tenant_inventory"."inventory_suppliers"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_suppliers_tenant_id_id_key" ON "tenant_inventory"."inventory_suppliers"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "shipment_items_id_key" ON "tenant_inventory"."shipment_items"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "shipments_id_key" ON "tenant_inventory"."shipments"("id");
