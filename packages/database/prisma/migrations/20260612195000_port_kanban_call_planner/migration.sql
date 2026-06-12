-- AlterTable
ALTER TABLE "tenant_admin"."admin_tasks" ADD COLUMN     "estimated_hours" DECIMAL(6,2),
ADD COLUMN     "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "tenant_admin"."board_configs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT 'Default Board',
    "columns" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "board_configs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_task_comments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "author_id" UUID,
    "author_name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_task_comments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_task_attachments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_task_attachments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_task_file_refs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" UUID NOT NULL,
    "ref_label" TEXT NOT NULL,
    "linked_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_task_file_refs_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_task_activity" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_task_activity_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_admin"."admin_task_dev_meta" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "environment" TEXT,
    "steps_to_repro" TEXT,
    "expected_result" TEXT,
    "actual_result" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_task_dev_meta_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."call_planning_sessions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source_type" TEXT NOT NULL DEFAULT 'manual',
    "transcript_text" TEXT,
    "metadata" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "call_planning_sessions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."event_planning_drafts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "client_name" TEXT,
    "client_contact_id" UUID,
    "event_type" TEXT,
    "event_date" DATE,
    "event_time" TEXT,
    "guest_count" INTEGER,
    "guest_count_min" INTEGER,
    "guest_count_max" INTEGER,
    "venue_preference" TEXT,
    "venue_id" UUID,
    "service_style" TEXT,
    "dietary_restrictions" TEXT,
    "menu_preferences" JSONB,
    "budget_min" DECIMAL(12,2),
    "budget_max" DECIMAL(12,2),
    "package_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "add_on_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custom_items" JSONB,
    "timeline_notes" TEXT,
    "open_questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "special_notes" TEXT,
    "ai_summary" TEXT,
    "overall_confidence" DECIMAL(3,2),
    "converted_event_id" UUID,
    "proposal_id" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_planning_drafts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."extracted_details" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "draft_id" UUID NOT NULL,
    "field_name" TEXT NOT NULL,
    "raw_value" TEXT,
    "normalized_value" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "source_quote" TEXT,
    "source_timestamp" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "catalog_match_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "extracted_details_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."proposal_drafts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "draft_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "client_phone" TEXT,
    "event_summary" JSONB NOT NULL DEFAULT '{}',
    "menu_sections" JSONB NOT NULL DEFAULT '{}',
    "service_plan" JSONB NOT NULL DEFAULT '{}',
    "pricing_breakdown" JSONB NOT NULL DEFAULT '{}',
    "timeline" JSONB,
    "upgrade_options" JSONB,
    "vision_summary" TEXT,
    "notes" TEXT,
    "next_steps" TEXT,
    "template_id" UUID,
    "magic_token" TEXT NOT NULL,
    "magic_token_expires_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "sent_via" TEXT NOT NULL DEFAULT '',
    "viewed_at" TIMESTAMPTZ(6),
    "responded_at" TIMESTAMPTZ(6),
    "deposit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_paid" BOOLEAN NOT NULL DEFAULT false,
    "html_content" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "proposal_drafts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateTable
CREATE TABLE "tenant_crm"."proposal_actions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_actions_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE INDEX "board_configs_tenant_idx" ON "tenant_admin"."board_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "admin_task_comments_task_idx" ON "tenant_admin"."admin_task_comments"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "admin_task_attachments_task_idx" ON "tenant_admin"."admin_task_attachments"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "admin_task_file_refs_task_idx" ON "tenant_admin"."admin_task_file_refs"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "admin_task_activity_task_idx" ON "tenant_admin"."admin_task_activity"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "admin_task_dev_meta_task_idx" ON "tenant_admin"."admin_task_dev_meta"("tenant_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_task_dev_meta_task_unique" ON "tenant_admin"."admin_task_dev_meta"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "call_planning_sessions_status_idx" ON "tenant_crm"."call_planning_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "call_planning_sessions_user_idx" ON "tenant_crm"."call_planning_sessions"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "event_planning_drafts_status_idx" ON "tenant_crm"."event_planning_drafts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "event_planning_drafts_session_idx" ON "tenant_crm"."event_planning_drafts"("tenant_id", "session_id");

-- CreateIndex
CREATE INDEX "extracted_details_draft_idx" ON "tenant_crm"."extracted_details"("tenant_id", "draft_id");

-- CreateIndex
CREATE INDEX "extracted_details_session_idx" ON "tenant_crm"."extracted_details"("tenant_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_drafts_magic_token_key" ON "tenant_crm"."proposal_drafts"("magic_token");

-- CreateIndex
CREATE INDEX "proposal_drafts_status_idx" ON "tenant_crm"."proposal_drafts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "proposal_drafts_draft_idx" ON "tenant_crm"."proposal_drafts"("tenant_id", "draft_id");

-- CreateIndex
CREATE INDEX "proposal_actions_proposal_idx" ON "tenant_crm"."proposal_actions"("tenant_id", "proposal_id");

-- CreateIndex
CREATE INDEX "admin_tasks_status_position_idx" ON "tenant_admin"."admin_tasks"("tenant_id", "status", "position");
