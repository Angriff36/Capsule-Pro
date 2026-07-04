CREATE TABLE IF NOT EXISTS "tenant_staff"."training_questions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "section_title" TEXT NOT NULL DEFAULT '',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT NOT NULL DEFAULT '',
    "option_a" TEXT NOT NULL DEFAULT '',
    "option_b" TEXT NOT NULL DEFAULT '',
    "option_c" TEXT NOT NULL DEFAULT '',
    "option_d" TEXT NOT NULL DEFAULT '',
    "correct_option_key" TEXT NOT NULL DEFAULT 'A',
    "explanation" TEXT NOT NULL DEFAULT '',
    "why_it_matters" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_questions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_staff"."training_attempts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "score_percent" INTEGER NOT NULL DEFAULT 0,
    "pass_threshold_percent" INTEGER NOT NULL DEFAULT 80,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "manager_review_required" BOOLEAN NOT NULL DEFAULT false,
    "answers_json" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_attempts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_staff"."staff_training_signals" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "signal_type" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_training_signals_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "training_questions_module_idx" ON "tenant_staff"."training_questions"("module_id");

CREATE INDEX IF NOT EXISTS "training_attempts_assignment_idx" ON "tenant_staff"."training_attempts"("assignment_id");

CREATE INDEX IF NOT EXISTS "training_attempts_module_idx" ON "tenant_staff"."training_attempts"("module_id");

CREATE INDEX IF NOT EXISTS "training_attempts_staff_member_idx" ON "tenant_staff"."training_attempts"("staff_member_id");

CREATE INDEX IF NOT EXISTS "staff_training_signals_staff_member_idx" ON "tenant_staff"."staff_training_signals"("staff_member_id");

CREATE INDEX IF NOT EXISTS "staff_training_signals_assignment_idx" ON "tenant_staff"."staff_training_signals"("assignment_id");;
