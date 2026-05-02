DO $$ BEGIN
  CREATE TYPE "tenant_admin"."sms_automation_trigger_type" AS ENUM ('task_assigned', 'task_completed', 'task_overdue', 'shift_assigned', 'shift_reminder', 'shift_changed', 'clock_in_reminder', 'clock_out_reminder', 'prep_list_published', 'inventory_low', 'custom_event');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "tenant_admin"."sms_recipient_type" AS ENUM ('employee', 'role_based', 'custom_phone', 'manager');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "tenant_admin"."webhook_delivery_status" ADD VALUE IF NOT EXISTS 'dead_letter';

ALTER TABLE "tenant_inventory"."variance_reports" ADD COLUMN IF NOT EXISTS "resolution_notes" TEXT,
ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "resolved_by_id" UUID,
ADD COLUMN IF NOT EXISTS "root_cause" TEXT;

CREATE TABLE IF NOT EXISTS "tenant_admin"."sms_automation_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" "tenant_admin"."sms_automation_trigger_type" NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "template_id" UUID,
    "custom_message" TEXT,
    "recipient_type" "tenant_admin"."sms_recipient_type" NOT NULL DEFAULT 'employee',
    "recipient_config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sms_automation_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."audit_schedules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "day_of_month" INTEGER,
    "time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "audit_schedules_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "sms_automation_rules_tenant_id_is_active_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "is_active");

CREATE INDEX IF NOT EXISTS "sms_automation_rules_tenant_id_trigger_type_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "trigger_type");

CREATE INDEX IF NOT EXISTS "sms_automation_rules_tenant_id_priority_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "priority");

CREATE INDEX IF NOT EXISTS "audit_schedules_tenant_id_is_active_idx" ON "tenant_inventory"."audit_schedules"("tenant_id", "is_active");

CREATE INDEX IF NOT EXISTS "audit_schedules_tenant_id_frequency_idx" ON "tenant_inventory"."audit_schedules"("tenant_id", "frequency");
