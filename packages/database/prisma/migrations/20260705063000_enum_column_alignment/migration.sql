-- Align live enum-typed columns with the generated Prisma schema.
-- The 3.1.3 projection declares these columns as Postgres enums, but the live
-- columns were still TEXT (or an older snake_named enum type) — so EVERY
-- Prisma filter on them failed with "operator does not exist: text = <Enum>"
-- (verified live 2026-07-04: prepList.count status eq AND notIn both failed;
-- /api/kitchen/events/today 500'd on it).
--
-- Idempotent for prod recovery: Deploy 2026-07-09 failed mid-apply (P3018).
-- Re-runs must tolerate columns/types already converted, and must compare
-- status via ::text so hyphenated literals are not cast into the enum.

-- 0. Data repair: hyphenated legacy statuses → underscore enum members.
-- Compare/set through text so this works whether the column is still TEXT
-- or already an enum (invalid enum literals cannot be stored; 0 rows then).
UPDATE "tenant_admin"."admin_tasks"
SET "status" = 'in_progress'
WHERE "status"::text = 'in-progress';
UPDATE "tenant_kitchen"."kitchen_tasks"
SET "status" = 'in_progress'
WHERE "status"::text = 'in-progress';
UPDATE "tenant_kitchen"."prep_tasks"
SET "status" = 'in_progress'
WHERE "status"::text = 'in-progress';
UPDATE "tenant_kitchen"."work_orders"
SET "status" = 'in_progress'
WHERE "status"::text = 'in-progress';

-- 1. Enum types the schema expects (no-op if already present)
DO $$ BEGIN
  CREATE TYPE "public"."AdminTaskStatus" AS ENUM ('backlog', 'in_progress', 'review', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "public"."ActionType" AS ENUM ('insert', 'update', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "public"."UnitSystem" AS ENUM ('metric', 'imperial', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "public"."UnitType" AS ENUM ('volume', 'weight', 'count', 'length', 'temperature', 'time');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. TEXT/legacy -> enum conversions (defaults preserved as introspected).
-- Cast through ::text so already-enum columns re-apply cleanly.
ALTER TABLE "tenant_admin"."admin_tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_admin"."admin_tasks" ALTER COLUMN "status" TYPE "public"."AdminTaskStatus" USING "status"::text::"public"."AdminTaskStatus";
ALTER TABLE "tenant_admin"."admin_tasks" ALTER COLUMN "status" SET DEFAULT 'backlog'::"public"."AdminTaskStatus";

ALTER TABLE "public"."Budget" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Budget" ALTER COLUMN "status" TYPE "public"."BudgetStatus" USING "status"::text::"public"."BudgetStatus";
ALTER TABLE "public"."Budget" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."BudgetStatus";

ALTER TABLE "public"."Deal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Deal" ALTER COLUMN "status" TYPE "public"."DealStatus" USING "status"::text::"public"."DealStatus";
ALTER TABLE "public"."Deal" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."DealStatus";

ALTER TABLE "tenant_kitchen"."kitchen_tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."kitchen_tasks" ALTER COLUMN "status" TYPE "public"."KitchenTaskStatus" USING "status"::text::"public"."KitchenTaskStatus";
ALTER TABLE "tenant_kitchen"."kitchen_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."KitchenTaskStatus";

ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "status" TYPE "public"."MenuStatus" USING "status"::text::"public"."MenuStatus";
ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."MenuStatus";

ALTER TABLE "tenant_staff"."payroll_periods" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_staff"."payroll_periods" ALTER COLUMN "status" TYPE "public"."PayrollPeriodStatus" USING "status"::text::"public"."PayrollPeriodStatus";
ALTER TABLE "tenant_staff"."payroll_periods" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."PayrollPeriodStatus";

ALTER TABLE "tenant_staff"."payroll_runs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_staff"."payroll_runs" ALTER COLUMN "status" TYPE "public"."PayrollRunStatus" USING "status"::text::"public"."PayrollRunStatus";
ALTER TABLE "tenant_staff"."payroll_runs" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."PayrollRunStatus";

ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "status" TYPE "public"."PrepListStatus" USING "status"::text::"public"."PrepListStatus";
ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."PrepListStatus";

ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "status" TYPE "public"."PrepTaskStatus" USING "status"::text::"public"."PrepTaskStatus";
ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."PrepTaskStatus";

ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ALTER COLUMN "status" TYPE "public"."PrepTaskPlanWorkflowStatus" USING "status"::text::"public"."PrepTaskPlanWorkflowStatus";
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ALTER COLUMN "status" SET DEFAULT 'created'::"public"."PrepTaskPlanWorkflowStatus";

ALTER TABLE "tenant_crm"."proposals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_crm"."proposals" ALTER COLUMN "status" TYPE "public"."ProposalStatus" USING "status"::text::"public"."ProposalStatus";
ALTER TABLE "tenant_crm"."proposals" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."ProposalStatus";

ALTER TABLE "tenant_kitchen"."qa_checks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."qa_checks" ALTER COLUMN "status" TYPE "public"."QACheckStatus" USING "status"::text::"public"."QACheckStatus";
ALTER TABLE "tenant_kitchen"."qa_checks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."QACheckStatus";

ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "status" TYPE "public"."RecipeVersionStatus" USING "status"::text::"public"."RecipeVersionStatus";
ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."RecipeVersionStatus";

ALTER TABLE "tenant_staff"."schedules" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_staff"."schedules" ALTER COLUMN "status" TYPE "public"."ScheduleStatus" USING "status"::text::"public"."ScheduleStatus";
ALTER TABLE "tenant_staff"."schedules" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."ScheduleStatus";

ALTER TABLE "tenant_kitchen"."work_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."work_orders" ALTER COLUMN "status" TYPE "public"."WorkOrderStatus" USING "status"::text::"public"."WorkOrderStatus";
ALTER TABLE "tenant_kitchen"."work_orders" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."WorkOrderStatus";

-- 3. Old snake-named enum types -> the Pascal types the schema expects
--    (old types action_type/unit_system/unit_type left in place; dropping is out of scope)
ALTER TABLE "platform"."audit_archive" ALTER COLUMN "action" TYPE "public"."ActionType" USING "action"::text::"public"."ActionType";
ALTER TABLE "platform"."audit_log" ALTER COLUMN "action" TYPE "public"."ActionType" USING "action"::text::"public"."ActionType";
ALTER TABLE "core"."units" ALTER COLUMN "unit_system" TYPE "public"."UnitSystem" USING "unit_system"::text::"public"."UnitSystem";
ALTER TABLE "core"."units" ALTER COLUMN "unit_type" TYPE "public"."UnitType" USING "unit_type"::text::"public"."UnitType";
