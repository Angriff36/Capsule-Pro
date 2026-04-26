-- Migration: Add Row Level Security to post-expansion tables
-- Date: 2026-04-27
-- Description: Add RLS policies, update_timestamp triggers, and prevent_tenant_mutation
--              triggers to all tables created after 2026-03-08 that lack RLS.
--              These tables were added during the expansion phase but missed the
--              standard RLS hardening that protects against cross-tenant data leakage.

-- ============================================================================
-- tenant_inventory.vendor_contacts
-- Source: 20260327000000_add_vendor_management
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."vendor_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."vendor_contacts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_contacts_select" ON "tenant_inventory"."vendor_contacts";
CREATE POLICY "vendor_contacts_select" ON "tenant_inventory"."vendor_contacts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "vendor_contacts_insert" ON "tenant_inventory"."vendor_contacts";
CREATE POLICY "vendor_contacts_insert" ON "tenant_inventory"."vendor_contacts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "vendor_contacts_update" ON "tenant_inventory"."vendor_contacts";
CREATE POLICY "vendor_contacts_update" ON "tenant_inventory"."vendor_contacts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "vendor_contacts_delete" ON "tenant_inventory"."vendor_contacts";
CREATE POLICY "vendor_contacts_delete" ON "tenant_inventory"."vendor_contacts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "vendor_contacts_service" ON "tenant_inventory"."vendor_contacts";
CREATE POLICY "vendor_contacts_service" ON "tenant_inventory"."vendor_contacts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for vendor_contacts
DROP TRIGGER IF EXISTS "vendor_contacts_update_timestamp" ON "tenant_inventory"."vendor_contacts";
CREATE TRIGGER "vendor_contacts_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."vendor_contacts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "vendor_contacts_prevent_tenant_mutation" ON "tenant_inventory"."vendor_contacts";
CREATE TRIGGER "vendor_contacts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."vendor_contacts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.vendor_ratings
-- Source: 20260327000000_add_vendor_management
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."vendor_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."vendor_ratings" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_ratings_select" ON "tenant_inventory"."vendor_ratings";
CREATE POLICY "vendor_ratings_select" ON "tenant_inventory"."vendor_ratings"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "vendor_ratings_insert" ON "tenant_inventory"."vendor_ratings";
CREATE POLICY "vendor_ratings_insert" ON "tenant_inventory"."vendor_ratings"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "vendor_ratings_update" ON "tenant_inventory"."vendor_ratings";
CREATE POLICY "vendor_ratings_update" ON "tenant_inventory"."vendor_ratings"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "vendor_ratings_delete" ON "tenant_inventory"."vendor_ratings";
CREATE POLICY "vendor_ratings_delete" ON "tenant_inventory"."vendor_ratings"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "vendor_ratings_service" ON "tenant_inventory"."vendor_ratings";
CREATE POLICY "vendor_ratings_service" ON "tenant_inventory"."vendor_ratings"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for vendor_ratings
DROP TRIGGER IF EXISTS "vendor_ratings_update_timestamp" ON "tenant_inventory"."vendor_ratings";
CREATE TRIGGER "vendor_ratings_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."vendor_ratings"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "vendor_ratings_prevent_tenant_mutation" ON "tenant_inventory"."vendor_ratings";
CREATE TRIGGER "vendor_ratings_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."vendor_ratings"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.procurement_budgets
-- Source: 20260327010000_add_procurement_budgets
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."procurement_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."procurement_budgets" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procurement_budgets_select" ON "tenant_inventory"."procurement_budgets";
CREATE POLICY "procurement_budgets_select" ON "tenant_inventory"."procurement_budgets"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "procurement_budgets_insert" ON "tenant_inventory"."procurement_budgets";
CREATE POLICY "procurement_budgets_insert" ON "tenant_inventory"."procurement_budgets"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "procurement_budgets_update" ON "tenant_inventory"."procurement_budgets";
CREATE POLICY "procurement_budgets_update" ON "tenant_inventory"."procurement_budgets"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "procurement_budgets_delete" ON "tenant_inventory"."procurement_budgets";
CREATE POLICY "procurement_budgets_delete" ON "tenant_inventory"."procurement_budgets"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "procurement_budgets_service" ON "tenant_inventory"."procurement_budgets";
CREATE POLICY "procurement_budgets_service" ON "tenant_inventory"."procurement_budgets"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for procurement_budgets
DROP TRIGGER IF EXISTS "procurement_budgets_update_timestamp" ON "tenant_inventory"."procurement_budgets";
CREATE TRIGGER "procurement_budgets_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."procurement_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "procurement_budgets_prevent_tenant_mutation" ON "tenant_inventory"."procurement_budgets";
CREATE TRIGGER "procurement_budgets_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."procurement_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_inventory.procurement_budget_alerts
-- Source: 20260327010000_add_procurement_budgets
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."procurement_budget_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."procurement_budget_alerts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procurement_budget_alerts_select" ON "tenant_inventory"."procurement_budget_alerts";
CREATE POLICY "procurement_budget_alerts_select" ON "tenant_inventory"."procurement_budget_alerts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "procurement_budget_alerts_insert" ON "tenant_inventory"."procurement_budget_alerts";
CREATE POLICY "procurement_budget_alerts_insert" ON "tenant_inventory"."procurement_budget_alerts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "procurement_budget_alerts_update" ON "tenant_inventory"."procurement_budget_alerts";
CREATE POLICY "procurement_budget_alerts_update" ON "tenant_inventory"."procurement_budget_alerts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "procurement_budget_alerts_delete" ON "tenant_inventory"."procurement_budget_alerts";
CREATE POLICY "procurement_budget_alerts_delete" ON "tenant_inventory"."procurement_budget_alerts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "procurement_budget_alerts_service" ON "tenant_inventory"."procurement_budget_alerts";
CREATE POLICY "procurement_budget_alerts_service" ON "tenant_inventory"."procurement_budget_alerts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for procurement_budget_alerts
DROP TRIGGER IF EXISTS "procurement_budget_alerts_update_timestamp" ON "tenant_inventory"."procurement_budget_alerts";
CREATE TRIGGER "procurement_budget_alerts_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."procurement_budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "procurement_budget_alerts_prevent_tenant_mutation" ON "tenant_inventory"."procurement_budget_alerts";
CREATE TRIGGER "procurement_budget_alerts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."procurement_budget_alerts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_staff.employee_bank_accounts
-- Source: 20260327020000_add_employee_bank_accounts
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_staff"."employee_bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."employee_bank_accounts" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_bank_accounts_select" ON "tenant_staff"."employee_bank_accounts";
CREATE POLICY "employee_bank_accounts_select" ON "tenant_staff"."employee_bank_accounts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "employee_bank_accounts_insert" ON "tenant_staff"."employee_bank_accounts";
CREATE POLICY "employee_bank_accounts_insert" ON "tenant_staff"."employee_bank_accounts"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "employee_bank_accounts_update" ON "tenant_staff"."employee_bank_accounts";
CREATE POLICY "employee_bank_accounts_update" ON "tenant_staff"."employee_bank_accounts"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "employee_bank_accounts_delete" ON "tenant_staff"."employee_bank_accounts";
CREATE POLICY "employee_bank_accounts_delete" ON "tenant_staff"."employee_bank_accounts"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "employee_bank_accounts_service" ON "tenant_staff"."employee_bank_accounts";
CREATE POLICY "employee_bank_accounts_service" ON "tenant_staff"."employee_bank_accounts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for employee_bank_accounts
DROP TRIGGER IF EXISTS "employee_bank_accounts_update_timestamp" ON "tenant_staff"."employee_bank_accounts";
CREATE TRIGGER "employee_bank_accounts_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."employee_bank_accounts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "employee_bank_accounts_prevent_tenant_mutation" ON "tenant_staff"."employee_bank_accounts";
CREATE TRIGGER "employee_bank_accounts_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."employee_bank_accounts"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_admin.audit_log
-- Source: 20260327030000_add_audit_log
-- tenant_id: TEXT (not UUID) | deleted_at: NO | updated_at: NO
-- Note: tenant_id is TEXT, so we cast it to UUID for comparison.
-- ============================================================================

ALTER TABLE "tenant_admin"."audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."audit_log" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON "tenant_admin"."audit_log";
CREATE POLICY "audit_log_select" ON "tenant_admin"."audit_log"
    FOR SELECT USING (
        "tenant_id"::uuid = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "audit_log_insert" ON "tenant_admin"."audit_log";
CREATE POLICY "audit_log_insert" ON "tenant_admin"."audit_log"
    FOR INSERT WITH CHECK (
        "tenant_id"::uuid = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "audit_log_update" ON "tenant_admin"."audit_log";
CREATE POLICY "audit_log_update" ON "tenant_admin"."audit_log"
    FOR UPDATE USING (
        "tenant_id"::uuid = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id"::uuid = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "audit_log_delete" ON "tenant_admin"."audit_log";
CREATE POLICY "audit_log_delete" ON "tenant_admin"."audit_log"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "audit_log_service" ON "tenant_admin"."audit_log";
CREATE POLICY "audit_log_service" ON "tenant_admin"."audit_log"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- tenant_crm.crm_scoring_rules
-- Source: 20260327040000_add_lead_scoring
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_crm"."crm_scoring_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_crm"."crm_scoring_rules" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_scoring_rules_select" ON "tenant_crm"."crm_scoring_rules";
CREATE POLICY "crm_scoring_rules_select" ON "tenant_crm"."crm_scoring_rules"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "crm_scoring_rules_insert" ON "tenant_crm"."crm_scoring_rules";
CREATE POLICY "crm_scoring_rules_insert" ON "tenant_crm"."crm_scoring_rules"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "crm_scoring_rules_update" ON "tenant_crm"."crm_scoring_rules";
CREATE POLICY "crm_scoring_rules_update" ON "tenant_crm"."crm_scoring_rules"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "crm_scoring_rules_delete" ON "tenant_crm"."crm_scoring_rules";
CREATE POLICY "crm_scoring_rules_delete" ON "tenant_crm"."crm_scoring_rules"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "crm_scoring_rules_service" ON "tenant_crm"."crm_scoring_rules";
CREATE POLICY "crm_scoring_rules_service" ON "tenant_crm"."crm_scoring_rules"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for crm_scoring_rules
DROP TRIGGER IF EXISTS "crm_scoring_rules_update_timestamp" ON "tenant_crm"."crm_scoring_rules";
CREATE TRIGGER "crm_scoring_rules_update_timestamp"
    BEFORE UPDATE ON "tenant_crm"."crm_scoring_rules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "crm_scoring_rules_prevent_tenant_mutation" ON "tenant_crm"."crm_scoring_rules";
CREATE TRIGGER "crm_scoring_rules_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_crm"."crm_scoring_rules"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_accounting.payment_methods
-- Source: 20260325181153_repair_drift
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

-- Triggers for payment_methods
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
-- Source: 20260325181153_repair_drift
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

-- Triggers for payments
DROP TRIGGER IF EXISTS "payments_update_timestamp" ON "tenant_accounting"."payments";
CREATE TRIGGER "payments_update_timestamp"
    BEFORE UPDATE ON "tenant_accounting"."payments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "payments_prevent_tenant_mutation" ON "tenant_accounting"."payments";
CREATE TRIGGER "payments_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_accounting"."payments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_logistics.delivery_routes
-- Source: 20260325181153_repair_drift
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_logistics"."delivery_routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_logistics"."delivery_routes" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_routes_select" ON "tenant_logistics"."delivery_routes";
CREATE POLICY "delivery_routes_select" ON "tenant_logistics"."delivery_routes"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "delivery_routes_insert" ON "tenant_logistics"."delivery_routes";
CREATE POLICY "delivery_routes_insert" ON "tenant_logistics"."delivery_routes"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "delivery_routes_update" ON "tenant_logistics"."delivery_routes";
CREATE POLICY "delivery_routes_update" ON "tenant_logistics"."delivery_routes"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "delivery_routes_delete" ON "tenant_logistics"."delivery_routes";
CREATE POLICY "delivery_routes_delete" ON "tenant_logistics"."delivery_routes"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "delivery_routes_service" ON "tenant_logistics"."delivery_routes";
CREATE POLICY "delivery_routes_service" ON "tenant_logistics"."delivery_routes"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for delivery_routes
DROP TRIGGER IF EXISTS "delivery_routes_update_timestamp" ON "tenant_logistics"."delivery_routes";
CREATE TRIGGER "delivery_routes_update_timestamp"
    BEFORE UPDATE ON "tenant_logistics"."delivery_routes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "delivery_routes_prevent_tenant_mutation" ON "tenant_logistics"."delivery_routes";
CREATE TRIGGER "delivery_routes_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_logistics"."delivery_routes"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_logistics.route_stops
-- Source: 20260325181153_repair_drift
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_logistics"."route_stops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_logistics"."route_stops" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "route_stops_select" ON "tenant_logistics"."route_stops";
CREATE POLICY "route_stops_select" ON "tenant_logistics"."route_stops"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "route_stops_insert" ON "tenant_logistics"."route_stops";
CREATE POLICY "route_stops_insert" ON "tenant_logistics"."route_stops"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "route_stops_update" ON "tenant_logistics"."route_stops";
CREATE POLICY "route_stops_update" ON "tenant_logistics"."route_stops"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "route_stops_delete" ON "tenant_logistics"."route_stops";
CREATE POLICY "route_stops_delete" ON "tenant_logistics"."route_stops"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "route_stops_service" ON "tenant_logistics"."route_stops";
CREATE POLICY "route_stops_service" ON "tenant_logistics"."route_stops"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for route_stops
DROP TRIGGER IF EXISTS "route_stops_update_timestamp" ON "tenant_logistics"."route_stops";
CREATE TRIGGER "route_stops_update_timestamp"
    BEFORE UPDATE ON "tenant_logistics"."route_stops"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "route_stops_prevent_tenant_mutation" ON "tenant_logistics"."route_stops";
CREATE TRIGGER "route_stops_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_logistics"."route_stops"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_admin."ActivityFeed"
-- Source: 20260325181153_repair_drift
-- tenant_id: UUID | deleted_at: NO | updated_at: NO
-- Note: Table name is PascalCase, must be quoted.
-- ============================================================================

ALTER TABLE "tenant_admin"."ActivityFeed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."ActivityFeed" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ActivityFeed_select" ON "tenant_admin"."ActivityFeed";
CREATE POLICY "ActivityFeed_select" ON "tenant_admin"."ActivityFeed"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "ActivityFeed_insert" ON "tenant_admin"."ActivityFeed";
CREATE POLICY "ActivityFeed_insert" ON "tenant_admin"."ActivityFeed"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "ActivityFeed_update" ON "tenant_admin"."ActivityFeed";
CREATE POLICY "ActivityFeed_update" ON "tenant_admin"."ActivityFeed"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "ActivityFeed_delete" ON "tenant_admin"."ActivityFeed";
CREATE POLICY "ActivityFeed_delete" ON "tenant_admin"."ActivityFeed"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "ActivityFeed_service" ON "tenant_admin"."ActivityFeed";
CREATE POLICY "ActivityFeed_service" ON "tenant_admin"."ActivityFeed"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- tenant_admin.webhook_dead_letter_queue
-- Source: 20260308171626_repair_drift
-- tenant_id: UUID | deleted_at: NO | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_admin"."webhook_dead_letter_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."webhook_dead_letter_queue" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_dead_letter_queue_select" ON "tenant_admin"."webhook_dead_letter_queue";
CREATE POLICY "webhook_dead_letter_queue_select" ON "tenant_admin"."webhook_dead_letter_queue"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "webhook_dead_letter_queue_insert" ON "tenant_admin"."webhook_dead_letter_queue";
CREATE POLICY "webhook_dead_letter_queue_insert" ON "tenant_admin"."webhook_dead_letter_queue"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "webhook_dead_letter_queue_update" ON "tenant_admin"."webhook_dead_letter_queue";
CREATE POLICY "webhook_dead_letter_queue_update" ON "tenant_admin"."webhook_dead_letter_queue"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "webhook_dead_letter_queue_delete" ON "tenant_admin"."webhook_dead_letter_queue";
CREATE POLICY "webhook_dead_letter_queue_delete" ON "tenant_admin"."webhook_dead_letter_queue"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "webhook_dead_letter_queue_service" ON "tenant_admin"."webhook_dead_letter_queue";
CREATE POLICY "webhook_dead_letter_queue_service" ON "tenant_admin"."webhook_dead_letter_queue"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for webhook_dead_letter_queue
DROP TRIGGER IF EXISTS "webhook_dead_letter_queue_update_timestamp" ON "tenant_admin"."webhook_dead_letter_queue";
CREATE TRIGGER "webhook_dead_letter_queue_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."webhook_dead_letter_queue"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "webhook_dead_letter_queue_prevent_tenant_mutation" ON "tenant_admin"."webhook_dead_letter_queue";
CREATE TRIGGER "webhook_dead_letter_queue_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."webhook_dead_letter_queue"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================================
-- tenant_admin.manifest_command_telemetry
-- Source: 20260308171626_repair_drift
-- tenant_id: UUID | deleted_at: NO | updated_at: NO
-- ============================================================================

ALTER TABLE "tenant_admin"."manifest_command_telemetry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."manifest_command_telemetry" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manifest_command_telemetry_select" ON "tenant_admin"."manifest_command_telemetry";
CREATE POLICY "manifest_command_telemetry_select" ON "tenant_admin"."manifest_command_telemetry"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "manifest_command_telemetry_insert" ON "tenant_admin"."manifest_command_telemetry";
CREATE POLICY "manifest_command_telemetry_insert" ON "tenant_admin"."manifest_command_telemetry"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "manifest_command_telemetry_update" ON "tenant_admin"."manifest_command_telemetry";
CREATE POLICY "manifest_command_telemetry_update" ON "tenant_admin"."manifest_command_telemetry"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "manifest_command_telemetry_delete" ON "tenant_admin"."manifest_command_telemetry";
CREATE POLICY "manifest_command_telemetry_delete" ON "tenant_admin"."manifest_command_telemetry"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "manifest_command_telemetry_service" ON "tenant_admin"."manifest_command_telemetry";
CREATE POLICY "manifest_command_telemetry_service" ON "tenant_admin"."manifest_command_telemetry"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
