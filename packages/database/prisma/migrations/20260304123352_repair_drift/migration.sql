CREATE TABLE IF NOT EXISTS "tenant_staff"."onboarding_progress_shares" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "share_token" VARCHAR(32) NOT NULL,
    "progress_data" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_progress_shares_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_shares_id_key" ON "tenant_staff"."onboarding_progress_shares"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_progress_shares_share_token_key" ON "tenant_staff"."onboarding_progress_shares"("share_token");

CREATE INDEX IF NOT EXISTS "onboarding_progress_shares_tenant_id_user_id_idx" ON "tenant_staff"."onboarding_progress_shares"("tenant_id", "user_id");

CREATE INDEX IF NOT EXISTS "onboarding_progress_shares_share_token_idx" ON "tenant_staff"."onboarding_progress_shares"("share_token");;
