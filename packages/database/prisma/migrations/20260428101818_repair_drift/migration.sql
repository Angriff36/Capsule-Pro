ALTER TABLE "tenant_admin"."email_templates" ALTER COLUMN "template_type" DROP DEFAULT;

ALTER TABLE "tenant_facilities"."facility_assets" ALTER COLUMN "purchase_cost" SET DATA TYPE DECIMAL(12,2);

ALTER TABLE "tenant_logistics"."vehicles" ALTER COLUMN "year" SET DATA TYPE INTEGER,
ALTER COLUMN "capacity_weight" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "capacity_volume" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "mileage" SET DATA TYPE DECIMAL(10,2);

-- NOTE: tenant_staff.employee_bank_accounts.account_number_last4 is a GENERATED
-- ALWAYS column (RIGHT(account_number, 4) STORED). Postgres forbids UPDATE,
-- SET DEFAULT, or SET NOT NULL on generated columns, so the originally
-- diff-suggested ALTERs were removed. Drift is resolved at the Prisma schema
-- level instead (model field changed to nullable, no default).

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."prep_task_plan_workflows" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 5,
    "generation_options" TEXT,
    "generated_tasks" TEXT,
    "reviewed_tasks" TEXT,
    "approved_task_ids" TEXT,
    "rejected_task_ids" TEXT,
    "instantiated_task_ids" TEXT,
    "scheduled_windows" TEXT,
    "constraint_outcomes" TEXT,
    "errors" TEXT,
    "warnings" TEXT,
    "generated_count" INTEGER NOT NULL DEFAULT 0,
    "approved_count" INTEGER NOT NULL DEFAULT 0,
    "instantiated_count" INTEGER NOT NULL DEFAULT 0,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "prep_task_plan_workflows_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."purchase_requisitions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requisition_number" TEXT NOT NULL,
    "requested_by" UUID NOT NULL,
    "request_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "required_by" DATE,
    "location_id" UUID,
    "department" TEXT,
    "justification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "manager_approval_by" UUID,
    "manager_approval_at" TIMESTAMPTZ(6),
    "finance_approval_by" UUID,
    "finance_approval_at" TIMESTAMPTZ(6),
    "converted_to_po_id" UUID,
    "converted_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "item_category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."purchase_requisition_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requisition_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" TEXT,
    "quantity_requested" DECIMAL(10,2) NOT NULL,
    "unit_id" SMALLINT,
    "estimated_unit_cost" DECIMAL(10,4) NOT NULL,
    "estimated_total_cost" DECIMAL(12,2) NOT NULL,
    "suggested_vendor_id" UUID,
    "suggested_vendor_name" TEXT,
    "specifications" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_requisition_items_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."vendor_contracts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_number" TEXT NOT NULL,
    "vendor_id" UUID NOT NULL,
    "vendor_name" TEXT,
    "contract_type" TEXT NOT NULL DEFAULT 'purchase',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "renewal_term_days" SMALLINT NOT NULL DEFAULT 365,
    "notice_days_before_renewal" SMALLINT NOT NULL DEFAULT 30,
    "payment_terms" TEXT NOT NULL DEFAULT 'NET_30',
    "delivery_terms" TEXT,
    "minimum_order_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "annual_spend_commitment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "spend_to_period" DATE,
    "currency_code" TEXT NOT NULL DEFAULT 'USD',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "terminated_by" UUID,
    "terminated_at" TIMESTAMPTZ(6),
    "termination_reason" TEXT,
    "contract_url" TEXT,
    "notes" TEXT,
    "compliance_score" SMALLINT NOT NULL DEFAULT 100,
    "last_compliance_review" TIMESTAMPTZ(6),
    "sla_breach_count" INTEGER NOT NULL DEFAULT 0,
    "on_time_delivery_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "quality_rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_contracts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."payment_refund_attempts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "requested_amount" MONEY NOT NULL,
    "effective_amount" MONEY NOT NULL,
    "refund_reason" TEXT,
    "original_gateway_transaction_id" TEXT,
    "refund_transaction_id" TEXT,
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_refund_attempts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."revenue_recognition_schedules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "contract_id" UUID,
    "client_id" UUID NOT NULL,
    "total_amount" MONEY NOT NULL,
    "recognized_amount" MONEY NOT NULL DEFAULT 0,
    "remaining_amount" MONEY NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "recognition_period" INTEGER NOT NULL,
    "service_start_date" TIMESTAMPTZ(6),
    "service_end_date" TIMESTAMPTZ(6),
    "total_milestones" INTEGER NOT NULL DEFAULT 0,
    "completed_milestones" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "revenue_recognition_schedules_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."revenue_recognition_lines" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "amount" MONEY NOT NULL,
    "recognized_amount" MONEY NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMPTZ(6),
    "recognized_at" TIMESTAMPTZ(6),
    "milestone_id" UUID,
    "milestone_name" TEXT,
    "milestone_description" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "revenue_recognition_lines_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_facilities"."facilities" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "facility_type" TEXT NOT NULL DEFAULT 'kitchen',
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_id_event_id_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_id_status_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_id_created_at_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "created_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "prep_task_plan_workflows_tenant_idempotency_key" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "idempotency_key");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_id_key" ON "tenant_inventory"."purchase_requisitions"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_requisition_number_key" ON "tenant_inventory"."purchase_requisitions"("requisition_number");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_converted_to_po_id_key" ON "tenant_inventory"."purchase_requisitions"("converted_to_po_id");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_status_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_requester_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "requested_by");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_department_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "department");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_date_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "request_date");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_tenant_id_id_key" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisition_items_id_key" ON "tenant_inventory"."purchase_requisition_items"("id");

CREATE INDEX IF NOT EXISTS "purchase_requisition_items_tenant_req_idx" ON "tenant_inventory"."purchase_requisition_items"("tenant_id", "requisition_id");

CREATE INDEX IF NOT EXISTS "purchase_requisition_items_tenant_item_idx" ON "tenant_inventory"."purchase_requisition_items"("tenant_id", "item_id");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_contracts_id_key" ON "tenant_inventory"."vendor_contracts"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_contracts_contract_number_key" ON "tenant_inventory"."vendor_contracts"("contract_number");

CREATE INDEX IF NOT EXISTS "vendor_contracts_tenant_vendor_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "vendor_id");

CREATE INDEX IF NOT EXISTS "vendor_contracts_tenant_status_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "vendor_contracts_tenant_end_date_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "end_date");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_contracts_tenant_id_id_key" ON "tenant_inventory"."vendor_contracts"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "payment_refund_attempts_tenant_id_payment_id_idx" ON "tenant_accounting"."payment_refund_attempts"("tenant_id", "payment_id");

CREATE INDEX IF NOT EXISTS "payment_refund_attempts_tenant_id_created_at_idx" ON "tenant_accounting"."payment_refund_attempts"("tenant_id", "created_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_refund_attempts_id_key" ON "tenant_accounting"."payment_refund_attempts"("id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_invoice_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "invoice_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_event_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_client_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "client_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_status_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "revenue_recognition_schedules_id_key" ON "tenant_accounting"."revenue_recognition_schedules"("id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_lines_tenant_id_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_lines_tenant_id_schedule_id_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "schedule_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_lines_tenant_id_schedule_id_sequence_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "schedule_id", "sequence");

CREATE UNIQUE INDEX IF NOT EXISTS "revenue_recognition_lines_id_key" ON "tenant_accounting"."revenue_recognition_lines"("id");

CREATE INDEX IF NOT EXISTS "facilities_tenant_id_status_idx" ON "tenant_facilities"."facilities"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "facilities_tenant_id_facility_type_idx" ON "tenant_facilities"."facilities"("tenant_id", "facility_type");

CREATE UNIQUE INDEX IF NOT EXISTS "facilities_tenant_id_code_key" ON "tenant_facilities"."facilities"("tenant_id", "code");

CREATE INDEX IF NOT EXISTS "crm_scoring_rules_tenant_active_priority_idx" ON "tenant_crm"."crm_scoring_rules"("tenant_id", "is_active", "priority");

CREATE INDEX IF NOT EXISTS "prep_comments_task_id_idx" ON "tenant_kitchen"."prep_comments"("task_id");

CREATE INDEX IF NOT EXISTS "prep_comments_employee_id_idx" ON "tenant_kitchen"."prep_comments"("employee_id");

CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_id_key" ON "tenant_logistics"."vehicles"("id");;
