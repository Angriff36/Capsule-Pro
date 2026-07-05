-- Corrects two defects found by independent forensic review of
-- 20260705063000_enum_column_alignment, plus one insert-path hazard class.

-- ── 1. Enum NAMESPACE corrections ───────────────────────────────────────────
-- The previous migration matched enum NAMES but not their Prisma-mapped pg
-- type: infra.prisma declares ActionType/UnitSystem/UnitType with
-- @@map + @@schema("core") (core.action_type / core.unit_system /
-- core.unit_type — which already existed), so converting these 4 columns to
-- NEW public.* types recreated the exact text-vs-enum failure one namespace
-- over. Convert to the schema-mapped core types and drop the wrong ones.
ALTER TABLE "platform"."audit_archive" ALTER COLUMN "action" TYPE "core"."action_type" USING "action"::text::"core"."action_type";
ALTER TABLE "platform"."audit_log" ALTER COLUMN "action" TYPE "core"."action_type" USING "action"::text::"core"."action_type";
ALTER TABLE "core"."units" ALTER COLUMN "unit_system" TYPE "core"."unit_system" USING "unit_system"::text::"core"."unit_system";
ALTER TABLE "core"."units" ALTER COLUMN "unit_type" TYPE "core"."unit_type" USING "unit_type"::text::"core"."unit_type";
DROP TYPE "public"."ActionType";
DROP TYPE "public"."UnitSystem";
DROP TYPE "public"."UnitType";

-- Pre-existing sibling of the same class: shipments.status was created on
-- core."ShipmentStatus" but manifest.prisma declares ShipmentStatus
-- @@schema("public") — status-filtered shipment queries fail with
-- "operator does not exist". Both types carry identical labels; table is
-- empty (verified). core."ShipmentStatus" kept: dropping types not created
-- by these migrations stays out of scope.
ALTER TABLE "tenant_inventory"."shipments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tenant_inventory"."shipments" ALTER COLUMN "status" TYPE "public"."ShipmentStatus" USING "status"::text::"public"."ShipmentStatus";
ALTER TABLE "tenant_inventory"."shipments" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."ShipmentStatus";

-- ── 2. Default drift ─────────────────────────────────────────────────────────
-- Generated schema declares PrepTask.status @default(open); the previous
-- migration preserved the stale live default 'pending'.
ALTER TABLE "tenant_kitchen"."prep_tasks" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."PrepTaskStatus";

-- ── 3. Insert-path unblock: live-only NOT NULL columns ──────────────────────
-- These columns exist live but are NOT declared in the generated schema
-- (legacy leftovers the 3.x projection dropped). Prisma never writes them, so
-- every INSERT into these tables fails with 23502. Verified per column:
-- absent from the model in packages/database/prisma/schema/*.prisma,
-- is_nullable=NO, no default. DROP NOT NULL is non-destructive + reversible.
ALTER TABLE "tenant_accounting"."collection_actions" ALTER COLUMN "contacted_at" DROP NOT NULL;
ALTER TABLE "tenant_accounting"."collection_payment_plans" ALTER COLUMN "frequency_days" DROP NOT NULL;
ALTER TABLE "tenant"."documents" ALTER COLUMN "file_name" DROP NOT NULL;
ALTER TABLE "tenant"."documents" ALTER COLUMN "file_type" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."forecast_inputs" ALTER COLUMN "historical_usage" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."inventory_forecasts" ALTER COLUMN "forecast" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."inventory_forecasts" ALTER COLUMN "lower_bound" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."inventory_forecasts" ALTER COLUMN "upper_bound" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."inventory_forecasts" ALTER COLUMN "horizon_days" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."inventory_transfers" ALTER COLUMN "transfer_number" DROP NOT NULL;
ALTER TABLE "tenant"."knowledge_base_entries" ALTER COLUMN "slug" DROP NOT NULL;
ALTER TABLE "tenant_staff"."labor_budgets" ALTER COLUMN "budget_unit" DROP NOT NULL;
ALTER TABLE "tenant_kitchen"."method_videos" ALTER COLUMN "method_id" DROP NOT NULL;
ALTER TABLE "tenant_kitchen"."method_videos" ALTER COLUMN "video_url" DROP NOT NULL;
ALTER TABLE "tenant_staff"."open_shifts" ALTER COLUMN "location_id" DROP NOT NULL;
ALTER TABLE "tenant_kitchen"."prep_list_imports" ALTER COLUMN "source_system" DROP NOT NULL;
ALTER TABLE "tenant_kitchen"."prep_list_imports" ALTER COLUMN "imported_by" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."reorder_suggestions" ALTER COLUMN "recommended_order_qty" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."reorder_suggestions" ALTER COLUMN "reorder_point" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."reorder_suggestions" ALTER COLUMN "safety_stock" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."reorder_suggestions" ALTER COLUMN "lead_time_days" DROP NOT NULL;
ALTER TABLE "tenant_inventory"."reorder_suggestions" ALTER COLUMN "justification" DROP NOT NULL;
-- task_bundle_items.bundle_id/task_id are members of the composite PRIMARY KEY
-- (cannot drop NOT NULL); that table's Prisma insert path remains a known
-- composite-PK limitation and is excluded here.
ALTER TABLE "tenant_staff"."employee_time_off_requests" ALTER COLUMN "hours" DROP NOT NULL;
