-- Migration: Add Row Level Security to tenant_accounting tables
-- Date: 2026-05-14
-- Description: Add RLS policies, update_timestamp triggers, and prevent_tenant_mutation
--              triggers to all tables in tenant_accounting schema. These tables contain
--              sensitive financial data (invoices, payments, revenue recognition, etc.)
--              and MUST be protected against cross-tenant data leakage.

-- ============================================================================
-- Tenant isolation: ALL tenant_* tables must enforce RLS
-- Pattern: auth.jwt() -> 'tenant_id' for session auth
--          service_role bypasses RLS for internal operations
-- ============================================================================

-- ============================================================================
-- tenant_accounting.chart_of_accounts
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."chart_of_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."chart_of_accounts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chart_of_accounts_select" ON "tenant_accounting"."chart_of_accounts";
CREATE POLICY "chart_of_accounts_select" ON "tenant_accounting"."chart_of_accounts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "chart_of_accounts_insert" ON "tenant_accounting"."chart_of_accounts";
CREATE POLICY "chart_of_accounts_insert" ON "tenant_accounting"."chart_of_accounts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "chart_of_accounts_update" ON "tenant_accounting"."chart_of_accounts";
CREATE POLICY "chart_of_accounts_update" ON "tenant_accounting"."chart_of_accounts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "chart_of_accounts_delete" ON "tenant_accounting"."chart_of_accounts";
CREATE POLICY "chart_of_accounts_delete" ON "tenant_accounting"."chart_of_accounts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "chart_of_accounts_service" ON "tenant_accounting"."chart_of_accounts";
CREATE POLICY "chart_of_accounts_service" ON "tenant_accounting"."chart_of_accounts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "chart_of_accounts_update_timestamp" ON "tenant_accounting"."chart_of_accounts";
CREATE TRIGGER "chart_of_accounts_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."chart_of_accounts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "chart_of_accounts_prevent_tenant_mutation" ON "tenant_accounting"."chart_of_accounts";
CREATE TRIGGER "chart_of_accounts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."chart_of_accounts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.invoices
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."invoices" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select" ON "tenant_accounting"."invoices";
CREATE POLICY "invoices_select" ON "tenant_accounting"."invoices"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "invoices_insert" ON "tenant_accounting"."invoices";
CREATE POLICY "invoices_insert" ON "tenant_accounting"."invoices"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "invoices_update" ON "tenant_accounting"."invoices";
CREATE POLICY "invoices_update" ON "tenant_accounting"."invoices"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "invoices_delete" ON "tenant_accounting"."invoices";
CREATE POLICY "invoices_delete" ON "tenant_accounting"."invoices"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "invoices_service" ON "tenant_accounting"."invoices";
CREATE POLICY "invoices_service" ON "tenant_accounting"."invoices"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "invoices_update_timestamp" ON "tenant_accounting"."invoices";
CREATE TRIGGER "invoices_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."invoices"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "invoices_prevent_tenant_mutation" ON "tenant_accounting"."invoices";
CREATE TRIGGER "invoices_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."invoices"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.payment_methods
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."payment_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."payment_methods" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_methods_select" ON "tenant_accounting"."payment_methods";
CREATE POLICY "payment_methods_select" ON "tenant_accounting"."payment_methods"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "payment_methods_insert" ON "tenant_accounting"."payment_methods";
CREATE POLICY "payment_methods_insert" ON "tenant_accounting"."payment_methods"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "payment_methods_update" ON "tenant_accounting"."payment_methods";
CREATE POLICY "payment_methods_update" ON "tenant_accounting"."payment_methods"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "payment_methods_delete" ON "tenant_accounting"."payment_methods";
CREATE POLICY "payment_methods_delete" ON "tenant_accounting"."payment_methods"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "payment_methods_service" ON "tenant_accounting"."payment_methods";
CREATE POLICY "payment_methods_service" ON "tenant_accounting"."payment_methods"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "payment_methods_update_timestamp" ON "tenant_accounting"."payment_methods";
CREATE TRIGGER "payment_methods_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."payment_methods"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "payment_methods_prevent_tenant_mutation" ON "tenant_accounting"."payment_methods";
CREATE TRIGGER "payment_methods_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."payment_methods"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.payments
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."payments" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON "tenant_accounting"."payments";
CREATE POLICY "payments_select" ON "tenant_accounting"."payments"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "payments_insert" ON "tenant_accounting"."payments";
CREATE POLICY "payments_insert" ON "tenant_accounting"."payments"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "payments_update" ON "tenant_accounting"."payments";
CREATE POLICY "payments_update" ON "tenant_accounting"."payments"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "payments_delete" ON "tenant_accounting"."payments";
CREATE POLICY "payments_delete" ON "tenant_accounting"."payments"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "payments_service" ON "tenant_accounting"."payments";
CREATE POLICY "payments_service" ON "tenant_accounting"."payments"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "payments_update_timestamp" ON "tenant_accounting"."payments";
CREATE TRIGGER "payments_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."payments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "payments_prevent_tenant_mutation" ON "tenant_accounting"."payments";
CREATE TRIGGER "payments_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."payments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.payment_refund_attempts
-- tenant_id: UUID | deleted_at: NO | updated_at: NO (immutable audit trail)
-- ============================================================================

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

-- ============================================================================
-- tenant_accounting.collection_cases
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."collection_cases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."collection_cases" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_cases_select" ON "tenant_accounting"."collection_cases";
CREATE POLICY "collection_cases_select" ON "tenant_accounting"."collection_cases"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "collection_cases_insert" ON "tenant_accounting"."collection_cases";
CREATE POLICY "collection_cases_insert" ON "tenant_accounting"."collection_cases"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "collection_cases_update" ON "tenant_accounting"."collection_cases";
CREATE POLICY "collection_cases_update" ON "tenant_accounting"."collection_cases"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "collection_cases_delete" ON "tenant_accounting"."collection_cases";
CREATE POLICY "collection_cases_delete" ON "tenant_accounting"."collection_cases"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "collection_cases_service" ON "tenant_accounting"."collection_cases";
CREATE POLICY "collection_cases_service" ON "tenant_accounting"."collection_cases"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "collection_cases_update_timestamp" ON "tenant_accounting"."collection_cases";
CREATE TRIGGER "collection_cases_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."collection_cases"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "collection_cases_prevent_tenant_mutation" ON "tenant_accounting"."collection_cases";
CREATE TRIGGER "collection_cases_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."collection_cases"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.collection_actions
-- tenant_id: UUID | deleted_at: NO | updated_at: NO (immutable audit trail)
-- ============================================================================

ALTER TABLE "tenant_accounting"."collection_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."collection_actions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_actions_select" ON "tenant_accounting"."collection_actions";
CREATE POLICY "collection_actions_select" ON "tenant_accounting"."collection_actions"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "collection_actions_insert" ON "tenant_accounting"."collection_actions";
CREATE POLICY "collection_actions_insert" ON "tenant_accounting"."collection_actions"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "collection_actions_update" ON "tenant_accounting"."collection_actions";
CREATE POLICY "collection_actions_update" ON "tenant_accounting"."collection_actions"
    FOR UPDATE USING (false);

DROP POLICY IF EXISTS "collection_actions_delete" ON "tenant_accounting"."collection_actions";
CREATE POLICY "collection_actions_delete" ON "tenant_accounting"."collection_actions"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "collection_actions_service" ON "tenant_accounting"."collection_actions";
CREATE POLICY "collection_actions_service" ON "tenant_accounting"."collection_actions"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- tenant_accounting.collection_payment_plans
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."collection_payment_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."collection_payment_plans" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_payment_plans_select" ON "tenant_accounting"."collection_payment_plans";
CREATE POLICY "collection_payment_plans_select" ON "tenant_accounting"."collection_payment_plans"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "collection_payment_plans_insert" ON "tenant_accounting"."collection_payment_plans";
CREATE POLICY "collection_payment_plans_insert" ON "tenant_accounting"."collection_payment_plans"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "collection_payment_plans_update" ON "tenant_accounting"."collection_payment_plans";
CREATE POLICY "collection_payment_plans_update" ON "tenant_accounting"."collection_payment_plans"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "collection_payment_plans_delete" ON "tenant_accounting"."collection_payment_plans";
CREATE POLICY "collection_payment_plans_delete" ON "tenant_accounting"."collection_payment_plans"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "collection_payment_plans_service" ON "tenant_accounting"."collection_payment_plans";
CREATE POLICY "collection_payment_plans_service" ON "tenant_accounting"."collection_payment_plans"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "collection_payment_plans_update_timestamp" ON "tenant_accounting"."collection_payment_plans";
CREATE TRIGGER "collection_payment_plans_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."collection_payment_plans"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "collection_payment_plans_prevent_tenant_mutation" ON "tenant_accounting"."collection_payment_plans";
CREATE TRIGGER "collection_payment_plans_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."collection_payment_plans"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.revenue_recognition_schedules
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."revenue_recognition_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."revenue_recognition_schedules" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_recognition_schedules_select" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_select" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "revenue_recognition_schedules_insert" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_insert" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "revenue_recognition_schedules_update" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_update" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "revenue_recognition_schedules_delete" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_delete" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "revenue_recognition_schedules_service" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE POLICY "revenue_recognition_schedules_service" ON "tenant_accounting"."revenue_recognition_schedules"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "revenue_recognition_schedules_update_timestamp" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE TRIGGER "revenue_recognition_schedules_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "revenue_recognition_schedules_prevent_tenant_mutation" ON "tenant_accounting"."revenue_recognition_schedules";
CREATE TRIGGER "revenue_recognition_schedules_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.revenue_recognition_lines
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_accounting"."revenue_recognition_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."revenue_recognition_lines" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revenue_recognition_lines_select" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_select" ON "tenant_accounting"."revenue_recognition_lines"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "revenue_recognition_lines_insert" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_insert" ON "tenant_accounting"."revenue_recognition_lines"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "revenue_recognition_lines_update" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_update" ON "tenant_accounting"."revenue_recognition_lines"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "revenue_recognition_lines_delete" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_delete" ON "tenant_accounting"."revenue_recognition_lines"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "revenue_recognition_lines_service" ON "tenant_accounting"."revenue_recognition_lines";
CREATE POLICY "revenue_recognition_lines_service" ON "tenant_accounting"."revenue_recognition_lines"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "revenue_recognition_lines_update_timestamp" ON "tenant_accounting"."revenue_recognition_lines";
CREATE TRIGGER "revenue_recognition_lines_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_lines"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "revenue_recognition_lines_prevent_tenant_mutation" ON "tenant_accounting"."revenue_recognition_lines";
CREATE TRIGGER "revenue_recognition_lines_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."revenue_recognition_lines"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();