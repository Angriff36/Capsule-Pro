-- Add missing foreign key constraints to user_preferences table
-- The table was created in a previous migration but FKs were missing on
-- the prod state this migration ran against. Guarded by pg_constraint
-- lookup so re-runs on a clean DB (where the FKs already exist) are no-ops.
-- `ADD CONSTRAINT IF NOT EXISTS` is Postgres 17+ only; the ephemeral CI
-- Postgres is 16, so we use a DO block for portability.

-- Add foreign key to platform.accounts
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
