CREATE TABLE IF NOT EXISTS "tenant_staff"."user_preferences" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "preference_key" TEXT NOT NULL,
    "preference_value" JSONB NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "user_preferences_tenant_id_category_idx" ON "tenant_staff"."user_preferences"("tenant_id", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_tenant_id_user_id_preference_key_category_key" ON "tenant_staff"."user_preferences"("tenant_id", "user_id", "preference_key", "category");

-- Add foreign key to platform.accounts
-- Guarded by pg_constraint lookup: 20260211000000_add_user_preferences already
-- creates this FK on clean DBs (P3018/42710 on fresh CI Postgres). This repair
-- migration ran on a prod state where the FK was missing. The DO block is
-- purely additive (no-op when FK exists, original behavior when it doesn't)
-- and uses syntax portable to Postgres 16 (ADD CONSTRAINT IF NOT EXISTS is
-- Postgres 17+).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_tenant_fk'
      AND conrelid = '"tenant_staff"."user_preferences"'::regclass
  ) THEN
    ALTER TABLE "tenant_staff"."user_preferences" ADD CONSTRAINT "user_preferences_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Add foreign key to tenant_staff.employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_user_fk'
      AND conrelid = '"tenant_staff"."user_preferences"'::regclass
  ) THEN
    ALTER TABLE "tenant_staff"."user_preferences" ADD CONSTRAINT "user_preferences_user_fk" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;