-- Migration: Add Row Level Security to remaining tenant_accounting tables
-- Date: 2026-04-27
-- Description:
--   Adds RLS policies + update_timestamp triggers + prevent_tenant_mutation triggers
--   + REPLICA IDENTITY FULL to six tenant_accounting tables that were created in
--   `20260211060149_repair_drift` (chart_of_accounts) and `20260305012618_repair_drift`
--   (invoices, payment_reconciliations, collection_cases, collection_actions,
--   collection_payment_plans) but never received the standard RLS hardening.
--
-- Why this matters:
--   Without RLS, any database role with table-level SELECT/UPDATE permission can
--   read or modify rows belonging to any tenant. The Postgres roles used by the
--   API (non-service_role JWT-derived sessions) currently rely on RLS as the
--   tenant-isolation backstop. Six tables in the accounting domain — including
--   chart of accounts, invoices, payments-reconciliation, and the entire
--   collections sub-module — bypass that backstop.
--
-- Pattern alignment:
--   Mirrors the structure of `20260427000000_add_rls_post_expansion_tables` and
--   `20260426000000_add_revenue_recognition`. Tables that have a `deleted_at`
--   column include the soft-delete predicate in SELECT/UPDATE policies; tables
--   without `deleted_at` (chart_of_accounts, collection_actions,
--   collection_payment_plans) omit it.

-- ============================================================
-- tenant_accounting.chart_of_accounts (no deleted_at)
-- ============================================================
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

-- ============================================================
-- tenant_accounting.invoices (deleted_at: YES)
-- ============================================================
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

-- ============================================================
-- tenant_accounting.payment_reconciliations (deleted_at: YES)
-- ============================================================
ALTER TABLE "tenant_accounting"."payment_reconciliations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_accounting"."payment_reconciliations" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_reconciliations_select" ON "tenant_accounting"."payment_reconciliations";
CREATE POLICY "payment_reconciliations_select" ON "tenant_accounting"."payment_reconciliations"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "payment_reconciliations_insert" ON "tenant_accounting"."payment_reconciliations";
CREATE POLICY "payment_reconciliations_insert" ON "tenant_accounting"."payment_reconciliations"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "payment_reconciliations_update" ON "tenant_accounting"."payment_reconciliations";
CREATE POLICY "payment_reconciliations_update" ON "tenant_accounting"."payment_reconciliations"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "payment_reconciliations_delete" ON "tenant_accounting"."payment_reconciliations";
CREATE POLICY "payment_reconciliations_delete" ON "tenant_accounting"."payment_reconciliations"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "payment_reconciliations_service" ON "tenant_accounting"."payment_reconciliations";
CREATE POLICY "payment_reconciliations_service" ON "tenant_accounting"."payment_reconciliations"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- tenant_accounting.collection_cases (deleted_at: YES)
-- ============================================================
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

-- ============================================================
-- tenant_accounting.collection_actions (no deleted_at)
-- ============================================================
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
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "collection_actions_delete" ON "tenant_accounting"."collection_actions";
CREATE POLICY "collection_actions_delete" ON "tenant_accounting"."collection_actions"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "collection_actions_service" ON "tenant_accounting"."collection_actions";
CREATE POLICY "collection_actions_service" ON "tenant_accounting"."collection_actions"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- tenant_accounting.collection_payment_plans (no deleted_at)
-- ============================================================
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

-- ============================================================
-- Triggers: update_timestamp + prevent_tenant_mutation
-- ============================================================

-- chart_of_accounts
DROP TRIGGER IF EXISTS "chart_of_accounts_update_timestamp" ON "tenant_accounting"."chart_of_accounts";
CREATE TRIGGER "chart_of_accounts_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."chart_of_accounts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "chart_of_accounts_prevent_tenant_mutation" ON "tenant_accounting"."chart_of_accounts";
CREATE TRIGGER "chart_of_accounts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."chart_of_accounts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- invoices
DROP TRIGGER IF EXISTS "invoices_update_timestamp" ON "tenant_accounting"."invoices";
CREATE TRIGGER "invoices_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."invoices"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "invoices_prevent_tenant_mutation" ON "tenant_accounting"."invoices";
CREATE TRIGGER "invoices_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."invoices"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- payment_reconciliations
DROP TRIGGER IF EXISTS "payment_reconciliations_update_timestamp" ON "tenant_accounting"."payment_reconciliations";
CREATE TRIGGER "payment_reconciliations_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."payment_reconciliations"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "payment_reconciliations_prevent_tenant_mutation" ON "tenant_accounting"."payment_reconciliations";
CREATE TRIGGER "payment_reconciliations_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."payment_reconciliations"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- collection_cases
DROP TRIGGER IF EXISTS "collection_cases_update_timestamp" ON "tenant_accounting"."collection_cases";
CREATE TRIGGER "collection_cases_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."collection_cases"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "collection_cases_prevent_tenant_mutation" ON "tenant_accounting"."collection_cases";
CREATE TRIGGER "collection_cases_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."collection_cases"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- collection_actions
DROP TRIGGER IF EXISTS "collection_actions_update_timestamp" ON "tenant_accounting"."collection_actions";
CREATE TRIGGER "collection_actions_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."collection_actions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "collection_actions_prevent_tenant_mutation" ON "tenant_accounting"."collection_actions";
CREATE TRIGGER "collection_actions_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."collection_actions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- collection_payment_plans
DROP TRIGGER IF EXISTS "collection_payment_plans_update_timestamp" ON "tenant_accounting"."collection_payment_plans";
CREATE TRIGGER "collection_payment_plans_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."collection_payment_plans"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "collection_payment_plans_prevent_tenant_mutation" ON "tenant_accounting"."collection_payment_plans";
CREATE TRIGGER "collection_payment_plans_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."collection_payment_plans"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================
-- REPLICA IDENTITY FULL — required for logical replication / real-time subscriptions
-- ============================================================
ALTER TABLE "tenant_accounting"."chart_of_accounts" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_accounting"."invoices" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_accounting"."payment_reconciliations" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_accounting"."collection_cases" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_accounting"."collection_actions" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_accounting"."collection_payment_plans" REPLICA IDENTITY FULL;
