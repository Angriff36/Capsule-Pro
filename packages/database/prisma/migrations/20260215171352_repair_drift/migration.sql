DROP INDEX IF EXISTS "tenant_staff"."employees_auth_user_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "employees_tenant_auth_user_idx" ON "tenant_staff"."employees"("tenant_id", "auth_user_id");
