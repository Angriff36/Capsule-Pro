-- Add API keys table for external integrations
-- Enables generate, rotate, and revoke API keys with scoped permissions

-- Create the api_keys table in tenant_admin schema
CREATE TABLE "tenant_admin"."api_keys" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "key_prefix" VARCHAR(8) NOT NULL,
    "hashed_key" VARCHAR(255) NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "last_used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id"),
    CONSTRAINT "api_keys_tenant_name_unique" UNIQUE ("tenant_id", "name"),
    CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "api_keys_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id", "tenant_id") REFERENCES "tenant_staff"."employees"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for API keys
CREATE INDEX "api_keys_tenant_prefix_idx" ON "tenant_admin"."api_keys"("tenant_id", "key_prefix");
-- Original computed index used now() which is STABLE, not IMMUTABLE — replaced with simple status column index
-- The status column is added by migration 20260304190000_add_rate_limiting
-- CREATE INDEX "api_keys_tenant_status_idx" ON "tenant_admin"."api_keys"("tenant_id", "status");
CREATE INDEX "api_keys_tenant_created_by_idx" ON "tenant_admin"."api_keys"("tenant_id", "created_by_user_id");
CREATE INDEX "api_keys_tenant_expires_idx" ON "tenant_admin"."api_keys"("tenant_id", "expires_at");

-- Duplicate FK removed (already defined in CREATE TABLE above as api_keys_created_by_user_id_fkey)
