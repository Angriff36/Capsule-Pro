-- Create webhook enum types in tenant_admin schema (required before outbound_webhooks table)
DO $$ BEGIN
    CREATE TYPE "tenant_admin"."webhook_event_type" AS ENUM ('created', 'updated', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "tenant_admin"."webhook_status" AS ENUM ('active', 'inactive', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "tenant_admin"."webhook_delivery_status" AS ENUM ('pending', 'success', 'failed', 'retrying');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "tenant_staff"."training_modules" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."training_assignments" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."training_completions" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."employee_time_off_requests" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."performance_reviews" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."disciplinary_actions" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."action_milestones" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."onboarding_tasks" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."onboarding_completions" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."employee_pins" (
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

CREATE TABLE IF NOT EXISTS "tenant_staff"."employee_pin_access_logs" (
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

CREATE TABLE IF NOT EXISTS "tenant_admin"."outbound_webhooks" (
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

CREATE TABLE IF NOT EXISTS "tenant_admin"."webhook_delivery_logs" (
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

CREATE INDEX IF NOT EXISTS "training_modules_category_idx" ON "tenant_staff"."training_modules"("category");

CREATE INDEX IF NOT EXISTS "training_modules_required_idx" ON "tenant_staff"."training_modules"("is_required");

CREATE INDEX IF NOT EXISTS "training_assignments_module_idx" ON "tenant_staff"."training_assignments"("module_id");

CREATE INDEX IF NOT EXISTS "training_assignments_employee_idx" ON "tenant_staff"."training_assignments"("employee_id");

CREATE INDEX IF NOT EXISTS "training_assignments_status_idx" ON "tenant_staff"."training_assignments"("status");

CREATE INDEX IF NOT EXISTS "training_completions_employee_idx" ON "tenant_staff"."training_completions"("employee_id");

CREATE INDEX IF NOT EXISTS "training_completions_module_idx" ON "tenant_staff"."training_completions"("module_id");

CREATE UNIQUE INDEX IF NOT EXISTS "training_completions_unique" ON "tenant_staff"."training_completions"("tenant_id", "employee_id", "module_id");

CREATE INDEX IF NOT EXISTS "employee_time_off_requests_employee_idx" ON "tenant_staff"."employee_time_off_requests"("employee_id");

CREATE INDEX IF NOT EXISTS "employee_time_off_requests_status_idx" ON "tenant_staff"."employee_time_off_requests"("status");

CREATE INDEX IF NOT EXISTS "employee_time_off_requests_start_date_idx" ON "tenant_staff"."employee_time_off_requests"("start_date");

CREATE INDEX IF NOT EXISTS "performance_reviews_employee_idx" ON "tenant_staff"."performance_reviews"("employee_id");

CREATE INDEX IF NOT EXISTS "performance_reviews_reviewer_idx" ON "tenant_staff"."performance_reviews"("reviewer_id");

CREATE INDEX IF NOT EXISTS "performance_reviews_scheduled_idx" ON "tenant_staff"."performance_reviews"("scheduled_date");

CREATE INDEX IF NOT EXISTS "disciplinary_actions_employee_idx" ON "tenant_staff"."disciplinary_actions"("employee_id");

CREATE INDEX IF NOT EXISTS "disciplinary_actions_status_idx" ON "tenant_staff"."disciplinary_actions"("status");

CREATE INDEX IF NOT EXISTS "action_milestones_action_idx" ON "tenant_staff"."action_milestones"("disciplinary_action_id");

CREATE INDEX IF NOT EXISTS "onboarding_tasks_type_idx" ON "tenant_staff"."onboarding_tasks"("task_type");

CREATE INDEX IF NOT EXISTS "onboarding_completions_employee_idx" ON "tenant_staff"."onboarding_completions"("employee_id");

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_completions_unique" ON "tenant_staff"."onboarding_completions"("tenant_id", "employee_id", "task_id");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_pins_employee_id_key" ON "tenant_staff"."employee_pins"("employee_id");

CREATE INDEX IF NOT EXISTS "employee_pin_access_logs_employee_idx" ON "tenant_staff"."employee_pin_access_logs"("employee_id");

CREATE INDEX IF NOT EXISTS "employee_pin_access_logs_accessor_idx" ON "tenant_staff"."employee_pin_access_logs"("accessed_by_id");

CREATE INDEX IF NOT EXISTS "employee_pin_access_logs_created_idx" ON "tenant_staff"."employee_pin_access_logs"("created_at");

CREATE INDEX IF NOT EXISTS "outbound_webhooks_tenant_id_status_idx" ON "tenant_admin"."outbound_webhooks"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "outbound_webhooks_tenant_id_created_at_idx" ON "tenant_admin"."outbound_webhooks"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "webhook_delivery_logs_tenant_id_webhook_id_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "webhook_id");

CREATE INDEX IF NOT EXISTS "webhook_delivery_logs_tenant_id_status_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "webhook_delivery_logs_tenant_id_entity_type_entity_id_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "webhook_delivery_logs_tenant_id_created_at_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "webhook_delivery_logs_tenant_id_next_retry_at_idx" ON "tenant_admin"."webhook_delivery_logs"("tenant_id", "next_retry_at");;
