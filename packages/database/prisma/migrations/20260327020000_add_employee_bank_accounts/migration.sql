-- CreateTable: employee_bank_accounts
-- Stores bank account info for direct deposit payroll
-- account_number stored as masked (last 4) only in production;
-- full routing/account stored in encrypted metadata for payout processing

CREATE TABLE "tenant_staff"."employee_bank_accounts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL DEFAULT 'checking',
    "routing_number" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_number_last4" TEXT GENERATED ALWAYS AS (RIGHT("account_number", 4)) STORED,
    "account_holder_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(6),
    "verification_method" TEXT,
    "deposit_history" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("tenant_id","id")
);

-- Add payout_method to employees
ALTER TABLE "tenant_staff"."employees" ADD COLUMN "payout_method" TEXT NOT NULL DEFAULT 'check';

-- Add payout_preference to payroll_line_items (which account was used)
ALTER TABLE "tenant_staff"."payroll_line_items" ADD COLUMN "bank_account_id" UUID;

-- Indexes
CREATE INDEX "employee_bank_accounts_employee_idx" ON "tenant_staff"."employee_bank_accounts"("tenant_id", "employee_id");
CREATE INDEX "employee_bank_accounts_status_idx" ON "tenant_staff"."employee_bank_accounts"("tenant_id", "status");

-- Foreign keys
ALTER TABLE "tenant_staff"."employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employee_fkey" FOREIGN KEY ("tenant_id","employee_id") REFERENCES "tenant_staff"."employees"("tenant_id","id") ON DELETE CASCADE ON UPDATE CASCADE;
