-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_accounting";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_admin";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_crm";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_events";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_facilities";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_kitchen";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_logistics";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_staff";

-- CreateEnum
CREATE TYPE "tenant_admin"."sms_status" AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "tenant_admin"."sms_automation_trigger_type" AS ENUM ('task_assigned', 'task_completed', 'task_overdue', 'shift_assigned', 'shift_reminder', 'shift_changed', 'clock_in_reminder', 'clock_out_reminder', 'prep_list_published', 'inventory_low', 'custom_event');

-- CreateEnum
CREATE TYPE "tenant_admin"."sms_recipient_type" AS ENUM ('employee', 'role_based', 'custom_phone', 'manager');

-- CreateEnum
CREATE TYPE "tenant_admin"."email_template_type" AS ENUM ('proposal', 'confirmation', 'reminder', 'follow_up', 'contract', 'contact', 'custom');

-- CreateEnum
CREATE TYPE "tenant_events"."EntityType" AS ENUM ('event', 'client', 'prep_task', 'kitchen_task', 'employee', 'inventory_item', 'recipe', 'dish', 'proposal', 'shipment', 'note', 'risk', 'financial_projection');

-- CreateEnum
CREATE TYPE "core"."action_type" AS ENUM ('insert', 'update', 'delete');

-- CreateEnum
CREATE TYPE "core"."employment_type" AS ENUM ('full_time', 'part_time', 'contractor', 'temp');

-- CreateEnum
CREATE TYPE "core"."unit_system" AS ENUM ('metric', 'imperial', 'custom');

-- CreateEnum
CREATE TYPE "core"."unit_type" AS ENUM ('volume', 'weight', 'count', 'length', 'temperature', 'time');

-- CreateEnum
CREATE TYPE "core"."KitchenTaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "core"."KitchenTaskStatus" AS ENUM ('open', 'in_progress', 'done', 'canceled');

-- CreateEnum
CREATE TYPE "core"."OutboxStatus" AS ENUM ('pending', 'published', 'failed');

-- CreateEnum
CREATE TYPE "core"."UserRole" AS ENUM ('owner', 'admin', 'manager', 'staff');

-- CreateEnum
CREATE TYPE "tenant_admin"."admin_action" AS ENUM ('login', 'logout', 'create', 'update', 'delete', 'view', 'permission_change', 'role_change', 'account_change', 'security_change');

-- CreateEnum
CREATE TYPE "tenant_admin"."admin_entity_type" AS ENUM ('admin_users', 'admin_roles', 'admin_permissions', 'admin_audit_trail', 'users', 'roles', 'permissions', 'tenants', 'reports', 'settings');

-- CreateEnum
CREATE TYPE "tenant_admin"."admin_role" AS ENUM ('super_admin', 'tenant_admin', 'finance_manager', 'operations_manager', 'staff_manager', 'read_only');

-- CreateEnum
CREATE TYPE "core"."ShipmentStatus" AS ENUM ('draft', 'scheduled', 'preparing', 'in_transit', 'delivered', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "core"."SentryFixJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "tenant_accounting"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "tenant_accounting"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'VOID', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "tenant_accounting"."InvoiceType" AS ENUM ('DEPOSIT', 'FINAL_PAYMENT', 'PROGRESS', 'MISC', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "tenant_accounting"."CollectionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "tenant_accounting"."CollectionStatus" AS ENUM ('ACTIVE', 'PAID', 'CLOSED', 'LEGAL', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "tenant_accounting"."DunningStage" AS ENUM ('CURRENT', 'REMINDER_1', 'REMINDER_2', 'REMINDER_3', 'FINAL_NOTICE', 'COLLECTIONS');

-- CreateEnum
CREATE TYPE "tenant_admin"."email_trigger_type" AS ENUM ('event_confirmed', 'event_canceled', 'event_completed', 'task_assigned', 'task_completed', 'task_reminder', 'shift_reminder', 'proposal_sent', 'contract_signed', 'contract_expiration', 'custom');

-- CreateEnum
CREATE TYPE "tenant_admin"."email_status" AS ENUM ('pending', 'sent', 'delivered', 'opened', 'failed', 'bounced');

-- CreateEnum
CREATE TYPE "tenant_admin"."webhook_event_type" AS ENUM ('created', 'updated', 'deleted');

-- CreateEnum
CREATE TYPE "tenant_admin"."webhook_status" AS ENUM ('active', 'inactive', 'disabled');

-- CreateEnum
CREATE TYPE "tenant_admin"."webhook_delivery_status" AS ENUM ('pending', 'success', 'failed', 'retrying', 'dead_letter');

-- CreateTable
CREATE TABLE "platform"."accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "default_timezone" TEXT NOT NULL DEFAULT 'UTC',
    "week_start" SMALLINT NOT NULL DEFAULT 1,
    "subscription_tier" TEXT NOT NULL DEFAULT 'trial',
    "subscription_status" TEXT NOT NULL DEFAULT 'active',
    "max_locations" SMALLINT NOT NULL DEFAULT 1,
    "max_employees" SMALLINT NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."locations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country_code" CHAR(2),
    "timezone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant"."venues" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "venue_type" TEXT NOT NULL DEFAULT 'other',
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country_code" CHAR(2),
    "capacity" INTEGER DEFAULT 0,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "equipment_list" JSONB,
    "preferred_vendors" JSONB,
    "access_notes" TEXT,
    "catering_notes" TEXT,
    "layout_image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "venues_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employees" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT 'Test',
    "last_name" TEXT NOT NULL DEFAULT 'User',
    "role" TEXT NOT NULL DEFAULT 'staff',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "auth_user_id" TEXT,
    "employee_number" TEXT,
    "phone" TEXT,
    "employment_type" "core"."employment_type" NOT NULL DEFAULT 'full_time',
    "hourly_rate" DECIMAL(10,2),
    "salary_annual" DECIMAL(12,2),
    "hire_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "termination_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "role_id" UUID,
    "payout_method" TEXT NOT NULL DEFAULT 'check',
    "department_id" UUID,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_bank_accounts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL DEFAULT 'checking',
    "routing_number" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_number_last4" TEXT GENERATED ALWAYS AS ("right"(account_number, 4)) STORED,
    "account_holder_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(6),
    "verification_method" TEXT,
    "deposit_history" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."kitchen_tasks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" SMALLINT NOT NULL DEFAULT 5,
    "complexity" SMALLINT NOT NULL DEFAULT 5,
    "tags" TEXT[],
    "due_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "kitchen_tasks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."prep_tasks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "dish_id" UUID,
    "recipe_version_id" UUID,
    "method_id" UUID,
    "container_id" UUID,
    "location_id" UUID NOT NULL,
    "task_type" TEXT NOT NULL DEFAULT 'prep',
    "name" TEXT NOT NULL,
    "quantity_total" DECIMAL(10,2) NOT NULL,
    "quantity_unit_id" SMALLINT,
    "quantity_completed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "servings_total" INTEGER,
    "start_by_date" DATE NOT NULL,
    "due_by_date" DATE NOT NULL,
    "due_by_time" TIME(6),
    "is_event_finish" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" SMALLINT NOT NULL DEFAULT 5,
    "estimated_minutes" INTEGER,
    "actual_minutes" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "do_not_complete_until" TIMESTAMPTZ(6),
    "import_id" UUID,

    CONSTRAINT "prep_tasks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."task_claims" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),
    "release_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_claims_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."task_progress" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "progress_type" TEXT NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT,
    "quantity_completed" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_progress_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."prep_lists" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "batch_multiplier" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "dietary_restrictions" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "total_estimated_time" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "prep_lists_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."prep_task_plan_workflows" (
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

-- CreateTable
CREATE TABLE "tenant_kitchen"."prep_list_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prep_list_id" UUID NOT NULL,
    "station_id" TEXT,
    "station_name" TEXT NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "category" TEXT,
    "base_quantity" DECIMAL(10,2) NOT NULL,
    "base_unit" TEXT NOT NULL,
    "scaled_quantity" DECIMAL(10,2) NOT NULL,
    "scaled_unit" TEXT NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "preparation_notes" TEXT,
    "allergens" TEXT[],
    "dietary_substitutions" TEXT[],
    "dish_id" UUID,
    "dish_name" TEXT,
    "recipe_version_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "prep_list_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."stations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "station_type" TEXT NOT NULL,
    "capacity_simultaneous_tasks" INTEGER NOT NULL DEFAULT 1,
    "equipmentList" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."equipment" (
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

-- CreateTable
CREATE TABLE "tenant_kitchen"."work_orders" (
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

-- CreateTable
CREATE TABLE "tenant_events"."events" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_number" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled Event',
    "client_id" UUID,
    "location_id" UUID,
    "venue_id" UUID,
    "venue_entity_id" UUID,
    "event_type" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "guest_count" INTEGER NOT NULL DEFAULT 1,
    "max_capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "budget" DECIMAL(12,2),
    "ticket_price" DECIMAL(10,2),
    "ticket_tier" TEXT,
    "event_format" TEXT,
    "accessibility_options" TEXT[],
    "featured_media_url" TEXT,
    "assigned_to" UUID,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "template_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "events_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_profitability" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "budgeted_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budgeted_food_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budgeted_labor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budgeted_overhead" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budgeted_total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budgeted_gross_margin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budgeted_gross_margin_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "actual_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_food_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_labor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_overhead" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_gross_margin" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_gross_margin_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "revenue_variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "food_cost_variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labor_cost_variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost_variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_variance_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculation_method" TEXT NOT NULL DEFAULT 'auto',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_profitability_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_summaries" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "highlights" JSONB DEFAULT '[]',
    "issues" JSONB DEFAULT '[]',
    "financialPerformance" JSONB DEFAULT '[]',
    "clientFeedback" JSONB DEFAULT '[]',
    "insights" JSONB DEFAULT '[]',
    "overall_summary" TEXT,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generation_duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_summaries_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_reports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '2025-01-01',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "completion" INTEGER NOT NULL DEFAULT 0,
    "checklist_data" JSONB NOT NULL DEFAULT '{}',
    "parsed_event_data" JSONB,
    "report_config" JSONB,
    "auto_fill_score" INTEGER,
    "review_notes" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_reports_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_budgets" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_budget_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_actual_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_budgets_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."budget_line_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budgeted_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "budget_line_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."clients" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_type" TEXT NOT NULL DEFAULT 'company',
    "company_name" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country_code" CHAR(2),
    "default_payment_terms" SMALLINT DEFAULT 30,
    "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
    "tax_id" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "source" TEXT,
    "assigned_to" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."client_contacts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "phone_mobile" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_billing_contact" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."client_preferences" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "preference_type" TEXT NOT NULL,
    "preference_key" TEXT NOT NULL,
    "preference_value" JSONB NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "client_preferences_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."user_preferences" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "preference_key" TEXT NOT NULL,
    "preference_value" JSONB NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."leads" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" TEXT,
    "company_name" TEXT,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "event_type" TEXT,
    "event_date" DATE,
    "estimated_guests" INTEGER,
    "estimated_value" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigned_to" UUID,
    "notes" TEXT,
    "converted_to_client_id" UUID,
    "converted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."client_interactions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID,
    "lead_id" UUID,
    "employee_id" UUID NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "interaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT,
    "description" TEXT,
    "follow_up_date" DATE,
    "follow_up_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "correlation_id" TEXT,

    CONSTRAINT "client_interactions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."interaction_attachments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interaction_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "interaction_attachments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."crm_scoring_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_name" VARCHAR(255) NOT NULL,
    "field" VARCHAR(100) NOT NULL,
    "condition" VARCHAR(50) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_scoring_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."proposals" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_number" TEXT NOT NULL,
    "template_id" UUID,
    "client_id" UUID,
    "lead_id" UUID,
    "event_id" UUID,
    "title" TEXT NOT NULL,
    "event_date" DATE,
    "event_type" TEXT,
    "guest_count" INTEGER,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "public_token" UUID,
    "valid_until" DATE,
    "sent_at" TIMESTAMPTZ(6),
    "viewed_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."proposal_line_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_of_measure" TEXT,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "proposal_line_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."proposal_templates" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "event_type" TEXT,
    "default_terms" TEXT,
    "default_tax_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "default_notes" TEXT,
    "default_line_items" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "accent_color" TEXT,
    "font_family" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "proposal_templates_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."recipes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT,
    "cuisine_type" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."recipe_versions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "cuisine_type" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "version_number" INTEGER NOT NULL,
    "yield_quantity" DECIMAL(10,2) NOT NULL,
    "yield_unit_id" SMALLINT NOT NULL,
    "yield_description" TEXT,
    "prep_time_minutes" INTEGER,
    "cook_time_minutes" INTEGER,
    "rest_time_minutes" INTEGER,
    "difficulty_level" SMALLINT,
    "instructions" TEXT,
    "notes" TEXT,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "cost_calculated_at" TIMESTAMPTZ(6),
    "cost_per_yield" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."recipe_ingredients" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_version_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit_id" SMALLINT NOT NULL,
    "preparation_notes" TEXT,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "adjusted_quantity" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "cost_calculated_at" TIMESTAMPTZ(6),
    "ingredient_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "waste_factor" DECIMAL(5,4) NOT NULL DEFAULT 1.0,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."ingredients" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT,
    "default_unit_id" SMALLINT NOT NULL,
    "density_g_per_ml" DECIMAL(10,4),
    "shelf_life_days" SMALLINT,
    "storage_instructions" TEXT,
    "allergens" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."prep_methods" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "estimated_duration_minutes" INTEGER,
    "requires_certification" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "prep_methods_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."containers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID,
    "name" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "size_description" TEXT,
    "capacity_volume_ml" DECIMAL(10,2),
    "capacity_weight_g" DECIMAL(10,2),
    "capacity_portions" INTEGER,
    "is_reusable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "containers_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."dishes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "service_style" TEXT,
    "default_container_id" UUID,
    "presentation_image_url" TEXT,
    "min_prep_lead_days" SMALLINT NOT NULL DEFAULT 0,
    "max_prep_lead_days" SMALLINT,
    "portion_size_description" TEXT,
    "dietary_tags" TEXT[],
    "allergens" TEXT[],
    "price_per_person" DECIMAL(10,2),
    "cost_per_person" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."menus" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "base_price" DECIMAL(10,2),
    "price_per_person" DECIMAL(10,2),
    "min_guests" SMALLINT,
    "max_guests" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "menus_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."menu_dishes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_id" UUID NOT NULL,
    "dish_id" UUID NOT NULL,
    "course" TEXT,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "menu_dishes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."prep_comments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "comment_text" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "prep_comments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_timeline" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "timeline_time" TIME(6) NOT NULL,
    "description" TEXT NOT NULL,
    "responsible_role" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_timeline_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_imports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL DEFAULT 0,
    "content" BYTEA,
    "blob_url" TEXT,
    "file_type" TEXT NOT NULL DEFAULT 'pdf',
    "detected_format" TEXT,
    "parse_status" TEXT NOT NULL DEFAULT 'pending',
    "extracted_data" JSONB,
    "confidence" INTEGER DEFAULT 0,
    "parse_errors" TEXT[],
    "report_id" UUID,
    "battle_board_id" UUID,
    "parsed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_imports_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."battle_boards" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID,
    "board_name" TEXT NOT NULL,
    "board_type" TEXT NOT NULL DEFAULT 'event-specific',
    "schema_version" TEXT NOT NULL DEFAULT 'mangia-battle-board@1',
    "board_data" JSONB NOT NULL DEFAULT '{}',
    "document_url" TEXT,
    "source_document_type" TEXT,
    "document_imported_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "event_date" TIMESTAMPTZ(6),
    "client_id" TEXT,
    "guest_count" INTEGER,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "location_id" TEXT,
    "inherited_context" TEXT,

    CONSTRAINT "battle_boards_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."command_boards" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "scope" JSONB,
    "auto_populate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "command_boards_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."command_board_cards" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "card_type" TEXT NOT NULL DEFAULT 'task',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 200,
    "height" INTEGER NOT NULL DEFAULT 150,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "group_id" UUID,
    "entity_id" UUID,
    "entity_type" TEXT,
    "vector_clock" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "command_board_cards_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."command_board_layouts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "viewport" JSONB NOT NULL,
    "visibleCards" TEXT[],
    "grid_size" INTEGER NOT NULL DEFAULT 40,
    "show_grid" BOOLEAN NOT NULL DEFAULT true,
    "snap_to_grid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "command_board_layouts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."command_board_groups" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 300,
    "height" INTEGER NOT NULL DEFAULT 200,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "command_board_groups_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."command_board_connections" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "from_card_id" UUID NOT NULL,
    "to_card_id" UUID NOT NULL,
    "relationship_type" TEXT NOT NULL DEFAULT 'generic',
    "label" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "command_board_connections_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."board_projections" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "entity_type" "tenant_events"."EntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 280,
    "height" INTEGER NOT NULL DEFAULT 180,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "color_override" TEXT,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "group_id" UUID,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "board_projections_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."notes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT,
    "color" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."board_annotations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "annotation_type" TEXT NOT NULL DEFAULT 'connection',
    "from_projection_id" UUID,
    "to_projection_id" UUID,
    "label" TEXT,
    "color" TEXT,
    "style" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "board_annotations_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."timeline_tasks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL,
    "assignee_id" UUID,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "dependencies" TEXT[],
    "is_on_critical_path" BOOLEAN NOT NULL DEFAULT false,
    "slack_minutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "timeline_tasks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."catering_orders" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "event_id" UUID,
    "order_number" TEXT NOT NULL,
    "order_status" TEXT NOT NULL DEFAULT 'draft',
    "order_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_date" TIMESTAMPTZ(6) NOT NULL,
    "delivery_time" TEXT NOT NULL,
    "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "service_charge_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_required" BOOLEAN NOT NULL DEFAULT false,
    "deposit_amount" DECIMAL(12,2),
    "deposit_paid" BOOLEAN NOT NULL DEFAULT false,
    "deposit_paid_at" TIMESTAMPTZ(6),
    "venue_name" TEXT,
    "venue_address" TEXT,
    "venue_city" TEXT,
    "venue_state" TEXT,
    "venue_zip" TEXT,
    "venue_contact_name" TEXT,
    "venue_contact_phone" TEXT,
    "guest_count" INTEGER NOT NULL DEFAULT 0,
    "special_instructions" TEXT,
    "dietary_restrictions" TEXT,
    "staff_required" INTEGER DEFAULT 0,
    "staff_assigned" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "catering_orders_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'each',
    "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "quantity_on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "par_level" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "reorder_level" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "supplier_id" UUID,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "fsa_status" TEXT DEFAULT 'unknown',
    "fsa_temp_logged" BOOLEAN DEFAULT false,
    "fsa_allergen_info" BOOLEAN DEFAULT false,
    "fsa_traceable" BOOLEAN DEFAULT false,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_transactions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_cost" DECIMAL(12,2),
    "reference" TEXT,
    "notes" TEXT,
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storage_location_id" UUID,
    "reason" TEXT NOT NULL DEFAULT '',
    "reference_type" TEXT,
    "reference_id" UUID,
    "employee_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_suppliers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "payment_terms" TEXT NOT NULL DEFAULT 'NET_30',
    "connector_type" TEXT,
    "connector_credentials" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "tax_id" TEXT,
    "website" TEXT,
    "performance_rating" DECIMAL(2,1),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_suppliers_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."supplier_sync_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "products_synced" INTEGER NOT NULL DEFAULT 0,
    "products_created" INTEGER NOT NULL DEFAULT 0,
    "products_updated" INTEGER NOT NULL DEFAULT 0,
    "products_deactivated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "supplier_sync_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "threshold_value" DECIMAL(12,3) NOT NULL,
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_stock" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "storage_location_id" UUID NOT NULL,
    "quantity_on_hand" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit_id" SMALLINT NOT NULL,
    "last_counted_at" TIMESTAMPTZ(6),
    "last_counted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_stock_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_forecasts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "forecast" DECIMAL(10,2) NOT NULL,
    "lower_bound" DECIMAL(10,2) NOT NULL,
    "upper_bound" DECIMAL(10,2) NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "horizon_days" INTEGER NOT NULL,
    "last_updated" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actual_depletion_date" TIMESTAMPTZ(6),
    "error_days" INTEGER,
    "accuracy_tracked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inventory_forecasts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."forecast_inputs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "historical_usage" DECIMAL(10,2) NOT NULL,
    "events" JSONB NOT NULL,
    "promotions" JSONB NOT NULL,
    "seasonality_factors" JSONB,

    CONSTRAINT "forecast_inputs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."reorder_suggestions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT NOT NULL,
    "recommended_order_qty" DECIMAL(10,2) NOT NULL,
    "reorder_point" DECIMAL(10,2) NOT NULL,
    "safety_stock" DECIMAL(10,2) NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "justification" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reorder_suggestions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."alerts_config" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "alerts_config_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."cycle_count_sessions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "session_id" TEXT NOT NULL,
    "session_name" TEXT NOT NULL,
    "count_type" TEXT NOT NULL DEFAULT 'ad_hoc',
    "scheduled_date" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "finalized_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "counted_items" INTEGER NOT NULL DEFAULT 0,
    "total_variance" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "variance_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "cycle_count_sessions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."cycle_count_records" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "item_number" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "storage_location_id" UUID NOT NULL,
    "expected_quantity" DECIMAL(12,3) NOT NULL,
    "counted_quantity" DECIMAL(12,3) NOT NULL,
    "variance" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "variance_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "count_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counted_by_id" UUID NOT NULL,
    "barcode" TEXT,
    "notes" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "sync_status" TEXT NOT NULL DEFAULT 'synced',
    "offline_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "cycle_count_records_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."variance_reports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "report_type" TEXT NOT NULL,
    "item_id" UUID NOT NULL,
    "item_number" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "expected_quantity" DECIMAL(12,3) NOT NULL,
    "counted_quantity" DECIMAL(12,3) NOT NULL,
    "variance" DECIMAL(12,3) NOT NULL,
    "variance_pct" DECIMAL(5,2) NOT NULL,
    "accuracy_score" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adjustment_type" TEXT,
    "adjustment_amount" DECIMAL(12,3),
    "adjustment_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "root_cause" TEXT,
    "resolution_notes" TEXT,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "variance_reports_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."cycle_count_audit_log" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "record_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "performed_by_id" UUID NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycle_count_audit_log_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."purchase_orders" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_number" TEXT NOT NULL,
    "vendor_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "order_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery_date" DATE,
    "actual_delivery_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "received_by" UUID,
    "received_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."purchase_order_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_order_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity_ordered" DECIMAL(10,2) NOT NULL,
    "quantity_received" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit_id" SMALLINT NOT NULL,
    "unit_cost" DECIMAL(10,4) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "quality_status" TEXT DEFAULT 'pending',
    "discrepancy_type" TEXT,
    "discrepancy_amount" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."purchase_requisitions" (
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

-- CreateTable
CREATE TABLE "tenant_inventory"."purchase_requisition_items" (
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

-- CreateTable
CREATE TABLE "tenant_inventory"."vendor_contracts" (
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

-- CreateTable
CREATE TABLE "tenant_inventory"."vendor_contacts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "contact_role" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."vendor_ratings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'overall',
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "rated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_ratings_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."procurement_budgets" (
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

    CONSTRAINT "procurement_budgets_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."procurement_budget_alerts" (
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

    CONSTRAINT "procurement_budget_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."shipments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_number" TEXT NOT NULL,
    "status" "core"."ShipmentStatus" NOT NULL DEFAULT 'draft',
    "event_id" UUID,
    "supplier_id" UUID,
    "location_id" UUID,
    "scheduled_date" TIMESTAMPTZ(6),
    "shipped_date" TIMESTAMPTZ(6),
    "estimated_delivery_date" TIMESTAMPTZ(6),
    "actual_delivery_date" TIMESTAMPTZ(6),
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "shipping_cost" DECIMAL(12,2) DEFAULT 0,
    "total_value" DECIMAL(12,2) DEFAULT 0,
    "tracking_number" TEXT,
    "carrier" TEXT,
    "shipping_method" TEXT,
    "delivered_by" UUID,
    "received_by" TEXT,
    "signature" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."shipment_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity_shipped" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantity_received" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantity_damaged" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit_id" SMALLINT,
    "unit_cost" DECIMAL(10,4) DEFAULT 0,
    "total_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "condition" TEXT DEFAULT 'good',
    "condition_notes" TEXT,
    "lot_number" TEXT,
    "expiration_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."reports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "report_type" TEXT NOT NULL,
    "query_config" JSONB NOT NULL,
    "display_config" JSONB NOT NULL DEFAULT '{}',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("tenant_id","id")
);

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

-- CreateTable
CREATE TABLE "tenant_admin"."admin_chat_threads" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_type" TEXT NOT NULL,
    "slug" TEXT,
    "direct_key" TEXT,
    "created_by" UUID,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_threads_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_chat_participants" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(6),
    "cleared_at" TIMESTAMPTZ(6),
    "last_read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_participants_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_chat_messages" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_messages_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."workflows" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" TEXT NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."notifications" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_employee_id" UUID NOT NULL,
    "notification_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" TEXT,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."schedules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID,
    "schedule_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(6),
    "published_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."schedule_shifts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "shift_start" TIMESTAMPTZ(6) NOT NULL,
    "shift_end" TIMESTAMPTZ(6) NOT NULL,
    "role_during_shift" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "schedule_shifts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."time_entries" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "location_id" UUID,
    "shift_id" UUID,
    "clock_in" TIMESTAMPTZ(6) NOT NULL,
    "clock_out" TIMESTAMPTZ(6),
    "break_minutes" SMALLINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."timecard_edit_requests" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "time_entry_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "requested_clock_in" TIMESTAMPTZ(6),
    "requested_clock_out" TIMESTAMPTZ(6),
    "requested_break_minutes" SMALLINT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "timecard_edit_requests_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_locations" (
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_locations_pkey" PRIMARY KEY ("tenant_id","employee_id","location_id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."labor_budgets" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID,
    "event_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budget_type" TEXT NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "budget_target" DECIMAL(10,2) NOT NULL,
    "budget_unit" TEXT NOT NULL,
    "actual_spend" DECIMAL(10,2),
    "threshold_80_pct" BOOLEAN NOT NULL DEFAULT true,
    "threshold_90_pct" BOOLEAN NOT NULL DEFAULT true,
    "threshold_100_pct" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "override_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "labor_budgets_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."budget_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "utilization" DECIMAL(5,2) NOT NULL,
    "message" TEXT NOT NULL,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "core"."audit_config" (
    "table_schema" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "audit_level" TEXT NOT NULL DEFAULT 'full',
    "excluded_columns" TEXT[],

    CONSTRAINT "audit_config_pkey" PRIMARY KEY ("table_schema","table_name")
);

-- CreateTable
CREATE TABLE "core"."status_transitions" (
    "id" BIGSERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "from_status_code" TEXT,
    "to_status_code" TEXT NOT NULL,
    "requires_role" TEXT[],
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "status_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."status_types" (
    "id" SMALLINT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color_hex" CHAR(7),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "status_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."allergen_warnings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "dish_id" UUID,
    "warning_type" TEXT NOT NULL,
    "allergens" TEXT[],
    "affected_guests" TEXT[],
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "override_reason" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "allergen_warnings_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "core"."unit_conversions" (
    "from_unit_id" SMALLINT NOT NULL,
    "to_unit_id" SMALLINT NOT NULL,
    "multiplier" DECIMAL(20,10) NOT NULL,

    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("from_unit_id","to_unit_id")
);

-- CreateTable
CREATE TABLE "core"."units" (
    "id" SMALLINT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_plural" TEXT NOT NULL,
    "unit_system" "core"."unit_system" NOT NULL,
    "unit_type" "core"."unit_type" NOT NULL,
    "is_base_unit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."audit_archive" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "table_schema" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "action" "core"."action_type" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "performed_by" UUID,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_archive_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateTable
CREATE TABLE "platform"."audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "table_schema" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "action" "core"."action_type" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "performed_by" UUID,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateTable
CREATE TABLE "platform"."sent_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "correlation_id" TEXT,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Tenant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "storage_path" TEXT,
    "parsed_data" JSONB,
    "parse_status" TEXT NOT NULL DEFAULT 'pending',
    "parse_error" TEXT,
    "parsed_at" TIMESTAMPTZ(6),
    "event_id" UUID,
    "battle_board_id" UUID,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant"."settings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "setting_key" TEXT NOT NULL,
    "setting_value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_audit_trail" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID NOT NULL,
    "entity_type" "tenant_admin"."admin_entity_type" NOT NULL,
    "entity_id" UUID,
    "action" "tenant_admin"."admin_action" NOT NULL,
    "description" TEXT,
    "changes" JSONB,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_audit_trail_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."ActivityFeed" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "performed_by" UUID,
    "performer_name" TEXT,
    "correlation_id" UUID,
    "parent_id" UUID,
    "source_type" TEXT,
    "source_id" UUID,
    "importance" TEXT NOT NULL DEFAULT 'normal',
    "visibility" TEXT NOT NULL DEFAULT 'all',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFeed_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_permissions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "permission_name" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_roles" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_name" "tenant_admin"."admin_role" NOT NULL,
    "description" TEXT,
    "permissions" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_users" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMPTZ(6),
    "last_failed_login" TIMESTAMPTZ(6),
    "failed_login_attempts" SMALLINT DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "login_ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."notification_preferences" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "notification_type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."sms_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID,
    "phone_number" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "status" "tenant_admin"."sms_status" NOT NULL DEFAULT 'pending',
    "twilio_sid" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."sms_automation_rules" (
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

-- CreateTable
CREATE TABLE "tenant_admin"."email_templates" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "template_type" "tenant_admin"."email_template_type" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "merge_fields" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."report_history" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "schedule_id" UUID,
    "generated_by" UUID,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "output_format" TEXT NOT NULL,
    "file_url" TEXT,
    "file_size_bytes" BIGINT,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_history_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."report_schedules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "schedule_cron" TEXT NOT NULL,
    "output_format" TEXT NOT NULL DEFAULT 'pdf',
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ(6),
    "next_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."workflow_executions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "triggered_by" UUID,
    "trigger_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',
    "current_step_id" UUID,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "execution_log" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."workflow_steps" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "step_number" SMALLINT NOT NULL,
    "step_type" TEXT NOT NULL,
    "step_config" JSONB NOT NULL DEFAULT '{}',
    "on_success_step_id" UUID,
    "on_failure_step_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_dishes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "dish_id" UUID NOT NULL,
    "course" TEXT,
    "quantity_servings" INTEGER NOT NULL DEFAULT 1,
    "service_style" TEXT,
    "special_instructions" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_dishes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."storage_locations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "storage_type" TEXT NOT NULL,
    "temperature_min" DECIMAL(5,1),
    "temperature_max" DECIMAL(5,1),
    "temperature_unit" CHAR(1) DEFAULT 'F',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."bulk_combine_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "match_criteria" JSONB NOT NULL,
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bulk_combine_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."method_videos" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "method_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "video_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "duration_seconds" INTEGER,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "method_videos_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."prep_list_imports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_system" TEXT NOT NULL,
    "external_id" TEXT,
    "import_metadata" JSONB DEFAULT '{}',
    "imported_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prep_list_imports_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."recipe_steps" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_version_id" UUID NOT NULL,
    "step_number" SMALLINT NOT NULL,
    "instruction" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "temperature_value" DECIMAL(5,1),
    "temperature_unit" CHAR(1),
    "equipment_needed" TEXT[],
    "tips" TEXT,
    "video_url" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."task_bundle_items" (
    "tenant_id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_bundle_items_pkey" PRIMARY KEY ("tenant_id","bundle_id","task_id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."task_bundles" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "task_bundles_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_availability" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL DEFAULT CURRENT_DATE,
    "effective_until" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_certifications" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "certification_type" TEXT NOT NULL,
    "certification_name" TEXT NOT NULL,
    "issued_date" DATE NOT NULL,
    "expiry_date" DATE,
    "document_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_certifications_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_skills" (
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "proficiency_level" SMALLINT NOT NULL DEFAULT 1,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("tenant_id","employee_id","skill_id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_seniority" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_seniority_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."open_shifts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "shift_start" TIMESTAMPTZ(6) NOT NULL,
    "shift_end" TIMESTAMPTZ(6) NOT NULL,
    "role_during_shift" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "claimed_by" UUID,
    "claimed_at" TIMESTAMPTZ(6),
    "assigned_shift_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "open_shifts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."payroll_line_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "hours_regular" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "hours_overtime" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "rate_regular" DECIMAL(10,2) NOT NULL,
    "rate_overtime" DECIMAL(10,2) NOT NULL,
    "gross_pay" DECIMAL(10,2) NOT NULL,
    "deductions" JSONB NOT NULL DEFAULT '{}',
    "net_pay" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payroll_line_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."payroll_periods" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."payroll_runs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_period_id" UUID NOT NULL,
    "run_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_gross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."timecard_approvals" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_run_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reject_reason" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "timecard_approvals_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."approval_history" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" UUID NOT NULL,
    "performed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_history_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."skills" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."roles" (
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

-- CreateTable
CREATE TABLE "tenant_staff"."EmployeeDeduction" (
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

-- CreateTable
CREATE TABLE "tenant_staff"."employee_tax_info" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "jurisdiction" TEXT NOT NULL DEFAULT 'FL',
    "filing_status" TEXT NOT NULL DEFAULT 'single',
    "federal_withholding_allowances" INTEGER NOT NULL DEFAULT 0,
    "state_withholding_allowances" INTEGER NOT NULL DEFAULT 0,
    "additional_withholding" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_tax_info_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_payroll_prefs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "pay_period_frequency" TEXT NOT NULL DEFAULT 'biweekly',
    "rounding_rule" TEXT NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_payroll_prefs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."tip_pools" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_id" UUID NOT NULL,
    "total_tips" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "allocation_rule" TEXT NOT NULL DEFAULT 'by_hours',
    "fixed_shares" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tip_pools_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."departments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."training_modules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content_url" TEXT,
    "content_type" TEXT NOT NULL DEFAULT 'document',
    "duration_minutes" SMALLINT,
    "category" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "training_modules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."training_assignments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "employee_id" UUID,
    "assigned_to_all" BOOLEAN NOT NULL DEFAULT false,
    "assigned_by" UUID NOT NULL,
    "due_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."training_completions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignment_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "score" DECIMAL(5,2),
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_completions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_time_off_requests" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "request_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_time_off_requests_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."performance_reviews" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "review_type" TEXT NOT NULL,
    "scheduled_date" TIMESTAMPTZ(6) NOT NULL,
    "completed_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "rating" DECIMAL(3,2),
    "strengths" TEXT,
    "areas_for_improvement" TEXT,
    "goals_next_period" TEXT,
    "manager_comments" TEXT,
    "employee_comments" TEXT,
    "employee_acknowledged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."disciplinary_actions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "issued_date" TIMESTAMPTZ(6) NOT NULL,
    "issued_by" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "improvement_plan" TEXT,
    "end_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'active',
    "outcome" TEXT,
    "closed_at" TIMESTAMPTZ(6),
    "closed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."action_milestones" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disciplinary_action_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "completed_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_milestones_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."onboarding_tasks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "task_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."onboarding_completions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,
    "signature_data" TEXT,
    "document_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_completions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_pins" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "pin_encrypted" TEXT NOT NULL,
    "pin_hint" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_pins_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."employee_pin_access_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "accessed_by_id" UUID NOT NULL,
    "access_type" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pin_access_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "core"."waste_reasons" (
    "id" SMALLSERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color_hex" CHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "waste_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."waste_entries" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_item_id" UUID NOT NULL,
    "reason_id" SMALLINT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_id" SMALLINT,
    "location_id" UUID,
    "event_id" UUID,
    "logged_by" UUID NOT NULL,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unitCost" DECIMAL(10,2),
    "totalCost" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "waste_entries_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."override_audit" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "constraint_id" TEXT NOT NULL,
    "guard_expression" TEXT,
    "overridden_by" UUID NOT NULL,
    "override_reason" TEXT NOT NULL,
    "authorized_by" UUID,
    "authorized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

-- CreateTable
CREATE TABLE "tenant"."OutboxEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "core"."OutboxStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_guests" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "guest_name" TEXT NOT NULL,
    "guest_email" TEXT,
    "guest_phone" TEXT,
    "is_primary_contact" BOOLEAN NOT NULL DEFAULT false,
    "dietary_restrictions" TEXT[],
    "allergen_restrictions" TEXT[],
    "notes" TEXT,
    "special_meal_required" BOOLEAN NOT NULL DEFAULT false,
    "special_meal_notes" TEXT,
    "table_assignment" TEXT,
    "meal_preference" TEXT,
    "rsvp_status" TEXT NOT NULL DEFAULT 'pending',
    "waitlist_position" INTEGER,
    "rsvp_responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_guests_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_contracts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "contract_number" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled Contract',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "document_url" TEXT,
    "document_type" TEXT,
    "notes" TEXT,
    "signing_token" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_contracts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."contract_signatures" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "signed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signature_data" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."document_versions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_type" TEXT NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "change_summary" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_followups" (
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

-- CreateTable
CREATE TABLE "tenant_accounting"."chart_of_accounts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type" "tenant_accounting"."AccountType" NOT NULL,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_accounting"."invoices" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_number" TEXT NOT NULL,
    "invoice_type" "tenant_accounting"."InvoiceType" NOT NULL,
    "status" "tenant_accounting"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "client_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "subtotal" MONEY NOT NULL,
    "tax_amount" MONEY NOT NULL DEFAULT 0,
    "discount_amount" MONEY NOT NULL DEFAULT 0,
    "total" MONEY NOT NULL,
    "amount_paid" MONEY NOT NULL DEFAULT 0,
    "amount_due" MONEY NOT NULL,
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deposit_percentage" DECIMAL(65,30),
    "deposit_required" MONEY,
    "deposit_paid" MONEY,
    "notes" TEXT,
    "internal_notes" TEXT,
    "line_items" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "sent_at" TIMESTAMPTZ(6),
    "viewed_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "voided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_accounting"."payment_methods" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "card_last_four" CHAR(4),
    "card_network" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_accounting"."payments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "amount" MONEY NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method_type" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "gateway_transaction_id" TEXT,
    "gateway_payment_method_id" TEXT,
    "processor" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_accounting"."payment_refund_attempts" (
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

-- CreateTable
CREATE TABLE "tenant_accounting"."collection_cases" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "original_amount" MONEY NOT NULL,
    "outstanding_amount" MONEY NOT NULL,
    "collected_amount" MONEY NOT NULL DEFAULT 0,
    "status" "tenant_accounting"."CollectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" "tenant_accounting"."CollectionPriority" NOT NULL DEFAULT 'MEDIUM',
    "dunning_stage" "tenant_accounting"."DunningStage" NOT NULL DEFAULT 'CURRENT',
    "days_overdue" INTEGER NOT NULL DEFAULT 0,
    "aging_bucket" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "assigned_to" UUID,
    "has_payment_plan" BOOLEAN NOT NULL DEFAULT false,
    "is_disputed" BOOLEAN NOT NULL DEFAULT false,
    "is_escalated_to_legal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "eventTenantId" UUID,
    "clientTenantId" UUID,

    CONSTRAINT "collection_cases_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_accounting"."collection_actions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collection_case_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "outcome" TEXT,
    "contacted_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_actions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_accounting"."collection_payment_plans" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collection_case_id" UUID NOT NULL,
    "total_amount" MONEY NOT NULL,
    "installments" INTEGER NOT NULL,
    "frequency_days" INTEGER NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_payment_plans_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_accounting"."revenue_recognition_schedules" (
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

-- CreateTable
CREATE TABLE "tenant_accounting"."revenue_recognition_lines" (
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

-- CreateTable
CREATE TABLE "tenant"."manifest_entity" (
    "tenant_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_entity_pkey" PRIMARY KEY ("tenant_id","entity_type","id")
);

-- CreateTable
CREATE TABLE "tenant"."manifest_idempotency" (
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "manifest_idempotency_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "platform"."sentry_fix_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sentry_issue_id" TEXT NOT NULL,
    "sentry_event_id" TEXT,
    "organization_slug" TEXT NOT NULL,
    "project_slug" TEXT NOT NULL,
    "environment" TEXT,
    "release" TEXT,
    "issue_title" TEXT NOT NULL,
    "issue_url" TEXT NOT NULL,
    "status" "core"."SentryFixJobStatus" NOT NULL DEFAULT 'queued',
    "payload_snapshot" JSONB NOT NULL,
    "branch_name" TEXT,
    "pr_url" TEXT,
    "pr_number" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentry_fix_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."nowsta_config" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "organization_id" TEXT,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncDirection" TEXT NOT NULL DEFAULT 'one_way',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "auto_sync_interval" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nowsta_config_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."nowsta_employee_mappings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nowsta_employee_id" TEXT NOT NULL,
    "convoy_employee_id" UUID NOT NULL,
    "nowsta_employee_name" TEXT,
    "nowsta_employee_email" TEXT,
    "auto_mapped" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nowsta_employee_mappings_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."nowsta_shift_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nowsta_shift_id" TEXT NOT NULL,
    "convoy_shift_id" UUID,
    "nowsta_employee_id" TEXT NOT NULL,
    "location_id" UUID,
    "shift_start" TIMESTAMPTZ(6) NOT NULL,
    "shift_end" TIMESTAMPTZ(6) NOT NULL,
    "role_during_shift" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "last_synced_at" TIMESTAMPTZ(6),
    "nowsta_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nowsta_shift_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."goodshuffle_config" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "api_key" TEXT NOT NULL,
    "api_secret" TEXT NOT NULL,
    "webhook_secret" TEXT,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncDirection" TEXT NOT NULL DEFAULT 'one_way',
    "conflictResolution" TEXT NOT NULL DEFAULT 'convoy_wins',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "auto_sync_interval" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_config_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."goodshuffle_event_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goodshuffle_event_id" TEXT NOT NULL,
    "convoy_event_id" UUID,
    "event_name" TEXT,
    "event_date" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "conflict_data" JSONB,
    "conflict_resolved_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "goodshuffle_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_event_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."goodshuffle_inventory_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goodshuffle_item_id" TEXT NOT NULL,
    "convoy_inventory_item_id" UUID,
    "item_name" TEXT,
    "item_sku" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "conflict_data" JSONB,
    "conflict_resolved_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "goodshuffle_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_inventory_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."goodshuffle_invoice_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goodshuffle_invoice_id" TEXT NOT NULL,
    "convoy_invoice_id" UUID,
    "invoice_number" TEXT,
    "invoice_total" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sync_error" TEXT,
    "conflict_data" JSONB,
    "conflict_resolved_at" TIMESTAMPTZ(6),
    "last_synced_at" TIMESTAMPTZ(6),
    "goodshuffle_updated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goodshuffle_invoice_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."email_workflows" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "trigger_type" "tenant_admin"."email_trigger_type" NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "email_template_id" UUID,
    "email_template_tenant_id" UUID,
    "recipient_config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "email_workflows_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."email_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID,
    "recipient_email" TEXT NOT NULL,
    "recipient_id" UUID,
    "recipient_type" TEXT,
    "subject" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "status" "tenant_admin"."email_status" NOT NULL DEFAULT 'pending',
    "resend_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "opened_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."outbound_webhooks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "secret" TEXT,
    "api_key" TEXT,
    "event_type_filters" "tenant_admin"."webhook_event_type"[] DEFAULT ARRAY[]::"tenant_admin"."webhook_event_type"[],
    "entity_filters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "tenant_admin"."webhook_status" NOT NULL DEFAULT 'active',
    "retry_count" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 1000,
    "timeout_ms" INTEGER NOT NULL DEFAULT 30000,
    "custom_headers" JSONB,
    "last_triggered_at" TIMESTAMPTZ(6),
    "last_success_at" TIMESTAMPTZ(6),
    "last_failure_at" TIMESTAMPTZ(6),
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbound_webhooks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."webhook_delivery_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "eventType" "tenant_admin"."webhook_event_type" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "tenant_admin"."webhook_delivery_status" NOT NULL DEFAULT 'pending',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "http_response_status" INTEGER,
    "response_body" TEXT,
    "error_message" TEXT,
    "next_retry_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."webhook_dead_letter_queue" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID,
    "original_delivery_id" UUID NOT NULL,
    "eventType" "tenant_admin"."webhook_event_type" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "final_error_message" TEXT,
    "total_attempts" INTEGER NOT NULL DEFAULT 1,
    "original_url" VARCHAR(2048) NOT NULL,
    "moved_to_dlq_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "retried_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letter_queue_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "platform"."api_keys" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "hashed_key" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."manifest_command_telemetry" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "command_name" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "instance_id" UUID,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_code" TEXT,
    "duration_ms" INTEGER,
    "guard_eval_ms" INTEGER,
    "action_exec_ms" INTEGER,
    "guards_evaluated" INTEGER DEFAULT 0,
    "guards_passed" INTEGER DEFAULT 0,
    "guards_failed" INTEGER DEFAULT 0,
    "failed_guards" JSONB,
    "idempotency_key" TEXT,
    "was_idempotent_hit" BOOLEAN NOT NULL DEFAULT false,
    "events_emitted" INTEGER DEFAULT 0,
    "performed_by" UUID,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_command_telemetry_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."rate_limit_configs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "endpoint_pattern" TEXT NOT NULL,
    "window_ms" INTEGER NOT NULL,
    "max_requests" INTEGER NOT NULL,
    "burst_allowance" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rate_limit_configs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."rate_limit_usage" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "bucket_start" TIMESTAMPTZ(6) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "blocked_count" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" INTEGER,
    "max_response_time" INTEGER,
    "user_hashes" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_usage_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."rate_limit_events" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "requests_in_window" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "user_id" UUID,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "response_time" INTEGER,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."role_policies" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "role_name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_policies_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."payroll_approval_history" (
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

-- CreateTable
CREATE TABLE "tenant_staff"."tax_configurations" (
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_audit_log_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."vendor_catalogs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "item_number" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "base_unit_cost" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unit_of_measure" TEXT NOT NULL,
    "lead_time_days" INTEGER,
    "lead_time_min_days" INTEGER,
    "lead_time_max_days" INTEGER,
    "minimum_order_quantity" DECIMAL(12,3),
    "order_multiple" DECIMAL(12,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "supplier_sku" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "last_cost_update" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_catalogs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."pricing_tiers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_entry_id" UUID NOT NULL,
    "tier_name" TEXT NOT NULL,
    "min_quantity" DECIMAL(12,3) NOT NULL,
    "max_quantity" DECIMAL(12,3),
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "discount_percent" DECIMAL(5,2),
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."bulk_order_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_entry_id" UUID NOT NULL,
    "rule_name" TEXT NOT NULL,
    "minimum_quantity" DECIMAL(12,3) NOT NULL,
    "rule_type" TEXT NOT NULL,
    "threshold_quantity" DECIMAL(12,3),
    "action" TEXT NOT NULL,
    "discount_percent" DECIMAL(5,2),
    "free_item_quantity" INTEGER,
    "shipping_included" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bulk_order_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."audit_schedules" (
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

-- CreateTable
CREATE TABLE "tenant"."knowledge_base_entries" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "author_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "knowledge_base_entries_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_transfers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_number" TEXT NOT NULL,
    "from_location_id" UUID NOT NULL,
    "to_location_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_by" UUID,
    "approved_by" UUID,
    "shipped_by" UUID,
    "received_by" UUID,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ(6),
    "shipped_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_transfer_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "received_quantity" DECIMAL(12,3),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transfer_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."quality_checks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "check_number" TEXT NOT NULL,
    "event_id" UUID,
    "check_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduled_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "assigned_to" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."quality_check_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "check_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "passed" BOOLEAN,
    "value" TEXT,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_check_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."temperature_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "log_number" TEXT NOT NULL,
    "event_id" UUID,
    "equipment_id" UUID,
    "log_type" TEXT NOT NULL,
    "item_name" TEXT,
    "temperature" DECIMAL(6,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'F',
    "target_temp" DECIMAL(6,2),
    "withinRange" BOOLEAN,
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logged_by" UUID,
    "notes" TEXT,
    "corrective_action" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "temperature_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."corrective_actions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action_number" TEXT NOT NULL,
    "event_id" UUID,
    "related_check_id" UUID,
    "related_temp_log_id" UUID,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "root_cause" TEXT,
    "immediate_action" TEXT,
    "preventive_action" TEXT,
    "assigned_to" UUID,
    "due_date" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "resolution_notes" TEXT,
    "verification_method" TEXT,
    "verified_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."temperature_probes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "probe_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location_id" UUID,
    "area_id" UUID,
    "probe_type" TEXT NOT NULL DEFAULT 'bluetooth',
    "status" TEXT NOT NULL DEFAULT 'active',
    "min_temp" DECIMAL(6,2) NOT NULL DEFAULT -40,
    "max_temp" DECIMAL(6,2) NOT NULL DEFAULT 300,
    "last_reading" DECIMAL(6,2),
    "last_reading_at" TIMESTAMPTZ(6),
    "battery_level" SMALLINT,
    "last_calibration" TIMESTAMPTZ(6),
    "next_calibration" TIMESTAMPTZ(6),
    "calibration_interval_days" SMALLINT DEFAULT 90,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "temperature_probes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."temperature_readings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "probe_id" UUID NOT NULL,
    "event_id" UUID,
    "temperature" DECIMAL(6,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'F',
    "logged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "battery_level" SMALLINT,
    "signal_strength" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temperature_readings_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."iot_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alert_number" TEXT NOT NULL,
    "probe_id" UUID,
    "event_id" UUID,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "message" TEXT,
    "temperature" DECIMAL(6,2),
    "threshold" DECIMAL(6,2),
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ(6),
    "acknowledged_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iot_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_kitchen"."iot_alert_rules" (
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

-- CreateTable
CREATE TABLE "tenant_facilities"."facilities" (
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

-- CreateTable
CREATE TABLE "tenant_facilities"."facility_areas" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "venue_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "areaType" TEXT NOT NULL DEFAULT 'other',
    "floor" TEXT,
    "description" TEXT,
    "square_feet" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "facility_areas_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_facilities"."facility_assets" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL DEFAULT 'other',
    "serial_number" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "purchase_date" DATE,
    "purchase_cost" DECIMAL(12,2),
    "warranty_expiry" DATE,
    "area_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "facility_assets_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_facilities"."maintenance_work_orders" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "work_order_number" TEXT NOT NULL,
    "area_id" UUID,
    "equipment_id" UUID,
    "workOrderType" TEXT NOT NULL DEFAULT 'corrective',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reported_by" UUID,
    "reported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_to" UUID,
    "assigned_vendor" TEXT,
    "scheduled_date" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "labor_hours" DECIMAL(5,2),
    "parts_cost" DECIMAL(10,2),
    "labor_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "maintenance_work_orders_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_facilities"."preventive_maintenance_schedules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_number" TEXT NOT NULL,
    "area_id" UUID,
    "equipment_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "interval_days" INTEGER NOT NULL DEFAULT 30,
    "last_completed_at" TIMESTAMPTZ(6),
    "next_due_at" TIMESTAMPTZ(6) NOT NULL,
    "assigned_to" UUID,
    "estimated_hours" DECIMAL(4,1),
    "estimated_cost" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "preventive_maintenance_schedules_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_logistics"."delivery_routes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "event_id" UUID,
    "scheduled_date" DATE,
    "start_time" TIMESTAMPTZ(6),
    "end_time" TIMESTAMPTZ(6),
    "total_distance" DECIMAL(10,2),
    "total_duration" INTEGER,
    "optimization_score" DECIMAL(5,2),
    "optimization_algorithm" TEXT,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "actual_start_time" TIMESTAMPTZ(6),
    "actual_end_time" TIMESTAMPTZ(6),
    "actual_distance" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "delivery_routes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_logistics"."route_stops" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_id" UUID NOT NULL,
    "stop_number" INTEGER NOT NULL,
    "location_id" UUID,
    "venue_id" UUID,
    "name" TEXT NOT NULL,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country_code" CHAR(2),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "stopType" TEXT NOT NULL DEFAULT 'delivery',
    "planned_arrival" TIMESTAMPTZ(6),
    "planned_duration" INTEGER,
    "notes" TEXT,
    "distance_from_previous" DECIMAL(10,2),
    "time_from_previous" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "actual_arrival" TIMESTAMPTZ(6),
    "actual_departure" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_logistics"."vehicles" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "plate_number" TEXT,
    "vin" TEXT,
    "capacity_weight" DECIMAL(10,2),
    "capacity_volume" DECIMAL(10,2),
    "fuel_type" TEXT,
    "mileage" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_logistics"."drivers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "license_number" TEXT,
    "license_expiry" DATE,
    "vehicle_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."provider_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMPTZ(6),
    "calendar_id" TEXT,
    "calendar_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "syncDirection" TEXT NOT NULL DEFAULT 'import',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "provider_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_staff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "role" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "shiftStart" INTEGER DEFAULT 0,
    "shiftEnd" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'assigned',
    "confirmedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "noShowReason" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "event_staff_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "tenant_staff"."staff_members" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "role" TEXT DEFAULT 'server',
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AiEventSetupSession" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalInput" TEXT DEFAULT '',
    "parsedTitle" TEXT DEFAULT '',
    "parsedEventType" TEXT DEFAULT '',
    "parsedEventDate" TIMESTAMP(3),
    "parsedGuestCount" INTEGER DEFAULT 0,
    "parsedVenueName" TEXT DEFAULT '',
    "parsedVenueAddress" TEXT DEFAULT '',
    "parsedNotes" TEXT DEFAULT '',
    "parsedTags" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "confidence" DECIMAL(12,2) DEFAULT 0,
    "missingFields" TEXT DEFAULT '[]',
    "suggestions" TEXT DEFAULT '[]',
    "createdEventId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiEventSetupSession_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "AutomatedFollowup" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT DEFAULT 'email',
    "status" TEXT DEFAULT 'pending',
    "scheduledDate" TIMESTAMP(3),
    "sentDate" TIMESTAMP(3),
    "recipientId" TEXT DEFAULT '',
    "subject" TEXT DEFAULT '',
    "body" TEXT DEFAULT '',
    "templateId" TEXT DEFAULT '',
    "errorMessage" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "AutomatedFollowup_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "fiscalYear" INTEGER DEFAULT 0,
    "totalAmount" DECIMAL(12,2) DEFAULT 0,
    "allocatedAmount" DECIMAL(12,2) DEFAULT 0,
    "spentAmount" DECIMAL(12,2) DEFAULT 0,
    "status" TEXT DEFAULT 'draft',
    "category" TEXT DEFAULT 'general',
    "departmentId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DECIMAL(12,2) DEFAULT 0,
    "currency" TEXT DEFAULT 'USD',
    "stage" TEXT DEFAULT 'new',
    "status" TEXT DEFAULT 'open',
    "probability" DECIMAL(12,2) DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "assignedTo" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EntityVersion" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "versionedEntityId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeReason" TEXT DEFAULT '',
    "changeSummary" TEXT DEFAULT '',
    "changeType" TEXT NOT NULL,
    "snapshotData" TEXT,
    "metadata" TEXT,
    "isApproved" BOOLEAN DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "createdBy" TEXT DEFAULT '',

    CONSTRAINT "EntityVersion_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "EventWaitlistEntry" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "partySize" INTEGER DEFAULT 1,
    "status" TEXT DEFAULT 'waiting',
    "notes" TEXT DEFAULT '',
    "joinedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "EventWaitlistEntry_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "FacilitySchedule" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "facilityId" TEXT DEFAULT '',
    "areaId" TEXT DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "scheduleType" TEXT DEFAULT 'maintenance',
    "status" TEXT DEFAULT 'scheduled',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "assignedTo" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "FacilitySchedule_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "FacilityWorkOrder" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "facilityId" TEXT DEFAULT '',
    "areaId" TEXT DEFAULT '',
    "assetId" TEXT DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "priority" TEXT DEFAULT 'medium',
    "status" TEXT DEFAULT 'open',
    "category" TEXT DEFAULT 'repair',
    "requestedBy" TEXT DEFAULT '',
    "assignedTo" TEXT DEFAULT '',
    "estimatedCost" DECIMAL(12,2) DEFAULT 0,
    "actualCost" DECIMAL(12,2) DEFAULT 0,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "FacilityWorkOrder_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "LogisticsDispatch" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "driverId" TEXT DEFAULT '',
    "vehicleId" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "priority" TEXT DEFAULT 'normal',
    "estimatedDeliveryTime" TIMESTAMP(3),
    "actualDeliveryTime" TIMESTAMP(3),
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "LogisticsDispatch_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "PerformancePrediction" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "employeeId" TEXT DEFAULT '',
    "predictionType" TEXT DEFAULT '',
    "predictionHorizon" INTEGER DEFAULT 0,
    "predictionScore" DECIMAL(12,2) DEFAULT 0,
    "confidence" TEXT DEFAULT 'medium',
    "factors" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PerformancePrediction_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "SampleData" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "seededAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "isSeeded" BOOLEAN DEFAULT false,
    "eventsCreated" INTEGER DEFAULT 0,
    "clientsCreated" INTEGER DEFAULT 0,
    "usersCreated" INTEGER DEFAULT 0,
    "recipesCreated" INTEGER DEFAULT 0,

    CONSTRAINT "SampleData_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "StaffPerformance" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewType" TEXT DEFAULT 'quarterly',
    "status" TEXT DEFAULT 'draft',
    "rating" DECIMAL(12,2) DEFAULT 0,
    "reviewerId" TEXT DEFAULT '',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "strengths" TEXT DEFAULT '',
    "improvements" TEXT DEFAULT '',
    "goals" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "StaffPerformance_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT DEFAULT 'supplier',
    "status" TEXT DEFAULT 'active',
    "email" TEXT DEFAULT '',
    "phone" TEXT DEFAULT '',
    "website" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "city" TEXT DEFAULT '',
    "state" TEXT DEFAULT '',
    "zip" TEXT DEFAULT '',
    "taxId" TEXT DEFAULT '',
    "paymentTerms" TEXT DEFAULT 'net30',
    "rating" DECIMAL(12,2) DEFAULT 0,
    "ratingCount" INTEGER DEFAULT 0,
    "notes" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VersionApproval" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "entityVersionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comments" TEXT DEFAULT '',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "VersionApproval_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "VersionedEntity" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "isLocked" BOOLEAN DEFAULT false,
    "currentVersionId" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "VersionedEntity_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateTable
CREATE TABLE "WorkforceOptimization" (
    "tenantId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "locationId" TEXT DEFAULT '',
    "optimizationType" TEXT DEFAULT '',
    "status" TEXT DEFAULT 'pending',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkforceOptimization_pkey" PRIMARY KEY ("tenantId","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_slug_key" ON "platform"."accounts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "locations_id_key" ON "tenant"."locations"("id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_id_key" ON "tenant"."locations"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "venues_id_key" ON "tenant"."venues"("id");

-- CreateIndex
CREATE INDEX "venues_tenant_id_city_idx" ON "tenant"."venues"("tenant_id", "city");

-- CreateIndex
CREATE INDEX "venues_tenant_id_venue_type_idx" ON "tenant"."venues"("tenant_id", "venue_type");

-- CreateIndex
CREATE INDEX "venues_tenant_id_is_active_idx" ON "tenant"."venues"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "venues_tenant_id_id_key" ON "tenant"."venues"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "employees_role_id_idx" ON "tenant_staff"."employees"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_unique_idx" ON "tenant_staff"."employees"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_auth_user_idx" ON "tenant_staff"."employees"("tenant_id", "auth_user_id");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_employee_idx" ON "tenant_staff"."employee_bank_accounts"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_status_idx" ON "tenant_staff"."employee_bank_accounts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "kitchen_tasks_tags_idx" ON "tenant_kitchen"."kitchen_tasks" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "prep_tasks_event_id_idx" ON "tenant_kitchen"."prep_tasks"("event_id");

-- CreateIndex
CREATE INDEX "prep_tasks_location_id_idx" ON "tenant_kitchen"."prep_tasks"("location_id");

-- CreateIndex
CREATE INDEX "prep_tasks_container_id_idx" ON "tenant_kitchen"."prep_tasks"("container_id");

-- CreateIndex
CREATE INDEX "prep_tasks_dish_id_idx" ON "tenant_kitchen"."prep_tasks"("dish_id");

-- CreateIndex
CREATE INDEX "prep_tasks_method_id_idx" ON "tenant_kitchen"."prep_tasks"("method_id");

-- CreateIndex
CREATE INDEX "prep_tasks_recipe_version_id_idx" ON "tenant_kitchen"."prep_tasks"("recipe_version_id");

-- CreateIndex
CREATE INDEX "task_claims_task_id_idx" ON "tenant_kitchen"."task_claims"("task_id");

-- CreateIndex
CREATE INDEX "task_claims_employee_id_idx" ON "tenant_kitchen"."task_claims"("employee_id");

-- CreateIndex
CREATE INDEX "task_progress_employee_id_idx" ON "tenant_kitchen"."task_progress"("employee_id");

-- CreateIndex
CREATE INDEX "task_progress_task_id_idx" ON "tenant_kitchen"."task_progress"("task_id");

-- CreateIndex
CREATE INDEX "task_progress_tenant_task_created_idx" ON "tenant_kitchen"."task_progress"("tenant_id", "task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "prep_lists_event_id_idx" ON "tenant_kitchen"."prep_lists"("event_id");

-- CreateIndex
CREATE INDEX "prep_lists_status_idx" ON "tenant_kitchen"."prep_lists"("status");

-- CreateIndex
CREATE INDEX "prep_lists_generated_at_idx" ON "tenant_kitchen"."prep_lists"("generated_at");

-- CreateIndex
CREATE INDEX "prep_task_plan_workflows_tenant_id_event_id_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "prep_task_plan_workflows_tenant_id_status_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "prep_task_plan_workflows_tenant_id_created_at_idx" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "prep_task_plan_workflows_tenant_idempotency_key" ON "tenant_kitchen"."prep_task_plan_workflows"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "prep_list_items_prep_list_id_idx" ON "tenant_kitchen"."prep_list_items"("prep_list_id");

-- CreateIndex
CREATE INDEX "prep_list_items_station_id_idx" ON "tenant_kitchen"."prep_list_items"("station_id");

-- CreateIndex
CREATE INDEX "prep_list_items_ingredient_id_idx" ON "tenant_kitchen"."prep_list_items"("ingredient_id");

-- CreateIndex
CREATE INDEX "prep_list_items_is_completed_idx" ON "tenant_kitchen"."prep_list_items"("is_completed");

-- CreateIndex
CREATE INDEX "stations_tenant_id_location_id_idx" ON "tenant_kitchen"."stations"("tenant_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "stations_tenant_id_id_key" ON "tenant_kitchen"."stations"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_location_id_idx" ON "tenant_kitchen"."equipment"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_status_idx" ON "tenant_kitchen"."equipment"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_next_maintenance_date_idx" ON "tenant_kitchen"."equipment"("tenant_id", "next_maintenance_date");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_iot_device_id_idx" ON "tenant_kitchen"."equipment"("tenant_id", "iot_device_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_tenant_id_id_key" ON "tenant_kitchen"."equipment"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_equipment_id_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "equipment_id");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_status_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_priority_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_scheduled_date_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_tenant_id_id_key" ON "tenant_kitchen"."work_orders"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "events_id_key" ON "tenant_events"."events"("id");

-- CreateIndex
CREATE INDEX "idx_events_venue_id" ON "tenant_events"."events"("tenant_id", "venue_id");

-- CreateIndex
CREATE INDEX "idx_events_venue_entity_id" ON "tenant_events"."events"("tenant_id", "venue_entity_id");

-- CreateIndex
CREATE INDEX "events_client_id_idx" ON "tenant_events"."events"("client_id");

-- CreateIndex
CREATE INDEX "events_location_id_idx" ON "tenant_events"."events"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_tenant_id_id_key" ON "tenant_events"."events"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "event_profitability_event_id_idx" ON "tenant_events"."event_profitability"("event_id");

-- CreateIndex
CREATE INDEX "event_profitability_tenant_id_event_id_idx" ON "tenant_events"."event_profitability"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_profitability_calculated_at_idx" ON "tenant_events"."event_profitability"("calculated_at" DESC);

-- CreateIndex
CREATE INDEX "event_summaries_event_id_idx" ON "tenant_events"."event_summaries"("event_id");

-- CreateIndex
CREATE INDEX "event_summaries_tenant_id_event_id_idx" ON "tenant_events"."event_summaries"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_summaries_generated_at_idx" ON "tenant_events"."event_summaries"("generated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "event_reports_id_key" ON "tenant_events"."event_reports"("id");

-- CreateIndex
CREATE INDEX "event_reports_event_id_idx" ON "tenant_events"."event_reports"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_reports_status_idx" ON "tenant_events"."event_reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_event_reports_data_gin" ON "tenant_events"."event_reports" USING GIN ("checklist_data");

-- CreateIndex
CREATE UNIQUE INDEX "event_budgets_id_key" ON "tenant_events"."event_budgets"("id");

-- CreateIndex
CREATE INDEX "event_budgets_event_id_idx" ON "tenant_events"."event_budgets"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_budgets_status_idx" ON "tenant_events"."event_budgets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "budget_line_items_budget_id_idx" ON "tenant_events"."budget_line_items"("tenant_id", "budget_id");

-- CreateIndex
CREATE INDEX "budget_line_items_category_idx" ON "tenant_events"."budget_line_items"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "clients_tags_idx" ON "tenant_crm"."clients" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "clients_id_key" ON "tenant_crm"."clients"("id");

-- CreateIndex
CREATE INDEX "client_contacts_client_id_idx" ON "tenant_crm"."client_contacts"("client_id");

-- CreateIndex
CREATE INDEX "user_preferences_tenant_id_category_idx" ON "tenant_staff"."user_preferences"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_tenant_id_user_id_preference_key_category_key" ON "tenant_staff"."user_preferences"("tenant_id", "user_id", "preference_key", "category");

-- CreateIndex
CREATE UNIQUE INDEX "leads_id_key" ON "tenant_crm"."leads"("id");

-- CreateIndex
CREATE INDEX "client_interactions_client_id_idx" ON "tenant_crm"."client_interactions"("client_id");

-- CreateIndex
CREATE INDEX "client_interactions_lead_id_idx" ON "tenant_crm"."client_interactions"("lead_id");

-- CreateIndex
CREATE INDEX "client_interactions_employee_idx" ON "tenant_crm"."client_interactions"("employee_id");

-- CreateIndex
CREATE INDEX "crm_scoring_rules_tenant_active_priority_idx" ON "tenant_crm"."crm_scoring_rules"("tenant_id", "is_active", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_public_token_key" ON "tenant_crm"."proposals"("public_token");

-- CreateIndex
CREATE INDEX "proposals_client_id_idx" ON "tenant_crm"."proposals"("client_id");

-- CreateIndex
CREATE INDEX "proposals_lead_id_idx" ON "tenant_crm"."proposals"("lead_id");

-- CreateIndex
CREATE INDEX "proposals_event_id_idx" ON "tenant_crm"."proposals"("event_id");

-- CreateIndex
CREATE INDEX "proposals_template_id_idx" ON "tenant_crm"."proposals"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_tenant_id_id_key" ON "tenant_crm"."proposals"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "proposal_line_items_tenant_id_proposal_id_idx" ON "tenant_crm"."proposal_line_items"("tenant_id", "proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_templates_id_key" ON "tenant_crm"."proposal_templates"("id");

-- CreateIndex
CREATE INDEX "proposal_templates_tenant_id_event_type_idx" ON "tenant_crm"."proposal_templates"("tenant_id", "event_type");

-- CreateIndex
CREATE INDEX "proposal_templates_tenant_id_is_active_idx" ON "tenant_crm"."proposal_templates"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "proposal_templates_tenant_id_is_default_idx" ON "tenant_crm"."proposal_templates"("tenant_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_templates_tenant_id_id_key" ON "tenant_crm"."proposal_templates"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "recipes_tags_idx" ON "tenant_kitchen"."recipes" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "recipe_versions_recipe_id_idx" ON "tenant_kitchen"."recipe_versions"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_versions_locked_by_idx" ON "tenant_kitchen"."recipe_versions"("locked_by");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_tenant_id_recipe_id_version_number_key" ON "tenant_kitchen"."recipe_versions"("tenant_id", "recipe_id", "version_number");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_version_id_idx" ON "tenant_kitchen"."recipe_ingredients"("recipe_version_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "tenant_kitchen"."recipe_ingredients"("ingredient_id");

-- CreateIndex
CREATE INDEX "ingredients_allergens_idx" ON "tenant_kitchen"."ingredients" USING GIN ("allergens");

-- CreateIndex
CREATE INDEX "prep_methods_certifications_idx" ON "tenant_kitchen"."prep_methods" USING GIN ("requires_certification");

-- CreateIndex
CREATE INDEX "containers_location_idx" ON "tenant_kitchen"."containers"("location_id");

-- CreateIndex
CREATE INDEX "dishes_recipe_id_idx" ON "tenant_kitchen"."dishes"("recipe_id");

-- CreateIndex
CREATE INDEX "menu_dishes_menu_id_idx" ON "tenant_kitchen"."menu_dishes"("menu_id");

-- CreateIndex
CREATE INDEX "menu_dishes_dish_id_idx" ON "tenant_kitchen"."menu_dishes"("dish_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_dishes_tenant_id_menu_id_dish_id_key" ON "tenant_kitchen"."menu_dishes"("tenant_id", "menu_id", "dish_id");

-- CreateIndex
CREATE INDEX "prep_comments_task_id_idx" ON "tenant_kitchen"."prep_comments"("task_id");

-- CreateIndex
CREATE INDEX "prep_comments_employee_id_idx" ON "tenant_kitchen"."prep_comments"("employee_id");

-- CreateIndex
CREATE INDEX "event_timeline_event_id_idx" ON "tenant_events"."event_timeline"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_imports_id_key" ON "tenant_events"."event_imports"("id");

-- CreateIndex
CREATE INDEX "event_imports_created_idx" ON "tenant_events"."event_imports"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "event_imports_event_idx" ON "tenant_events"."event_imports"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_imports_status_idx" ON "tenant_events"."event_imports"("tenant_id", "parse_status");

-- CreateIndex
CREATE INDEX "idx_battle_boards_data_gin" ON "tenant_events"."battle_boards" USING GIN ("board_data");

-- CreateIndex
CREATE INDEX "idx_battle_boards_tags_gin" ON "tenant_events"."battle_boards" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "command_boards_event_id_idx" ON "tenant_events"."command_boards"("event_id");

-- CreateIndex
CREATE INDEX "idx_command_boards_tags_gin" ON "tenant_events"."command_boards" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "command_board_cards_board_id_idx" ON "tenant_events"."command_board_cards"("board_id");

-- CreateIndex
CREATE INDEX "command_board_cards_z_index_idx" ON "tenant_events"."command_board_cards"("z_index");

-- CreateIndex
CREATE INDEX "command_board_cards_group_id_idx" ON "tenant_events"."command_board_cards"("group_id");

-- CreateIndex
CREATE INDEX "command_board_cards_entity_id_entity_type_idx" ON "tenant_events"."command_board_cards"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "command_board_layouts_board_id_idx" ON "tenant_events"."command_board_layouts"("board_id");

-- CreateIndex
CREATE INDEX "command_board_layouts_user_id_idx" ON "tenant_events"."command_board_layouts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "command_board_layouts_board_id_user_id_name_key" ON "tenant_events"."command_board_layouts"("board_id", "user_id", "name");

-- CreateIndex
CREATE INDEX "command_board_groups_board_id_idx" ON "tenant_events"."command_board_groups"("board_id");

-- CreateIndex
CREATE INDEX "command_board_connections_board_id_idx" ON "tenant_events"."command_board_connections"("board_id");

-- CreateIndex
CREATE INDEX "command_board_connections_from_card_id_idx" ON "tenant_events"."command_board_connections"("from_card_id");

-- CreateIndex
CREATE INDEX "command_board_connections_to_card_id_idx" ON "tenant_events"."command_board_connections"("to_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_connection_per_board" ON "tenant_events"."command_board_connections"("board_id", "from_card_id", "to_card_id", "relationship_type");

-- CreateIndex
CREATE INDEX "board_projections_board_id_idx" ON "tenant_events"."board_projections"("board_id");

-- CreateIndex
CREATE INDEX "board_projections_entity_type_entity_id_idx" ON "tenant_events"."board_projections"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_projections_board_id_entity_type_entity_id_key" ON "tenant_events"."board_projections"("board_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "board_annotations_board_id_idx" ON "tenant_events"."board_annotations"("board_id");

-- CreateIndex
CREATE INDEX "timeline_tasks_event_id_idx" ON "tenant_events"."timeline_tasks"("event_id");

-- CreateIndex
CREATE INDEX "timeline_tasks_assignee_id_idx" ON "tenant_events"."timeline_tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "timeline_tasks_status_idx" ON "tenant_events"."timeline_tasks"("status");

-- CreateIndex
CREATE INDEX "timeline_tasks_priority_idx" ON "tenant_events"."timeline_tasks"("priority");

-- CreateIndex
CREATE INDEX "timeline_tasks_start_time_idx" ON "tenant_events"."timeline_tasks"("start_time");

-- CreateIndex
CREATE INDEX "timeline_tasks_is_on_critical_path_idx" ON "tenant_events"."timeline_tasks"("is_on_critical_path");

-- CreateIndex
CREATE INDEX "timeline_tasks_dependencies_idx" ON "tenant_events"."timeline_tasks" USING GIN ("dependencies");

-- CreateIndex
CREATE UNIQUE INDEX "catering_orders_id_key" ON "tenant_events"."catering_orders"("id");

-- CreateIndex
CREATE UNIQUE INDEX "catering_orders_order_number_key" ON "tenant_events"."catering_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_id_key" ON "tenant_inventory"."inventory_items"("id");

-- CreateIndex
CREATE INDEX "inventory_items_supplier_id_idx" ON "tenant_inventory"."inventory_items"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_tenant_id_id_key" ON "tenant_inventory"."inventory_items"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_date_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id", "transaction_date");

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_item_fk_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_item_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_location_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id", "storage_location_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_type_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id", "transaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_suppliers_id_key" ON "tenant_inventory"."inventory_suppliers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_suppliers_tenant_id_id_key" ON "tenant_inventory"."inventory_suppliers"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_suppliers_tenant_id_supplier_number_key" ON "tenant_inventory"."inventory_suppliers"("tenant_id", "supplier_number");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_tenant_supplier_idx" ON "tenant_inventory"."supplier_sync_logs"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_connector_idx" ON "tenant_inventory"."supplier_sync_logs"("connector_id");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_status_idx" ON "tenant_inventory"."supplier_sync_logs"("status");

-- CreateIndex
CREATE INDEX "supplier_sync_logs_created_at_idx" ON "tenant_inventory"."supplier_sync_logs"("created_at");

-- CreateIndex
CREATE INDEX "inventory_alerts_tenant_item_idx" ON "tenant_inventory"."inventory_alerts"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_alerts_tenant_triggered_idx" ON "tenant_inventory"."inventory_alerts"("tenant_id", "triggered_at");

-- CreateIndex
CREATE INDEX "inventory_alerts_tenant_type_idx" ON "tenant_inventory"."inventory_alerts"("tenant_id", "alert_type");

-- CreateIndex
CREATE INDEX "inventory_stock_tenant_item_idx" ON "tenant_inventory"."inventory_stock"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_stock_tenant_item_location_idx" ON "tenant_inventory"."inventory_stock"("tenant_id", "item_id", "storage_location_id");

-- CreateIndex
CREATE INDEX "inventory_stock_tenant_location_idx" ON "tenant_inventory"."inventory_stock"("tenant_id", "storage_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_tenant_id_item_id_storage_location_id_key" ON "tenant_inventory"."inventory_stock"("tenant_id", "item_id", "storage_location_id");

-- CreateIndex
CREATE INDEX "inventory_forecasts_tenant_sku_date_idx" ON "tenant_inventory"."inventory_forecasts"("tenant_id", "sku", "date");

-- CreateIndex
CREATE INDEX "forecast_inputs_tenant_sku_date_idx" ON "tenant_inventory"."forecast_inputs"("tenant_id", "sku", "date");

-- CreateIndex
CREATE INDEX "reorder_suggestions_tenant_sku_idx" ON "tenant_inventory"."reorder_suggestions"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_count_sessions_session_id_key" ON "tenant_inventory"."cycle_count_sessions"("session_id");

-- CreateIndex
CREATE INDEX "cycle_count_sessions_tenant_location_idx" ON "tenant_inventory"."cycle_count_sessions"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "cycle_count_sessions_tenant_status_idx" ON "tenant_inventory"."cycle_count_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cycle_count_sessions_tenant_scheduled_idx" ON "tenant_inventory"."cycle_count_sessions"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_session_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_item_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_sync_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id", "sync_status");

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_offline_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id", "offline_id");

-- CreateIndex
CREATE INDEX "variance_reports_tenant_session_idx" ON "tenant_inventory"."variance_reports"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "variance_reports_tenant_item_idx" ON "tenant_inventory"."variance_reports"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "variance_reports_tenant_status_idx" ON "tenant_inventory"."variance_reports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_session_idx" ON "tenant_inventory"."cycle_count_audit_log"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_performer_idx" ON "tenant_inventory"."cycle_count_audit_log"("tenant_id", "performed_by_id");

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_created_idx" ON "tenant_inventory"."cycle_count_audit_log"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_id_key" ON "tenant_inventory"."purchase_orders"("id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "tenant_inventory"."purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_vendor_idx" ON "tenant_inventory"."purchase_orders"("tenant_id", "vendor_id");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_status_idx" ON "tenant_inventory"."purchase_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_date_idx" ON "tenant_inventory"."purchase_orders"("tenant_id", "order_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenant_id_id_key" ON "tenant_inventory"."purchase_orders"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "purchase_order_items_tenant_po_idx" ON "tenant_inventory"."purchase_order_items"("tenant_id", "purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_tenant_item_idx" ON "tenant_inventory"."purchase_order_items"("tenant_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_id_key" ON "tenant_inventory"."purchase_requisitions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_requisition_number_key" ON "tenant_inventory"."purchase_requisitions"("requisition_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_converted_to_po_id_key" ON "tenant_inventory"."purchase_requisitions"("converted_to_po_id");

-- CreateIndex
CREATE INDEX "purchase_requisitions_tenant_status_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "purchase_requisitions_tenant_requester_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "requested_by");

-- CreateIndex
CREATE INDEX "purchase_requisitions_tenant_department_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "department");

-- CreateIndex
CREATE INDEX "purchase_requisitions_tenant_date_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "request_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_tenant_id_id_key" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisition_items_id_key" ON "tenant_inventory"."purchase_requisition_items"("id");

-- CreateIndex
CREATE INDEX "purchase_requisition_items_tenant_req_idx" ON "tenant_inventory"."purchase_requisition_items"("tenant_id", "requisition_id");

-- CreateIndex
CREATE INDEX "purchase_requisition_items_tenant_item_idx" ON "tenant_inventory"."purchase_requisition_items"("tenant_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_contracts_id_key" ON "tenant_inventory"."vendor_contracts"("id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_contracts_contract_number_key" ON "tenant_inventory"."vendor_contracts"("contract_number");

-- CreateIndex
CREATE INDEX "vendor_contracts_tenant_vendor_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "vendor_id");

-- CreateIndex
CREATE INDEX "vendor_contracts_tenant_status_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "vendor_contracts_tenant_end_date_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_contracts_tenant_id_id_key" ON "tenant_inventory"."vendor_contracts"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "vendor_contacts_tenant_supplier_idx" ON "tenant_inventory"."vendor_contacts"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "vendor_ratings_tenant_supplier_idx" ON "tenant_inventory"."vendor_ratings"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "procurement_budgets_tenant_status_idx" ON "tenant_inventory"."procurement_budgets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "procurement_budgets_tenant_category_idx" ON "tenant_inventory"."procurement_budgets"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "procurement_budgets_tenant_year_idx" ON "tenant_inventory"."procurement_budgets"("tenant_id", "fiscal_year");

-- CreateIndex
CREATE INDEX "procurement_budget_alerts_budget_idx" ON "tenant_inventory"."procurement_budget_alerts"("tenant_id", "budget_id");

-- CreateIndex
CREATE INDEX "procurement_budget_alerts_ack_idx" ON "tenant_inventory"."procurement_budget_alerts"("tenant_id", "is_acknowledged");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_id_key" ON "tenant_inventory"."shipments"("id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "tenant_inventory"."shipments"("shipment_number");

-- CreateIndex
CREATE INDEX "shipments_tenant_id_status_idx" ON "tenant_inventory"."shipments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "shipments_tenant_id_event_id_idx" ON "tenant_inventory"."shipments"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "shipments_tenant_id_supplier_id_idx" ON "tenant_inventory"."shipments"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "shipments_location_id_idx" ON "tenant_inventory"."shipments"("location_id");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "tenant_inventory"."shipments"("tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tenant_id_id_key" ON "tenant_inventory"."shipments"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_id_key" ON "tenant_inventory"."shipment_items"("id");

-- CreateIndex
CREATE INDEX "shipment_items_tenant_id_shipment_id_idx" ON "tenant_inventory"."shipment_items"("tenant_id", "shipment_id");

-- CreateIndex
CREATE INDEX "shipment_items_tenant_id_item_id_idx" ON "tenant_inventory"."shipment_items"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "shipment_items_tenant_id_lot_number_idx" ON "tenant_inventory"."shipment_items"("tenant_id", "lot_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_tenant_id_id_key" ON "tenant_inventory"."shipment_items"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "admin_tasks_tenant_idx" ON "tenant_admin"."admin_tasks"("tenant_id");

-- CreateIndex
CREATE INDEX "admin_tasks_status_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "admin_tasks_due_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "due_date");

-- CreateIndex
CREATE INDEX "admin_chat_thread_type_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id", "thread_type");

-- CreateIndex
CREATE INDEX "admin_chat_thread_last_message_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id", "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_chat_thread_slug_unique" ON "tenant_admin"."admin_chat_threads"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "admin_chat_thread_direct_key_unique" ON "tenant_admin"."admin_chat_threads"("tenant_id", "direct_key");

-- CreateIndex
CREATE INDEX "admin_chat_participant_user_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "admin_chat_participant_thread_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "thread_id");

-- CreateIndex
CREATE INDEX "admin_chat_participant_archived_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_chat_participant_unique" ON "tenant_admin"."admin_chat_participants"("tenant_id", "thread_id", "user_id");

-- CreateIndex
CREATE INDEX "admin_chat_message_thread_created_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id", "thread_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_chat_message_author_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id", "author_id");

-- CreateIndex
CREATE INDEX "admin_chat_message_active_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id", "thread_id", "deleted_at");

-- CreateIndex
CREATE INDEX "workflows_tenant_idx" ON "tenant_admin"."workflows"("tenant_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "tenant_admin"."notifications"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_read_idx" ON "tenant_admin"."notifications"("tenant_id", "recipient_employee_id", "is_read");

-- CreateIndex
CREATE INDEX "schedule_shifts_employee_idx" ON "tenant_staff"."schedule_shifts"("employee_id");

-- CreateIndex
CREATE INDEX "schedule_shifts_location_idx" ON "tenant_staff"."schedule_shifts"("location_id");

-- CreateIndex
CREATE INDEX "time_entries_employee_idx" ON "tenant_staff"."time_entries"("employee_id");

-- CreateIndex
CREATE INDEX "timecard_edit_requests_employee_idx" ON "tenant_staff"."timecard_edit_requests"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "timecard_edit_requests_unique_entry" ON "tenant_staff"."timecard_edit_requests"("tenant_id", "time_entry_id");

-- CreateIndex
CREATE INDEX "employee_locations_employee_idx" ON "tenant_staff"."employee_locations"("employee_id");

-- CreateIndex
CREATE INDEX "employee_locations_location_idx" ON "tenant_staff"."employee_locations"("location_id");

-- CreateIndex
CREATE INDEX "labor_budgets_location_idx" ON "tenant_staff"."labor_budgets"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "labor_budgets_event_idx" ON "tenant_staff"."labor_budgets"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "labor_budgets_period_idx" ON "tenant_staff"."labor_budgets"("tenant_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "budget_alerts_budget_idx" ON "tenant_staff"."budget_alerts"("tenant_id", "budget_id");

-- CreateIndex
CREATE INDEX "budget_alerts_type_idx" ON "tenant_staff"."budget_alerts"("tenant_id", "alert_type");

-- CreateIndex
CREATE INDEX "budget_alerts_acknowledged_idx" ON "tenant_staff"."budget_alerts"("is_acknowledged");

-- CreateIndex
CREATE UNIQUE INDEX "status_transitions_category_from_status_code_to_status_code_key" ON "core"."status_transitions"("category", "from_status_code", "to_status_code");

-- CreateIndex
CREATE UNIQUE INDEX "status_types_category_code_key" ON "core"."status_types"("category", "code");

-- CreateIndex
CREATE INDEX "allergen_warnings_event_id_idx" ON "tenant_kitchen"."allergen_warnings"("event_id");

-- CreateIndex
CREATE INDEX "allergen_warnings_dish_id_idx" ON "tenant_kitchen"."allergen_warnings"("dish_id");

-- CreateIndex
CREATE INDEX "allergen_warnings_warning_type_idx" ON "tenant_kitchen"."allergen_warnings"("warning_type");

-- CreateIndex
CREATE INDEX "allergen_warnings_is_acknowledged_idx" ON "tenant_kitchen"."allergen_warnings"("is_acknowledged");

-- CreateIndex
CREATE INDEX "allergen_warnings_allergens_idx" ON "tenant_kitchen"."allergen_warnings" USING GIN ("allergens");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "core"."units"("code");

-- CreateIndex
CREATE INDEX "audit_archive_tenant_idx" ON "platform"."audit_archive"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_log_table_record_idx" ON "platform"."audit_log"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant_created_idx" ON "platform"."audit_log"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "sent_emails_tenant_idx" ON "platform"."sent_emails"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "platform"."Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "documents_tenant_id_id_key" ON "tenant"."documents"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "settings_tenant_key_idx" ON "tenant"."settings"("tenant_id", "setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_setting_key_key" ON "tenant"."settings"("tenant_id", "setting_key");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_created_at_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_activity_type_created_at_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "activity_type", "created_at");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_entity_type_entity_id_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_performed_by_created_at_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "performed_by", "created_at");

-- CreateIndex
CREATE INDEX "ActivityFeed_tenant_id_correlation_id_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_employee_id_notification_key" ON "tenant_admin"."notification_preferences"("tenant_id", "employee_id", "notification_type", "channel");

-- CreateIndex
CREATE INDEX "sms_logs_tenant_id_status_idx" ON "tenant_admin"."sms_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "sms_logs_tenant_id_employee_id_idx" ON "tenant_admin"."sms_logs"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "sms_logs_tenant_id_created_at_idx" ON "tenant_admin"."sms_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "sms_automation_rules_tenant_id_is_active_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "sms_automation_rules_tenant_id_trigger_type_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "sms_automation_rules_tenant_id_priority_idx" ON "tenant_admin"."sms_automation_rules"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "email_templates_tenant_id_template_type_idx" ON "tenant_admin"."email_templates"("tenant_id", "template_type");

-- CreateIndex
CREATE INDEX "email_templates_tenant_id_is_active_idx" ON "tenant_admin"."email_templates"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "email_templates_tenant_id_is_default_idx" ON "tenant_admin"."email_templates"("tenant_id", "is_default");

-- CreateIndex
CREATE INDEX "report_history_generated_at_idx" ON "tenant_admin"."report_history"("tenant_id", "generated_at" DESC);

-- CreateIndex
CREATE INDEX "report_history_tenant_report_idx" ON "tenant_admin"."report_history"("tenant_id", "report_id");

-- CreateIndex
CREATE INDEX "report_schedules_tenant_report_idx" ON "tenant_admin"."report_schedules"("tenant_id", "report_id");

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "tenant_admin"."workflow_executions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_idx" ON "tenant_admin"."workflow_executions"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "workflow_steps_workflow_idx" ON "tenant_admin"."workflow_steps"("tenant_id", "workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflow_number_idx" ON "tenant_admin"."workflow_steps"("tenant_id", "workflow_id", "step_number");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_tenant_id_recipe_version_id_step_number_key" ON "tenant_kitchen"."recipe_steps"("tenant_id", "recipe_version_id", "step_number");

-- CreateIndex
CREATE INDEX "task_bundle_items_tenant_bundle_idx" ON "tenant_kitchen"."task_bundle_items"("tenant_id", "bundle_id");

-- CreateIndex
CREATE INDEX "task_bundle_items_tenant_task_idx" ON "tenant_kitchen"."task_bundle_items"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "task_bundles_event_id_idx" ON "tenant_kitchen"."task_bundles"("event_id");

-- CreateIndex
CREATE INDEX "employee_availability_employee_idx" ON "tenant_staff"."employee_availability"("employee_id");

-- CreateIndex
CREATE INDEX "employee_certifications_employee_idx" ON "tenant_staff"."employee_certifications"("employee_id");

-- CreateIndex
CREATE INDEX "employee_seniority_employee_idx" ON "tenant_staff"."employee_seniority"("employee_id");

-- CreateIndex
CREATE INDEX "employee_seniority_current_idx" ON "tenant_staff"."employee_seniority"("tenant_id", "employee_id", "effective_at" DESC);

-- CreateIndex
CREATE INDEX "payroll_line_items_employee_idx" ON "tenant_staff"."payroll_line_items"("employee_id");

-- CreateIndex
CREATE INDEX "timecard_approvals_run_idx" ON "tenant_staff"."timecard_approvals"("payroll_run_id");

-- CreateIndex
CREATE INDEX "timecard_approvals_employee_idx" ON "tenant_staff"."timecard_approvals"("employee_id");

-- CreateIndex
CREATE INDEX "timecard_approvals_status_idx" ON "tenant_staff"."timecard_approvals"("status");

-- CreateIndex
CREATE INDEX "approval_history_entity_idx" ON "tenant_staff"."approval_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "approval_history_performer_idx" ON "tenant_staff"."approval_history"("performed_by");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_unique" ON "tenant_staff"."skills"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_unique" ON "tenant_staff"."roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "employee_deductions_employee_idx" ON "tenant_staff"."EmployeeDeduction"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_tax_info_employee_unique" ON "tenant_staff"."employee_tax_info"("tenant_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_payroll_prefs_employee_unique" ON "tenant_staff"."employee_payroll_prefs"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "tip_pools_period_idx" ON "tenant_staff"."tip_pools"("tenant_id", "period_id");

-- CreateIndex
CREATE INDEX "departments_active_idx" ON "tenant_staff"."departments"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_unique" ON "tenant_staff"."departments"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "training_modules_category_idx" ON "tenant_staff"."training_modules"("category");

-- CreateIndex
CREATE INDEX "training_modules_required_idx" ON "tenant_staff"."training_modules"("is_required");

-- CreateIndex
CREATE INDEX "training_assignments_module_idx" ON "tenant_staff"."training_assignments"("module_id");

-- CreateIndex
CREATE INDEX "training_assignments_employee_idx" ON "tenant_staff"."training_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "training_assignments_status_idx" ON "tenant_staff"."training_assignments"("status");

-- CreateIndex
CREATE INDEX "training_completions_employee_idx" ON "tenant_staff"."training_completions"("employee_id");

-- CreateIndex
CREATE INDEX "training_completions_module_idx" ON "tenant_staff"."training_completions"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "training_completions_unique" ON "tenant_staff"."training_completions"("tenant_id", "employee_id", "module_id");

-- CreateIndex
CREATE INDEX "employee_time_off_requests_employee_idx" ON "tenant_staff"."employee_time_off_requests"("employee_id");

-- CreateIndex
CREATE INDEX "employee_time_off_requests_status_idx" ON "tenant_staff"."employee_time_off_requests"("status");

-- CreateIndex
CREATE INDEX "employee_time_off_requests_start_date_idx" ON "tenant_staff"."employee_time_off_requests"("start_date");

-- CreateIndex
CREATE INDEX "performance_reviews_employee_idx" ON "tenant_staff"."performance_reviews"("employee_id");

-- CreateIndex
CREATE INDEX "performance_reviews_reviewer_idx" ON "tenant_staff"."performance_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "performance_reviews_scheduled_idx" ON "tenant_staff"."performance_reviews"("scheduled_date");

-- CreateIndex
CREATE INDEX "disciplinary_actions_employee_idx" ON "tenant_staff"."disciplinary_actions"("employee_id");

-- CreateIndex
CREATE INDEX "disciplinary_actions_status_idx" ON "tenant_staff"."disciplinary_actions"("status");

-- CreateIndex
CREATE INDEX "action_milestones_action_idx" ON "tenant_staff"."action_milestones"("disciplinary_action_id");

-- CreateIndex
CREATE INDEX "onboarding_tasks_type_idx" ON "tenant_staff"."onboarding_tasks"("task_type");

-- CreateIndex
CREATE INDEX "onboarding_completions_employee_idx" ON "tenant_staff"."onboarding_completions"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_completions_unique" ON "tenant_staff"."onboarding_completions"("tenant_id", "employee_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_pins_employee_id_key" ON "tenant_staff"."employee_pins"("employee_id");

-- CreateIndex
CREATE INDEX "employee_pin_access_logs_employee_idx" ON "tenant_staff"."employee_pin_access_logs"("employee_id");

-- CreateIndex
CREATE INDEX "employee_pin_access_logs_accessor_idx" ON "tenant_staff"."employee_pin_access_logs"("accessed_by_id");

-- CreateIndex
CREATE INDEX "employee_pin_access_logs_created_idx" ON "tenant_staff"."employee_pin_access_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "waste_reasons_code_key" ON "core"."waste_reasons"("code");

-- CreateIndex
CREATE INDEX "waste_entries_inventory_item_id_idx" ON "tenant_kitchen"."waste_entries"("inventory_item_id");

-- CreateIndex
CREATE INDEX "waste_entries_reason_id_idx" ON "tenant_kitchen"."waste_entries"("reason_id");

-- CreateIndex
CREATE INDEX "waste_entries_location_id_idx" ON "tenant_kitchen"."waste_entries"("location_id");

-- CreateIndex
CREATE INDEX "waste_entries_event_id_idx" ON "tenant_kitchen"."waste_entries"("event_id");

-- CreateIndex
CREATE INDEX "waste_entries_logged_by_idx" ON "tenant_kitchen"."waste_entries"("logged_by");

-- CreateIndex
CREATE INDEX "waste_entries_tenant_id_logged_at_idx" ON "tenant_kitchen"."waste_entries"("tenant_id", "logged_at" DESC);

-- CreateIndex
CREATE INDEX "override_audit_tenant_id_entity_type_entity_id_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "override_audit_tenant_id_overridden_by_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "overridden_by");

-- CreateIndex
CREATE INDEX "override_audit_tenant_id_created_at_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "override_audit_tenant_id_id_key" ON "tenant_kitchen"."override_audit"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_created_at_idx" ON "tenant"."OutboxEvent"("status", "created_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenant_id_idx" ON "tenant"."OutboxEvent"("tenant_id");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregate_type_aggregate_id_idx" ON "tenant"."OutboxEvent"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "event_guests_event_id_idx" ON "tenant_events"."event_guests"("event_id");

-- CreateIndex
CREATE INDEX "event_guests_event_id_waitlist_position_idx" ON "tenant_events"."event_guests"("event_id", "waitlist_position");

-- CreateIndex
CREATE INDEX "event_guests_event_id_rsvp_status_idx" ON "tenant_events"."event_guests"("event_id", "rsvp_status");

-- CreateIndex
CREATE INDEX "event_guests_dietary_restrictions_idx" ON "tenant_events"."event_guests" USING GIN ("dietary_restrictions");

-- CreateIndex
CREATE INDEX "event_guests_allergen_restrictions_idx" ON "tenant_events"."event_guests" USING GIN ("allergen_restrictions");

-- CreateIndex
CREATE UNIQUE INDEX "event_contracts_signing_token_key" ON "tenant_events"."event_contracts"("signing_token");

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_status_idx" ON "tenant_events"."event_contracts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_event_id_idx" ON "tenant_events"."event_contracts"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_client_id_idx" ON "tenant_events"."event_contracts"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_expires_at_idx" ON "tenant_events"."event_contracts"("tenant_id", "expires_at");

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_contract_number_idx" ON "tenant_events"."event_contracts"("tenant_id", "contract_number");

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_document_type_idx" ON "tenant_events"."event_contracts"("tenant_id", "document_type");

-- CreateIndex
CREATE INDEX "event_contracts_signing_token_idx" ON "tenant_events"."event_contracts"("signing_token");

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_contract_id_idx" ON "tenant_events"."contract_signatures"("tenant_id", "contract_id");

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_signed_at_idx" ON "tenant_events"."contract_signatures"("tenant_id", "signed_at");

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_signer_email_idx" ON "tenant_events"."contract_signatures"("tenant_id", "signer_email");

-- CreateIndex
CREATE INDEX "document_versions_tenant_id_document_type_document_id_idx" ON "tenant_events"."document_versions"("tenant_id", "document_type", "document_id");

-- CreateIndex
CREATE INDEX "document_versions_tenant_id_created_at_idx" ON "tenant_events"."document_versions"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_tenant_id_document_type_document_id_versi_key" ON "tenant_events"."document_versions"("tenant_id", "document_type", "document_id", "version_number");

-- CreateIndex
CREATE INDEX "event_followups_tenant_id_event_id_idx" ON "tenant_events"."event_followups"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "event_followups_tenant_id_status_idx" ON "tenant_events"."event_followups"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_account_number_key" ON "tenant_accounting"."chart_of_accounts"("account_number");

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_account_number_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id", "account_number");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_id_key" ON "tenant_accounting"."chart_of_accounts"("id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "tenant_accounting"."invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "tenant_accounting"."invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "tenant_accounting"."invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_client_id_idx" ON "tenant_accounting"."invoices"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_event_id_idx" ON "tenant_accounting"."invoices"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_due_date_idx" ON "tenant_accounting"."invoices"("tenant_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_id_key" ON "tenant_accounting"."invoices"("id");

-- CreateIndex
CREATE INDEX "payment_methods_tenant_id_idx" ON "tenant_accounting"."payment_methods"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_methods_tenant_id_client_id_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "payment_methods_tenant_id_is_default_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_id_key" ON "tenant_accounting"."payment_methods"("id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "tenant_accounting"."payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_status_idx" ON "tenant_accounting"."payments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payments_tenant_id_invoice_id_idx" ON "tenant_accounting"."payments"("tenant_id", "invoice_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_event_id_idx" ON "tenant_accounting"."payments"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_client_id_idx" ON "tenant_accounting"."payments"("tenant_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_id_key" ON "tenant_accounting"."payments"("id");

-- CreateIndex
CREATE INDEX "payment_refund_attempts_tenant_id_payment_id_idx" ON "tenant_accounting"."payment_refund_attempts"("tenant_id", "payment_id");

-- CreateIndex
CREATE INDEX "payment_refund_attempts_tenant_id_created_at_idx" ON "tenant_accounting"."payment_refund_attempts"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_refund_attempts_id_key" ON "tenant_accounting"."payment_refund_attempts"("id");

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_idx" ON "tenant_accounting"."collection_cases"("tenant_id");

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_invoice_id_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "invoice_id");

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_client_id_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_status_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "collection_cases_tenant_id_days_overdue_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "days_overdue");

-- CreateIndex
CREATE UNIQUE INDEX "collection_cases_id_key" ON "tenant_accounting"."collection_cases"("id");

-- CreateIndex
CREATE INDEX "collection_actions_tenant_id_idx" ON "tenant_accounting"."collection_actions"("tenant_id");

-- CreateIndex
CREATE INDEX "collection_actions_tenant_id_collection_case_id_idx" ON "tenant_accounting"."collection_actions"("tenant_id", "collection_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_actions_id_key" ON "tenant_accounting"."collection_actions"("id");

-- CreateIndex
CREATE INDEX "collection_payment_plans_tenant_id_idx" ON "tenant_accounting"."collection_payment_plans"("tenant_id");

-- CreateIndex
CREATE INDEX "collection_payment_plans_tenant_id_collection_case_id_idx" ON "tenant_accounting"."collection_payment_plans"("tenant_id", "collection_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_payment_plans_id_key" ON "tenant_accounting"."collection_payment_plans"("id");

-- CreateIndex
CREATE INDEX "revenue_recognition_schedules_tenant_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "revenue_recognition_schedules_tenant_id_invoice_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "invoice_id");

-- CreateIndex
CREATE INDEX "revenue_recognition_schedules_tenant_id_event_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "revenue_recognition_schedules_tenant_id_client_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "revenue_recognition_schedules_tenant_id_status_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_recognition_schedules_id_key" ON "tenant_accounting"."revenue_recognition_schedules"("id");

-- CreateIndex
CREATE INDEX "revenue_recognition_lines_tenant_id_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "revenue_recognition_lines_tenant_id_schedule_id_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "schedule_id");

-- CreateIndex
CREATE INDEX "revenue_recognition_lines_tenant_id_schedule_id_sequence_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "schedule_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_recognition_lines_id_key" ON "tenant_accounting"."revenue_recognition_lines"("id");

-- CreateIndex
CREATE INDEX "manifest_entity_tenant_id_entity_type_idx" ON "tenant"."manifest_entity"("tenant_id", "entity_type");

-- CreateIndex
CREATE INDEX "manifest_idempotency_expires_at_idx" ON "tenant"."manifest_idempotency"("expires_at");

-- CreateIndex
CREATE INDEX "sentry_fix_jobs_status_created_at_idx" ON "platform"."sentry_fix_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "sentry_fix_jobs_sentry_issue_id_created_at_idx" ON "platform"."sentry_fix_jobs"("sentry_issue_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sentry_fix_jobs_sentry_issue_id_key" ON "platform"."sentry_fix_jobs"("sentry_issue_id");

-- CreateIndex
CREATE INDEX "nowsta_employee_mappings_tenant_id_convoy_employee_id_idx" ON "tenant_admin"."nowsta_employee_mappings"("tenant_id", "convoy_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "nowsta_employee_mappings_tenant_id_nowsta_employee_id_key" ON "tenant_admin"."nowsta_employee_mappings"("tenant_id", "nowsta_employee_id");

-- CreateIndex
CREATE INDEX "nowsta_shift_syncs_tenant_id_status_idx" ON "tenant_admin"."nowsta_shift_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "nowsta_shift_syncs_tenant_id_shift_start_idx" ON "tenant_admin"."nowsta_shift_syncs"("tenant_id", "shift_start");

-- CreateIndex
CREATE INDEX "nowsta_shift_syncs_tenant_id_nowsta_employee_id_idx" ON "tenant_admin"."nowsta_shift_syncs"("tenant_id", "nowsta_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "nowsta_shift_syncs_tenant_id_nowsta_shift_id_key" ON "tenant_admin"."nowsta_shift_syncs"("tenant_id", "nowsta_shift_id");

-- CreateIndex
CREATE INDEX "goodshuffle_event_syncs_tenant_id_status_idx" ON "tenant_admin"."goodshuffle_event_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goodshuffle_event_syncs_tenant_id_event_date_idx" ON "tenant_admin"."goodshuffle_event_syncs"("tenant_id", "event_date");

-- CreateIndex
CREATE INDEX "goodshuffle_event_syncs_tenant_id_convoy_event_id_idx" ON "tenant_admin"."goodshuffle_event_syncs"("tenant_id", "convoy_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "goodshuffle_event_syncs_tenant_id_goodshuffle_event_id_key" ON "tenant_admin"."goodshuffle_event_syncs"("tenant_id", "goodshuffle_event_id");

-- CreateIndex
CREATE INDEX "goodshuffle_inventory_syncs_tenant_id_status_idx" ON "tenant_admin"."goodshuffle_inventory_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goodshuffle_inventory_syncs_tenant_id_convoy_inventory_item_idx" ON "tenant_admin"."goodshuffle_inventory_syncs"("tenant_id", "convoy_inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "goodshuffle_inventory_syncs_tenant_id_goodshuffle_item_id_key" ON "tenant_admin"."goodshuffle_inventory_syncs"("tenant_id", "goodshuffle_item_id");

-- CreateIndex
CREATE INDEX "goodshuffle_invoice_syncs_tenant_id_status_idx" ON "tenant_admin"."goodshuffle_invoice_syncs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "goodshuffle_invoice_syncs_tenant_id_convoy_invoice_id_idx" ON "tenant_admin"."goodshuffle_invoice_syncs"("tenant_id", "convoy_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "goodshuffle_invoice_syncs_tenant_id_goodshuffle_invoice_id_key" ON "tenant_admin"."goodshuffle_invoice_syncs"("tenant_id", "goodshuffle_invoice_id");

-- CreateIndex
CREATE INDEX "email_workflows_tenant_id_trigger_type_idx" ON "tenant_admin"."email_workflows"("tenant_id", "trigger_type");

-- CreateIndex
CREATE INDEX "email_workflows_tenant_id_is_active_idx" ON "tenant_admin"."email_workflows"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_workflow_id_idx" ON "tenant_admin"."email_logs"("tenant_id", "workflow_id");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_recipient_email_idx" ON "tenant_admin"."email_logs"("tenant_id", "recipient_email");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_status_idx" ON "tenant_admin"."email_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "email_logs_tenant_id_created_at_idx" ON "tenant_admin"."email_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "outbound_webhooks_tenant_id_status_idx" ON "tenant_admin"."outbound_webhooks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "outbound_webhooks_tenant_id_created_at_idx" ON "tenant_admin"."outbound_webhooks"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_webhook_id_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "webhook_id");

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_status_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_entity_type_entity_id_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_created_at_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_delivery_logs_tenant_id_next_retry_at_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "next_retry_at");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_webhook_id_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "webhook_id");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_entity_type_entity_id_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_moved_to_dlq_at_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "moved_to_dlq_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_dead_letter_queue_tenant_id_reviewed_at_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_key_prefix_idx" ON "platform"."api_keys"("tenant_id", "key_prefix");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_created_by_user_id_idx" ON "platform"."api_keys"("tenant_id", "created_by_user_id");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_expires_at_idx" ON "platform"."api_keys"("tenant_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_tenant_id_name_key" ON "platform"."api_keys"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_command_name_executed__idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "command_name", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_entity_name_executed_a_idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "entity_name", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_status_executed_at_idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "status", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_performed_by_executed__idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "performed_by", "executed_at");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_tenant_id_correlation_id_idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "manifest_command_telemetry_executed_at_idx" ON "tenant_admin"."manifest_command_telemetry"("executed_at");

-- CreateIndex
CREATE INDEX "rate_limit_configs_tenant_id_is_active_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "rate_limit_configs_tenant_id_priority_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_configs_tenant_id_name_key" ON "tenant_admin"."rate_limit_configs"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "rate_limit_usage_tenant_id_bucket_start_idx" ON "tenant_admin"."rate_limit_usage"("tenant_id", "bucket_start");

-- CreateIndex
CREATE INDEX "rate_limit_usage_tenant_id_endpoint_idx" ON "tenant_admin"."rate_limit_usage"("tenant_id", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_usage_tenant_id_endpoint_method_bucket_start_key" ON "tenant_admin"."rate_limit_usage"("tenant_id", "endpoint", "method", "bucket_start");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_timestamp_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_endpoint_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "endpoint");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_allowed_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "allowed");

-- CreateIndex
CREATE INDEX "rate_limit_events_tenant_id_user_id_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "role_policies_tenant_id_is_active_idx" ON "tenant_staff"."role_policies"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "role_policies_tenant_id_role_id_key" ON "tenant_staff"."role_policies"("tenant_id", "role_id");

-- CreateIndex
CREATE INDEX "payroll_approval_history_tenant_id_payroll_run_id_idx" ON "tenant_staff"."payroll_approval_history"("tenant_id", "payroll_run_id");

-- CreateIndex
CREATE INDEX "payroll_approval_history_tenant_id_performed_by_idx" ON "tenant_staff"."payroll_approval_history"("tenant_id", "performed_by");

-- CreateIndex
CREATE INDEX "tax_configurations_tenant_id_is_active_idx" ON "tenant_staff"."tax_configurations"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "tax_configurations_tenant_id_tax_type_idx" ON "tenant_staff"."tax_configurations"("tenant_id", "tax_type");

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_period_id_idx" ON "tenant_staff"."payroll_audit_log"("tenant_id", "period_id");

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_action_idx" ON "tenant_staff"."payroll_audit_log"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "payroll_audit_log_tenant_id_created_at_idx" ON "tenant_staff"."payroll_audit_log"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_audit_log_tenant_id_id_key" ON "tenant_staff"."payroll_audit_log"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "vendor_catalogs_tenant_id_supplier_id_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "vendor_catalogs_tenant_id_item_number_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "item_number");

-- CreateIndex
CREATE INDEX "vendor_catalogs_tenant_id_category_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_catalogs_tenant_id_supplier_id_item_number_key" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id", "item_number");

-- CreateIndex
CREATE INDEX "pricing_tiers_tenant_id_catalog_entry_id_idx" ON "tenant_inventory"."pricing_tiers"("tenant_id", "catalog_entry_id");

-- CreateIndex
CREATE INDEX "pricing_tiers_tenant_id_catalog_entry_id_min_quantity_idx" ON "tenant_inventory"."pricing_tiers"("tenant_id", "catalog_entry_id", "min_quantity");

-- CreateIndex
CREATE INDEX "bulk_order_rules_tenant_id_catalog_entry_id_idx" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "catalog_entry_id");

-- CreateIndex
CREATE INDEX "bulk_order_rules_tenant_id_rule_type_idx" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "rule_type");

-- CreateIndex
CREATE INDEX "audit_schedules_tenant_id_is_active_idx" ON "tenant_inventory"."audit_schedules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "audit_schedules_tenant_id_frequency_idx" ON "tenant_inventory"."audit_schedules"("tenant_id", "frequency");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_entries_slug_key" ON "tenant"."knowledge_base_entries"("slug");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_tenant_id_status_idx" ON "tenant"."knowledge_base_entries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_tenant_id_category_idx" ON "tenant"."knowledge_base_entries"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_entries_tenant_id_slug_key" ON "tenant"."knowledge_base_entries"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "inventory_transfers_tenant_id_status_idx" ON "tenant_inventory"."inventory_transfers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "inventory_transfers_tenant_id_from_location_id_idx" ON "tenant_inventory"."inventory_transfers"("tenant_id", "from_location_id");

-- CreateIndex
CREATE INDEX "inventory_transfers_tenant_id_to_location_id_idx" ON "tenant_inventory"."inventory_transfers"("tenant_id", "to_location_id");

-- CreateIndex
CREATE INDEX "inventory_transfers_tenant_id_requested_at_idx" ON "tenant_inventory"."inventory_transfers"("tenant_id", "requested_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transfers_tenant_id_transfer_number_key" ON "tenant_inventory"."inventory_transfers"("tenant_id", "transfer_number");

-- CreateIndex
CREATE INDEX "inventory_transfer_items_tenant_id_transfer_id_idx" ON "tenant_inventory"."inventory_transfer_items"("tenant_id", "transfer_id");

-- CreateIndex
CREATE INDEX "inventory_transfer_items_tenant_id_item_id_idx" ON "tenant_inventory"."inventory_transfer_items"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "quality_checks_tenant_id_status_idx" ON "tenant_kitchen"."quality_checks"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "quality_checks_tenant_id_check_type_idx" ON "tenant_kitchen"."quality_checks"("tenant_id", "check_type");

-- CreateIndex
CREATE INDEX "quality_checks_tenant_id_event_id_idx" ON "tenant_kitchen"."quality_checks"("tenant_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_tenant_id_check_number_key" ON "tenant_kitchen"."quality_checks"("tenant_id", "check_number");

-- CreateIndex
CREATE INDEX "quality_check_items_tenant_id_check_id_idx" ON "tenant_kitchen"."quality_check_items"("tenant_id", "check_id");

-- CreateIndex
CREATE INDEX "temperature_logs_tenant_id_log_type_idx" ON "tenant_kitchen"."temperature_logs"("tenant_id", "log_type");

-- CreateIndex
CREATE INDEX "temperature_logs_tenant_id_event_id_idx" ON "tenant_kitchen"."temperature_logs"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "temperature_logs_tenant_id_logged_at_idx" ON "tenant_kitchen"."temperature_logs"("tenant_id", "logged_at");

-- CreateIndex
CREATE UNIQUE INDEX "temperature_logs_tenant_id_log_number_key" ON "tenant_kitchen"."temperature_logs"("tenant_id", "log_number");

-- CreateIndex
CREATE INDEX "corrective_actions_tenant_id_status_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "corrective_actions_tenant_id_severity_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "severity");

-- CreateIndex
CREATE INDEX "corrective_actions_tenant_id_event_id_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "corrective_actions_tenant_id_action_number_key" ON "tenant_kitchen"."corrective_actions"("tenant_id", "action_number");

-- CreateIndex
CREATE UNIQUE INDEX "temperature_probes_probe_id_key" ON "tenant_kitchen"."temperature_probes"("probe_id");

-- CreateIndex
CREATE INDEX "temperature_probes_tenant_id_status_idx" ON "tenant_kitchen"."temperature_probes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "temperature_probes_tenant_id_location_id_idx" ON "tenant_kitchen"."temperature_probes"("tenant_id", "location_id");

-- CreateIndex
CREATE INDEX "temperature_probes_tenant_id_next_calibration_idx" ON "tenant_kitchen"."temperature_probes"("tenant_id", "next_calibration");

-- CreateIndex
CREATE UNIQUE INDEX "temperature_probes_tenant_id_probe_id_key" ON "tenant_kitchen"."temperature_probes"("tenant_id", "probe_id");

-- CreateIndex
CREATE INDEX "temperature_readings_tenant_id_probe_id_idx" ON "tenant_kitchen"."temperature_readings"("tenant_id", "probe_id");

-- CreateIndex
CREATE INDEX "temperature_readings_tenant_id_event_id_idx" ON "tenant_kitchen"."temperature_readings"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "temperature_readings_tenant_id_logged_at_idx" ON "tenant_kitchen"."temperature_readings"("tenant_id", "logged_at");

-- CreateIndex
CREATE INDEX "iot_alerts_tenant_id_status_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "iot_alerts_tenant_id_alert_type_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "alert_type");

-- CreateIndex
CREATE INDEX "iot_alerts_tenant_id_probe_id_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "probe_id");

-- CreateIndex
CREATE INDEX "iot_alerts_tenant_id_triggered_at_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "triggered_at");

-- CreateIndex
CREATE UNIQUE INDEX "iot_alerts_tenant_id_alert_number_key" ON "tenant_kitchen"."iot_alerts"("tenant_id", "alert_number");

-- CreateIndex
CREATE INDEX "iot_alert_rules_tenant_id_equipment_id_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "equipment_id");

-- CreateIndex
CREATE INDEX "iot_alert_rules_tenant_id_is_active_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "iot_alert_rules_tenant_id_id_key" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "facilities_tenant_id_status_idx" ON "tenant_facilities"."facilities"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "facilities_tenant_id_facility_type_idx" ON "tenant_facilities"."facilities"("tenant_id", "facility_type");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_tenant_id_code_key" ON "tenant_facilities"."facilities"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "facility_areas_tenant_id_venue_id_idx" ON "tenant_facilities"."facility_areas"("tenant_id", "venue_id");

-- CreateIndex
CREATE INDEX "facility_areas_tenant_id_areaType_idx" ON "tenant_facilities"."facility_areas"("tenant_id", "areaType");

-- CreateIndex
CREATE UNIQUE INDEX "facility_areas_tenant_id_code_key" ON "tenant_facilities"."facility_areas"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "facility_assets_tenant_id_status_idx" ON "tenant_facilities"."facility_assets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "facility_assets_tenant_id_area_id_idx" ON "tenant_facilities"."facility_assets"("tenant_id", "area_id");

-- CreateIndex
CREATE INDEX "facility_assets_tenant_id_asset_type_idx" ON "tenant_facilities"."facility_assets"("tenant_id", "asset_type");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_tenant_id_status_idx" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_tenant_id_priority_idx" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "priority");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_tenant_id_area_id_idx" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "area_id");

-- CreateIndex
CREATE INDEX "maintenance_work_orders_tenant_id_scheduled_date_idx" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_work_orders_tenant_id_work_order_number_key" ON "tenant_facilities"."maintenance_work_orders"("tenant_id", "work_order_number");

-- CreateIndex
CREATE INDEX "preventive_maintenance_schedules_tenant_id_next_due_at_idx" ON "tenant_facilities"."preventive_maintenance_schedules"("tenant_id", "next_due_at");

-- CreateIndex
CREATE INDEX "preventive_maintenance_schedules_tenant_id_status_idx" ON "tenant_facilities"."preventive_maintenance_schedules"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "preventive_maintenance_schedules_tenant_id_schedule_number_key" ON "tenant_facilities"."preventive_maintenance_schedules"("tenant_id", "schedule_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_routes_id_key" ON "tenant_logistics"."delivery_routes"("id");

-- CreateIndex
CREATE INDEX "delivery_routes_tenant_id_status_idx" ON "tenant_logistics"."delivery_routes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "delivery_routes_tenant_id_scheduled_date_idx" ON "tenant_logistics"."delivery_routes"("tenant_id", "scheduled_date");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_routes_tenant_id_route_number_key" ON "tenant_logistics"."delivery_routes"("tenant_id", "route_number");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_id_key" ON "tenant_logistics"."route_stops"("id");

-- CreateIndex
CREATE INDEX "route_stops_route_id_status_idx" ON "tenant_logistics"."route_stops"("route_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_route_id_stop_number_key" ON "tenant_logistics"."route_stops"("route_id", "stop_number");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_id_key" ON "tenant_logistics"."vehicles"("id");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_status_idx" ON "tenant_logistics"."vehicles"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "drivers_tenant_id_status_idx" ON "tenant_logistics"."drivers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "drivers_tenant_id_vehicle_id_idx" ON "tenant_logistics"."drivers"("tenant_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "provider_syncs_tenant_id_status_idx" ON "tenant_admin"."provider_syncs"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_syncs_tenant_id_provider_key" ON "tenant_admin"."provider_syncs"("tenant_id", "provider");

