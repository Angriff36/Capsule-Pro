-- Create tenant_accounting schema
CREATE SCHEMA IF NOT EXISTS "tenant_accounting";

-- Create AccountType enum
CREATE TYPE "tenant_accounting"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

CREATE TABLE IF NOT EXISTS "tenant_accounting"."chart_of_accounts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type" "tenant_accounting"."AccountType" NOT NULL,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chart_of_accounts_account_number_key" ON "tenant_accounting"."chart_of_accounts"("account_number");

CREATE INDEX IF NOT EXISTS "chart_of_accounts_tenant_id_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id");

CREATE INDEX IF NOT EXISTS "chart_of_accounts_tenant_id_account_number_idx" ON "tenant_accounting"."chart_of_accounts"("tenant_id", "account_number");

CREATE UNIQUE INDEX IF NOT EXISTS "chart_of_accounts_id_key" ON "tenant_accounting"."chart_of_accounts"("id");

-- Foreign key to platform.accounts
ALTER TABLE "tenant_accounting"."chart_of_accounts"
ADD CONSTRAINT "chart_of_accounts_tenant_id_fkey"
FOREIGN KEY ("tenant_id")
REFERENCES "platform"."accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign key for parent_id (self-reference)
-- Note: Using ON DELETE SET NULL to allow parent to be deleted without deleting children
ALTER TABLE "tenant_accounting"."chart_of_accounts"
ADD CONSTRAINT "chart_of_accounts_parent_id_fkey"
FOREIGN KEY ("tenant_id", "parent_id")
REFERENCES "tenant_accounting"."chart_of_accounts"("tenant_id", "id")
ON DELETE SET NULL ON UPDATE CASCADE;
