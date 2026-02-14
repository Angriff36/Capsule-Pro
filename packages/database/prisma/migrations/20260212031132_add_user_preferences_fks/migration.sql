-- Add missing foreign key constraints to user_preferences table
-- The table was created in a previous migration but FKs were missing

-- Add foreign key to platform.accounts
ALTER TABLE "tenant_staff"."user_preferences" ADD CONSTRAINT IF NOT EXISTS "user_preferences_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key to tenant_staff.employees
ALTER TABLE "tenant_staff"."user_preferences" ADD CONSTRAINT IF NOT EXISTS "user_preferences_user_fk" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "tenant_staff"."employees"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
