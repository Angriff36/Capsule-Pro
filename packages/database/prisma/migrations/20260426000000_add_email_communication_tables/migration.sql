-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "tenant_admin"."email_template_type" AS ENUM ('proposal', 'confirmation', 'reminder', 'follow_up', 'contract', 'contact', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "tenant_admin"."email_trigger_type" AS ENUM ('event_confirmed', 'event_canceled', 'event_completed', 'task_assigned', 'task_completed', 'task_reminder', 'shift_reminder', 'proposal_sent', 'contract_signed', 'contract_expiration', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "tenant_admin"."email_status" AS ENUM ('pending', 'sent', 'delivered', 'opened', 'failed', 'bounced');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "tenant_admin"."email_templates" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "template_type" "tenant_admin"."email_template_type" NOT NULL DEFAULT 'custom',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "merge_fields" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("tenant_id", "id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."email_workflows" (
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

    CONSTRAINT "email_workflows_pkey" PRIMARY KEY ("tenant_id", "id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."email_logs" (
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

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- CreateIndex (idempotent via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "email_templates_tenant_id_template_type_idx" ON "tenant_admin"."email_templates"("tenant_id", "template_type");
CREATE INDEX IF NOT EXISTS "email_templates_tenant_id_is_active_idx" ON "tenant_admin"."email_templates"("tenant_id", "is_active");
CREATE INDEX IF NOT EXISTS "email_templates_tenant_id_is_default_idx" ON "tenant_admin"."email_templates"("tenant_id", "is_default");
CREATE INDEX IF NOT EXISTS "email_workflows_tenant_id_trigger_type_idx" ON "tenant_admin"."email_workflows"("tenant_id", "trigger_type");
CREATE INDEX IF NOT EXISTS "email_workflows_tenant_id_is_active_idx" ON "tenant_admin"."email_workflows"("tenant_id", "is_active");
CREATE INDEX IF NOT EXISTS "email_logs_tenant_id_workflow_id_idx" ON "tenant_admin"."email_logs"("tenant_id", "workflow_id");
CREATE INDEX IF NOT EXISTS "email_logs_tenant_id_recipient_email_idx" ON "tenant_admin"."email_logs"("tenant_id", "recipient_email");
CREATE INDEX IF NOT EXISTS "email_logs_tenant_id_status_idx" ON "tenant_admin"."email_logs"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "email_logs_tenant_id_created_at_idx" ON "tenant_admin"."email_logs"("tenant_id", "created_at" DESC);

-- AddForeignKey (idempotent via DO blocks)
DO $$ BEGIN
    ALTER TABLE "tenant_admin"."email_templates" ADD CONSTRAINT "email_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tenant_admin"."email_workflows" ADD CONSTRAINT "email_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tenant_admin"."email_workflows" ADD CONSTRAINT "email_workflows_email_template_tenant_id_email_template_id_fkey" FOREIGN KEY ("email_template_tenant_id", "email_template_id") REFERENCES "tenant_admin"."email_templates"("tenant_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "tenant_admin"."email_logs" ADD CONSTRAINT "email_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
