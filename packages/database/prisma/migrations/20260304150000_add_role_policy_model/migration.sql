-- Create RolePolicy table for granular RBAC
CREATE TABLE "tenant_admin"."role_policies" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "role_name" VARCHAR(255) NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_policies_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Create unique index on tenant_id + role_id
CREATE UNIQUE INDEX "role_policy_role_unique" ON "tenant_admin"."role_policies"("tenant_id", "role_id");

-- Create index for active policies lookup
CREATE INDEX "role_policy_active_idx" ON "tenant_admin"."role_policies"("tenant_id", "is_active");

-- Add foreign key to tenant_admin.roles table (if exists) or tenant_staff.roles
ALTER TABLE "tenant_admin"."role_policies"
ADD CONSTRAINT "role_policies_role_id_fkey" FOREIGN KEY ("tenant_id", "role_id")
REFERENCES "tenant_staff"."roles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
