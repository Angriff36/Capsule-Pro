-- Migration: Add Row Level Security to remaining tables without RLS
-- Date: 2026-04-29
-- Description: Add RLS policies, update_timestamp triggers, and prevent_tenant_mutation
--              triggers to 53 tables across 7 schemas that were missing RLS hardening.
--              This completes the tenant isolation security perimeter.


-- ╔══════════════════════════════════════════════════════════════════════════════
-- ║ tenant_accounting (7 tables)
-- ╚══════════════════════════════════════════════════════════════════════════════

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
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
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

DROP TRIGGER IF EXISTS "collection_actions_update_timestamp" ON "tenant_accounting"."collection_actions";
CREATE TRIGGER "collection_actions_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."collection_actions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "collection_actions_prevent_tenant_mutation" ON "tenant_accounting"."collection_actions";
CREATE TRIGGER "collection_actions_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."collection_actions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

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

-- ╔══════════════════════════════════════════════════════════════════════════════
-- ║ tenant_inventory (11 tables)
-- ╚══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- tenant_inventory.inventory_items
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."inventory_items" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_items_select" ON "tenant_inventory"."inventory_items";
CREATE POLICY "inventory_items_select" ON "tenant_inventory"."inventory_items"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "inventory_items_insert" ON "tenant_inventory"."inventory_items";
CREATE POLICY "inventory_items_insert" ON "tenant_inventory"."inventory_items"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "inventory_items_update" ON "tenant_inventory"."inventory_items";
CREATE POLICY "inventory_items_update" ON "tenant_inventory"."inventory_items"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "inventory_items_delete" ON "tenant_inventory"."inventory_items";
CREATE POLICY "inventory_items_delete" ON "tenant_inventory"."inventory_items"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "inventory_items_service" ON "tenant_inventory"."inventory_items";
CREATE POLICY "inventory_items_service" ON "tenant_inventory"."inventory_items"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "inventory_items_update_timestamp" ON "tenant_inventory"."inventory_items";
CREATE TRIGGER "inventory_items_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."inventory_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "inventory_items_prevent_tenant_mutation" ON "tenant_inventory"."inventory_items";
CREATE TRIGGER "inventory_items_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."inventory_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.inventory_transactions
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."inventory_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."inventory_transactions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_transactions_select" ON "tenant_inventory"."inventory_transactions";
CREATE POLICY "inventory_transactions_select" ON "tenant_inventory"."inventory_transactions"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "inventory_transactions_insert" ON "tenant_inventory"."inventory_transactions";
CREATE POLICY "inventory_transactions_insert" ON "tenant_inventory"."inventory_transactions"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "inventory_transactions_update" ON "tenant_inventory"."inventory_transactions";
CREATE POLICY "inventory_transactions_update" ON "tenant_inventory"."inventory_transactions"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "inventory_transactions_delete" ON "tenant_inventory"."inventory_transactions";
CREATE POLICY "inventory_transactions_delete" ON "tenant_inventory"."inventory_transactions"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "inventory_transactions_service" ON "tenant_inventory"."inventory_transactions";
CREATE POLICY "inventory_transactions_service" ON "tenant_inventory"."inventory_transactions"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "inventory_transactions_update_timestamp" ON "tenant_inventory"."inventory_transactions";
CREATE TRIGGER "inventory_transactions_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."inventory_transactions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "inventory_transactions_prevent_tenant_mutation" ON "tenant_inventory"."inventory_transactions";
CREATE TRIGGER "inventory_transactions_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."inventory_transactions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.inventory_suppliers
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."inventory_suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."inventory_suppliers" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_suppliers_select" ON "tenant_inventory"."inventory_suppliers";
CREATE POLICY "inventory_suppliers_select" ON "tenant_inventory"."inventory_suppliers"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "inventory_suppliers_insert" ON "tenant_inventory"."inventory_suppliers";
CREATE POLICY "inventory_suppliers_insert" ON "tenant_inventory"."inventory_suppliers"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "inventory_suppliers_update" ON "tenant_inventory"."inventory_suppliers";
CREATE POLICY "inventory_suppliers_update" ON "tenant_inventory"."inventory_suppliers"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "inventory_suppliers_delete" ON "tenant_inventory"."inventory_suppliers";
CREATE POLICY "inventory_suppliers_delete" ON "tenant_inventory"."inventory_suppliers"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "inventory_suppliers_service" ON "tenant_inventory"."inventory_suppliers";
CREATE POLICY "inventory_suppliers_service" ON "tenant_inventory"."inventory_suppliers"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "inventory_suppliers_update_timestamp" ON "tenant_inventory"."inventory_suppliers";
CREATE TRIGGER "inventory_suppliers_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."inventory_suppliers"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "inventory_suppliers_prevent_tenant_mutation" ON "tenant_inventory"."inventory_suppliers";
CREATE TRIGGER "inventory_suppliers_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."inventory_suppliers"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.vendor_catalog
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."vendor_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."vendor_catalog" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_catalog_select" ON "tenant_inventory"."vendor_catalog";
CREATE POLICY "vendor_catalog_select" ON "tenant_inventory"."vendor_catalog"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "vendor_catalog_insert" ON "tenant_inventory"."vendor_catalog";
CREATE POLICY "vendor_catalog_insert" ON "tenant_inventory"."vendor_catalog"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "vendor_catalog_update" ON "tenant_inventory"."vendor_catalog";
CREATE POLICY "vendor_catalog_update" ON "tenant_inventory"."vendor_catalog"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "vendor_catalog_delete" ON "tenant_inventory"."vendor_catalog";
CREATE POLICY "vendor_catalog_delete" ON "tenant_inventory"."vendor_catalog"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "vendor_catalog_service" ON "tenant_inventory"."vendor_catalog";
CREATE POLICY "vendor_catalog_service" ON "tenant_inventory"."vendor_catalog"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "vendor_catalog_update_timestamp" ON "tenant_inventory"."vendor_catalog";
CREATE TRIGGER "vendor_catalog_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."vendor_catalog"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "vendor_catalog_prevent_tenant_mutation" ON "tenant_inventory"."vendor_catalog";
CREATE TRIGGER "vendor_catalog_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."vendor_catalog"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.pricing_tiers
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."pricing_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."pricing_tiers" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_tiers_select" ON "tenant_inventory"."pricing_tiers";
CREATE POLICY "pricing_tiers_select" ON "tenant_inventory"."pricing_tiers"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "pricing_tiers_insert" ON "tenant_inventory"."pricing_tiers";
CREATE POLICY "pricing_tiers_insert" ON "tenant_inventory"."pricing_tiers"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "pricing_tiers_update" ON "tenant_inventory"."pricing_tiers";
CREATE POLICY "pricing_tiers_update" ON "tenant_inventory"."pricing_tiers"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "pricing_tiers_delete" ON "tenant_inventory"."pricing_tiers";
CREATE POLICY "pricing_tiers_delete" ON "tenant_inventory"."pricing_tiers"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "pricing_tiers_service" ON "tenant_inventory"."pricing_tiers";
CREATE POLICY "pricing_tiers_service" ON "tenant_inventory"."pricing_tiers"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "pricing_tiers_update_timestamp" ON "tenant_inventory"."pricing_tiers";
CREATE TRIGGER "pricing_tiers_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."pricing_tiers"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "pricing_tiers_prevent_tenant_mutation" ON "tenant_inventory"."pricing_tiers";
CREATE TRIGGER "pricing_tiers_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."pricing_tiers"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.bulk_order_rules
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."bulk_order_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."bulk_order_rules" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bulk_order_rules_select" ON "tenant_inventory"."bulk_order_rules";
CREATE POLICY "bulk_order_rules_select" ON "tenant_inventory"."bulk_order_rules"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "bulk_order_rules_insert" ON "tenant_inventory"."bulk_order_rules";
CREATE POLICY "bulk_order_rules_insert" ON "tenant_inventory"."bulk_order_rules"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "bulk_order_rules_update" ON "tenant_inventory"."bulk_order_rules";
CREATE POLICY "bulk_order_rules_update" ON "tenant_inventory"."bulk_order_rules"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "bulk_order_rules_delete" ON "tenant_inventory"."bulk_order_rules";
CREATE POLICY "bulk_order_rules_delete" ON "tenant_inventory"."bulk_order_rules"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "bulk_order_rules_service" ON "tenant_inventory"."bulk_order_rules";
CREATE POLICY "bulk_order_rules_service" ON "tenant_inventory"."bulk_order_rules"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "bulk_order_rules_update_timestamp" ON "tenant_inventory"."bulk_order_rules";
CREATE TRIGGER "bulk_order_rules_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."bulk_order_rules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "bulk_order_rules_prevent_tenant_mutation" ON "tenant_inventory"."bulk_order_rules";
CREATE TRIGGER "bulk_order_rules_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."bulk_order_rules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.purchase_requisitions
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."purchase_requisitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."purchase_requisitions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_requisitions_select" ON "tenant_inventory"."purchase_requisitions";
CREATE POLICY "purchase_requisitions_select" ON "tenant_inventory"."purchase_requisitions"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "purchase_requisitions_insert" ON "tenant_inventory"."purchase_requisitions";
CREATE POLICY "purchase_requisitions_insert" ON "tenant_inventory"."purchase_requisitions"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "purchase_requisitions_update" ON "tenant_inventory"."purchase_requisitions";
CREATE POLICY "purchase_requisitions_update" ON "tenant_inventory"."purchase_requisitions"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "purchase_requisitions_delete" ON "tenant_inventory"."purchase_requisitions";
CREATE POLICY "purchase_requisitions_delete" ON "tenant_inventory"."purchase_requisitions"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "purchase_requisitions_service" ON "tenant_inventory"."purchase_requisitions";
CREATE POLICY "purchase_requisitions_service" ON "tenant_inventory"."purchase_requisitions"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "purchase_requisitions_update_timestamp" ON "tenant_inventory"."purchase_requisitions";
CREATE TRIGGER "purchase_requisitions_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."purchase_requisitions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "purchase_requisitions_prevent_tenant_mutation" ON "tenant_inventory"."purchase_requisitions";
CREATE TRIGGER "purchase_requisitions_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."purchase_requisitions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.purchase_requisition_items
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."purchase_requisition_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."purchase_requisition_items" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_requisition_items_select" ON "tenant_inventory"."purchase_requisition_items";
CREATE POLICY "purchase_requisition_items_select" ON "tenant_inventory"."purchase_requisition_items"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "purchase_requisition_items_insert" ON "tenant_inventory"."purchase_requisition_items";
CREATE POLICY "purchase_requisition_items_insert" ON "tenant_inventory"."purchase_requisition_items"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "purchase_requisition_items_update" ON "tenant_inventory"."purchase_requisition_items";
CREATE POLICY "purchase_requisition_items_update" ON "tenant_inventory"."purchase_requisition_items"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "purchase_requisition_items_delete" ON "tenant_inventory"."purchase_requisition_items";
CREATE POLICY "purchase_requisition_items_delete" ON "tenant_inventory"."purchase_requisition_items"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "purchase_requisition_items_service" ON "tenant_inventory"."purchase_requisition_items";
CREATE POLICY "purchase_requisition_items_service" ON "tenant_inventory"."purchase_requisition_items"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "purchase_requisition_items_update_timestamp" ON "tenant_inventory"."purchase_requisition_items";
CREATE TRIGGER "purchase_requisition_items_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."purchase_requisition_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "purchase_requisition_items_prevent_tenant_mutation" ON "tenant_inventory"."purchase_requisition_items";
CREATE TRIGGER "purchase_requisition_items_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."purchase_requisition_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.vendor_contracts
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."vendor_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."vendor_contracts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_contracts_select" ON "tenant_inventory"."vendor_contracts";
CREATE POLICY "vendor_contracts_select" ON "tenant_inventory"."vendor_contracts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "vendor_contracts_insert" ON "tenant_inventory"."vendor_contracts";
CREATE POLICY "vendor_contracts_insert" ON "tenant_inventory"."vendor_contracts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "vendor_contracts_update" ON "tenant_inventory"."vendor_contracts";
CREATE POLICY "vendor_contracts_update" ON "tenant_inventory"."vendor_contracts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "vendor_contracts_delete" ON "tenant_inventory"."vendor_contracts";
CREATE POLICY "vendor_contracts_delete" ON "tenant_inventory"."vendor_contracts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "vendor_contracts_service" ON "tenant_inventory"."vendor_contracts";
CREATE POLICY "vendor_contracts_service" ON "tenant_inventory"."vendor_contracts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "vendor_contracts_update_timestamp" ON "tenant_inventory"."vendor_contracts";
CREATE TRIGGER "vendor_contracts_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."vendor_contracts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "vendor_contracts_prevent_tenant_mutation" ON "tenant_inventory"."vendor_contracts";
CREATE TRIGGER "vendor_contracts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."vendor_contracts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.purchase_orders
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."purchase_orders" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_orders_select" ON "tenant_inventory"."purchase_orders";
CREATE POLICY "purchase_orders_select" ON "tenant_inventory"."purchase_orders"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "purchase_orders_insert" ON "tenant_inventory"."purchase_orders";
CREATE POLICY "purchase_orders_insert" ON "tenant_inventory"."purchase_orders"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "purchase_orders_update" ON "tenant_inventory"."purchase_orders";
CREATE POLICY "purchase_orders_update" ON "tenant_inventory"."purchase_orders"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "purchase_orders_delete" ON "tenant_inventory"."purchase_orders";
CREATE POLICY "purchase_orders_delete" ON "tenant_inventory"."purchase_orders"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "purchase_orders_service" ON "tenant_inventory"."purchase_orders";
CREATE POLICY "purchase_orders_service" ON "tenant_inventory"."purchase_orders"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "purchase_orders_update_timestamp" ON "tenant_inventory"."purchase_orders";
CREATE TRIGGER "purchase_orders_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."purchase_orders"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "purchase_orders_prevent_tenant_mutation" ON "tenant_inventory"."purchase_orders";
CREATE TRIGGER "purchase_orders_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."purchase_orders"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.purchase_order_items
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."purchase_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."purchase_order_items" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_order_items_select" ON "tenant_inventory"."purchase_order_items";
CREATE POLICY "purchase_order_items_select" ON "tenant_inventory"."purchase_order_items"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "purchase_order_items_insert" ON "tenant_inventory"."purchase_order_items";
CREATE POLICY "purchase_order_items_insert" ON "tenant_inventory"."purchase_order_items"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "purchase_order_items_update" ON "tenant_inventory"."purchase_order_items";
CREATE POLICY "purchase_order_items_update" ON "tenant_inventory"."purchase_order_items"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "purchase_order_items_delete" ON "tenant_inventory"."purchase_order_items";
CREATE POLICY "purchase_order_items_delete" ON "tenant_inventory"."purchase_order_items"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "purchase_order_items_service" ON "tenant_inventory"."purchase_order_items";
CREATE POLICY "purchase_order_items_service" ON "tenant_inventory"."purchase_order_items"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "purchase_order_items_update_timestamp" ON "tenant_inventory"."purchase_order_items";
CREATE TRIGGER "purchase_order_items_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."purchase_order_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "purchase_order_items_prevent_tenant_mutation" ON "tenant_inventory"."purchase_order_items";
CREATE TRIGGER "purchase_order_items_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."purchase_order_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ╔══════════════════════════════════════════════════════════════════════════════
-- ║ tenant_staff (12 tables)
-- ╚══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- tenant_staff.users
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."users" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON "tenant_staff"."users";
CREATE POLICY "users_select" ON "tenant_staff"."users"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "users_insert" ON "tenant_staff"."users";
CREATE POLICY "users_insert" ON "tenant_staff"."users"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "users_update" ON "tenant_staff"."users";
CREATE POLICY "users_update" ON "tenant_staff"."users"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "users_delete" ON "tenant_staff"."users";
CREATE POLICY "users_delete" ON "tenant_staff"."users"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "users_service" ON "tenant_staff"."users";
CREATE POLICY "users_service" ON "tenant_staff"."users"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "users_update_timestamp" ON "tenant_staff"."users";
CREATE TRIGGER "users_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."users"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "users_prevent_tenant_mutation" ON "tenant_staff"."users";
CREATE TRIGGER "users_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."users"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.employee_deductions
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."employee_deductions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."employee_deductions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_deductions_select" ON "tenant_staff"."employee_deductions";
CREATE POLICY "employee_deductions_select" ON "tenant_staff"."employee_deductions"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "employee_deductions_insert" ON "tenant_staff"."employee_deductions";
CREATE POLICY "employee_deductions_insert" ON "tenant_staff"."employee_deductions"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "employee_deductions_update" ON "tenant_staff"."employee_deductions";
CREATE POLICY "employee_deductions_update" ON "tenant_staff"."employee_deductions"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "employee_deductions_delete" ON "tenant_staff"."employee_deductions";
CREATE POLICY "employee_deductions_delete" ON "tenant_staff"."employee_deductions"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "employee_deductions_service" ON "tenant_staff"."employee_deductions";
CREATE POLICY "employee_deductions_service" ON "tenant_staff"."employee_deductions"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "employee_deductions_update_timestamp" ON "tenant_staff"."employee_deductions";
CREATE TRIGGER "employee_deductions_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."employee_deductions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "employee_deductions_prevent_tenant_mutation" ON "tenant_staff"."employee_deductions";
CREATE TRIGGER "employee_deductions_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."employee_deductions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.training_modules
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."training_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."training_modules" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_modules_select" ON "tenant_staff"."training_modules";
CREATE POLICY "training_modules_select" ON "tenant_staff"."training_modules"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "training_modules_insert" ON "tenant_staff"."training_modules";
CREATE POLICY "training_modules_insert" ON "tenant_staff"."training_modules"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "training_modules_update" ON "tenant_staff"."training_modules";
CREATE POLICY "training_modules_update" ON "tenant_staff"."training_modules"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "training_modules_delete" ON "tenant_staff"."training_modules";
CREATE POLICY "training_modules_delete" ON "tenant_staff"."training_modules"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "training_modules_service" ON "tenant_staff"."training_modules";
CREATE POLICY "training_modules_service" ON "tenant_staff"."training_modules"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "training_modules_update_timestamp" ON "tenant_staff"."training_modules";
CREATE TRIGGER "training_modules_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."training_modules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "training_modules_prevent_tenant_mutation" ON "tenant_staff"."training_modules";
CREATE TRIGGER "training_modules_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."training_modules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.training_assignments
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."training_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."training_assignments" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_assignments_select" ON "tenant_staff"."training_assignments";
CREATE POLICY "training_assignments_select" ON "tenant_staff"."training_assignments"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "training_assignments_insert" ON "tenant_staff"."training_assignments";
CREATE POLICY "training_assignments_insert" ON "tenant_staff"."training_assignments"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "training_assignments_update" ON "tenant_staff"."training_assignments";
CREATE POLICY "training_assignments_update" ON "tenant_staff"."training_assignments"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "training_assignments_delete" ON "tenant_staff"."training_assignments";
CREATE POLICY "training_assignments_delete" ON "tenant_staff"."training_assignments"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "training_assignments_service" ON "tenant_staff"."training_assignments";
CREATE POLICY "training_assignments_service" ON "tenant_staff"."training_assignments"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "training_assignments_update_timestamp" ON "tenant_staff"."training_assignments";
CREATE TRIGGER "training_assignments_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."training_assignments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "training_assignments_prevent_tenant_mutation" ON "tenant_staff"."training_assignments";
CREATE TRIGGER "training_assignments_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."training_assignments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.employee_availability
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."employee_availability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."employee_availability" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_availability_select" ON "tenant_staff"."employee_availability";
CREATE POLICY "employee_availability_select" ON "tenant_staff"."employee_availability"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "employee_availability_insert" ON "tenant_staff"."employee_availability";
CREATE POLICY "employee_availability_insert" ON "tenant_staff"."employee_availability"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "employee_availability_update" ON "tenant_staff"."employee_availability";
CREATE POLICY "employee_availability_update" ON "tenant_staff"."employee_availability"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "employee_availability_delete" ON "tenant_staff"."employee_availability";
CREATE POLICY "employee_availability_delete" ON "tenant_staff"."employee_availability"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "employee_availability_service" ON "tenant_staff"."employee_availability";
CREATE POLICY "employee_availability_service" ON "tenant_staff"."employee_availability"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "employee_availability_update_timestamp" ON "tenant_staff"."employee_availability";
CREATE TRIGGER "employee_availability_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."employee_availability"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "employee_availability_prevent_tenant_mutation" ON "tenant_staff"."employee_availability";
CREATE TRIGGER "employee_availability_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."employee_availability"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.employee_certifications
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."employee_certifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."employee_certifications" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_certifications_select" ON "tenant_staff"."employee_certifications";
CREATE POLICY "employee_certifications_select" ON "tenant_staff"."employee_certifications"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "employee_certifications_insert" ON "tenant_staff"."employee_certifications";
CREATE POLICY "employee_certifications_insert" ON "tenant_staff"."employee_certifications"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "employee_certifications_update" ON "tenant_staff"."employee_certifications";
CREATE POLICY "employee_certifications_update" ON "tenant_staff"."employee_certifications"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "employee_certifications_delete" ON "tenant_staff"."employee_certifications";
CREATE POLICY "employee_certifications_delete" ON "tenant_staff"."employee_certifications"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "employee_certifications_service" ON "tenant_staff"."employee_certifications";
CREATE POLICY "employee_certifications_service" ON "tenant_staff"."employee_certifications"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "employee_certifications_update_timestamp" ON "tenant_staff"."employee_certifications";
CREATE TRIGGER "employee_certifications_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."employee_certifications"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "employee_certifications_prevent_tenant_mutation" ON "tenant_staff"."employee_certifications";
CREATE TRIGGER "employee_certifications_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."employee_certifications"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.payroll_periods
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."payroll_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."payroll_periods" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_periods_select" ON "tenant_staff"."payroll_periods";
CREATE POLICY "payroll_periods_select" ON "tenant_staff"."payroll_periods"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "payroll_periods_insert" ON "tenant_staff"."payroll_periods";
CREATE POLICY "payroll_periods_insert" ON "tenant_staff"."payroll_periods"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "payroll_periods_update" ON "tenant_staff"."payroll_periods";
CREATE POLICY "payroll_periods_update" ON "tenant_staff"."payroll_periods"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "payroll_periods_delete" ON "tenant_staff"."payroll_periods";
CREATE POLICY "payroll_periods_delete" ON "tenant_staff"."payroll_periods"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "payroll_periods_service" ON "tenant_staff"."payroll_periods";
CREATE POLICY "payroll_periods_service" ON "tenant_staff"."payroll_periods"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "payroll_periods_update_timestamp" ON "tenant_staff"."payroll_periods";
CREATE TRIGGER "payroll_periods_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."payroll_periods"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "payroll_periods_prevent_tenant_mutation" ON "tenant_staff"."payroll_periods";
CREATE TRIGGER "payroll_periods_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."payroll_periods"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.payroll_runs
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."payroll_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."payroll_runs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_runs_select" ON "tenant_staff"."payroll_runs";
CREATE POLICY "payroll_runs_select" ON "tenant_staff"."payroll_runs"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "payroll_runs_insert" ON "tenant_staff"."payroll_runs";
CREATE POLICY "payroll_runs_insert" ON "tenant_staff"."payroll_runs"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "payroll_runs_update" ON "tenant_staff"."payroll_runs";
CREATE POLICY "payroll_runs_update" ON "tenant_staff"."payroll_runs"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "payroll_runs_delete" ON "tenant_staff"."payroll_runs";
CREATE POLICY "payroll_runs_delete" ON "tenant_staff"."payroll_runs"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "payroll_runs_service" ON "tenant_staff"."payroll_runs";
CREATE POLICY "payroll_runs_service" ON "tenant_staff"."payroll_runs"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "payroll_runs_update_timestamp" ON "tenant_staff"."payroll_runs";
CREATE TRIGGER "payroll_runs_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."payroll_runs"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "payroll_runs_prevent_tenant_mutation" ON "tenant_staff"."payroll_runs";
CREATE TRIGGER "payroll_runs_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."payroll_runs"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.schedules
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."schedules" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select" ON "tenant_staff"."schedules";
CREATE POLICY "schedules_select" ON "tenant_staff"."schedules"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "schedules_insert" ON "tenant_staff"."schedules";
CREATE POLICY "schedules_insert" ON "tenant_staff"."schedules"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "schedules_update" ON "tenant_staff"."schedules";
CREATE POLICY "schedules_update" ON "tenant_staff"."schedules"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "schedules_delete" ON "tenant_staff"."schedules";
CREATE POLICY "schedules_delete" ON "tenant_staff"."schedules"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "schedules_service" ON "tenant_staff"."schedules";
CREATE POLICY "schedules_service" ON "tenant_staff"."schedules"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "schedules_update_timestamp" ON "tenant_staff"."schedules";
CREATE TRIGGER "schedules_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "schedules_prevent_tenant_mutation" ON "tenant_staff"."schedules";
CREATE TRIGGER "schedules_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.schedule_shifts
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."schedule_shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."schedule_shifts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_shifts_select" ON "tenant_staff"."schedule_shifts";
CREATE POLICY "schedule_shifts_select" ON "tenant_staff"."schedule_shifts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "schedule_shifts_insert" ON "tenant_staff"."schedule_shifts";
CREATE POLICY "schedule_shifts_insert" ON "tenant_staff"."schedule_shifts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "schedule_shifts_update" ON "tenant_staff"."schedule_shifts";
CREATE POLICY "schedule_shifts_update" ON "tenant_staff"."schedule_shifts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "schedule_shifts_delete" ON "tenant_staff"."schedule_shifts";
CREATE POLICY "schedule_shifts_delete" ON "tenant_staff"."schedule_shifts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "schedule_shifts_service" ON "tenant_staff"."schedule_shifts";
CREATE POLICY "schedule_shifts_service" ON "tenant_staff"."schedule_shifts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "schedule_shifts_update_timestamp" ON "tenant_staff"."schedule_shifts";
CREATE TRIGGER "schedule_shifts_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."schedule_shifts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "schedule_shifts_prevent_tenant_mutation" ON "tenant_staff"."schedule_shifts";
CREATE TRIGGER "schedule_shifts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."schedule_shifts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.time_entries
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."time_entries" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_entries_select" ON "tenant_staff"."time_entries";
CREATE POLICY "time_entries_select" ON "tenant_staff"."time_entries"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "time_entries_insert" ON "tenant_staff"."time_entries";
CREATE POLICY "time_entries_insert" ON "tenant_staff"."time_entries"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "time_entries_update" ON "tenant_staff"."time_entries";
CREATE POLICY "time_entries_update" ON "tenant_staff"."time_entries"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "time_entries_delete" ON "tenant_staff"."time_entries";
CREATE POLICY "time_entries_delete" ON "tenant_staff"."time_entries"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "time_entries_service" ON "tenant_staff"."time_entries";
CREATE POLICY "time_entries_service" ON "tenant_staff"."time_entries"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "time_entries_update_timestamp" ON "tenant_staff"."time_entries";
CREATE TRIGGER "time_entries_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."time_entries"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "time_entries_prevent_tenant_mutation" ON "tenant_staff"."time_entries";
CREATE TRIGGER "time_entries_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."time_entries"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.timecard_edit_requests
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."timecard_edit_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."timecard_edit_requests" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timecard_edit_requests_select" ON "tenant_staff"."timecard_edit_requests";
CREATE POLICY "timecard_edit_requests_select" ON "tenant_staff"."timecard_edit_requests"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "timecard_edit_requests_insert" ON "tenant_staff"."timecard_edit_requests";
CREATE POLICY "timecard_edit_requests_insert" ON "tenant_staff"."timecard_edit_requests"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "timecard_edit_requests_update" ON "tenant_staff"."timecard_edit_requests";
CREATE POLICY "timecard_edit_requests_update" ON "tenant_staff"."timecard_edit_requests"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "timecard_edit_requests_delete" ON "tenant_staff"."timecard_edit_requests";
CREATE POLICY "timecard_edit_requests_delete" ON "tenant_staff"."timecard_edit_requests"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "timecard_edit_requests_service" ON "tenant_staff"."timecard_edit_requests";
CREATE POLICY "timecard_edit_requests_service" ON "tenant_staff"."timecard_edit_requests"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "timecard_edit_requests_update_timestamp" ON "tenant_staff"."timecard_edit_requests";
CREATE TRIGGER "timecard_edit_requests_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."timecard_edit_requests"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "timecard_edit_requests_prevent_tenant_mutation" ON "tenant_staff"."timecard_edit_requests";
CREATE TRIGGER "timecard_edit_requests_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."timecard_edit_requests"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ╔══════════════════════════════════════════════════════════════════════════════
-- ║ tenant_crm (5 tables)
-- ╚══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- tenant_crm.clients
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_crm"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_crm"."clients" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON "tenant_crm"."clients";
CREATE POLICY "clients_select" ON "tenant_crm"."clients"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "clients_insert" ON "tenant_crm"."clients";
CREATE POLICY "clients_insert" ON "tenant_crm"."clients"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "clients_update" ON "tenant_crm"."clients";
CREATE POLICY "clients_update" ON "tenant_crm"."clients"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "clients_delete" ON "tenant_crm"."clients";
CREATE POLICY "clients_delete" ON "tenant_crm"."clients"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "clients_service" ON "tenant_crm"."clients";
CREATE POLICY "clients_service" ON "tenant_crm"."clients"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "clients_update_timestamp" ON "tenant_crm"."clients";
CREATE TRIGGER "clients_update_timestamp"
    BEFORE UPDATE ON "tenant_crm"."clients"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "clients_prevent_tenant_mutation" ON "tenant_crm"."clients";
CREATE TRIGGER "clients_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_crm"."clients"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_crm.client_contacts
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_crm"."client_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_crm"."client_contacts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_contacts_select" ON "tenant_crm"."client_contacts";
CREATE POLICY "client_contacts_select" ON "tenant_crm"."client_contacts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "client_contacts_insert" ON "tenant_crm"."client_contacts";
CREATE POLICY "client_contacts_insert" ON "tenant_crm"."client_contacts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "client_contacts_update" ON "tenant_crm"."client_contacts";
CREATE POLICY "client_contacts_update" ON "tenant_crm"."client_contacts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "client_contacts_delete" ON "tenant_crm"."client_contacts";
CREATE POLICY "client_contacts_delete" ON "tenant_crm"."client_contacts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "client_contacts_service" ON "tenant_crm"."client_contacts";
CREATE POLICY "client_contacts_service" ON "tenant_crm"."client_contacts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "client_contacts_update_timestamp" ON "tenant_crm"."client_contacts";
CREATE TRIGGER "client_contacts_update_timestamp"
    BEFORE UPDATE ON "tenant_crm"."client_contacts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "client_contacts_prevent_tenant_mutation" ON "tenant_crm"."client_contacts";
CREATE TRIGGER "client_contacts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_crm"."client_contacts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_crm.client_interactions
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_crm"."client_interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_crm"."client_interactions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_interactions_select" ON "tenant_crm"."client_interactions";
CREATE POLICY "client_interactions_select" ON "tenant_crm"."client_interactions"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "client_interactions_insert" ON "tenant_crm"."client_interactions";
CREATE POLICY "client_interactions_insert" ON "tenant_crm"."client_interactions"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "client_interactions_update" ON "tenant_crm"."client_interactions";
CREATE POLICY "client_interactions_update" ON "tenant_crm"."client_interactions"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "client_interactions_delete" ON "tenant_crm"."client_interactions";
CREATE POLICY "client_interactions_delete" ON "tenant_crm"."client_interactions"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "client_interactions_service" ON "tenant_crm"."client_interactions";
CREATE POLICY "client_interactions_service" ON "tenant_crm"."client_interactions"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "client_interactions_update_timestamp" ON "tenant_crm"."client_interactions";
CREATE TRIGGER "client_interactions_update_timestamp"
    BEFORE UPDATE ON "tenant_crm"."client_interactions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "client_interactions_prevent_tenant_mutation" ON "tenant_crm"."client_interactions";
CREATE TRIGGER "client_interactions_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_crm"."client_interactions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_crm.leads
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_crm"."leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_crm"."leads" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select" ON "tenant_crm"."leads";
CREATE POLICY "leads_select" ON "tenant_crm"."leads"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "leads_insert" ON "tenant_crm"."leads";
CREATE POLICY "leads_insert" ON "tenant_crm"."leads"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "leads_update" ON "tenant_crm"."leads";
CREATE POLICY "leads_update" ON "tenant_crm"."leads"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "leads_delete" ON "tenant_crm"."leads";
CREATE POLICY "leads_delete" ON "tenant_crm"."leads"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "leads_service" ON "tenant_crm"."leads";
CREATE POLICY "leads_service" ON "tenant_crm"."leads"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "leads_update_timestamp" ON "tenant_crm"."leads";
CREATE TRIGGER "leads_update_timestamp"
    BEFORE UPDATE ON "tenant_crm"."leads"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "leads_prevent_tenant_mutation" ON "tenant_crm"."leads";
CREATE TRIGGER "leads_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_crm"."leads"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_crm.proposals
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_crm"."proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_crm"."proposals" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select" ON "tenant_crm"."proposals";
CREATE POLICY "proposals_select" ON "tenant_crm"."proposals"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "proposals_insert" ON "tenant_crm"."proposals";
CREATE POLICY "proposals_insert" ON "tenant_crm"."proposals"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "proposals_update" ON "tenant_crm"."proposals";
CREATE POLICY "proposals_update" ON "tenant_crm"."proposals"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "proposals_delete" ON "tenant_crm"."proposals";
CREATE POLICY "proposals_delete" ON "tenant_crm"."proposals"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "proposals_service" ON "tenant_crm"."proposals";
CREATE POLICY "proposals_service" ON "tenant_crm"."proposals"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "proposals_update_timestamp" ON "tenant_crm"."proposals";
CREATE TRIGGER "proposals_update_timestamp"
    BEFORE UPDATE ON "tenant_crm"."proposals"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "proposals_prevent_tenant_mutation" ON "tenant_crm"."proposals";
CREATE TRIGGER "proposals_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_crm"."proposals"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ╔══════════════════════════════════════════════════════════════════════════════
-- ║ tenant_events (5 tables)
-- ╚══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- tenant_events.events
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_events"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."events" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select" ON "tenant_events"."events";
CREATE POLICY "events_select" ON "tenant_events"."events"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "events_insert" ON "tenant_events"."events";
CREATE POLICY "events_insert" ON "tenant_events"."events"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "events_update" ON "tenant_events"."events";
CREATE POLICY "events_update" ON "tenant_events"."events"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "events_delete" ON "tenant_events"."events";
CREATE POLICY "events_delete" ON "tenant_events"."events"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "events_service" ON "tenant_events"."events";
CREATE POLICY "events_service" ON "tenant_events"."events"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "events_update_timestamp" ON "tenant_events"."events";
CREATE TRIGGER "events_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."events"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "events_prevent_tenant_mutation" ON "tenant_events"."events";
CREATE TRIGGER "events_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."events"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_events.event_profitability
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_events"."event_profitability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."event_profitability" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_profitability_select" ON "tenant_events"."event_profitability";
CREATE POLICY "event_profitability_select" ON "tenant_events"."event_profitability"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "event_profitability_insert" ON "tenant_events"."event_profitability";
CREATE POLICY "event_profitability_insert" ON "tenant_events"."event_profitability"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "event_profitability_update" ON "tenant_events"."event_profitability";
CREATE POLICY "event_profitability_update" ON "tenant_events"."event_profitability"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "event_profitability_delete" ON "tenant_events"."event_profitability";
CREATE POLICY "event_profitability_delete" ON "tenant_events"."event_profitability"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "event_profitability_service" ON "tenant_events"."event_profitability";
CREATE POLICY "event_profitability_service" ON "tenant_events"."event_profitability"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "event_profitability_update_timestamp" ON "tenant_events"."event_profitability";
CREATE TRIGGER "event_profitability_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."event_profitability"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "event_profitability_prevent_tenant_mutation" ON "tenant_events"."event_profitability";
CREATE TRIGGER "event_profitability_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."event_profitability"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_events.event_summaries
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_events"."event_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."event_summaries" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_summaries_select" ON "tenant_events"."event_summaries";
CREATE POLICY "event_summaries_select" ON "tenant_events"."event_summaries"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "event_summaries_insert" ON "tenant_events"."event_summaries";
CREATE POLICY "event_summaries_insert" ON "tenant_events"."event_summaries"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "event_summaries_update" ON "tenant_events"."event_summaries";
CREATE POLICY "event_summaries_update" ON "tenant_events"."event_summaries"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "event_summaries_delete" ON "tenant_events"."event_summaries";
CREATE POLICY "event_summaries_delete" ON "tenant_events"."event_summaries"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "event_summaries_service" ON "tenant_events"."event_summaries";
CREATE POLICY "event_summaries_service" ON "tenant_events"."event_summaries"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "event_summaries_update_timestamp" ON "tenant_events"."event_summaries";
CREATE TRIGGER "event_summaries_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."event_summaries"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "event_summaries_prevent_tenant_mutation" ON "tenant_events"."event_summaries";
CREATE TRIGGER "event_summaries_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."event_summaries"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_events.event_reports
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_events"."event_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."event_reports" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_reports_select" ON "tenant_events"."event_reports";
CREATE POLICY "event_reports_select" ON "tenant_events"."event_reports"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "event_reports_insert" ON "tenant_events"."event_reports";
CREATE POLICY "event_reports_insert" ON "tenant_events"."event_reports"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "event_reports_update" ON "tenant_events"."event_reports";
CREATE POLICY "event_reports_update" ON "tenant_events"."event_reports"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "event_reports_delete" ON "tenant_events"."event_reports";
CREATE POLICY "event_reports_delete" ON "tenant_events"."event_reports"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "event_reports_service" ON "tenant_events"."event_reports";
CREATE POLICY "event_reports_service" ON "tenant_events"."event_reports"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "event_reports_update_timestamp" ON "tenant_events"."event_reports";
CREATE TRIGGER "event_reports_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."event_reports"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "event_reports_prevent_tenant_mutation" ON "tenant_events"."event_reports";
CREATE TRIGGER "event_reports_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."event_reports"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_events.catering_orders
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_events"."catering_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_events"."catering_orders" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catering_orders_select" ON "tenant_events"."catering_orders";
CREATE POLICY "catering_orders_select" ON "tenant_events"."catering_orders"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "catering_orders_insert" ON "tenant_events"."catering_orders";
CREATE POLICY "catering_orders_insert" ON "tenant_events"."catering_orders"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "catering_orders_update" ON "tenant_events"."catering_orders";
CREATE POLICY "catering_orders_update" ON "tenant_events"."catering_orders"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "catering_orders_delete" ON "tenant_events"."catering_orders";
CREATE POLICY "catering_orders_delete" ON "tenant_events"."catering_orders"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "catering_orders_service" ON "tenant_events"."catering_orders";
CREATE POLICY "catering_orders_service" ON "tenant_events"."catering_orders"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "catering_orders_update_timestamp" ON "tenant_events"."catering_orders";
CREATE TRIGGER "catering_orders_update_timestamp"
    BEFORE UPDATE ON "tenant_events"."catering_orders"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "catering_orders_prevent_tenant_mutation" ON "tenant_events"."catering_orders";
CREATE TRIGGER "catering_orders_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_events"."catering_orders"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ╔══════════════════════════════════════════════════════════════════════════════
-- ║ tenant_kitchen (10 tables)
-- ╚══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- tenant_kitchen.prep_tasks
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."prep_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."prep_tasks" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prep_tasks_select" ON "tenant_kitchen"."prep_tasks";
CREATE POLICY "prep_tasks_select" ON "tenant_kitchen"."prep_tasks"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "prep_tasks_insert" ON "tenant_kitchen"."prep_tasks";
CREATE POLICY "prep_tasks_insert" ON "tenant_kitchen"."prep_tasks"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "prep_tasks_update" ON "tenant_kitchen"."prep_tasks";
CREATE POLICY "prep_tasks_update" ON "tenant_kitchen"."prep_tasks"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "prep_tasks_delete" ON "tenant_kitchen"."prep_tasks";
CREATE POLICY "prep_tasks_delete" ON "tenant_kitchen"."prep_tasks"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "prep_tasks_service" ON "tenant_kitchen"."prep_tasks";
CREATE POLICY "prep_tasks_service" ON "tenant_kitchen"."prep_tasks"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "prep_tasks_update_timestamp" ON "tenant_kitchen"."prep_tasks";
CREATE TRIGGER "prep_tasks_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."prep_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "prep_tasks_prevent_tenant_mutation" ON "tenant_kitchen"."prep_tasks";
CREATE TRIGGER "prep_tasks_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."prep_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.kitchen_tasks
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."kitchen_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."kitchen_tasks" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kitchen_tasks_select" ON "tenant_kitchen"."kitchen_tasks";
CREATE POLICY "kitchen_tasks_select" ON "tenant_kitchen"."kitchen_tasks"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "kitchen_tasks_insert" ON "tenant_kitchen"."kitchen_tasks";
CREATE POLICY "kitchen_tasks_insert" ON "tenant_kitchen"."kitchen_tasks"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "kitchen_tasks_update" ON "tenant_kitchen"."kitchen_tasks";
CREATE POLICY "kitchen_tasks_update" ON "tenant_kitchen"."kitchen_tasks"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "kitchen_tasks_delete" ON "tenant_kitchen"."kitchen_tasks";
CREATE POLICY "kitchen_tasks_delete" ON "tenant_kitchen"."kitchen_tasks"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "kitchen_tasks_service" ON "tenant_kitchen"."kitchen_tasks";
CREATE POLICY "kitchen_tasks_service" ON "tenant_kitchen"."kitchen_tasks"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "kitchen_tasks_update_timestamp" ON "tenant_kitchen"."kitchen_tasks";
CREATE TRIGGER "kitchen_tasks_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."kitchen_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "kitchen_tasks_prevent_tenant_mutation" ON "tenant_kitchen"."kitchen_tasks";
CREATE TRIGGER "kitchen_tasks_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."kitchen_tasks"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.recipes
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."recipes" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_select" ON "tenant_kitchen"."recipes";
CREATE POLICY "recipes_select" ON "tenant_kitchen"."recipes"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "recipes_insert" ON "tenant_kitchen"."recipes";
CREATE POLICY "recipes_insert" ON "tenant_kitchen"."recipes"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "recipes_update" ON "tenant_kitchen"."recipes";
CREATE POLICY "recipes_update" ON "tenant_kitchen"."recipes"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "recipes_delete" ON "tenant_kitchen"."recipes";
CREATE POLICY "recipes_delete" ON "tenant_kitchen"."recipes"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "recipes_service" ON "tenant_kitchen"."recipes";
CREATE POLICY "recipes_service" ON "tenant_kitchen"."recipes"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "recipes_update_timestamp" ON "tenant_kitchen"."recipes";
CREATE TRIGGER "recipes_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."recipes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "recipes_prevent_tenant_mutation" ON "tenant_kitchen"."recipes";
CREATE TRIGGER "recipes_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."recipes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.recipe_versions
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."recipe_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."recipe_versions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_versions_select" ON "tenant_kitchen"."recipe_versions";
CREATE POLICY "recipe_versions_select" ON "tenant_kitchen"."recipe_versions"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "recipe_versions_insert" ON "tenant_kitchen"."recipe_versions";
CREATE POLICY "recipe_versions_insert" ON "tenant_kitchen"."recipe_versions"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "recipe_versions_update" ON "tenant_kitchen"."recipe_versions";
CREATE POLICY "recipe_versions_update" ON "tenant_kitchen"."recipe_versions"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "recipe_versions_delete" ON "tenant_kitchen"."recipe_versions";
CREATE POLICY "recipe_versions_delete" ON "tenant_kitchen"."recipe_versions"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "recipe_versions_service" ON "tenant_kitchen"."recipe_versions";
CREATE POLICY "recipe_versions_service" ON "tenant_kitchen"."recipe_versions"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "recipe_versions_update_timestamp" ON "tenant_kitchen"."recipe_versions";
CREATE TRIGGER "recipe_versions_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."recipe_versions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "recipe_versions_prevent_tenant_mutation" ON "tenant_kitchen"."recipe_versions";
CREATE TRIGGER "recipe_versions_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."recipe_versions"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.ingredients
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."ingredients" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredients_select" ON "tenant_kitchen"."ingredients";
CREATE POLICY "ingredients_select" ON "tenant_kitchen"."ingredients"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "ingredients_insert" ON "tenant_kitchen"."ingredients";
CREATE POLICY "ingredients_insert" ON "tenant_kitchen"."ingredients"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "ingredients_update" ON "tenant_kitchen"."ingredients";
CREATE POLICY "ingredients_update" ON "tenant_kitchen"."ingredients"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "ingredients_delete" ON "tenant_kitchen"."ingredients";
CREATE POLICY "ingredients_delete" ON "tenant_kitchen"."ingredients"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "ingredients_service" ON "tenant_kitchen"."ingredients";
CREATE POLICY "ingredients_service" ON "tenant_kitchen"."ingredients"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "ingredients_update_timestamp" ON "tenant_kitchen"."ingredients";
CREATE TRIGGER "ingredients_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."ingredients"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "ingredients_prevent_tenant_mutation" ON "tenant_kitchen"."ingredients";
CREATE TRIGGER "ingredients_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."ingredients"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.stations
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."stations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."stations" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stations_select" ON "tenant_kitchen"."stations";
CREATE POLICY "stations_select" ON "tenant_kitchen"."stations"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "stations_insert" ON "tenant_kitchen"."stations";
CREATE POLICY "stations_insert" ON "tenant_kitchen"."stations"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "stations_update" ON "tenant_kitchen"."stations";
CREATE POLICY "stations_update" ON "tenant_kitchen"."stations"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "stations_delete" ON "tenant_kitchen"."stations";
CREATE POLICY "stations_delete" ON "tenant_kitchen"."stations"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "stations_service" ON "tenant_kitchen"."stations";
CREATE POLICY "stations_service" ON "tenant_kitchen"."stations"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "stations_update_timestamp" ON "tenant_kitchen"."stations";
CREATE TRIGGER "stations_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."stations"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "stations_prevent_tenant_mutation" ON "tenant_kitchen"."stations";
CREATE TRIGGER "stations_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."stations"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.dishes
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."dishes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."dishes" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dishes_select" ON "tenant_kitchen"."dishes";
CREATE POLICY "dishes_select" ON "tenant_kitchen"."dishes"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "dishes_insert" ON "tenant_kitchen"."dishes";
CREATE POLICY "dishes_insert" ON "tenant_kitchen"."dishes"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "dishes_update" ON "tenant_kitchen"."dishes";
CREATE POLICY "dishes_update" ON "tenant_kitchen"."dishes"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "dishes_delete" ON "tenant_kitchen"."dishes";
CREATE POLICY "dishes_delete" ON "tenant_kitchen"."dishes"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "dishes_service" ON "tenant_kitchen"."dishes";
CREATE POLICY "dishes_service" ON "tenant_kitchen"."dishes"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "dishes_update_timestamp" ON "tenant_kitchen"."dishes";
CREATE TRIGGER "dishes_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."dishes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "dishes_prevent_tenant_mutation" ON "tenant_kitchen"."dishes";
CREATE TRIGGER "dishes_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."dishes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.menus
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."menus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."menus" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menus_select" ON "tenant_kitchen"."menus";
CREATE POLICY "menus_select" ON "tenant_kitchen"."menus"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "menus_insert" ON "tenant_kitchen"."menus";
CREATE POLICY "menus_insert" ON "tenant_kitchen"."menus"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "menus_update" ON "tenant_kitchen"."menus";
CREATE POLICY "menus_update" ON "tenant_kitchen"."menus"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "menus_delete" ON "tenant_kitchen"."menus";
CREATE POLICY "menus_delete" ON "tenant_kitchen"."menus"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "menus_service" ON "tenant_kitchen"."menus";
CREATE POLICY "menus_service" ON "tenant_kitchen"."menus"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "menus_update_timestamp" ON "tenant_kitchen"."menus";
CREATE TRIGGER "menus_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."menus"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "menus_prevent_tenant_mutation" ON "tenant_kitchen"."menus";
CREATE TRIGGER "menus_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."menus"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.prep_lists
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."prep_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."prep_lists" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prep_lists_select" ON "tenant_kitchen"."prep_lists";
CREATE POLICY "prep_lists_select" ON "tenant_kitchen"."prep_lists"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "prep_lists_insert" ON "tenant_kitchen"."prep_lists";
CREATE POLICY "prep_lists_insert" ON "tenant_kitchen"."prep_lists"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "prep_lists_update" ON "tenant_kitchen"."prep_lists";
CREATE POLICY "prep_lists_update" ON "tenant_kitchen"."prep_lists"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "prep_lists_delete" ON "tenant_kitchen"."prep_lists";
CREATE POLICY "prep_lists_delete" ON "tenant_kitchen"."prep_lists"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "prep_lists_service" ON "tenant_kitchen"."prep_lists";
CREATE POLICY "prep_lists_service" ON "tenant_kitchen"."prep_lists"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "prep_lists_update_timestamp" ON "tenant_kitchen"."prep_lists";
CREATE TRIGGER "prep_lists_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."prep_lists"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "prep_lists_prevent_tenant_mutation" ON "tenant_kitchen"."prep_lists";
CREATE TRIGGER "prep_lists_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."prep_lists"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_kitchen.waste_entries
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_kitchen"."waste_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_kitchen"."waste_entries" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waste_entries_select" ON "tenant_kitchen"."waste_entries";
CREATE POLICY "waste_entries_select" ON "tenant_kitchen"."waste_entries"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "waste_entries_insert" ON "tenant_kitchen"."waste_entries";
CREATE POLICY "waste_entries_insert" ON "tenant_kitchen"."waste_entries"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "waste_entries_update" ON "tenant_kitchen"."waste_entries";
CREATE POLICY "waste_entries_update" ON "tenant_kitchen"."waste_entries"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "waste_entries_delete" ON "tenant_kitchen"."waste_entries";
CREATE POLICY "waste_entries_delete" ON "tenant_kitchen"."waste_entries"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "waste_entries_service" ON "tenant_kitchen"."waste_entries";
CREATE POLICY "waste_entries_service" ON "tenant_kitchen"."waste_entries"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "waste_entries_update_timestamp" ON "tenant_kitchen"."waste_entries";
CREATE TRIGGER "waste_entries_update_timestamp"
    BEFORE UPDATE ON "tenant_kitchen"."waste_entries"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "waste_entries_prevent_tenant_mutation" ON "tenant_kitchen"."waste_entries";
CREATE TRIGGER "waste_entries_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_kitchen"."waste_entries"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ╔══════════════════════════════════════════════════════════════════════════════
-- ║ tenant_facilities (3 tables)
-- ╚══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- tenant_facilities.facility_areas
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_facilities"."facility_areas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_facilities"."facility_areas" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility_areas_select" ON "tenant_facilities"."facility_areas";
CREATE POLICY "facility_areas_select" ON "tenant_facilities"."facility_areas"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "facility_areas_insert" ON "tenant_facilities"."facility_areas";
CREATE POLICY "facility_areas_insert" ON "tenant_facilities"."facility_areas"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "facility_areas_update" ON "tenant_facilities"."facility_areas";
CREATE POLICY "facility_areas_update" ON "tenant_facilities"."facility_areas"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "facility_areas_delete" ON "tenant_facilities"."facility_areas";
CREATE POLICY "facility_areas_delete" ON "tenant_facilities"."facility_areas"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "facility_areas_service" ON "tenant_facilities"."facility_areas";
CREATE POLICY "facility_areas_service" ON "tenant_facilities"."facility_areas"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "facility_areas_update_timestamp" ON "tenant_facilities"."facility_areas";
CREATE TRIGGER "facility_areas_update_timestamp"
    BEFORE UPDATE ON "tenant_facilities"."facility_areas"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "facility_areas_prevent_tenant_mutation" ON "tenant_facilities"."facility_areas";
CREATE TRIGGER "facility_areas_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_facilities"."facility_areas"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_facilities.maintenance_work_orders
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_facilities"."maintenance_work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_facilities"."maintenance_work_orders" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_work_orders_select" ON "tenant_facilities"."maintenance_work_orders";
CREATE POLICY "maintenance_work_orders_select" ON "tenant_facilities"."maintenance_work_orders"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "maintenance_work_orders_insert" ON "tenant_facilities"."maintenance_work_orders";
CREATE POLICY "maintenance_work_orders_insert" ON "tenant_facilities"."maintenance_work_orders"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "maintenance_work_orders_update" ON "tenant_facilities"."maintenance_work_orders";
CREATE POLICY "maintenance_work_orders_update" ON "tenant_facilities"."maintenance_work_orders"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "maintenance_work_orders_delete" ON "tenant_facilities"."maintenance_work_orders";
CREATE POLICY "maintenance_work_orders_delete" ON "tenant_facilities"."maintenance_work_orders"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "maintenance_work_orders_service" ON "tenant_facilities"."maintenance_work_orders";
CREATE POLICY "maintenance_work_orders_service" ON "tenant_facilities"."maintenance_work_orders"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "maintenance_work_orders_update_timestamp" ON "tenant_facilities"."maintenance_work_orders";
CREATE TRIGGER "maintenance_work_orders_update_timestamp"
    BEFORE UPDATE ON "tenant_facilities"."maintenance_work_orders"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "maintenance_work_orders_prevent_tenant_mutation" ON "tenant_facilities"."maintenance_work_orders";
CREATE TRIGGER "maintenance_work_orders_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_facilities"."maintenance_work_orders"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_facilities.preventive_maintenance_schedules
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_facilities"."preventive_maintenance_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_facilities"."preventive_maintenance_schedules" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "preventive_maintenance_schedules_select" ON "tenant_facilities"."preventive_maintenance_schedules";
CREATE POLICY "preventive_maintenance_schedules_select" ON "tenant_facilities"."preventive_maintenance_schedules"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "preventive_maintenance_schedules_insert" ON "tenant_facilities"."preventive_maintenance_schedules";
CREATE POLICY "preventive_maintenance_schedules_insert" ON "tenant_facilities"."preventive_maintenance_schedules"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "preventive_maintenance_schedules_update" ON "tenant_facilities"."preventive_maintenance_schedules";
CREATE POLICY "preventive_maintenance_schedules_update" ON "tenant_facilities"."preventive_maintenance_schedules"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "preventive_maintenance_schedules_delete" ON "tenant_facilities"."preventive_maintenance_schedules";
CREATE POLICY "preventive_maintenance_schedules_delete" ON "tenant_facilities"."preventive_maintenance_schedules"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "preventive_maintenance_schedules_service" ON "tenant_facilities"."preventive_maintenance_schedules";
CREATE POLICY "preventive_maintenance_schedules_service" ON "tenant_facilities"."preventive_maintenance_schedules"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "preventive_maintenance_schedules_update_timestamp" ON "tenant_facilities"."preventive_maintenance_schedules";
CREATE TRIGGER "preventive_maintenance_schedules_update_timestamp"
    BEFORE UPDATE ON "tenant_facilities"."preventive_maintenance_schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "preventive_maintenance_schedules_prevent_tenant_mutation" ON "tenant_facilities"."preventive_maintenance_schedules";
CREATE TRIGGER "preventive_maintenance_schedules_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_facilities"."preventive_maintenance_schedules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
