-- Quality Control Models Migration
-- Create tables for quality control workflows with inspection checklists,
-- approval processes, and corrective action tracking

-- QualityChecklist: Reusable inspection templates
CREATE TABLE "tenant_kitchen"."quality_checklists" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "checklist_data" JSONB NOT NULL DEFAULT '{}',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Indexes for QualityChecklist
CREATE INDEX "quality_checklists_tenant_category_idx" ON "tenant_kitchen"."quality_checklists"("tenant_id", "category");
CREATE INDEX "quality_checklists_tenant_is_active_idx" ON "tenant_kitchen"."quality_checklists"("tenant_id", "is_active");

-- QualityChecklistItem: Individual items in a checklist
CREATE TABLE "tenant_kitchen"."quality_checklist_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklist_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "pass_criteria" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Indexes for QualityChecklistItem
CREATE INDEX "quality_checklist_items_tenant_checklist_idx" ON "tenant_kitchen"."quality_checklist_items"("tenant_id", "checklist_id");
CREATE INDEX "quality_checklist_items_tenant_category_idx" ON "tenant_kitchen"."quality_checklist_items"("tenant_id", "category");

-- QualityInspection: Inspection records using checklists
CREATE TABLE "tenant_kitchen"."quality_inspections" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "inspection_number" TEXT NOT NULL UNIQUE,
    "inspection_name" TEXT NOT NULL,
    "inspection_type" TEXT NOT NULL DEFAULT 'routine',
    "scheduled_date" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "inspection_data" JSONB NOT NULL DEFAULT '{}',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "passed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "skipped_items" INTEGER NOT NULL DEFAULT 0,
    "pass_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assigned_to_id" UUID,
    "inspected_by_id" UUID,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Indexes for QualityInspection
CREATE INDEX "quality_inspections_tenant_location_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "location_id");
CREATE INDEX "quality_inspections_tenant_status_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "status");
CREATE INDEX "quality_inspections_tenant_scheduled_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "scheduled_date");
CREATE INDEX "quality_inspections_tenant_type_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "inspection_type");

-- QualityInspectionItem: Individual inspection item responses
CREATE TABLE "tenant_kitchen"."quality_inspection_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_id" UUID NOT NULL,
    "checklist_item_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_value" TEXT,
    "numeric_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "temperature_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photo_url" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_corrective_action_required" BOOLEAN NOT NULL DEFAULT false,
    "corrective_action_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Indexes for QualityInspectionItem
CREATE INDEX "quality_inspection_items_tenant_inspection_idx" ON "tenant_kitchen"."quality_inspection_items"("tenant_id", "inspection_id");
CREATE INDEX "quality_inspection_items_tenant_corrective_action_idx" ON "tenant_kitchen"."quality_inspection_items"("tenant_id", "corrective_action_id");

-- CorrectiveAction: Corrective actions for failed inspection items
CREATE TABLE "tenant_kitchen"."corrective_actions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "action_number" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT 'other',
    "source_entity" TEXT,
    "source_entity_id" UUID,
    "source_inspection_item_id" UUID,
    "assigned_to_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "due_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "prevention_notes" TEXT,
    "cost_estimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Indexes for CorrectiveAction
CREATE INDEX "corrective_actions_tenant_location_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "location_id");
CREATE INDEX "corrective_actions_tenant_status_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "status");
CREATE INDEX "corrective_actions_tenant_severity_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "severity");
CREATE INDEX "corrective_actions_tenant_priority_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "priority");
CREATE INDEX "corrective_actions_tenant_assigned_to_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "assigned_to_id");
CREATE INDEX "corrective_actions_tenant_due_date_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "due_date");

-- QualityReport: Aggregated quality reports
CREATE TABLE "tenant_kitchen"."quality_reports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "report_number" TEXT NOT NULL UNIQUE,
    "report_type" TEXT NOT NULL,
    "report_period_start" TIMESTAMPTZ(6) NOT NULL,
    "report_period_end" TIMESTAMPTZ(6) NOT NULL,
    "report_data" JSONB NOT NULL DEFAULT '{}',
    "total_inspections" INTEGER NOT NULL DEFAULT 0,
    "passed_inspections" INTEGER NOT NULL DEFAULT 0,
    "failed_inspections" INTEGER NOT NULL DEFAULT 0,
    "overall_pass_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "open_corrective_actions" INTEGER NOT NULL DEFAULT 0,
    "closed_corrective_actions" INTEGER NOT NULL DEFAULT 0,
    "critical_issues" INTEGER NOT NULL DEFAULT 0,
    "generated_by_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Indexes for QualityReport
CREATE INDEX "quality_reports_tenant_location_idx" ON "tenant_kitchen"."quality_reports"("tenant_id", "location_id");
CREATE INDEX "quality_reports_tenant_type_idx" ON "tenant_kitchen"."quality_reports"("tenant_id", "report_type");
CREATE INDEX "quality_reports_tenant_period_start_idx" ON "tenant_kitchen"."quality_reports"("tenant_id", "report_period_start");

-- Foreign key constraints
ALTER TABLE "tenant_kitchen"."quality_checklists" ADD CONSTRAINT "quality_checklists_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."accounts"("id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_checklist_items" ADD CONSTRAINT "quality_checklist_items_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."accounts"("id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_checklist_items" ADD CONSTRAINT "quality_checklist_items_checklist_fk"
    FOREIGN KEY ("checklist_id", "tenant_id") REFERENCES "tenant_kitchen"."quality_checklists"("id", "tenant_id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_inspections" ADD CONSTRAINT "quality_inspections_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."accounts"("id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_inspections" ADD CONSTRAINT "quality_inspections_checklist_fk"
    FOREIGN KEY ("checklist_id", "tenant_id") REFERENCES "tenant_kitchen"."quality_checklists"("id", "tenant_id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_inspection_items" ADD CONSTRAINT "quality_inspection_items_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."accounts"("id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_inspection_items" ADD CONSTRAINT "quality_inspection_items_inspection_fk"
    FOREIGN KEY ("inspection_id", "tenant_id") REFERENCES "tenant_kitchen"."quality_inspections"("id", "tenant_id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_inspection_items" ADD CONSTRAINT "quality_inspection_items_checklist_item_fk"
    FOREIGN KEY ("checklist_item_id", "tenant_id") REFERENCES "tenant_kitchen"."quality_checklist_items"("id", "tenant_id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."corrective_actions" ADD CONSTRAINT "corrective_actions_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."accounts"("id") ON DELETE RESTRICT;

ALTER TABLE "tenant_kitchen"."quality_reports" ADD CONSTRAINT "quality_reports_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."accounts"("id") ON DELETE RESTRICT;
