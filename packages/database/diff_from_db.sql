-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

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
CREATE SCHEMA IF NOT EXISTS "tenant_inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_kitchen";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_staff";

-- CreateEnum
CREATE TYPE "core"."KitchenTaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "core"."KitchenTaskStatus" AS ENUM ('open', 'in_progress', 'done', 'canceled');

-- CreateEnum
CREATE TYPE "core"."OutboxStatus" AS ENUM ('pending', 'published', 'failed');

-- CreateEnum
CREATE TYPE "core"."ShipmentStatus" AS ENUM ('draft', 'scheduled', 'preparing', 'in_transit', 'delivered', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "core"."UserRole" AS ENUM ('owner', 'admin', 'manager', 'staff');

-- CreateEnum
CREATE TYPE "core"."action_type" AS ENUM ('insert', 'update', 'delete');

-- CreateEnum
CREATE TYPE "core"."employment_type" AS ENUM ('full_time', 'part_time', 'contractor', 'temp');

-- CreateEnum
CREATE TYPE "core"."unit_system" AS ENUM ('metric', 'imperial', 'custom');

-- CreateEnum
CREATE TYPE "core"."unit_type" AS ENUM ('volume', 'weight', 'count', 'length', 'temperature', 'time');

-- CreateEnum
CREATE TYPE "tenant_accounting"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "tenant_admin"."admin_action" AS ENUM ('login', 'logout', 'create', 'update', 'delete', 'view', 'permission_change', 'role_change', 'account_change', 'security_change');

-- CreateEnum
CREATE TYPE "tenant_admin"."admin_entity_type" AS ENUM ('admin_users', 'admin_roles', 'admin_permissions', 'admin_audit_trail', 'users', 'roles', 'permissions', 'tenants', 'reports', 'settings');

-- CreateEnum
CREATE TYPE "tenant_admin"."admin_role" AS ENUM ('super_admin', 'tenant_admin', 'finance_manager', 'operations_manager', 'staff_manager', 'read_only');

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
CREATE TABLE "platform"."Tenant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "tenant"."OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "core"."OutboxStatus" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("tenant_id","id")
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
CREATE TABLE "tenant_crm"."proposal_line_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_id" UUID NOT NULL,
    "sort_order" INTEGER DEFAULT 0,
    "item_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "category" TEXT NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "unit_of_measure" TEXT,

    CONSTRAINT "proposal_line_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."proposals" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_number" TEXT NOT NULL,
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

    CONSTRAINT "battle_boards_pkey" PRIMARY KEY ("tenant_id","id")
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "group_id" UUID,
    "entity_id" UUID,
    "entity_type" TEXT,
    "vector_clock" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "command_board_cards_pkey" PRIMARY KEY ("tenant_id","id")
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

    CONSTRAINT "command_boards_pkey" PRIMARY KEY ("tenant_id","id")
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
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_contracts_pkey" PRIMARY KEY ("tenant_id","id")
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_guests_pkey" PRIMARY KEY ("tenant_id","id")
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "battle_board_id" UUID,
    "blob_url" TEXT,
    "confidence" INTEGER DEFAULT 0,
    "detected_format" TEXT,
    "extracted_data" JSONB,
    "file_type" TEXT NOT NULL DEFAULT 'pdf',
    "parse_errors" TEXT[],
    "parse_status" TEXT NOT NULL DEFAULT 'pending',
    "parsed_at" TIMESTAMPTZ(6),
    "report_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_imports_pkey" PRIMARY KEY ("tenant_id","id")
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
CREATE TABLE "tenant_events"."event_reports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "completion" INTEGER NOT NULL DEFAULT 0,
    "auto_fill_score" INTEGER,
    "report_config" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "checklist_data" JSONB NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMPTZ(6),
    "parsed_event_data" JSONB,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "version" TEXT NOT NULL DEFAULT '2025-01-01',

    CONSTRAINT "event_reports_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_events"."event_staff_assignments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ(6),
    "end_time" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_staff_assignments_pkey" PRIMARY KEY ("tenant_id","id")
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
CREATE TABLE "tenant_events"."events" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_number" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled Event',
    "client_id" UUID,
    "location_id" UUID,
    "event_type" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "guest_count" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "budget" DECIMAL(12,2),
    "assigned_to" UUID,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "venue_id" UUID,
    "ticket_price" DECIMAL(10,2),
    "ticket_tier" TEXT,
    "event_format" TEXT,
    "accessibility_options" TEXT[],
    "featured_media_url" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("tenant_id","id")
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
CREATE TABLE "tenant_inventory"."alerts_config" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel" TEXT NOT NULL,
    "destination" TEXT NOT NULL,

    CONSTRAINT "alerts_config_pkey" PRIMARY KEY ("tenant_id","id")
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
    "accuracy_tracked" BOOLEAN NOT NULL DEFAULT false,
    "actual_depletion_date" TIMESTAMPTZ(6),
    "error_days" INTEGER,

    CONSTRAINT "inventory_forecasts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_inventory"."inventory_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "quantity_on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "reorder_level" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "fsa_status" TEXT DEFAULT 'unknown',
    "fsa_temp_logged" BOOLEAN DEFAULT false,
    "fsa_allergen_info" BOOLEAN DEFAULT false,
    "fsa_traceable" BOOLEAN DEFAULT false,
    "description" TEXT,
    "par_level" DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    "supplier_id" UUID,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'each',

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("tenant_id","id")
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
CREATE TABLE "tenant_inventory"."inventory_suppliers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "payment_terms" TEXT NOT NULL DEFAULT 'NET_30',
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_suppliers_pkey" PRIMARY KEY ("tenant_id","id")
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
    "storage_location_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    "reason" TEXT NOT NULL DEFAULT '',
    "reference_type" TEXT,
    "reference_id" UUID,
    "employee_id" UUID,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("tenant_id","id")
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
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "internal_notes" TEXT,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("tenant_id","id")
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
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "variance_reports_pkey" PRIMARY KEY ("tenant_id","id")
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
CREATE TABLE "tenant_kitchen"."menu_dishes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL,
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
CREATE TABLE "tenant_kitchen"."menus" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE TABLE "tenant_kitchen"."recipe_versions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "yield_quantity" DECIMAL(10,2) NOT NULL,
    "yield_unit_id" SMALLINT NOT NULL,
    "yield_description" TEXT,
    "prep_time_minutes" INTEGER,
    "cook_time_minutes" INTEGER,
    "rest_time_minutes" INTEGER,
    "difficulty_level" SMALLINT,
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
    "instructions" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "cuisine_type" TEXT,
    "description" TEXT,
    "tags" TEXT[],

    CONSTRAINT "recipe_versions_pkey" PRIMARY KEY ("tenant_id","id")
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

    CONSTRAINT "employees_pkey" PRIMARY KEY ("tenant_id","id")
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("tenant_id","id")
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

    CONSTRAINT "timecard_edit_requests_pkey" PRIMARY KEY ("tenant_id","id")
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

-- CreateIndex
CREATE UNIQUE INDEX "status_transitions_category_from_status_code_to_status_code_key" ON "core"."status_transitions"("category" ASC, "from_status_code" ASC, "to_status_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "status_types_category_code_key" ON "core"."status_types"("category" ASC, "code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "core"."units"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "waste_reasons_code_key" ON "core"."waste_reasons"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "platform"."Tenant"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_slug_key" ON "platform"."accounts"("slug" ASC);

-- CreateIndex
CREATE INDEX "audit_archive_tenant_idx" ON "platform"."audit_archive"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "audit_log_table_record_idx" ON "platform"."audit_log"("table_name" ASC, "record_id" ASC);

-- CreateIndex
CREATE INDEX "audit_log_tenant_created_idx" ON "platform"."audit_log"("tenant_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "sent_emails_tenant_idx" ON "platform"."sent_emails"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "tenant"."OutboxEvent"("aggregateType" ASC, "aggregateId" ASC);

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "tenant"."OutboxEvent"("status" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_idx" ON "tenant"."OutboxEvent"("tenantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "documents_tenant_id_id_key" ON "tenant"."documents"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "locations_id_key" ON "tenant"."locations"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_id_key" ON "tenant"."locations"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "settings_tenant_id_setting_key_key" ON "tenant"."settings"("tenant_id" ASC, "setting_key" ASC);

-- CreateIndex
CREATE INDEX "settings_tenant_key_idx" ON "tenant"."settings"("tenant_id" ASC, "setting_key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_account_number_key" ON "tenant_accounting"."chart_of_accounts"("account_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_id_key" ON "tenant_accounting"."chart_of_accounts"("id" ASC);

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_account_number_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id" ASC, "account_number" ASC);

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "admin_chat_message_active_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id" ASC, "thread_id" ASC, "deleted_at" ASC);

-- CreateIndex
CREATE INDEX "admin_chat_message_author_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id" ASC, "author_id" ASC);

-- CreateIndex
CREATE INDEX "admin_chat_message_thread_created_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id" ASC, "thread_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_chat_participant_archived_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id" ASC, "archived_at" ASC);

-- CreateIndex
CREATE INDEX "admin_chat_participant_thread_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id" ASC, "thread_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_chat_participant_unique" ON "tenant_admin"."admin_chat_participants"("tenant_id" ASC, "thread_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE INDEX "admin_chat_participant_user_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_chat_thread_direct_key_unique" ON "tenant_admin"."admin_chat_threads"("tenant_id" ASC, "direct_key" ASC);

-- CreateIndex
CREATE INDEX "admin_chat_thread_last_message_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id" ASC, "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_chat_thread_slug_unique" ON "tenant_admin"."admin_chat_threads"("tenant_id" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "admin_chat_thread_type_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id" ASC, "thread_type" ASC);

-- CreateIndex
CREATE INDEX "admin_tasks_due_idx" ON "tenant_admin"."admin_tasks"("tenant_id" ASC, "due_date" ASC);

-- CreateIndex
CREATE INDEX "admin_tasks_status_idx" ON "tenant_admin"."admin_tasks"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "admin_tasks_tenant_idx" ON "tenant_admin"."admin_tasks"("tenant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_tenant_id_employee_id_notification_key" ON "tenant_admin"."notification_preferences"("tenant_id" ASC, "employee_id" ASC, "notification_type" ASC, "channel" ASC);

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "tenant_admin"."notifications"("tenant_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_recipient_read_idx" ON "tenant_admin"."notifications"("tenant_id" ASC, "recipient_employee_id" ASC, "is_read" ASC);

-- CreateIndex
CREATE INDEX "report_history_generated_at_idx" ON "tenant_admin"."report_history"("tenant_id" ASC, "generated_at" DESC);

-- CreateIndex
CREATE INDEX "report_history_tenant_report_idx" ON "tenant_admin"."report_history"("tenant_id" ASC, "report_id" ASC);

-- CreateIndex
CREATE INDEX "report_schedules_tenant_report_idx" ON "tenant_admin"."report_schedules"("tenant_id" ASC, "report_id" ASC);

-- CreateIndex
CREATE INDEX "workflow_executions_status_idx" ON "tenant_admin"."workflow_executions"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "workflow_executions_workflow_idx" ON "tenant_admin"."workflow_executions"("tenant_id" ASC, "workflow_id" ASC);

-- CreateIndex
CREATE INDEX "workflow_steps_workflow_idx" ON "tenant_admin"."workflow_steps"("tenant_id" ASC, "workflow_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflow_number_idx" ON "tenant_admin"."workflow_steps"("tenant_id" ASC, "workflow_id" ASC, "step_number" ASC);

-- CreateIndex
CREATE INDEX "workflows_tenant_idx" ON "tenant_admin"."workflows"("tenant_id" ASC);

-- CreateIndex
CREATE INDEX "client_interactions_employee_idx" ON "tenant_crm"."client_interactions"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "clients_id_key" ON "tenant_crm"."clients"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "leads_id_key" ON "tenant_crm"."leads"("id" ASC);

-- CreateIndex
CREATE INDEX "proposal_line_items_tenant_id_proposal_id_idx" ON "tenant_crm"."proposal_line_items"("tenant_id" ASC, "proposal_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "proposals_tenant_id_id_key" ON "tenant_crm"."proposals"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "idx_battle_boards_data_gin" ON "tenant_events"."battle_boards" USING GIN ("board_data" jsonb_ops ASC);

-- CreateIndex
CREATE INDEX "idx_battle_boards_tags_gin" ON "tenant_events"."battle_boards" USING GIN ("tags" array_ops ASC);

-- CreateIndex
CREATE INDEX "budget_line_items_budget_id_idx" ON "tenant_events"."budget_line_items"("tenant_id" ASC, "budget_id" ASC);

-- CreateIndex
CREATE INDEX "budget_line_items_category_idx" ON "tenant_events"."budget_line_items"("tenant_id" ASC, "category" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "catering_orders_id_key" ON "tenant_events"."catering_orders"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "catering_orders_order_number_key" ON "tenant_events"."catering_orders"("order_number" ASC);

-- CreateIndex
CREATE INDEX "command_board_cards_board_id_idx" ON "tenant_events"."command_board_cards"("board_id" ASC);

-- CreateIndex
CREATE INDEX "command_board_cards_entity_id_entity_type_idx" ON "tenant_events"."command_board_cards"("entity_id" ASC, "entity_type" ASC);

-- CreateIndex
CREATE INDEX "command_board_cards_group_id_idx" ON "tenant_events"."command_board_cards"("group_id" ASC);

-- CreateIndex
CREATE INDEX "command_board_cards_z_index_idx" ON "tenant_events"."command_board_cards"("z_index" ASC);

-- CreateIndex
CREATE INDEX "command_board_connections_board_id_idx" ON "tenant_events"."command_board_connections"("board_id" ASC);

-- CreateIndex
CREATE INDEX "command_board_connections_from_card_id_idx" ON "tenant_events"."command_board_connections"("from_card_id" ASC);

-- CreateIndex
CREATE INDEX "command_board_connections_to_card_id_idx" ON "tenant_events"."command_board_connections"("to_card_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "unique_connection_per_board" ON "tenant_events"."command_board_connections"("board_id" ASC, "from_card_id" ASC, "to_card_id" ASC, "relationship_type" ASC);

-- CreateIndex
CREATE INDEX "command_board_groups_board_id_idx" ON "tenant_events"."command_board_groups"("board_id" ASC);

-- CreateIndex
CREATE INDEX "command_board_layouts_board_id_idx" ON "tenant_events"."command_board_layouts"("board_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "command_board_layouts_board_id_user_id_name_key" ON "tenant_events"."command_board_layouts"("board_id" ASC, "user_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "command_board_layouts_user_id_idx" ON "tenant_events"."command_board_layouts"("user_id" ASC);

-- CreateIndex
CREATE INDEX "command_boards_event_id_idx" ON "tenant_events"."command_boards"("event_id" ASC);

-- CreateIndex
CREATE INDEX "idx_command_boards_tags_gin" ON "tenant_events"."command_boards" USING GIN ("tags" array_ops ASC);

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_contract_id_idx" ON "tenant_events"."contract_signatures"("tenant_id" ASC, "contract_id" ASC);

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_signed_at_idx" ON "tenant_events"."contract_signatures"("tenant_id" ASC, "signed_at" ASC);

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_signer_email_idx" ON "tenant_events"."contract_signatures"("tenant_id" ASC, "signer_email" ASC);

-- CreateIndex
CREATE INDEX "event_budgets_event_id_idx" ON "tenant_events"."event_budgets"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "event_budgets_id_key" ON "tenant_events"."event_budgets"("id" ASC);

-- CreateIndex
CREATE INDEX "event_budgets_status_idx" ON "tenant_events"."event_budgets"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_client_id_idx" ON "tenant_events"."event_contracts"("tenant_id" ASC, "client_id" ASC);

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_contract_number_idx" ON "tenant_events"."event_contracts"("tenant_id" ASC, "contract_number" ASC);

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_document_type_idx" ON "tenant_events"."event_contracts"("tenant_id" ASC, "document_type" ASC);

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_event_id_idx" ON "tenant_events"."event_contracts"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_expires_at_idx" ON "tenant_events"."event_contracts"("tenant_id" ASC, "expires_at" ASC);

-- CreateIndex
CREATE INDEX "event_contracts_tenant_id_status_idx" ON "tenant_events"."event_contracts"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "event_guests_allergen_restrictions_idx" ON "tenant_events"."event_guests" USING GIN ("allergen_restrictions" array_ops ASC);

-- CreateIndex
CREATE INDEX "event_guests_dietary_restrictions_idx" ON "tenant_events"."event_guests" USING GIN ("dietary_restrictions" array_ops ASC);

-- CreateIndex
CREATE INDEX "event_guests_event_id_idx" ON "tenant_events"."event_guests"("event_id" ASC);

-- CreateIndex
CREATE INDEX "event_imports_created_idx" ON "tenant_events"."event_imports"("tenant_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "event_imports_event_idx" ON "tenant_events"."event_imports"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "event_imports_id_key" ON "tenant_events"."event_imports"("id" ASC);

-- CreateIndex
CREATE INDEX "event_imports_status_idx" ON "tenant_events"."event_imports"("tenant_id" ASC, "parse_status" ASC);

-- CreateIndex
CREATE INDEX "event_profitability_calculated_at_idx" ON "tenant_events"."event_profitability"("calculated_at" DESC);

-- CreateIndex
CREATE INDEX "event_profitability_event_id_idx" ON "tenant_events"."event_profitability"("event_id" ASC);

-- CreateIndex
CREATE INDEX "event_profitability_tenant_id_event_id_idx" ON "tenant_events"."event_profitability"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE INDEX "event_reports_event_id_idx" ON "tenant_events"."event_reports"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "event_reports_id_key" ON "tenant_events"."event_reports"("id" ASC);

-- CreateIndex
CREATE INDEX "event_reports_status_idx" ON "tenant_events"."event_reports"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "idx_event_reports_data_gin" ON "tenant_events"."event_reports" USING GIN ("checklist_data" jsonb_ops ASC);

-- CreateIndex
CREATE INDEX "event_summaries_event_id_idx" ON "tenant_events"."event_summaries"("event_id" ASC);

-- CreateIndex
CREATE INDEX "event_summaries_generated_at_idx" ON "tenant_events"."event_summaries"("generated_at" DESC);

-- CreateIndex
CREATE INDEX "event_summaries_tenant_id_event_id_idx" ON "tenant_events"."event_summaries"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "events_id_key" ON "tenant_events"."events"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "events_tenant_id_id_key" ON "tenant_events"."events"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "idx_events_venue_id" ON "tenant_events"."events"("tenant_id" ASC, "venue_id" ASC);

-- CreateIndex
CREATE INDEX "timeline_tasks_assignee_id_idx" ON "tenant_events"."timeline_tasks"("assignee_id" ASC);

-- CreateIndex
CREATE INDEX "timeline_tasks_dependencies_idx" ON "tenant_events"."timeline_tasks" USING GIN ("dependencies" array_ops ASC);

-- CreateIndex
CREATE INDEX "timeline_tasks_event_id_idx" ON "tenant_events"."timeline_tasks"("event_id" ASC);

-- CreateIndex
CREATE INDEX "timeline_tasks_is_on_critical_path_idx" ON "tenant_events"."timeline_tasks"("is_on_critical_path" ASC);

-- CreateIndex
CREATE INDEX "timeline_tasks_priority_idx" ON "tenant_events"."timeline_tasks"("priority" ASC);

-- CreateIndex
CREATE INDEX "timeline_tasks_start_time_idx" ON "tenant_events"."timeline_tasks"("start_time" ASC);

-- CreateIndex
CREATE INDEX "timeline_tasks_status_idx" ON "tenant_events"."timeline_tasks"("status" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_created_idx" ON "tenant_inventory"."cycle_count_audit_log"("tenant_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_performer_idx" ON "tenant_inventory"."cycle_count_audit_log"("tenant_id" ASC, "performed_by_id" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_audit_tenant_session_idx" ON "tenant_inventory"."cycle_count_audit_log"("tenant_id" ASC, "session_id" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_item_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_offline_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id" ASC, "offline_id" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_session_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id" ASC, "session_id" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_records_tenant_sync_idx" ON "tenant_inventory"."cycle_count_records"("tenant_id" ASC, "sync_status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "cycle_count_sessions_session_id_key" ON "tenant_inventory"."cycle_count_sessions"("session_id" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_sessions_tenant_location_idx" ON "tenant_inventory"."cycle_count_sessions"("tenant_id" ASC, "location_id" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_sessions_tenant_scheduled_idx" ON "tenant_inventory"."cycle_count_sessions"("tenant_id" ASC, "scheduled_date" ASC);

-- CreateIndex
CREATE INDEX "cycle_count_sessions_tenant_status_idx" ON "tenant_inventory"."cycle_count_sessions"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "forecast_inputs_tenant_sku_date_idx" ON "tenant_inventory"."forecast_inputs"("tenant_id" ASC, "sku" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "inventory_alerts_tenant_item_idx" ON "tenant_inventory"."inventory_alerts"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_alerts_tenant_triggered_idx" ON "tenant_inventory"."inventory_alerts"("tenant_id" ASC, "triggered_at" ASC);

-- CreateIndex
CREATE INDEX "inventory_alerts_tenant_type_idx" ON "tenant_inventory"."inventory_alerts"("tenant_id" ASC, "alert_type" ASC);

-- CreateIndex
CREATE INDEX "inventory_forecasts_tenant_sku_date_idx" ON "tenant_inventory"."inventory_forecasts"("tenant_id" ASC, "sku" ASC, "date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_id_key" ON "tenant_inventory"."inventory_items"("id" ASC);

-- CreateIndex
CREATE INDEX "inventory_items_supplier_id_idx" ON "tenant_inventory"."inventory_items"("supplier_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_tenant_id_id_key" ON "tenant_inventory"."inventory_items"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_tenant_id_item_id_storage_location_id_key" ON "tenant_inventory"."inventory_stock"("tenant_id" ASC, "item_id" ASC, "storage_location_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_stock_tenant_item_idx" ON "tenant_inventory"."inventory_stock"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_stock_tenant_item_location_idx" ON "tenant_inventory"."inventory_stock"("tenant_id" ASC, "item_id" ASC, "storage_location_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_stock_tenant_location_idx" ON "tenant_inventory"."inventory_stock"("tenant_id" ASC, "storage_location_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_suppliers_id_key" ON "tenant_inventory"."inventory_suppliers"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_suppliers_tenant_id_id_key" ON "tenant_inventory"."inventory_suppliers"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_suppliers_tenant_id_supplier_number_key" ON "tenant_inventory"."inventory_suppliers"("tenant_id" ASC, "supplier_number" ASC);

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_date_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id" ASC, "transaction_date" ASC);

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_item_fk_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_item_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_location_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id" ASC, "storage_location_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_transactions_tenant_type_idx" ON "tenant_inventory"."inventory_transactions"("tenant_id" ASC, "transaction_type" ASC);

-- CreateIndex
CREATE INDEX "purchase_order_items_tenant_item_idx" ON "tenant_inventory"."purchase_order_items"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_order_items_tenant_po_idx" ON "tenant_inventory"."purchase_order_items"("tenant_id" ASC, "purchase_order_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_id_key" ON "tenant_inventory"."purchase_orders"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "tenant_inventory"."purchase_orders"("po_number" ASC);

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_date_idx" ON "tenant_inventory"."purchase_orders"("tenant_id" ASC, "order_date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenant_id_id_key" ON "tenant_inventory"."purchase_orders"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_status_idx" ON "tenant_inventory"."purchase_orders"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_vendor_idx" ON "tenant_inventory"."purchase_orders"("tenant_id" ASC, "vendor_id" ASC);

-- CreateIndex
CREATE INDEX "reorder_suggestions_tenant_sku_idx" ON "tenant_inventory"."reorder_suggestions"("tenant_id" ASC, "sku" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_id_key" ON "tenant_inventory"."shipment_items"("id" ASC);

-- CreateIndex
CREATE INDEX "shipment_items_item_idx" ON "tenant_inventory"."shipment_items"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "shipment_items_lot_number_idx" ON "tenant_inventory"."shipment_items"("tenant_id" ASC, "lot_number" ASC);

-- CreateIndex
CREATE INDEX "shipment_items_shipment_idx" ON "tenant_inventory"."shipment_items"("tenant_id" ASC, "shipment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_tenant_id_id_key" ON "tenant_inventory"."shipment_items"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "shipments_event_idx" ON "tenant_inventory"."shipments"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_id_key" ON "tenant_inventory"."shipments"("id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "tenant_inventory"."shipments"("shipment_number" ASC);

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "tenant_inventory"."shipments"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "shipments_supplier_idx" ON "tenant_inventory"."shipments"("tenant_id" ASC, "supplier_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tenant_id_id_key" ON "tenant_inventory"."shipments"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "tenant_inventory"."shipments"("tracking_number" ASC);

-- CreateIndex
CREATE INDEX "variance_reports_tenant_item_idx" ON "tenant_inventory"."variance_reports"("tenant_id" ASC, "item_id" ASC);

-- CreateIndex
CREATE INDEX "variance_reports_tenant_session_idx" ON "tenant_inventory"."variance_reports"("tenant_id" ASC, "session_id" ASC);

-- CreateIndex
CREATE INDEX "variance_reports_tenant_status_idx" ON "tenant_inventory"."variance_reports"("tenant_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "allergen_warnings_allergens_idx" ON "tenant_kitchen"."allergen_warnings" USING GIN ("allergens" array_ops ASC);

-- CreateIndex
CREATE INDEX "allergen_warnings_dish_id_idx" ON "tenant_kitchen"."allergen_warnings"("dish_id" ASC);

-- CreateIndex
CREATE INDEX "allergen_warnings_event_id_idx" ON "tenant_kitchen"."allergen_warnings"("event_id" ASC);

-- CreateIndex
CREATE INDEX "allergen_warnings_is_acknowledged_idx" ON "tenant_kitchen"."allergen_warnings"("is_acknowledged" ASC);

-- CreateIndex
CREATE INDEX "allergen_warnings_warning_type_idx" ON "tenant_kitchen"."allergen_warnings"("warning_type" ASC);

-- CreateIndex
CREATE INDEX "containers_location_idx" ON "tenant_kitchen"."containers"("location_id" ASC);

-- CreateIndex
CREATE INDEX "dishes_recipe_id_idx" ON "tenant_kitchen"."dishes"("recipe_id" ASC);

-- CreateIndex
CREATE INDEX "ingredients_allergens_idx" ON "tenant_kitchen"."ingredients" USING GIN ("allergens" array_ops ASC);

-- CreateIndex
CREATE INDEX "kitchen_tasks_tags_idx" ON "tenant_kitchen"."kitchen_tasks" USING GIN ("tags" array_ops ASC);

-- CreateIndex
CREATE INDEX "menu_dishes_dish_id_idx" ON "tenant_kitchen"."menu_dishes"("dish_id" ASC);

-- CreateIndex
CREATE INDEX "menu_dishes_menu_id_idx" ON "tenant_kitchen"."menu_dishes"("menu_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "menu_dishes_tenant_menu_dish_unique" ON "tenant_kitchen"."menu_dishes"("tenant_id" ASC, "menu_id" ASC, "dish_id" ASC);

-- CreateIndex
CREATE INDEX "override_audit_tenant_id_created_at_idx" ON "tenant_kitchen"."override_audit"("tenant_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "override_audit_tenant_id_entity_type_entity_id_idx" ON "tenant_kitchen"."override_audit"("tenant_id" ASC, "entity_type" ASC, "entity_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "override_audit_tenant_id_id_key" ON "tenant_kitchen"."override_audit"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "override_audit_tenant_id_overridden_by_idx" ON "tenant_kitchen"."override_audit"("tenant_id" ASC, "overridden_by" ASC);

-- CreateIndex
CREATE INDEX "prep_list_items_ingredient_id_idx" ON "tenant_kitchen"."prep_list_items"("ingredient_id" ASC);

-- CreateIndex
CREATE INDEX "prep_list_items_is_completed_idx" ON "tenant_kitchen"."prep_list_items"("is_completed" ASC);

-- CreateIndex
CREATE INDEX "prep_list_items_prep_list_id_idx" ON "tenant_kitchen"."prep_list_items"("prep_list_id" ASC);

-- CreateIndex
CREATE INDEX "prep_list_items_station_id_idx" ON "tenant_kitchen"."prep_list_items"("station_id" ASC);

-- CreateIndex
CREATE INDEX "prep_lists_event_id_idx" ON "tenant_kitchen"."prep_lists"("event_id" ASC);

-- CreateIndex
CREATE INDEX "prep_lists_generated_at_idx" ON "tenant_kitchen"."prep_lists"("generated_at" ASC);

-- CreateIndex
CREATE INDEX "prep_lists_status_idx" ON "tenant_kitchen"."prep_lists"("status" ASC);

-- CreateIndex
CREATE INDEX "prep_methods_certifications_idx" ON "tenant_kitchen"."prep_methods" USING GIN ("requires_certification" array_ops ASC);

-- CreateIndex
CREATE INDEX "prep_tasks_container_id_idx" ON "tenant_kitchen"."prep_tasks"("container_id" ASC);

-- CreateIndex
CREATE INDEX "prep_tasks_dish_id_idx" ON "tenant_kitchen"."prep_tasks"("dish_id" ASC);

-- CreateIndex
CREATE INDEX "prep_tasks_event_id_idx" ON "tenant_kitchen"."prep_tasks"("event_id" ASC);

-- CreateIndex
CREATE INDEX "prep_tasks_location_id_idx" ON "tenant_kitchen"."prep_tasks"("location_id" ASC);

-- CreateIndex
CREATE INDEX "prep_tasks_method_id_idx" ON "tenant_kitchen"."prep_tasks"("method_id" ASC);

-- CreateIndex
CREATE INDEX "prep_tasks_recipe_version_id_idx" ON "tenant_kitchen"."prep_tasks"("recipe_version_id" ASC);

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "tenant_kitchen"."recipe_ingredients"("ingredient_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_tenant_id_recipe_version_id_step_number_key" ON "tenant_kitchen"."recipe_steps"("tenant_id" ASC, "recipe_version_id" ASC, "step_number" ASC);

-- CreateIndex
CREATE INDEX "recipe_versions_locked_by_idx" ON "tenant_kitchen"."recipe_versions"("locked_by" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_tenant_id_recipe_id_version_number_key" ON "tenant_kitchen"."recipe_versions"("tenant_id" ASC, "recipe_id" ASC, "version_number" ASC);

-- CreateIndex
CREATE INDEX "recipes_tags_idx" ON "tenant_kitchen"."recipes" USING GIN ("tags" array_ops ASC);

-- CreateIndex
CREATE UNIQUE INDEX "stations_tenant_id_id_key" ON "tenant_kitchen"."stations"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "stations_tenant_id_location_id_idx" ON "tenant_kitchen"."stations"("tenant_id" ASC, "location_id" ASC);

-- CreateIndex
CREATE INDEX "task_bundle_items_tenant_bundle_idx" ON "tenant_kitchen"."task_bundle_items"("tenant_id" ASC, "bundle_id" ASC);

-- CreateIndex
CREATE INDEX "task_bundle_items_tenant_task_idx" ON "tenant_kitchen"."task_bundle_items"("tenant_id" ASC, "task_id" ASC);

-- CreateIndex
CREATE INDEX "task_bundles_event_id_idx" ON "tenant_kitchen"."task_bundles"("event_id" ASC);

-- CreateIndex
CREATE INDEX "task_claims_task_id_idx" ON "tenant_kitchen"."task_claims"("task_id" ASC);

-- CreateIndex
CREATE INDEX "task_progress_employee_id_idx" ON "tenant_kitchen"."task_progress"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "task_progress_task_id_idx" ON "tenant_kitchen"."task_progress"("task_id" ASC);

-- CreateIndex
CREATE INDEX "task_progress_tenant_task_created_idx" ON "tenant_kitchen"."task_progress"("tenant_id" ASC, "task_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "waste_entries_event_id_idx" ON "tenant_kitchen"."waste_entries"("event_id" ASC);

-- CreateIndex
CREATE INDEX "waste_entries_inventory_item_id_idx" ON "tenant_kitchen"."waste_entries"("inventory_item_id" ASC);

-- CreateIndex
CREATE INDEX "waste_entries_location_id_idx" ON "tenant_kitchen"."waste_entries"("location_id" ASC);

-- CreateIndex
CREATE INDEX "waste_entries_logged_by_idx" ON "tenant_kitchen"."waste_entries"("logged_by" ASC);

-- CreateIndex
CREATE INDEX "waste_entries_reason_id_idx" ON "tenant_kitchen"."waste_entries"("reason_id" ASC);

-- CreateIndex
CREATE INDEX "waste_entries_tenant_id_logged_at_idx" ON "tenant_kitchen"."waste_entries"("tenant_id" ASC, "logged_at" DESC);

-- CreateIndex
CREATE INDEX "employee_deductions_employee_idx" ON "tenant_staff"."EmployeeDeduction"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "approval_history_entity_idx" ON "tenant_staff"."approval_history"("entity_type" ASC, "entity_id" ASC);

-- CreateIndex
CREATE INDEX "approval_history_performer_idx" ON "tenant_staff"."approval_history"("performed_by" ASC);

-- CreateIndex
CREATE INDEX "budget_alerts_acknowledged_idx" ON "tenant_staff"."budget_alerts"("is_acknowledged" ASC);

-- CreateIndex
CREATE INDEX "budget_alerts_budget_idx" ON "tenant_staff"."budget_alerts"("tenant_id" ASC, "budget_id" ASC);

-- CreateIndex
CREATE INDEX "budget_alerts_type_idx" ON "tenant_staff"."budget_alerts"("tenant_id" ASC, "alert_type" ASC);

-- CreateIndex
CREATE INDEX "employee_availability_employee_idx" ON "tenant_staff"."employee_availability"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "employee_certifications_employee_idx" ON "tenant_staff"."employee_certifications"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "employee_locations_employee_idx" ON "tenant_staff"."employee_locations"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "employee_locations_location_idx" ON "tenant_staff"."employee_locations"("location_id" ASC);

-- CreateIndex
CREATE INDEX "employee_seniority_current_idx" ON "tenant_staff"."employee_seniority"("tenant_id" ASC, "employee_id" ASC, "effective_at" DESC);

-- CreateIndex
CREATE INDEX "employee_seniority_employee_idx" ON "tenant_staff"."employee_seniority"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employees_auth_user_id_key" ON "tenant_staff"."employees"("auth_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_unique_idx" ON "tenant_staff"."employees"("tenant_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "labor_budgets_event_idx" ON "tenant_staff"."labor_budgets"("tenant_id" ASC, "event_id" ASC);

-- CreateIndex
CREATE INDEX "labor_budgets_location_idx" ON "tenant_staff"."labor_budgets"("tenant_id" ASC, "location_id" ASC);

-- CreateIndex
CREATE INDEX "labor_budgets_period_idx" ON "tenant_staff"."labor_budgets"("tenant_id" ASC, "period_start" ASC, "period_end" ASC);

-- CreateIndex
CREATE INDEX "payroll_line_items_employee_idx" ON "tenant_staff"."payroll_line_items"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_unique" ON "tenant_staff"."roles"("tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "schedule_shifts_employee_idx" ON "tenant_staff"."schedule_shifts"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "schedule_shifts_location_idx" ON "tenant_staff"."schedule_shifts"("location_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_unique" ON "tenant_staff"."skills"("tenant_id" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "time_entries_employee_idx" ON "tenant_staff"."time_entries"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "timecard_approvals_employee_idx" ON "tenant_staff"."timecard_approvals"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "timecard_approvals_run_idx" ON "tenant_staff"."timecard_approvals"("payroll_run_id" ASC);

-- CreateIndex
CREATE INDEX "timecard_approvals_status_idx" ON "tenant_staff"."timecard_approvals"("status" ASC);

-- CreateIndex
CREATE INDEX "timecard_edit_requests_employee_idx" ON "tenant_staff"."timecard_edit_requests"("employee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "timecard_edit_requests_unique_entry" ON "tenant_staff"."timecard_edit_requests"("tenant_id" ASC, "time_entry_id" ASC);

-- CreateIndex
CREATE INDEX "user_preferences_category_idx" ON "tenant_staff"."user_preferences"("tenant_id" ASC, "category" ASC);

-- AddForeignKey
ALTER TABLE "tenant"."documents" ADD CONSTRAINT "fk_documents_battle_board" FOREIGN KEY ("tenant_id", "battle_board_id") REFERENCES "tenant_events"."battle_boards"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant"."documents" ADD CONSTRAINT "fk_documents_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_accounting"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("tenant_id", "parent_id") REFERENCES "tenant_accounting"."chart_of_accounts"("tenant_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_accounting"."chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_admin"."notifications" ADD CONSTRAINT "fk_notifications_recipient" FOREIGN KEY ("tenant_id", "recipient_employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."report_history" ADD CONSTRAINT "fk_report_history_generated_by" FOREIGN KEY ("tenant_id", "generated_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."report_history" ADD CONSTRAINT "fk_report_history_report" FOREIGN KEY ("tenant_id", "report_id") REFERENCES "tenant_admin"."reports"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."report_history" ADD CONSTRAINT "fk_report_history_schedule" FOREIGN KEY ("tenant_id", "schedule_id") REFERENCES "tenant_admin"."report_schedules"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."report_schedules" ADD CONSTRAINT "fk_report_schedules_report" FOREIGN KEY ("tenant_id", "report_id") REFERENCES "tenant_admin"."reports"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."reports" ADD CONSTRAINT "fk_reports_created_by" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."workflow_executions" ADD CONSTRAINT "fk_workflow_executions_step" FOREIGN KEY ("tenant_id", "current_step_id") REFERENCES "tenant_admin"."workflow_steps"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."workflow_executions" ADD CONSTRAINT "fk_workflow_executions_triggered_by" FOREIGN KEY ("tenant_id", "triggered_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."workflow_executions" ADD CONSTRAINT "fk_workflow_executions_workflow" FOREIGN KEY ("tenant_id", "workflow_id") REFERENCES "tenant_admin"."workflows"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."workflow_steps" ADD CONSTRAINT "fk_workflow_steps_failure" FOREIGN KEY ("tenant_id", "on_failure_step_id") REFERENCES "tenant_admin"."workflow_steps"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."workflow_steps" ADD CONSTRAINT "fk_workflow_steps_success" FOREIGN KEY ("tenant_id", "on_success_step_id") REFERENCES "tenant_admin"."workflow_steps"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_admin"."workflow_steps" ADD CONSTRAINT "fk_workflow_steps_workflow" FOREIGN KEY ("tenant_id", "workflow_id") REFERENCES "tenant_admin"."workflows"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."client_contacts" ADD CONSTRAINT "fk_client_contacts_client" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."client_interactions" ADD CONSTRAINT "fk_client_interactions_client" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."client_interactions" ADD CONSTRAINT "fk_client_interactions_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."client_interactions" ADD CONSTRAINT "fk_client_interactions_lead" FOREIGN KEY ("tenant_id", "lead_id") REFERENCES "tenant_crm"."leads"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."client_preferences" ADD CONSTRAINT "fk_client_preferences_client" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."clients" ADD CONSTRAINT "fk_clients_assigned_to" FOREIGN KEY ("tenant_id", "assigned_to") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."leads" ADD CONSTRAINT "fk_leads_assigned_to" FOREIGN KEY ("tenant_id", "assigned_to") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."leads" ADD CONSTRAINT "fk_leads_converted_client" FOREIGN KEY ("tenant_id", "converted_to_client_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."proposal_line_items" ADD CONSTRAINT "fk_proposal_line_items_proposal" FOREIGN KEY ("tenant_id", "proposal_id") REFERENCES "tenant_crm"."proposals"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."proposals" ADD CONSTRAINT "fk_proposals_client" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."proposals" ADD CONSTRAINT "fk_proposals_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_crm"."proposals" ADD CONSTRAINT "fk_proposals_lead" FOREIGN KEY ("tenant_id", "lead_id") REFERENCES "tenant_crm"."leads"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."battle_boards" ADD CONSTRAINT "fk_battle_boards_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."budget_line_items" ADD CONSTRAINT "budget_line_items_tenant_id_budget_id_foreign" FOREIGN KEY ("tenant_id", "budget_id") REFERENCES "tenant_events"."event_budgets"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."budget_line_items" ADD CONSTRAINT "budget_line_items_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."budget_line_items" ADD CONSTRAINT "fk_budget_line_items_budget" FOREIGN KEY ("tenant_id", "budget_id") REFERENCES "tenant_events"."event_budgets"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."catering_orders" ADD CONSTRAINT "fk_catering_orders_customer" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."catering_orders" ADD CONSTRAINT "fk_catering_orders_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."command_board_cards" ADD CONSTRAINT "fk_command_board_cards_board" FOREIGN KEY ("tenant_id", "board_id") REFERENCES "tenant_events"."command_boards"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."command_boards" ADD CONSTRAINT "fk_command_boards_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."contract_signatures" ADD CONSTRAINT "fk_contract_signatures_contract" FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "tenant_events"."event_contracts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_budgets" ADD CONSTRAINT "event_budgets_event_tenant_id_event_id_foreign" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_budgets" ADD CONSTRAINT "event_budgets_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_budgets" ADD CONSTRAINT "fk_event_budgets_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_contracts" ADD CONSTRAINT "fk_event_contracts_client" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_contracts" ADD CONSTRAINT "fk_event_contracts_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_dishes" ADD CONSTRAINT "fk_event_dishes_dish" FOREIGN KEY ("tenant_id", "dish_id") REFERENCES "tenant_kitchen"."dishes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_dishes" ADD CONSTRAINT "fk_event_dishes_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_guests" ADD CONSTRAINT "fk_event_guests_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_imports" ADD CONSTRAINT "fk_event_imports_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_profitability" ADD CONSTRAINT "fk_event_profitability_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_reports" ADD CONSTRAINT "fk_event_reports_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_staff_assignments" ADD CONSTRAINT "fk_event_staff_assignments_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_staff_assignments" ADD CONSTRAINT "fk_event_staff_assignments_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_summaries" ADD CONSTRAINT "fk_event_summaries_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."event_timeline" ADD CONSTRAINT "fk_event_timeline_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."events" ADD CONSTRAINT "fk_events_assigned_to" FOREIGN KEY ("tenant_id", "assigned_to") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."events" ADD CONSTRAINT "fk_events_client" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "tenant_crm"."clients"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."events" ADD CONSTRAINT "fk_events_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."events" ADD CONSTRAINT "fk_events_venue" FOREIGN KEY ("tenant_id", "venue_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."timeline_tasks" ADD CONSTRAINT "fk_timeline_tasks_assignee" FOREIGN KEY ("tenant_id", "assignee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_events"."timeline_tasks" ADD CONSTRAINT "fk_timeline_tasks_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."inventory_alerts" ADD CONSTRAINT "fk_inventory_alerts_item" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "tenant_inventory"."inventory_items"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."inventory_stock" ADD CONSTRAINT "fk_inventory_stock_item" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "tenant_inventory"."inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."inventory_stock" ADD CONSTRAINT "fk_inventory_stock_location" FOREIGN KEY ("tenant_id", "storage_location_id") REFERENCES "tenant_inventory"."storage_locations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."inventory_transactions" ADD CONSTRAINT "fk_inventory_transactions_item" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "tenant_inventory"."inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."inventory_transactions" ADD CONSTRAINT "fk_inventory_transactions_location" FOREIGN KEY ("tenant_id", "storage_location_id") REFERENCES "tenant_inventory"."storage_locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."purchase_order_items" ADD CONSTRAINT "fk_purchase_order_items_item" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "tenant_inventory"."inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."purchase_order_items" ADD CONSTRAINT "fk_purchase_order_items_po" FOREIGN KEY ("tenant_id", "purchase_order_id") REFERENCES "tenant_inventory"."purchase_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."purchase_orders" ADD CONSTRAINT "fk_purchase_orders_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."purchase_orders" ADD CONSTRAINT "fk_purchase_orders_vendor" FOREIGN KEY ("tenant_id", "vendor_id") REFERENCES "tenant_inventory"."inventory_suppliers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."shipment_items" ADD CONSTRAINT "fk_shipment_items_item" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "tenant_inventory"."inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."shipment_items" ADD CONSTRAINT "fk_shipment_items_shipment" FOREIGN KEY ("tenant_id", "shipment_id") REFERENCES "tenant_inventory"."shipments"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."shipments" ADD CONSTRAINT "fk_shipments_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."shipments" ADD CONSTRAINT "fk_shipments_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."shipments" ADD CONSTRAINT "fk_shipments_supplier" FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "tenant_inventory"."inventory_suppliers"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_inventory"."storage_locations" ADD CONSTRAINT "fk_storage_locations_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."allergen_warnings" ADD CONSTRAINT "fk_allergen_warnings_acknowledged_by" FOREIGN KEY ("tenant_id", "acknowledged_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."allergen_warnings" ADD CONSTRAINT "fk_allergen_warnings_dish" FOREIGN KEY ("tenant_id", "dish_id") REFERENCES "tenant_kitchen"."dishes"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."allergen_warnings" ADD CONSTRAINT "fk_allergen_warnings_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."containers" ADD CONSTRAINT "fk_containers_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant_inventory"."storage_locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."dishes" ADD CONSTRAINT "fk_dishes_container" FOREIGN KEY ("tenant_id", "default_container_id") REFERENCES "tenant_kitchen"."containers"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."dishes" ADD CONSTRAINT "fk_dishes_recipe" FOREIGN KEY ("tenant_id", "recipe_id") REFERENCES "tenant_kitchen"."recipes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."menu_dishes" ADD CONSTRAINT "fk_menu_dishes_dish" FOREIGN KEY ("tenant_id", "dish_id") REFERENCES "tenant_kitchen"."dishes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."menu_dishes" ADD CONSTRAINT "fk_menu_dishes_menu" FOREIGN KEY ("tenant_id", "menu_id") REFERENCES "tenant_kitchen"."menus"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_comments" ADD CONSTRAINT "fk_prep_comments_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_comments" ADD CONSTRAINT "fk_prep_comments_resolved_by" FOREIGN KEY ("tenant_id", "resolved_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_comments" ADD CONSTRAINT "fk_prep_comments_task" FOREIGN KEY ("tenant_id", "task_id") REFERENCES "tenant_kitchen"."kitchen_tasks"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" ADD CONSTRAINT "fk_prep_list_items_completed_by" FOREIGN KEY ("tenant_id", "completed_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" ADD CONSTRAINT "fk_prep_list_items_dish" FOREIGN KEY ("tenant_id", "dish_id") REFERENCES "tenant_kitchen"."dishes"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" ADD CONSTRAINT "fk_prep_list_items_ingredient" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "tenant_kitchen"."ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" ADD CONSTRAINT "fk_prep_list_items_list" FOREIGN KEY ("tenant_id", "prep_list_id") REFERENCES "tenant_kitchen"."prep_lists"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_list_items" ADD CONSTRAINT "fk_prep_list_items_recipe_version" FOREIGN KEY ("tenant_id", "recipe_version_id") REFERENCES "tenant_kitchen"."recipe_versions"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_lists" ADD CONSTRAINT "fk_prep_lists_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD CONSTRAINT "fk_prep_tasks_container" FOREIGN KEY ("tenant_id", "container_id") REFERENCES "tenant_kitchen"."containers"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD CONSTRAINT "fk_prep_tasks_dish" FOREIGN KEY ("tenant_id", "dish_id") REFERENCES "tenant_kitchen"."dishes"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD CONSTRAINT "fk_prep_tasks_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD CONSTRAINT "fk_prep_tasks_import" FOREIGN KEY ("tenant_id", "import_id") REFERENCES "tenant_kitchen"."prep_list_imports"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD CONSTRAINT "fk_prep_tasks_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant_inventory"."storage_locations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD CONSTRAINT "fk_prep_tasks_method" FOREIGN KEY ("tenant_id", "method_id") REFERENCES "tenant_kitchen"."prep_methods"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD CONSTRAINT "fk_prep_tasks_recipe_version" FOREIGN KEY ("tenant_id", "recipe_version_id") REFERENCES "tenant_kitchen"."recipe_versions"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."recipe_ingredients" ADD CONSTRAINT "fk_recipe_ingredients_ingredient" FOREIGN KEY ("tenant_id", "ingredient_id") REFERENCES "tenant_kitchen"."ingredients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."recipe_ingredients" ADD CONSTRAINT "fk_recipe_ingredients_version" FOREIGN KEY ("tenant_id", "recipe_version_id") REFERENCES "tenant_kitchen"."recipe_versions"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."recipe_steps" ADD CONSTRAINT "fk_recipe_steps_version" FOREIGN KEY ("tenant_id", "recipe_version_id") REFERENCES "tenant_kitchen"."recipe_versions"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."recipe_versions" ADD CONSTRAINT "fk_recipe_versions_locked_by" FOREIGN KEY ("tenant_id", "locked_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."recipe_versions" ADD CONSTRAINT "fk_recipe_versions_recipe" FOREIGN KEY ("tenant_id", "recipe_id") REFERENCES "tenant_kitchen"."recipes"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."task_bundle_items" ADD CONSTRAINT "fk_task_bundle_items_bundle" FOREIGN KEY ("tenant_id", "bundle_id") REFERENCES "tenant_kitchen"."task_bundles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."task_bundle_items" ADD CONSTRAINT "fk_task_bundle_items_task" FOREIGN KEY ("tenant_id", "task_id") REFERENCES "tenant_kitchen"."kitchen_tasks"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."task_bundles" ADD CONSTRAINT "fk_task_bundles_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."task_claims" ADD CONSTRAINT "fk_task_claims_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."task_claims" ADD CONSTRAINT "fk_task_claims_task" FOREIGN KEY ("tenant_id", "task_id") REFERENCES "tenant_kitchen"."kitchen_tasks"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."task_progress" ADD CONSTRAINT "fk_task_progress_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."task_progress" ADD CONSTRAINT "fk_task_progress_task" FOREIGN KEY ("tenant_id", "task_id") REFERENCES "tenant_kitchen"."kitchen_tasks"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" ADD CONSTRAINT "fk_waste_entries_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" ADD CONSTRAINT "fk_waste_entries_item" FOREIGN KEY ("tenant_id", "inventory_item_id") REFERENCES "tenant_inventory"."inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" ADD CONSTRAINT "fk_waste_entries_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant_inventory"."storage_locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_kitchen"."waste_entries" ADD CONSTRAINT "fk_waste_entries_logged_by" FOREIGN KEY ("tenant_id", "logged_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" ADD CONSTRAINT "budget_alerts_tenant_id_budget_id_foreign" FOREIGN KEY ("tenant_id", "budget_id") REFERENCES "tenant_events"."event_budgets"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" ADD CONSTRAINT "budget_alerts_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" ADD CONSTRAINT "fk_budget_alerts_acknowledged_by" FOREIGN KEY ("tenant_id", "acknowledged_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."budget_alerts" ADD CONSTRAINT "fk_budget_alerts_budget" FOREIGN KEY ("tenant_id", "budget_id") REFERENCES "tenant_staff"."labor_budgets"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_availability" ADD CONSTRAINT "fk_employee_availability_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_certifications" ADD CONSTRAINT "fk_employee_certifications_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_locations" ADD CONSTRAINT "fk_employee_locations_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_locations" ADD CONSTRAINT "fk_employee_locations_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_seniority" ADD CONSTRAINT "fk_employee_seniority_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_skills" ADD CONSTRAINT "fk_employee_skills_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_skills" ADD CONSTRAINT "fk_employee_skills_skill" FOREIGN KEY ("tenant_id", "skill_id") REFERENCES "tenant_staff"."skills"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."employee_skills" ADD CONSTRAINT "fk_employee_skills_verified_by" FOREIGN KEY ("tenant_id", "verified_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "fk_labor_budgets_event" FOREIGN KEY ("tenant_id", "event_id") REFERENCES "tenant_events"."events"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "fk_labor_budgets_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."open_shifts" ADD CONSTRAINT "fk_open_shifts_assigned_shift" FOREIGN KEY ("tenant_id", "assigned_shift_id") REFERENCES "tenant_staff"."schedule_shifts"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."open_shifts" ADD CONSTRAINT "fk_open_shifts_claimed_by" FOREIGN KEY ("tenant_id", "claimed_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."open_shifts" ADD CONSTRAINT "fk_open_shifts_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."open_shifts" ADD CONSTRAINT "fk_open_shifts_schedule" FOREIGN KEY ("tenant_id", "schedule_id") REFERENCES "tenant_staff"."schedules"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."payroll_line_items" ADD CONSTRAINT "fk_payroll_line_items_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."payroll_line_items" ADD CONSTRAINT "fk_payroll_line_items_run" FOREIGN KEY ("tenant_id", "payroll_run_id") REFERENCES "tenant_staff"."payroll_runs"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."payroll_runs" ADD CONSTRAINT "fk_payroll_runs_approved_by" FOREIGN KEY ("tenant_id", "approved_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."payroll_runs" ADD CONSTRAINT "fk_payroll_runs_period" FOREIGN KEY ("tenant_id", "payroll_period_id") REFERENCES "tenant_staff"."payroll_periods"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."schedule_shifts" ADD CONSTRAINT "fk_schedule_shifts_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."schedule_shifts" ADD CONSTRAINT "fk_schedule_shifts_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."schedule_shifts" ADD CONSTRAINT "fk_schedule_shifts_schedule" FOREIGN KEY ("tenant_id", "schedule_id") REFERENCES "tenant_staff"."schedules"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."schedules" ADD CONSTRAINT "fk_schedules_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."schedules" ADD CONSTRAINT "fk_schedules_published_by" FOREIGN KEY ("tenant_id", "published_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."time_entries" ADD CONSTRAINT "fk_time_entries_approved_by" FOREIGN KEY ("tenant_id", "approved_by") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."time_entries" ADD CONSTRAINT "fk_time_entries_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."time_entries" ADD CONSTRAINT "fk_time_entries_location" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "tenant"."locations"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."time_entries" ADD CONSTRAINT "fk_time_entries_shift" FOREIGN KEY ("tenant_id", "shift_id") REFERENCES "tenant_staff"."schedule_shifts"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."timecard_edit_requests" ADD CONSTRAINT "fk_timecard_edit_requests_employee" FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."timecard_edit_requests" ADD CONSTRAINT "fk_timecard_edit_requests_entry" FOREIGN KEY ("tenant_id", "time_entry_id") REFERENCES "tenant_staff"."time_entries"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tenant_staff"."user_preferences" ADD CONSTRAINT "user_preferences_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_staff"."user_preferences" ADD CONSTRAINT "user_preferences_user_fk" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

