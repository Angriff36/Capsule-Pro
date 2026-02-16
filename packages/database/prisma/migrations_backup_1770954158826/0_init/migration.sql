-- ==========================================================
-- Capsule-Pro: Squashed baseline migration
-- Generated: 2026-02-13T03:39:43.469Z
-- ==========================================================

-- ── Extensions ────────────────────────────────────────────

-- Enable uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Functions ─────────────────────────────────────────────

-- Create stub auth.jwt() function for RLS policies
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS json AS $$
  SELECT '{"tenant_id": "00000000-0000-0000-0000-000000000000"}'::json
$$ LANGUAGE sql;
-- Core functions
CREATE OR REPLACE FUNCTION core.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION core.fn_prevent_tenant_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'tenant_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Prisma Schema DDL ─────────────────────────────────────

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
CREATE TYPE "tenant_accounting"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

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
CREATE TABLE "tenant_events"."events" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_number" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Untitled Event',
    "client_id" UUID,
    "location_id" UUID,
    "venue_id" UUID,
    "event_type" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "guest_count" INTEGER NOT NULL DEFAULT 1,
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
    "storage_location_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
    "reason" TEXT NOT NULL DEFAULT '',
    "reference_type" TEXT,
    "reference_id" UUID,
    "employee_id" UUID,

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
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_suppliers_pkey" PRIMARY KEY ("tenant_id","id")
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- CreateIndex
CREATE UNIQUE INDEX "accounts_slug_key" ON "platform"."accounts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "locations_id_key" ON "tenant"."locations"("id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_id_key" ON "tenant"."locations"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_auth_user_id_key" ON "tenant_staff"."employees"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenant_id_unique_idx" ON "tenant_staff"."employees"("tenant_id", "id");

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
CREATE UNIQUE INDEX "events_id_key" ON "tenant_events"."events"("id");

-- CreateIndex
CREATE INDEX "idx_events_venue_id" ON "tenant_events"."events"("tenant_id", "venue_id");

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
CREATE UNIQUE INDEX "clients_id_key" ON "tenant_crm"."clients"("id");

-- CreateIndex
CREATE INDEX "user_preferences_tenant_id_category_idx" ON "tenant_staff"."user_preferences"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_tenant_id_user_id_preference_key_category_key" ON "tenant_staff"."user_preferences"("tenant_id", "user_id", "preference_key", "category");

-- CreateIndex
CREATE UNIQUE INDEX "leads_id_key" ON "tenant_crm"."leads"("id");

-- CreateIndex
CREATE INDEX "client_interactions_employee_idx" ON "tenant_crm"."client_interactions"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_tenant_id_id_key" ON "tenant_crm"."proposals"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "proposal_line_items_tenant_id_proposal_id_idx" ON "tenant_crm"."proposal_line_items"("tenant_id", "proposal_id");

-- CreateIndex
CREATE INDEX "recipes_tags_idx" ON "tenant_kitchen"."recipes" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "recipe_versions_locked_by_idx" ON "tenant_kitchen"."recipe_versions"("locked_by");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_versions_tenant_id_recipe_id_version_number_key" ON "tenant_kitchen"."recipe_versions"("tenant_id", "recipe_id", "version_number");

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
CREATE UNIQUE INDEX "notification_preferences_tenant_id_employee_id_notification_key" ON "tenant_admin"."notification_preferences"("tenant_id", "employee_id", "notification_type", "channel");

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
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "tenant"."OutboxEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_idx" ON "tenant"."OutboxEvent"("tenantId");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "tenant"."OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "event_guests_event_id_idx" ON "tenant_events"."event_guests"("event_id");

-- CreateIndex
CREATE INDEX "event_guests_dietary_restrictions_idx" ON "tenant_events"."event_guests" USING GIN ("dietary_restrictions");

-- CreateIndex
CREATE INDEX "event_guests_allergen_restrictions_idx" ON "tenant_events"."event_guests" USING GIN ("allergen_restrictions");

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
CREATE INDEX "contract_signatures_tenant_id_contract_id_idx" ON "tenant_events"."contract_signatures"("tenant_id", "contract_id");

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_signed_at_idx" ON "tenant_events"."contract_signatures"("tenant_id", "signed_at");

-- CreateIndex
CREATE INDEX "contract_signatures_tenant_id_signer_email_idx" ON "tenant_events"."contract_signatures"("tenant_id", "signer_email");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_account_number_key" ON "tenant_accounting"."chart_of_accounts"("account_number");

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_account_number_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id", "account_number");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_id_key" ON "tenant_accounting"."chart_of_accounts"("id");

-- ── Row Level Security ────────────────────────────────────

-- AlterEnum
-- No existing enum to alter

-- RLS Policies for labor_budgets
ALTER TABLE "tenant_staff"."labor_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."labor_budgets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "labor_budgets_select" ON "tenant_staff"."labor_budgets"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
CREATE POLICY "labor_budgets_insert" ON "tenant_staff"."labor_budgets"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
CREATE POLICY "labor_budgets_update" ON "tenant_staff"."labor_budgets"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "labor_budgets_delete" ON "tenant_staff"."labor_budgets"
    FOR DELETE USING (false);
CREATE POLICY "labor_budgets_service" ON "tenant_staff"."labor_budgets"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- RLS Policies for budget_alerts
ALTER TABLE "tenant_staff"."budget_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."budget_alerts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "budget_alerts_select" ON "tenant_staff"."budget_alerts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
CREATE POLICY "budget_alerts_insert" ON "tenant_staff"."budget_alerts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
CREATE POLICY "budget_alerts_update" ON "tenant_staff"."budget_alerts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "budget_alerts_delete" ON "tenant_staff"."budget_alerts"
    FOR DELETE USING (false);
CREATE POLICY "budget_alerts_service" ON "tenant_staff"."budget_alerts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- RLS Policies for event_budgets
ALTER TABLE "tenant_events"."event_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."event_budgets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_budgets_select" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_select" ON "tenant_events"."event_budgets"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
DROP POLICY IF EXISTS "event_budgets_insert" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_insert" ON "tenant_events"."event_budgets"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
DROP POLICY IF EXISTS "event_budgets_update" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_update" ON "tenant_events"."event_budgets"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
DROP POLICY IF EXISTS "event_budgets_delete" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_delete" ON "tenant_events"."event_budgets"
    FOR DELETE USING (false);
DROP POLICY IF EXISTS "event_budgets_service" ON "tenant_events"."event_budgets";
CREATE POLICY "event_budgets_service" ON "tenant_events"."event_budgets"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- RLS Policies for budget_line_items
ALTER TABLE "tenant_events"."budget_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."budget_line_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_line_items_select" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_select" ON "tenant_events"."budget_line_items"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
DROP POLICY IF EXISTS "budget_line_items_insert" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_insert" ON "tenant_events"."budget_line_items"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
DROP POLICY IF EXISTS "budget_line_items_update" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_update" ON "tenant_events"."budget_line_items"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
DROP POLICY IF EXISTS "budget_line_items_delete" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_delete" ON "tenant_events"."budget_line_items"
    FOR DELETE USING (false);
DROP POLICY IF EXISTS "budget_line_items_service" ON "tenant_events"."budget_line_items";
CREATE POLICY "budget_line_items_service" ON "tenant_events"."budget_line_items"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
DROP POLICY IF EXISTS "budget_alerts_select" ON "tenant_staff"."budget_alerts";
DROP POLICY IF EXISTS "budget_alerts_insert" ON "tenant_staff"."budget_alerts";
DROP POLICY IF EXISTS "budget_alerts_update" ON "tenant_staff"."budget_alerts";
DROP POLICY IF EXISTS "budget_alerts_delete" ON "tenant_staff"."budget_alerts";
DROP POLICY IF EXISTS "budget_alerts_service" ON "tenant_staff"."budget_alerts";
-- RLS Policies for shipments
ALTER TABLE "tenant_inventory"."shipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."shipments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "shipments_select" ON "tenant_inventory"."shipments"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
CREATE POLICY "shipments_insert" ON "tenant_inventory"."shipments"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
CREATE POLICY "shipments_update" ON "tenant_inventory"."shipments"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "shipments_delete" ON "tenant_inventory"."shipments"
    FOR DELETE USING (false);
CREATE POLICY "shipments_service" ON "tenant_inventory"."shipments"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- RLS Policies for shipment_items
ALTER TABLE "tenant_inventory"."shipment_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."shipment_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY "shipment_items_select" ON "tenant_inventory"."shipment_items"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
CREATE POLICY "shipment_items_insert" ON "tenant_inventory"."shipment_items"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
CREATE POLICY "shipment_items_update" ON "tenant_inventory"."shipment_items"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "shipment_items_delete" ON "tenant_inventory"."shipment_items"
    FOR DELETE USING (false);
CREATE POLICY "shipment_items_service" ON "tenant_inventory"."shipment_items"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
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
-- RLS Policies for admin_chat_threads
ALTER TABLE "tenant_admin"."admin_chat_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."admin_chat_threads" FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_chat_threads_select" ON "tenant_admin"."admin_chat_threads"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
CREATE POLICY "admin_chat_threads_insert" ON "tenant_admin"."admin_chat_threads"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
CREATE POLICY "admin_chat_threads_update" ON "tenant_admin"."admin_chat_threads"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "admin_chat_threads_delete" ON "tenant_admin"."admin_chat_threads"
    FOR DELETE USING (false);
CREATE POLICY "admin_chat_threads_service" ON "tenant_admin"."admin_chat_threads"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- RLS Policies for admin_chat_participants
ALTER TABLE "tenant_admin"."admin_chat_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."admin_chat_participants" FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_chat_participants_select" ON "tenant_admin"."admin_chat_participants"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
CREATE POLICY "admin_chat_participants_insert" ON "tenant_admin"."admin_chat_participants"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
CREATE POLICY "admin_chat_participants_update" ON "tenant_admin"."admin_chat_participants"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "admin_chat_participants_delete" ON "tenant_admin"."admin_chat_participants"
    FOR DELETE USING (false);
CREATE POLICY "admin_chat_participants_service" ON "tenant_admin"."admin_chat_participants"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- RLS Policies for admin_chat_messages
ALTER TABLE "tenant_admin"."admin_chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."admin_chat_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin_chat_messages_select" ON "tenant_admin"."admin_chat_messages"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );
CREATE POLICY "admin_chat_messages_insert" ON "tenant_admin"."admin_chat_messages"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );
CREATE POLICY "admin_chat_messages_update" ON "tenant_admin"."admin_chat_messages"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );
CREATE POLICY "admin_chat_messages_delete" ON "tenant_admin"."admin_chat_messages"
    FOR DELETE USING (false);
CREATE POLICY "admin_chat_messages_service" ON "tenant_admin"."admin_chat_messages"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
-- ========================================================================
-- DROP UNUSED RLS POLICIES
-- These were created from Supabase template but are not used
-- Clerk handles authentication and tenant isolation at application level
-- ========================================================================

-- Drop RLS policies for admin_tasks (from migration 0020)
DROP POLICY IF EXISTS "admin_tasks_select" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_insert" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_update" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_delete" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_service" ON "tenant_admin"."admin_tasks";
-- Drop RLS policies for admin_chat_threads (from migration 0021)
DROP POLICY IF EXISTS "admin_chat_threads_select" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_insert" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_update" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_delete" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_service" ON "tenant_admin"."admin_chat_threads";
-- Drop RLS policies for admin_chat_participants
DROP POLICY IF EXISTS "admin_chat_participants_select" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_insert" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_update" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_delete" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_service" ON "tenant_admin"."admin_chat_participants";
-- Drop RLS policies for admin_chat_messages
DROP POLICY IF EXISTS "admin_chat_messages_select" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_insert" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_update" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_delete" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_service" ON "tenant_admin"."admin_chat_messages";

-- ── Triggers ──────────────────────────────────────────────

-- Triggers for labor_budgets
CREATE TRIGGER "labor_budgets_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."labor_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "labor_budgets_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."labor_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for budget_alerts
CREATE TRIGGER "budget_alerts_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "budget_alerts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for event_budgets
DROP TRIGGER IF EXISTS "event_budgets_update_timestamp" ON "tenant_events"."event_budgets";
CREATE TRIGGER "event_budgets_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."event_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
DROP TRIGGER IF EXISTS "event_budgets_prevent_tenant_mutation" ON "tenant_events"."event_budgets";
CREATE TRIGGER "event_budgets_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."event_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for budget_line_items
DROP TRIGGER IF EXISTS "budget_line_items_update_timestamp" ON "tenant_events"."budget_line_items";
CREATE TRIGGER "budget_line_items_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."budget_line_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
DROP TRIGGER IF EXISTS "budget_line_items_prevent_tenant_mutation" ON "tenant_events"."budget_line_items";
CREATE TRIGGER "budget_line_items_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."budget_line_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for budget_alerts
DROP TRIGGER IF EXISTS "budget_alerts_update_timestamp" ON "tenant_staff"."budget_alerts";
CREATE TRIGGER "budget_alerts_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
DROP TRIGGER IF EXISTS "budget_alerts_prevent_tenant_mutation" ON "tenant_staff"."budget_alerts";
-- Triggers for shipments
CREATE TRIGGER "shipments_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."shipments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "shipments_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."shipments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for shipment_items
CREATE TRIGGER "shipment_items_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."shipment_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "shipment_items_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."shipment_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for menus
DROP TRIGGER IF EXISTS "menus_update_timestamp" ON "tenant_kitchen"."menus";
CREATE TRIGGER "menus_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."menus"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
DROP TRIGGER IF EXISTS "menus_prevent_tenant_mutation" ON "tenant_kitchen"."menus";
CREATE TRIGGER "menus_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."menus"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for menu_dishes
DROP TRIGGER IF EXISTS "menu_dishes_update_timestamp" ON "tenant_kitchen"."menu_dishes";
CREATE TRIGGER "menu_dishes_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."menu_dishes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
DROP TRIGGER IF EXISTS "menu_dishes_prevent_tenant_mutation" ON "tenant_kitchen"."menu_dishes";
CREATE TRIGGER "menu_dishes_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."menu_dishes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for admin_tasks
CREATE TRIGGER "admin_tasks_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "admin_tasks_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for admin_chat_threads
CREATE TRIGGER "admin_chat_threads_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_threads"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "admin_chat_threads_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_threads"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for admin_chat_participants
CREATE TRIGGER "admin_chat_participants_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_participants"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "admin_chat_participants_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_participants"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Triggers for admin_chat_messages
CREATE TRIGGER "admin_chat_messages_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_messages"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
CREATE TRIGGER "admin_chat_messages_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_messages"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
-- Drop triggers for admin_tasks
DROP TRIGGER IF EXISTS "admin_tasks_update_timestamp" ON "tenant_admin"."admin_tasks";
DROP TRIGGER IF EXISTS "admin_tasks_prevent_tenant_mutation" ON "tenant_admin"."admin_tasks";
-- Drop triggers for admin_chat_threads
DROP TRIGGER IF EXISTS "admin_chat_threads_update_timestamp" ON "tenant_admin"."admin_chat_threads";
DROP TRIGGER IF EXISTS "admin_chat_threads_prevent_tenant_mutation" ON "tenant_admin"."admin_chat_threads";
-- Drop triggers for admin_chat_participants
DROP TRIGGER IF EXISTS "admin_chat_participants_update_timestamp" ON "tenant_admin"."admin_chat_participants";
DROP TRIGGER IF EXISTS "admin_chat_participants_prevent_tenant_mutation" ON "tenant_admin"."admin_chat_participants";
-- Drop triggers for admin_chat_messages
DROP TRIGGER IF EXISTS "admin_chat_messages_update_timestamp" ON "tenant_admin"."admin_chat_messages";
DROP TRIGGER IF EXISTS "admin_chat_messages_prevent_tenant_mutation" ON "tenant_admin"."admin_chat_messages";

-- ── CHECK Constraints ─────────────────────────────────────

-- CHECK constraints for data integrity
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "labor_budgets_budget_target_positive" CHECK ("budget_target" > 0);
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "labor_budgets_event_type_validation" CHECK (
    ("budget_type" = 'event' AND "event_id" IS NOT NULL) OR
    ("budget_type" IN ('week', 'month') AND "period_start" IS NOT NULL AND "period_end" IS NOT NULL)
);
ALTER TABLE "tenant_staff"."labor_budgets" ADD CONSTRAINT "labor_budgets_period_end_after_start" CHECK (
    "period_end" IS NULL OR "period_start" IS NULL OR "period_end" >= "period_start"
);

-- ── REPLICA IDENTITY ──────────────────────────────────────

-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_staff"."labor_budgets" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_staff"."budget_alerts" REPLICA IDENTITY FULL;
-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_events"."event_budgets" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_events"."budget_line_items" REPLICA IDENTITY FULL;
-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_inventory"."shipments" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_inventory"."shipment_items" REPLICA IDENTITY FULL;
-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_kitchen"."menus" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_kitchen"."menu_dishes" REPLICA IDENTITY FULL;

-- ── Seed Data ─────────────────────────────────────────────

-- Seed Units
-- Weight units (metric and imperial)
INSERT INTO "core"."units" ("id", "code", "name", "name_plural", "unit_system", "unit_type", "is_base_unit") VALUES
(1, 'g', 'gram', 'grams', 'metric', 'weight', false),
(2, 'kg', 'kilogram', 'kilograms', 'metric', 'weight', true),
(3, 'mg', 'milligram', 'milligrams', 'metric', 'weight', false),
(4, 'oz', 'ounce', 'ounces', 'imperial', 'weight', false),
(5, 'lb', 'pound', 'pounds', 'imperial', 'weight', true),
(6, 't', 'ton', 'tons', 'imperial', 'weight', false),

-- Volume units (metric and imperial)
(10, 'ml', 'milliliter', 'milliliters', 'metric', 'volume', false),
(11, 'l', 'liter', 'liters', 'metric', 'volume', true),
(12, 'floz', 'fluid ounce', 'fluid ounces', 'imperial', 'volume', false),
(13, 'cup', 'cup', 'cups', 'imperial', 'volume', false),
(14, 'pt', 'pint', 'pints', 'imperial', 'volume', false),
(15, 'qt', 'quart', 'quarts', 'imperial', 'volume', false),
(16, 'gal', 'gallon', 'gallons', 'imperial', 'volume', true),

-- Count units
(20, 'ea', 'each', 'each', 'custom', 'count', true),
(21, 'doz', 'dozen', 'dozens', 'custom', 'count', false),
(22, 'pcs', 'piece', 'pieces', 'custom', 'count', false),

-- Length units
(30, 'mm', 'millimeter', 'millimeters', 'metric', 'length', false),
(31, 'cm', 'centimeter', 'centimeters', 'metric', 'length', false),
(32, 'm', 'meter', 'meters', 'metric', 'length', true),
(33, 'in', 'inch', 'inches', 'imperial', 'length', false),
(34, 'ft', 'foot', 'feet', 'imperial', 'length', true),

-- Temperature units
(40, 'c', 'celsius', 'celsius', 'metric', 'temperature', true),
(41, 'f', 'fahrenheit', 'fahrenheit', 'imperial', 'temperature', true),

-- Time units
(50, 's', 'second', 'seconds', 'metric', 'time', false),
(51, 'min', 'minute', 'minutes', 'metric', 'time', false),
(52, 'h', 'hour', 'hours', 'metric', 'time', false),
(53, 'd', 'day', 'days', 'metric', 'time', true)
ON CONFLICT ("id") DO NOTHING;
-- Seed Unit Conversions
INSERT INTO "core"."unit_conversions" ("from_unit_id", "to_unit_id", "multiplier") VALUES
-- Weight: metric
(1, 2, 0.001),  -- gram to kilogram
(3, 1, 0.001),  -- milligram to gram
(2, 1, 1000),   -- kilogram to gram

-- Weight: imperial
(4, 5, 0.0625), -- ounce to pound
(5, 4, 16),     -- pound to ounce

-- Weight: cross-system
(1, 4, 0.035274), -- gram to ounce
(2, 5, 2.20462),  -- kilogram to pound

-- Volume: metric
(10, 11, 0.001), -- milliliter to liter
(11, 10, 1000),  -- liter to milliliter

-- Volume: imperial
(12, 13, 0.125), -- fluid ounce to cup
(13, 14, 0.5),   -- cup to pint
(14, 15, 0.5),   -- pint to quart
(15, 16, 0.25),  -- quart to gallon
(16, 15, 4),     -- gallon to quart

-- Volume: cross-system
(11, 16, 0.264172), -- liter to gallon
(10, 12, 0.033814), -- milliliter to fluid ounce

-- Count
(20, 22, 1),     -- each to piece
(21, 20, 12),    -- dozen to each

-- Length: metric
(30, 31, 0.1),   -- millimeter to centimeter
(31, 32, 0.01),  -- centimeter to meter
(30, 32, 0.001), -- millimeter to meter

-- Length: imperial
(33, 34, 0.0833333), -- inch to foot
(34, 33, 12),        -- foot to inch

-- Length: cross-system
(31, 33, 0.393701),  -- centimeter to inch
(32, 34, 3.28084),   -- meter to foot

-- Time
(50, 51, 0.0166667), -- second to minute
(51, 52, 0.0166667), -- minute to hour
(52, 53, 0.0416667), -- hour to day
(51, 50, 60),        -- minute to second
(52, 51, 60),        -- hour to minute
(53, 52, 24)         -- day to hour
ON CONFLICT ("from_unit_id", "to_unit_id") DO NOTHING;
-- Seed Waste Reasons
INSERT INTO "core"."waste_reasons" ("id", "code", "name", "description", "color_hex", "is_active", "sort_order") VALUES
(1, 'spoilage', 'Spoilage', 'Food that has spoiled or expired', '#ef4444', true, 1),
(2, 'overproduction', 'Overproduction', 'Food prepared in excess of what was needed', '#f59e0b', true, 2),
(3, 'prep_error', 'Preparation Error', 'Mistakes made during food preparation', '#f97316', true, 3),
(4, 'burnt', 'Burnt', 'Food that was burnt during cooking', '#dc2626', true, 4),
(5, 'expired', 'Expired', 'Food that reached its expiration date before use', '#b91c1c', true, 5),
(6, 'quality', 'Quality Issues', 'Food that did not meet quality standards', '#eab308', true, 6),
(7, 'dropped', 'Dropped/Spilled', 'Food that was dropped or spilled', '#ca8a04', true, 7),
(8, 'leftovers', 'Leftovers', 'Uneaten food from events or service', '#84cc16', true, 8),
(9, 'customer_return', 'Customer Return', 'Food returned by customers', '#a3e635', true, 9),
(10, 'other', 'Other', 'Other waste reasons not covered above', '#6b7280', true, 10)
ON CONFLICT ("id") DO NOTHING;

-- ── DO Blocks (conditional FKs, data migrations) ──────────

-- Foreign Keys for event_budgets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'event_budgets_tenant_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."event_budgets"
        ADD CONSTRAINT "event_budgets_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'event_budgets_event_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."event_budgets"
        ADD CONSTRAINT "event_budgets_event_tenant_id_event_id_foreign" FOREIGN KEY ("tenant_id","event_id") REFERENCES "tenant_events"."events"("tenant_id","id") ON DELETE CASCADE;
    END IF;
END $$;
-- Foreign Keys for budget_line_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_line_items_tenant_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."budget_line_items"
        ADD CONSTRAINT "budget_line_items_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_line_items_budget_id_foreign'
    ) THEN
        ALTER TABLE "tenant_events"."budget_line_items"
        ADD CONSTRAINT "budget_line_items_tenant_id_budget_id_foreign" FOREIGN KEY ("tenant_id","budget_id") REFERENCES "tenant_events"."event_budgets"("tenant_id","id") ON DELETE CASCADE;
    END IF;
END $$;
-- Foreign Keys for budget_alerts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_alerts_tenant_id_foreign'
    ) THEN
        ALTER TABLE "tenant_staff"."budget_alerts"
        ADD CONSTRAINT "budget_alerts_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'budget_alerts_budget_id_foreign'
    ) THEN
        ALTER TABLE "tenant_staff"."budget_alerts"
        ADD CONSTRAINT "budget_alerts_tenant_id_budget_id_foreign" FOREIGN KEY ("tenant_id","budget_id") REFERENCES "tenant_events"."event_budgets"("tenant_id","id") ON DELETE CASCADE;
    END IF;
END $$;
-- Migration: Add foreign key constraints for referential integrity
-- This migration adds database-level foreign key constraints to enforce referential integrity
-- All ON DELETE behaviors are chosen based on business logic:
-- - CASCADE: Child records should be deleted when parent is deleted
-- - SET NULL: Child records should remain but lose reference (for soft-delete scenarios)
-- - RESTRICT: Parent cannot be deleted if children exist (for critical entities)

-- =====================================================
-- tenant_crm schema foreign keys
-- =====================================================

-- client_contacts.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_contacts_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_contacts
        ADD CONSTRAINT fk_client_contacts_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- client_interactions.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_interactions_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_interactions
        ADD CONSTRAINT fk_client_interactions_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- client_interactions.lead_id -> leads(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_interactions_lead'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_interactions
        ADD CONSTRAINT fk_client_interactions_lead
        FOREIGN KEY (tenant_id, lead_id)
        REFERENCES tenant_crm.leads(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- client_interactions.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_interactions_employee'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_interactions
        ADD CONSTRAINT fk_client_interactions_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- client_preferences.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_client_preferences_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.client_preferences
        ADD CONSTRAINT fk_client_preferences_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- clients.assigned_to -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_clients_assigned_to'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.clients
        ADD CONSTRAINT fk_clients_assigned_to
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- leads.assigned_to -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_leads_assigned_to'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.leads
        ADD CONSTRAINT fk_leads_assigned_to
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- leads.converted_to_client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_leads_converted_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.leads
        ADD CONSTRAINT fk_leads_converted_client
        FOREIGN KEY (tenant_id, converted_to_client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- proposal_line_items.proposal_id -> proposals(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposal_line_items_proposal'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposal_line_items
        ADD CONSTRAINT fk_proposal_line_items_proposal
        FOREIGN KEY (tenant_id, proposal_id)
        REFERENCES tenant_crm.proposals(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- proposals.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposals_client'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposals
        ADD CONSTRAINT fk_proposals_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- proposals.lead_id -> leads(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposals_lead'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposals
        ADD CONSTRAINT fk_proposals_lead
        FOREIGN KEY (tenant_id, lead_id)
        REFERENCES tenant_crm.leads(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- proposals.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_proposals_event'
        AND table_schema = 'tenant_crm'
    ) THEN
        ALTER TABLE tenant_crm.proposals
        ADD CONSTRAINT fk_proposals_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- =====================================================
-- tenant_events schema foreign keys
-- =====================================================

-- battle_boards.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_battle_boards_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.battle_boards
        ADD CONSTRAINT fk_battle_boards_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- budget_line_items.budget_id -> event_budgets(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_budget_line_items_budget'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.budget_line_items
        ADD CONSTRAINT fk_budget_line_items_budget
        FOREIGN KEY (tenant_id, budget_id)
        REFERENCES tenant_events.event_budgets(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- catering_orders.customer_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_catering_orders_customer'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.catering_orders
        ADD CONSTRAINT fk_catering_orders_customer
        FOREIGN KEY (tenant_id, customer_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- catering_orders.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_catering_orders_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.catering_orders
        ADD CONSTRAINT fk_catering_orders_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- command_board_cards.board_id -> command_boards(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_command_board_cards_board'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.command_board_cards
        ADD CONSTRAINT fk_command_board_cards_board
        FOREIGN KEY (tenant_id, board_id)
        REFERENCES tenant_events.command_boards(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- command_boards.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_command_boards_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.command_boards
        ADD CONSTRAINT fk_command_boards_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- contract_signatures.contract_id -> event_contracts(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_contract_signatures_contract'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.contract_signatures
        ADD CONSTRAINT fk_contract_signatures_contract
        FOREIGN KEY (tenant_id, contract_id)
        REFERENCES tenant_events.event_contracts(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_budgets.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_budgets_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_budgets
        ADD CONSTRAINT fk_event_budgets_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_contracts.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_contracts_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_contracts
        ADD CONSTRAINT fk_event_contracts_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_contracts.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_contracts_client'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_contracts
        ADD CONSTRAINT fk_event_contracts_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- event_dishes.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_dishes_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_dishes
        ADD CONSTRAINT fk_event_dishes_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_dishes.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_dishes_dish'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_dishes
        ADD CONSTRAINT fk_event_dishes_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- event_guests.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_guests_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_guests
        ADD CONSTRAINT fk_event_guests_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_imports.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_imports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_imports
        ADD CONSTRAINT fk_event_imports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_profitability.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_profitability_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_profitability
        ADD CONSTRAINT fk_event_profitability_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_staff_assignments.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_staff_assignments_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_staff_assignments
        ADD CONSTRAINT fk_event_staff_assignments_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_staff_assignments.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_staff_assignments_employee'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_staff_assignments
        ADD CONSTRAINT fk_event_staff_assignments_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- event_summaries.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_summaries_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_summaries
        ADD CONSTRAINT fk_event_summaries_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- event_timeline.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_timeline_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_timeline
        ADD CONSTRAINT fk_event_timeline_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- events.client_id -> clients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_client'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_client
        FOREIGN KEY (tenant_id, client_id)
        REFERENCES tenant_crm.clients(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- events.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_location'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- events.assigned_to -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_assigned_to'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_assigned_to
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- events.venue_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_events_venue'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.events
        ADD CONSTRAINT fk_events_venue
        FOREIGN KEY (tenant_id, venue_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- timeline_tasks.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timeline_tasks_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.timeline_tasks
        ADD CONSTRAINT fk_timeline_tasks_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- timeline_tasks.assignee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timeline_tasks_assignee'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.timeline_tasks
        ADD CONSTRAINT fk_timeline_tasks_assignee
        FOREIGN KEY (tenant_id, assignee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- =====================================================
-- tenant_inventory schema foreign keys
-- =====================================================

-- inventory_alerts.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_alerts_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_alerts
        ADD CONSTRAINT fk_inventory_alerts_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- inventory_stock.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_stock_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_stock
        ADD CONSTRAINT fk_inventory_stock_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- inventory_stock.storage_location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_stock_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_stock
        ADD CONSTRAINT fk_inventory_stock_location
        FOREIGN KEY (tenant_id, storage_location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- inventory_transactions.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_transactions_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_transactions
        ADD CONSTRAINT fk_inventory_transactions_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- inventory_transactions.storage_location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_inventory_transactions_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.inventory_transactions
        ADD CONSTRAINT fk_inventory_transactions_location
        FOREIGN KEY (tenant_id, storage_location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- purchase_order_items.purchase_order_id -> purchase_orders(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_order_items_po'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_po
        FOREIGN KEY (tenant_id, purchase_order_id)
        REFERENCES tenant_inventory.purchase_orders(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- purchase_order_items.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_order_items_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_order_items
        ADD CONSTRAINT fk_purchase_order_items_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- purchase_orders.vendor_id -> inventory_suppliers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_orders_vendor'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_orders
        ADD CONSTRAINT fk_purchase_orders_vendor
        FOREIGN KEY (tenant_id, vendor_id)
        REFERENCES tenant_inventory.inventory_suppliers(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- purchase_orders.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_purchase_orders_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.purchase_orders
        ADD CONSTRAINT fk_purchase_orders_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- shipment_items.shipment_id -> shipments(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipment_items_shipment'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipment_items
        ADD CONSTRAINT fk_shipment_items_shipment
        FOREIGN KEY (tenant_id, shipment_id)
        REFERENCES tenant_inventory.shipments(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- shipment_items.item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipment_items_item'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipment_items
        ADD CONSTRAINT fk_shipment_items_item
        FOREIGN KEY (tenant_id, item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- shipments.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipments_event'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipments
        ADD CONSTRAINT fk_shipments_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- shipments.supplier_id -> inventory_suppliers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipments_supplier'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipments
        ADD CONSTRAINT fk_shipments_supplier
        FOREIGN KEY (tenant_id, supplier_id)
        REFERENCES tenant_inventory.inventory_suppliers(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- shipments.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_shipments_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.shipments
        ADD CONSTRAINT fk_shipments_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- storage_locations.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_storage_locations_location'
        AND table_schema = 'tenant_inventory'
    ) THEN
        ALTER TABLE tenant_inventory.storage_locations
        ADD CONSTRAINT fk_storage_locations_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- =====================================================
-- tenant_kitchen schema foreign keys
-- =====================================================

-- allergen_warnings.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_allergen_warnings_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.allergen_warnings
        ADD CONSTRAINT fk_allergen_warnings_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- allergen_warnings.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_allergen_warnings_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.allergen_warnings
        ADD CONSTRAINT fk_allergen_warnings_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- allergen_warnings.acknowledged_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_allergen_warnings_acknowledged_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.allergen_warnings
        ADD CONSTRAINT fk_allergen_warnings_acknowledged_by
        FOREIGN KEY (tenant_id, acknowledged_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- containers.location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_containers_location'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.containers
        ADD CONSTRAINT fk_containers_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- dishes.recipe_id -> recipes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_dishes_recipe'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.dishes
        ADD CONSTRAINT fk_dishes_recipe
        FOREIGN KEY (tenant_id, recipe_id)
        REFERENCES tenant_kitchen.recipes(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- dishes.default_container_id -> containers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_dishes_container'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.dishes
        ADD CONSTRAINT fk_dishes_container
        FOREIGN KEY (tenant_id, default_container_id)
        REFERENCES tenant_kitchen.containers(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- menu_dishes.menu_id -> menus(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_menu_dishes_menu'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.menu_dishes
        ADD CONSTRAINT fk_menu_dishes_menu
        FOREIGN KEY (tenant_id, menu_id)
        REFERENCES tenant_kitchen.menus(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- menu_dishes.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_menu_dishes_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.menu_dishes
        ADD CONSTRAINT fk_menu_dishes_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- prep_comments.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_comments_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_comments
        ADD CONSTRAINT fk_prep_comments_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- prep_comments.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_comments_employee'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_comments
        ADD CONSTRAINT fk_prep_comments_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- prep_comments.resolved_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_comments_resolved_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_comments
        ADD CONSTRAINT fk_prep_comments_resolved_by
        FOREIGN KEY (tenant_id, resolved_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_list_items.prep_list_id -> prep_lists(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_list'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_list
        FOREIGN KEY (tenant_id, prep_list_id)
        REFERENCES tenant_kitchen.prep_lists(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- prep_list_items.ingredient_id -> ingredients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_ingredient'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_ingredient
        FOREIGN KEY (tenant_id, ingredient_id)
        REFERENCES tenant_kitchen.ingredients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- prep_list_items.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_list_items.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_recipe_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_recipe_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_list_items.completed_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_list_items_completed_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_list_items
        ADD CONSTRAINT fk_prep_list_items_completed_by
        FOREIGN KEY (tenant_id, completed_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_lists.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_lists_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_lists
        ADD CONSTRAINT fk_prep_lists_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- prep_tasks.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- prep_tasks.dish_id -> dishes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_dish'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_dish
        FOREIGN KEY (tenant_id, dish_id)
        REFERENCES tenant_kitchen.dishes(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_tasks.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_recipe_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_recipe_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_tasks.method_id -> prep_methods(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_method'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_method
        FOREIGN KEY (tenant_id, method_id)
        REFERENCES tenant_kitchen.prep_methods(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_tasks.container_id -> containers(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_container'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_container
        FOREIGN KEY (tenant_id, container_id)
        REFERENCES tenant_kitchen.containers(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- prep_tasks.location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_location'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- prep_tasks.import_id -> prep_list_imports(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_prep_tasks_import'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT fk_prep_tasks_import
        FOREIGN KEY (tenant_id, import_id)
        REFERENCES tenant_kitchen.prep_list_imports(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- recipe_ingredients.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_ingredients_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_ingredients
        ADD CONSTRAINT fk_recipe_ingredients_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- recipe_ingredients.ingredient_id -> ingredients(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_ingredients_ingredient'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_ingredients
        ADD CONSTRAINT fk_recipe_ingredients_ingredient
        FOREIGN KEY (tenant_id, ingredient_id)
        REFERENCES tenant_kitchen.ingredients(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- recipe_steps.recipe_version_id -> recipe_versions(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_steps_version'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_steps
        ADD CONSTRAINT fk_recipe_steps_version
        FOREIGN KEY (tenant_id, recipe_version_id)
        REFERENCES tenant_kitchen.recipe_versions(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- recipe_versions.recipe_id -> recipes(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_versions_recipe'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_versions
        ADD CONSTRAINT fk_recipe_versions_recipe
        FOREIGN KEY (tenant_id, recipe_id)
        REFERENCES tenant_kitchen.recipes(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- recipe_versions.locked_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_recipe_versions_locked_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.recipe_versions
        ADD CONSTRAINT fk_recipe_versions_locked_by
        FOREIGN KEY (tenant_id, locked_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- task_bundle_items.bundle_id -> task_bundles(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_bundle_items_bundle'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_bundle_items
        ADD CONSTRAINT fk_task_bundle_items_bundle
        FOREIGN KEY (tenant_id, bundle_id)
        REFERENCES tenant_kitchen.task_bundles(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- task_bundle_items.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_bundle_items_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_bundle_items
        ADD CONSTRAINT fk_task_bundle_items_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- task_bundles.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_bundles_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_bundles
        ADD CONSTRAINT fk_task_bundles_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- task_claims.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_claims_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_claims
        ADD CONSTRAINT fk_task_claims_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- task_claims.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_claims_employee'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_claims
        ADD CONSTRAINT fk_task_claims_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- task_progress.task_id -> kitchen_tasks(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_progress_task'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_progress
        ADD CONSTRAINT fk_task_progress_task
        FOREIGN KEY (tenant_id, task_id)
        REFERENCES tenant_kitchen.kitchen_tasks(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- task_progress.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_task_progress_employee'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.task_progress
        ADD CONSTRAINT fk_task_progress_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- waste_entries.inventory_item_id -> inventory_items(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_item'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_item
        FOREIGN KEY (tenant_id, inventory_item_id)
        REFERENCES tenant_inventory.inventory_items(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- waste_entries.location_id -> storage_locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_location'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant_inventory.storage_locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- waste_entries.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_event'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- waste_entries.logged_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_waste_entries_logged_by'
        AND table_schema = 'tenant_kitchen'
    ) THEN
        ALTER TABLE tenant_kitchen.waste_entries
        ADD CONSTRAINT fk_waste_entries_logged_by
        FOREIGN KEY (tenant_id, logged_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- =====================================================
-- tenant_staff schema foreign keys
-- =====================================================

-- budget_alerts.budget_id -> labor_budgets(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_budget_alerts_budget'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.budget_alerts
        ADD CONSTRAINT fk_budget_alerts_budget
        FOREIGN KEY (tenant_id, budget_id)
        REFERENCES tenant_staff.labor_budgets(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- budget_alerts.acknowledged_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_budget_alerts_acknowledged_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.budget_alerts
        ADD CONSTRAINT fk_budget_alerts_acknowledged_by
        FOREIGN KEY (tenant_id, acknowledged_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- employee_availability.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_availability_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_availability
        ADD CONSTRAINT fk_employee_availability_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- employee_certifications.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_certifications_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_certifications
        ADD CONSTRAINT fk_employee_certifications_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- employee_locations.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_locations_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_locations
        ADD CONSTRAINT fk_employee_locations_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- employee_locations.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_locations_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_locations
        ADD CONSTRAINT fk_employee_locations_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- employee_seniority.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_seniority_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_seniority
        ADD CONSTRAINT fk_employee_seniority_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- employee_skills.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_skills_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_skills
        ADD CONSTRAINT fk_employee_skills_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- employee_skills.skill_id -> skills(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_skills_skill'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_skills
        ADD CONSTRAINT fk_employee_skills_skill
        FOREIGN KEY (tenant_id, skill_id)
        REFERENCES tenant_staff.skills(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- employee_skills.verified_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_employee_skills_verified_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.employee_skills
        ADD CONSTRAINT fk_employee_skills_verified_by
        FOREIGN KEY (tenant_id, verified_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- labor_budgets.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_labor_budgets_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.labor_budgets
        ADD CONSTRAINT fk_labor_budgets_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- labor_budgets.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_labor_budgets_event'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.labor_budgets
        ADD CONSTRAINT fk_labor_budgets_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- open_shifts.schedule_id -> schedules(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_schedule'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_schedule
        FOREIGN KEY (tenant_id, schedule_id)
        REFERENCES tenant_staff.schedules(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- open_shifts.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- open_shifts.claimed_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_claimed_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_claimed_by
        FOREIGN KEY (tenant_id, claimed_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- open_shifts.assigned_shift_id -> schedule_shifts(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_open_shifts_assigned_shift'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.open_shifts
        ADD CONSTRAINT fk_open_shifts_assigned_shift
        FOREIGN KEY (tenant_id, assigned_shift_id)
        REFERENCES tenant_staff.schedule_shifts(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- payroll_line_items.payroll_run_id -> payroll_runs(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_line_items_run'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_line_items
        ADD CONSTRAINT fk_payroll_line_items_run
        FOREIGN KEY (tenant_id, payroll_run_id)
        REFERENCES tenant_staff.payroll_runs(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- payroll_line_items.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_line_items_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_line_items
        ADD CONSTRAINT fk_payroll_line_items_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- payroll_runs.payroll_period_id -> payroll_periods(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_runs_period'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_runs
        ADD CONSTRAINT fk_payroll_runs_period
        FOREIGN KEY (tenant_id, payroll_period_id)
        REFERENCES tenant_staff.payroll_periods(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- payroll_runs.approved_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_payroll_runs_approved_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.payroll_runs
        ADD CONSTRAINT fk_payroll_runs_approved_by
        FOREIGN KEY (tenant_id, approved_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- schedule_shifts.schedule_id -> schedules(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedule_shifts_schedule'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedule_shifts
        ADD CONSTRAINT fk_schedule_shifts_schedule
        FOREIGN KEY (tenant_id, schedule_id)
        REFERENCES tenant_staff.schedules(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- schedule_shifts.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedule_shifts_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedule_shifts
        ADD CONSTRAINT fk_schedule_shifts_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- schedule_shifts.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedule_shifts_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedule_shifts
        ADD CONSTRAINT fk_schedule_shifts_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- schedules.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedules_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedules
        ADD CONSTRAINT fk_schedules_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- schedules.published_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_schedules_published_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.schedules
        ADD CONSTRAINT fk_schedules_published_by
        FOREIGN KEY (tenant_id, published_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- time_entries.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- time_entries.location_id -> locations(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_location'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_location
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- time_entries.shift_id -> schedule_shifts(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_shift'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_shift
        FOREIGN KEY (tenant_id, shift_id)
        REFERENCES tenant_staff.schedule_shifts(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- time_entries.approved_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_time_entries_approved_by'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.time_entries
        ADD CONSTRAINT fk_time_entries_approved_by
        FOREIGN KEY (tenant_id, approved_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- timecard_edit_requests.time_entry_id -> time_entries(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timecard_edit_requests_entry'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.timecard_edit_requests
        ADD CONSTRAINT fk_timecard_edit_requests_entry
        FOREIGN KEY (tenant_id, time_entry_id)
        REFERENCES tenant_staff.time_entries(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- timecard_edit_requests.employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_timecard_edit_requests_employee'
        AND table_schema = 'tenant_staff'
    ) THEN
        ALTER TABLE tenant_staff.timecard_edit_requests
        ADD CONSTRAINT fk_timecard_edit_requests_employee
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- =====================================================
-- tenant schema foreign keys
-- =====================================================

-- documents.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_documents_event'
        AND table_schema = 'tenant'
    ) THEN
        ALTER TABLE tenant.documents
        ADD CONSTRAINT fk_documents_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- documents.battle_board_id -> battle_boards(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_documents_battle_board'
        AND table_schema = 'tenant'
    ) THEN
        ALTER TABLE tenant.documents
        ADD CONSTRAINT fk_documents_battle_board
        FOREIGN KEY (tenant_id, battle_board_id)
        REFERENCES tenant_events.battle_boards(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- =====================================================
-- tenant_admin schema foreign keys
-- =====================================================

-- notifications.recipient_employee_id -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_notifications_recipient'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.notifications
        ADD CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (tenant_id, recipient_employee_id)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- report_history.report_id -> reports(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_history_report'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_history
        ADD CONSTRAINT fk_report_history_report
        FOREIGN KEY (tenant_id, report_id)
        REFERENCES tenant_admin.reports(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- report_history.schedule_id -> report_schedules(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_history_schedule'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_history
        ADD CONSTRAINT fk_report_history_schedule
        FOREIGN KEY (tenant_id, schedule_id)
        REFERENCES tenant_admin.report_schedules(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- report_history.generated_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_history_generated_by'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_history
        ADD CONSTRAINT fk_report_history_generated_by
        FOREIGN KEY (tenant_id, generated_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- report_schedules.report_id -> reports(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_report_schedules_report'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.report_schedules
        ADD CONSTRAINT fk_report_schedules_report
        FOREIGN KEY (tenant_id, report_id)
        REFERENCES tenant_admin.reports(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- reports.created_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_reports_created_by'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.reports
        ADD CONSTRAINT fk_reports_created_by
        FOREIGN KEY (tenant_id, created_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- workflow_executions.workflow_id -> workflows(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_executions_workflow'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_executions
        ADD CONSTRAINT fk_workflow_executions_workflow
        FOREIGN KEY (tenant_id, workflow_id)
        REFERENCES tenant_admin.workflows(tenant_id, id)
        ON DELETE RESTRICT;
    END IF;
END $$;
-- workflow_executions.triggered_by -> User(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_executions_triggered_by'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_executions
        ADD CONSTRAINT fk_workflow_executions_triggered_by
        FOREIGN KEY (tenant_id, triggered_by)
        REFERENCES tenant_staff.employees(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- workflow_executions.current_step_id -> workflow_steps(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_executions_step'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_executions
        ADD CONSTRAINT fk_workflow_executions_step
        FOREIGN KEY (tenant_id, current_step_id)
        REFERENCES tenant_admin.workflow_steps(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- workflow_steps.workflow_id -> workflows(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_steps_workflow'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_steps
        ADD CONSTRAINT fk_workflow_steps_workflow
        FOREIGN KEY (tenant_id, workflow_id)
        REFERENCES tenant_admin.workflows(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- workflow_steps.on_success_step_id -> workflow_steps(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_steps_success'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_steps
        ADD CONSTRAINT fk_workflow_steps_success
        FOREIGN KEY (tenant_id, on_success_step_id)
        REFERENCES tenant_admin.workflow_steps(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- workflow_steps.on_failure_step_id -> workflow_steps(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_workflow_steps_failure'
        AND table_schema = 'tenant_admin'
    ) THEN
        ALTER TABLE tenant_admin.workflow_steps
        ADD CONSTRAINT fk_workflow_steps_failure
        FOREIGN KEY (tenant_id, on_failure_step_id)
        REFERENCES tenant_admin.workflow_steps(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
-- Add foreign key constraint for event_reports.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_reports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_reports
        ADD CONSTRAINT fk_event_reports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
-- Re-add the FK constraint (allows NULL values)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_imports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_imports
        ADD CONSTRAINT fk_event_imports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- ── Data Migrations (UPDATE) ──────────────────────────────

UPDATE "tenant_kitchen"."recipe_versions" rv
SET
  "name" = r."name",
  "category" = r."category",
  "cuisine_type" = r."cuisine_type",
  "description" = r."description",
  "tags" = r."tags"
FROM "tenant_kitchen"."recipes" r
WHERE r."tenant_id" = rv."tenant_id"
  AND r."id" = rv."recipe_id"
  AND rv."name" IS NULL;

