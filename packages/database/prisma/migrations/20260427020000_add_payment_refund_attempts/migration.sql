-- Migration: Add payment_refund_attempts audit table
-- Date: 2026-04-27
-- Description: Immutable audit trail for every refund gateway call (success + failure).
--              Captures the gateway-side refund_transaction_id and failure_reason that
--              would otherwise be lost when a 502 closes the connection. Append-only
--              by policy: UPDATE/DELETE forbidden for tenant role; service_role bypass
--              retained for back-office tooling.

-- ============================================================================
-- tenant_accounting.payment_refund_attempts
-- ============================================================================

CREATE TABLE IF NOT EXISTS "tenant_accounting"."payment_refund_attempts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "requested_amount" MONEY NOT NULL,
    "effective_amount" MONEY NOT NULL,
    "refund_reason" TEXT,
    "original_gateway_transaction_id" TEXT,
    "refund_transaction_id" TEXT,
    "success" BOOLEAN NOT NULL,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "payment_refund_attempts_pkey" PRIMARY KEY ("tenant_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_refund_attempts_id_key"
    ON "tenant_accounting"."payment_refund_attempts" ("id");

CREATE INDEX IF NOT EXISTS "payment_refund_attempts_tenant_payment_idx"
    ON "tenant_accounting"."payment_refund_attempts" ("tenant_id", "payment_id");

CREATE INDEX IF NOT EXISTS "payment_refund_attempts_tenant_created_at_idx"
    ON "tenant_accounting"."payment_refund_attempts" ("tenant_id", "created_at" DESC);

-- Row Level Security: append-only audit log
ALTER TABLE "tenant_accounting"."payment_refund_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."payment_refund_attempts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_refund_attempts_select" ON "tenant_accounting"."payment_refund_attempts";
CREATE POLICY "payment_refund_attempts_select" ON "tenant_accounting"."payment_refund_attempts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "payment_refund_attempts_insert" ON "tenant_accounting"."payment_refund_attempts";
CREATE POLICY "payment_refund_attempts_insert" ON "tenant_accounting"."payment_refund_attempts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

-- Append-only: UPDATE and DELETE are forbidden for tenant role.
DROP POLICY IF EXISTS "payment_refund_attempts_update" ON "tenant_accounting"."payment_refund_attempts";
CREATE POLICY "payment_refund_attempts_update" ON "tenant_accounting"."payment_refund_attempts"
    FOR UPDATE USING (false);

DROP POLICY IF EXISTS "payment_refund_attempts_delete" ON "tenant_accounting"."payment_refund_attempts";
CREATE POLICY "payment_refund_attempts_delete" ON "tenant_accounting"."payment_refund_attempts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "payment_refund_attempts_service" ON "tenant_accounting"."payment_refund_attempts";
CREATE POLICY "payment_refund_attempts_service" ON "tenant_accounting"."payment_refund_attempts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Tenant immutability trigger: even if RLS UPDATE policy were ever loosened,
-- the tenant_id column itself cannot be mutated.
DROP TRIGGER IF EXISTS "payment_refund_attempts_prevent_tenant_mutation"
    ON "tenant_accounting"."payment_refund_attempts";
CREATE TRIGGER "payment_refund_attempts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."payment_refund_attempts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
