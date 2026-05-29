ALTER TABLE "tenant_inventory"."alerts_config" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

ALTER TABLE "tenant_inventory"."inventory_transactions" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6),
ALTER COLUMN "storage_location_id" DROP NOT NULL,
ALTER COLUMN "storage_location_id" DROP DEFAULT;

ALTER TABLE "tenant_kitchen"."override_audit" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

ALTER TABLE "tenant_staff"."payroll_runs" ADD COLUMN IF NOT EXISTS "reject_reason" TEXT;

ALTER TABLE "tenant_staff"."timecard_edit_requests" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."equipment" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'active',
    "serial_number" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "purchase_date" DATE,
    "warranty_expiry" DATE,
    "last_maintenance_date" DATE,
    "next_maintenance_date" DATE,
    "maintenance_interval_days" INTEGER NOT NULL DEFAULT 90,
    "usage_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_usage_hours" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "iot_device_id" TEXT,
    "iot_device_type" TEXT,
    "connection_status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_heartbeat" TIMESTAMPTZ(6),
    "current_sensor_data" JSONB
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."work_orders" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "equipment_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'repair',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT,
    "assigned_to" UUID,
    "estimated_cost" DOUBLE PRECISION,
    "actual_cost" DOUBLE PRECISION DEFAULT 0,
    "scheduled_date" TIMESTAMPTZ(6),
    "completed_date" TIMESTAMPTZ(6),
    "parts_used" TEXT,
    "vendor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_followups" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "task_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assigned_to" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_followups_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_staff"."payroll_approval_history" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_run_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "performed_by" UUID NOT NULL,
    "performed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payroll_approval_history_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_staff"."tax_configurations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tax_type" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "state_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tax_configurations_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."iot_alert_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sensor_type" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "threshold_min" DOUBLE PRECISION,
    "threshold_max" DOUBLE PRECISION,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "alert_action" TEXT NOT NULL DEFAULT 'notification',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notify_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notify_channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "iot_alert_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_location_id_idx" ON "tenant_kitchen"."equipment"("tenant_id", "location_id");

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_status_idx" ON "tenant_kitchen"."equipment"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_next_maintenance_date_idx" ON "tenant_kitchen"."equipment"("tenant_id", "next_maintenance_date");

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_iot_device_id_idx" ON "tenant_kitchen"."equipment"("tenant_id", "iot_device_id");

CREATE UNIQUE INDEX IF NOT EXISTS "equipment_tenant_id_id_key" ON "tenant_kitchen"."equipment"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_equipment_id_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "equipment_id");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_status_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_priority_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "priority");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_scheduled_date_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "scheduled_date");

CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_tenant_id_id_key" ON "tenant_kitchen"."work_orders"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "event_followups_tenant_id_event_id_idx" ON "tenant_events"."event_followups"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "event_followups_tenant_id_status_idx" ON "tenant_events"."event_followups"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "payroll_approval_history_tenant_id_payroll_run_id_idx" ON "tenant_staff"."payroll_approval_history"("tenant_id", "payroll_run_id");

CREATE INDEX IF NOT EXISTS "payroll_approval_history_tenant_id_performed_by_idx" ON "tenant_staff"."payroll_approval_history"("tenant_id", "performed_by");

CREATE INDEX IF NOT EXISTS "tax_configurations_tenant_id_is_active_idx" ON "tenant_staff"."tax_configurations"("tenant_id", "is_active");

CREATE INDEX IF NOT EXISTS "tax_configurations_tenant_id_tax_type_idx" ON "tenant_staff"."tax_configurations"("tenant_id", "tax_type");

CREATE INDEX IF NOT EXISTS "iot_alert_rules_tenant_id_equipment_id_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "equipment_id");

CREATE INDEX IF NOT EXISTS "iot_alert_rules_tenant_id_is_active_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "iot_alert_rules_tenant_id_id_key" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "clients_tags_idx" ON "tenant_crm"."clients" USING GIN ("tags");

CREATE INDEX IF NOT EXISTS "departments_active_idx" ON "tenant_staff"."departments"("tenant_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "departments_name_unique" ON "tenant_staff"."departments"("tenant_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_payroll_prefs_employee_unique" ON "tenant_staff"."employee_payroll_prefs"("tenant_id", "employee_id");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_tax_info_employee_unique" ON "tenant_staff"."employee_tax_info"("tenant_id", "employee_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_audit_log_tenant_id_id_key" ON "tenant_staff"."payroll_audit_log"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "tip_pools_period_idx" ON "tenant_staff"."tip_pools"("tenant_id", "period_id");
