-- Align live enum-typed columns with the generated Prisma schema.
-- The 3.1.3 projection declares these columns as Postgres enums, but the live
-- columns were still TEXT (or an older snake_named enum type) — so EVERY
-- Prisma filter on them failed with "operator does not exist: text = <Enum>"
-- (verified live 2026-07-04: prepList.count status eq AND notIn both failed;
-- /api/kitchen/events/today 500'd on it). All target enum types/members and
-- current defaults were introspected from the live DB before authoring.
--
-- Hyphenated legacy TEXT values ('in-progress') must be normalized before
-- ALTER ... TYPE <Enum>. Prod deploy 2026-07-09 failed with 22P02 on
-- kitchen_tasks because only prep_tasks was repaired (P3018).

-- 0. Data repair: hyphenated legacy statuses → underscore enum members
UPDATE "tenant_admin"."admin_tasks" SET "status" = 'in_progress' WHERE "status" = 'in-progress';
UPDATE "tenant_kitchen"."kitchen_tasks" SET "status" = 'in_progress' WHERE "status" = 'in-progress';
UPDATE "tenant_kitchen"."prep_tasks" SET "status" = 'in_progress' WHERE "status" = 'in-progress';
UPDATE "tenant_kitchen"."work_orders" SET "status" = 'in_progress' WHERE "status" = 'in-progress';

-- 1. Enum types the schema expects that don't exist yet
CREATE TYPE "public"."AdminTaskStatus" AS ENUM ('backlog', 'in_progress', 'review', 'done', 'cancelled');
CREATE TYPE "public"."ActionType" AS ENUM ('insert', 'update', 'delete');
CREATE TYPE "public"."UnitSystem" AS ENUM ('metric', 'imperial', 'custom');
CREATE TYPE "public"."UnitType" AS ENUM ('volume', 'weight', 'count', 'length', 'temperature', 'time');

-- 2. TEXT -> enum conversions (defaults preserved as introspected)
ALTER TABLE "tenant_admin"."admin_tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_admin"."admin_tasks" ALTER COLUMN "status" TYPE "public"."AdminTaskStatus" USING "status"::"public"."AdminTaskStatus";
ALTER TABLE "tenant_admin"."admin_tasks" ALTER COLUMN "status" SET DEFAULT 'backlog'::"public"."AdminTaskStatus";

ALTER TABLE "public"."Budget" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Budget" ALTER COLUMN "status" TYPE "public"."BudgetStatus" USING "status"::"public"."BudgetStatus";
ALTER TABLE "public"."Budget" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."BudgetStatus";

ALTER TABLE "public"."Deal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Deal" ALTER COLUMN "status" TYPE "public"."DealStatus" USING "status"::"public"."DealStatus";
ALTER TABLE "public"."Deal" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."DealStatus";

ALTER TABLE "tenant_kitchen"."kitchen_tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."kitchen_tasks" ALTER COLUMN "status" TYPE "public"."KitchenTaskStatus" USING "status"::"public"."KitchenTaskStatus";
ALTER TABLE "tenant_kitchen"."kitchen_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."KitchenTaskStatus";

ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "status" TYPE "public"."MenuStatus" USING "status"::"public"."MenuStatus";
ALTER TABLE "tenant_kitchen"."menus" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."MenuStatus";

ALTER TABLE "tenant_staff"."payroll_periods" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_staff"."payroll_periods" ALTER COLUMN "status" TYPE "public"."PayrollPeriodStatus" USING "status"::"public"."PayrollPeriodStatus";
ALTER TABLE "tenant_staff"."payroll_periods" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."PayrollPeriodStatus";

ALTER TABLE "tenant_staff"."payroll_runs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_staff"."payroll_runs" ALTER COLUMN "status" TYPE "public"."PayrollRunStatus" USING "status"::"public"."PayrollRunStatus";
ALTER TABLE "tenant_staff"."payroll_runs" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."PayrollRunStatus";

ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "status" TYPE "public"."PrepListStatus" USING "status"::"public"."PrepListStatus";
ALTER TABLE "tenant_kitchen"."prep_lists" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."PrepListStatus";

ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "status" TYPE "public"."PrepTaskStatus" USING "status"::"public"."PrepTaskStatus";
ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."PrepTaskStatus";

ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ALTER COLUMN "status" TYPE "public"."PrepTaskPlanWorkflowStatus" USING "status"::"public"."PrepTaskPlanWorkflowStatus";
ALTER TABLE "tenant_kitchen"."prep_task_plan_workflows" ALTER COLUMN "status" SET DEFAULT 'created'::"public"."PrepTaskPlanWorkflowStatus";

ALTER TABLE "tenant_crm"."proposals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_crm"."proposals" ALTER COLUMN "status" TYPE "public"."ProposalStatus" USING "status"::"public"."ProposalStatus";
ALTER TABLE "tenant_crm"."proposals" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."ProposalStatus";

ALTER TABLE "tenant_kitchen"."qa_checks" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."qa_checks" ALTER COLUMN "status" TYPE "public"."QACheckStatus" USING "status"::"public"."QACheckStatus";
ALTER TABLE "tenant_kitchen"."qa_checks" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."QACheckStatus";

ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "status" TYPE "public"."RecipeVersionStatus" USING "status"::"public"."RecipeVersionStatus";
ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."RecipeVersionStatus";

ALTER TABLE "tenant_staff"."schedules" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_staff"."schedules" ALTER COLUMN "status" TYPE "public"."ScheduleStatus" USING "status"::"public"."ScheduleStatus";
ALTER TABLE "tenant_staff"."schedules" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."ScheduleStatus";

ALTER TABLE "tenant_kitchen"."work_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_kitchen"."work_orders" ALTER COLUMN "status" TYPE "public"."WorkOrderStatus" USING "status"::"public"."WorkOrderStatus";
ALTER TABLE "tenant_kitchen"."work_orders" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."WorkOrderStatus";

-- 3. Old snake-named enum types -> the Pascal types the schema expects
--    (old types action_type/unit_system/unit_type left in place; dropping is out of scope)
ALTER TABLE "platform"."audit_archive" ALTER COLUMN "action" TYPE "public"."ActionType" USING "action"::text::"public"."ActionType";
ALTER TABLE "platform"."audit_log" ALTER COLUMN "action" TYPE "public"."ActionType" USING "action"::text::"public"."ActionType";
ALTER TABLE "core"."units" ALTER COLUMN "unit_system" TYPE "public"."UnitSystem" USING "unit_system"::text::"public"."UnitSystem";
ALTER TABLE "core"."units" ALTER COLUMN "unit_type" TYPE "public"."UnitType" USING "unit_type"::text::"public"."UnitType";
