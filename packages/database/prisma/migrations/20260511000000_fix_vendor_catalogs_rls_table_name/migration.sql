-- Fix: Previous migration (20260429140000) applied RLS to "vendor_catalog" (singular),
-- but the actual table is "vendor_catalogs" (plural, per @@map in schema.prisma).
-- This migration applies the same RLS policies to the correct table name.

-- ============================================================================
-- tenant_inventory.vendor_catalogs (PLURAL — correct table name)
-- tenant_id: UUID | deleted_at: YES | updated_at: YES
-- ============================================================================

ALTER TABLE "tenant_inventory"."vendor_catalogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."vendor_catalogs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_catalogs_select" ON "tenant_inventory"."vendor_catalogs";
CREATE POLICY "vendor_catalogs_select" ON "tenant_inventory"."vendor_catalogs"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "vendor_catalogs_insert" ON "tenant_inventory"."vendor_catalogs";
CREATE POLICY "vendor_catalogs_insert" ON "tenant_inventory"."vendor_catalogs"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "vendor_catalogs_update" ON "tenant_inventory"."vendor_catalogs";
CREATE POLICY "vendor_catalogs_update" ON "tenant_inventory"."vendor_catalogs"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "vendor_catalogs_delete" ON "tenant_inventory"."vendor_catalogs";
CREATE POLICY "vendor_catalogs_delete" ON "tenant_inventory"."vendor_catalogs"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "vendor_catalogs_service" ON "tenant_inventory"."vendor_catalogs";
CREATE POLICY "vendor_catalogs_service" ON "tenant_inventory"."vendor_catalogs"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS "vendor_catalogs_update_timestamp" ON "tenant_inventory"."vendor_catalogs";
CREATE TRIGGER "vendor_catalogs_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."vendor_catalogs"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "vendor_catalogs_prevent_tenant_mutation" ON "tenant_inventory"."vendor_catalogs";
CREATE TRIGGER "vendor_catalogs_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."vendor_catalogs"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
