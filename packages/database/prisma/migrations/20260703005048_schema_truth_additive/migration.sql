-- schema_truth_additive: close the schema-vs-database structural gap (additive only).
--
-- 1) CREATE TABLE for 6 declared-but-never-migrated entities
--    (bank_accounts, logistics_routes, qa_corrective_actions, qa_temperature_logs,
--     event_import_workflows, event_timeline_items) + ADD COLUMN for declared
--    fields whose columns never existed. NOT NULL adds without DEFAULT target
--    tables verified EMPTY in dev (forecast_inputs, inventory_forecasts,
--    reorder_suggestions, corrective_actions, method_videos, prep_list_imports,
--    task_bundle_items); if prod has rows there the deploy fails closed
--    (pre-migrate Neon snapshot) rather than corrupting.
-- 2) createdAt/updatedAt SET NOT NULL on 33 legacy-nullable columns — the
--    engine writes them unconditionally; 0 NULL rows in dev, defensive
--    backfill first so prod NULLs cannot fail the deploy.
-- 3) Scalar-list repair: Prisma String[] is non-nullable, but these columns
--    held NULL rows (events.accessibility_options had 2,524). Backfill '{}',
--    default '{}', tighten.

-- ── 1. missing tables + columns ────────────────────────────────────────────
ALTER TABLE "tenant"."documents"
  ADD COLUMN IF NOT EXISTS "document_type" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "entity_id" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "entity_type" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "file_size_bytes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "file_url" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS "uploaded_by" TEXT NOT NULL DEFAULT '';

ALTER TABLE "tenant_inventory"."forecast_inputs"
  ADD COLUMN IF NOT EXISTS "actual_usage" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "input_date" TIMESTAMP(3) NOT NULL,
  ADD COLUMN IF NOT EXISTS "inventory_item_id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL;

ALTER TABLE "tenant_inventory"."inventory_forecasts"
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approved_by" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "forecast_date" TIMESTAMP(3) NOT NULL,
  ADD COLUMN IF NOT EXISTS "inventory_item_id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "projected_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL;

ALTER TABLE "tenant_inventory"."inventory_transfers"
  ADD COLUMN IF NOT EXISTS "items" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "tenant_inventory"."reorder_suggestions"
  ADD COLUMN IF NOT EXISTS "inventory_item_id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "reason" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "suggested_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL;

ALTER TABLE "tenant_inventory"."shipments"
  ADD COLUMN IF NOT EXISTS "signature_data" TEXT NOT NULL DEFAULT '';

ALTER TABLE "tenant_inventory"."storage_locations"
  ADD COLUMN IF NOT EXISTS "temperature_zone" TEXT NOT NULL DEFAULT '';

ALTER TABLE "tenant_kitchen"."corrective_actions"
  ADD COLUMN IF NOT EXISTS "source_id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL;

ALTER TABLE "tenant_kitchen"."kitchen_tasks"
  ADD COLUMN IF NOT EXISTS "assigned_to" TEXT NOT NULL DEFAULT '';

ALTER TABLE "tenant_kitchen"."method_videos"
  ADD COLUMN IF NOT EXISTS "prep_method_id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "url" TEXT NOT NULL;

ALTER TABLE "tenant_kitchen"."prep_list_imports"
  ADD COLUMN IF NOT EXISTS "error_message" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "file_name" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "imported_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL;

ALTER TABLE "tenant_kitchen"."prep_tasks"
  ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "claimed_by" TEXT NOT NULL DEFAULT '';

ALTER TABLE "tenant_kitchen"."task_bundle_items"
  ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "kitchen_task_id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "task_bundle_id" TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL;

ALTER TABLE "tenant_kitchen"."task_bundles"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

ALTER TABLE "tenant_kitchen"."temperature_probes"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "tenant_staff"."open_shifts"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT '';

ALTER TABLE "tenant_staff"."schedules"
  ADD COLUMN IF NOT EXISTS "shift_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "tenant_staff"."bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "routing_number" TEXT NOT NULL,
    "account_type" TEXT NOT NULL DEFAULT 'checking',
    "bank_name" TEXT NOT NULL DEFAULT '',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "verified_at" TIMESTAMPTZ(6),
    "verification_failed_at" TIMESTAMPTZ(6),
    "verification_failure_reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_import_workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'created',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 6,
    "input_data" JSONB NOT NULL DEFAULT '{}',
    "output_data" JSONB NOT NULL DEFAULT '{}',
    "step_results" JSONB NOT NULL DEFAULT '{}',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_import_workflows_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_timeline_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "item_type" TEXT NOT NULL DEFAULT 'task',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assigned_to" TEXT NOT NULL DEFAULT '',
    "due_date" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "event_timeline_items_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_logistics"."logistics_routes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "vehicle_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "total_distance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_duration" INTEGER NOT NULL DEFAULT 0,
    "scheduled_date" DATE NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "actual_start_time" TIMESTAMPTZ(6) NOT NULL,
    "actual_end_time" TIMESTAMPTZ(6) NOT NULL,
    "completed_stops" INTEGER NOT NULL DEFAULT 0,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "logistics_routes_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."qa_corrective_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "related_check_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "assigned_to" UUID NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution_notes" TEXT NOT NULL DEFAULT '',
    "escalated_to" UUID NOT NULL,
    "escalation_reason" TEXT NOT NULL DEFAULT '',
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6) NOT NULL,
    "escalated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "qa_corrective_actions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."qa_temperature_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "log_type" TEXT NOT NULL,
    "temperature" DECIMAL(6,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'fahrenheit',
    "equipment_id" UUID NOT NULL,
    "logged_by" UUID NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "logged_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "qa_temperature_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "event_timeline_items_event_id_idx" ON "tenant_events"."event_timeline_items"("event_id");

CREATE INDEX IF NOT EXISTS "logistics_routes_tenant_id_status_idx" ON "tenant_logistics"."logistics_routes"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "logistics_routes_tenant_id_scheduled_date_idx" ON "tenant_logistics"."logistics_routes"("tenant_id", "scheduled_date");

CREATE INDEX IF NOT EXISTS "qa_corrective_actions_tenant_id_status_idx" ON "tenant_kitchen"."qa_corrective_actions"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "qa_corrective_actions_tenant_id_severity_idx" ON "tenant_kitchen"."qa_corrective_actions"("tenant_id", "severity");

CREATE INDEX IF NOT EXISTS "qa_temperature_logs_tenant_id_log_type_idx" ON "tenant_kitchen"."qa_temperature_logs"("tenant_id", "log_type");

CREATE INDEX IF NOT EXISTS "qa_temperature_logs_tenant_id_logged_at_idx" ON "tenant_kitchen"."qa_temperature_logs"("tenant_id", "logged_at");

-- ── 2. engine-owned timestamps become NOT NULL ─────────────────────────────
UPDATE "public"."AiEventSetupSession" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."AiEventSetupSession" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."AiEventSetupSession" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."AiEventSetupSession" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "tenant_inventory"."alerts_config" SET "updated_at" = now() WHERE "updated_at" IS NULL;
ALTER TABLE "tenant_inventory"."alerts_config" ALTER COLUMN "updated_at" SET NOT NULL;
UPDATE "public"."AutomatedFollowup" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."AutomatedFollowup" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."AutomatedFollowup" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."AutomatedFollowup" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."Budget" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."Budget" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."Budget" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."Budget" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "tenant_accounting"."collection_actions" SET "updated_at" = now() WHERE "updated_at" IS NULL;
ALTER TABLE "tenant_accounting"."collection_actions" ALTER COLUMN "updated_at" SET NOT NULL;
UPDATE "public"."Deal" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."Deal" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."Deal" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."Deal" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."EntityVersion" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."EntityVersion" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."EntityVersion" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."EntityVersion" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "tenant_events"."event_staff" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "tenant_events"."event_staff" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "tenant_events"."event_staff" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "tenant_events"."event_staff" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."EventWaitlistEntry" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."EventWaitlistEntry" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."EventWaitlistEntry" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."EventWaitlistEntry" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."FacilitySchedule" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."FacilitySchedule" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."FacilitySchedule" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."FacilitySchedule" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."FacilityWorkOrder" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."FacilityWorkOrder" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."FacilityWorkOrder" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."FacilityWorkOrder" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "tenant_crm"."interaction_attachments" SET "updated_at" = now() WHERE "updated_at" IS NULL;
ALTER TABLE "tenant_crm"."interaction_attachments" ALTER COLUMN "updated_at" SET NOT NULL;
UPDATE "public"."LogisticsDispatch" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."LogisticsDispatch" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."LogisticsDispatch" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."LogisticsDispatch" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."StaffPerformance" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."StaffPerformance" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."StaffPerformance" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."StaffPerformance" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."Vendor" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."Vendor" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."Vendor" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."Vendor" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."VersionApproval" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."VersionApproval" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."VersionApproval" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."VersionApproval" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."VersionedEntity" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."VersionedEntity" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."VersionedEntity" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."VersionedEntity" ALTER COLUMN "updatedAt" SET NOT NULL;
UPDATE "public"."WorkforceOptimization" SET "createdAt" = now() WHERE "createdAt" IS NULL;
ALTER TABLE "public"."WorkforceOptimization" ALTER COLUMN "createdAt" SET NOT NULL;
UPDATE "public"."WorkforceOptimization" SET "updatedAt" = now() WHERE "updatedAt" IS NULL;
ALTER TABLE "public"."WorkforceOptimization" ALTER COLUMN "updatedAt" SET NOT NULL;

-- ── 3. scalar-list columns: never NULL again ───────────────────────────────
UPDATE "tenant_events"."events" SET "accessibility_options" = '{}' WHERE "accessibility_options" IS NULL;
ALTER TABLE "tenant_events"."events" ALTER COLUMN "accessibility_options" SET DEFAULT '{}';
ALTER TABLE "tenant_events"."events" ALTER COLUMN "accessibility_options" SET NOT NULL;
UPDATE "tenant_events"."events" SET "tags" = '{}' WHERE "tags" IS NULL;
ALTER TABLE "tenant_events"."events" ALTER COLUMN "tags" SET DEFAULT '{}';
ALTER TABLE "tenant_events"."events" ALTER COLUMN "tags" SET NOT NULL;
UPDATE "tenant_kitchen"."recipes" SET "tags" = '{}' WHERE "tags" IS NULL;
ALTER TABLE "tenant_kitchen"."recipes" ALTER COLUMN "tags" SET DEFAULT '{}';
ALTER TABLE "tenant_kitchen"."recipes" ALTER COLUMN "tags" SET NOT NULL;
UPDATE "tenant_kitchen"."recipe_versions" SET "tags" = '{}' WHERE "tags" IS NULL;
ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "tags" SET DEFAULT '{}';
ALTER TABLE "tenant_kitchen"."recipe_versions" ALTER COLUMN "tags" SET NOT NULL;
