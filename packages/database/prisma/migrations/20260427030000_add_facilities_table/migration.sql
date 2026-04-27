-- Migration: Add tenant_facilities.facilities table
-- Date: 2026-04-27
-- Description: Create the top-level Facility table (a building/site such as a
--              commissary kitchen, warehouse, or office) that the new Facility
--              hub create-dialog and POST /api/facilities/commands/create
--              persist into. Closes P0.2 backpressure by giving the new-Facility
--              E2E test a real table to write to and read from.
--
-- Conventions match 20260427010000_add_logistics_facilities_tables for
-- tenant_facilities.facility_assets: composite PK (tenant_id, id), RLS via
-- auth.jwt() ->> 'tenant_id', service_role bypass, prevent_tenant_mutation
-- trigger, REPLICA IDENTITY FULL for real-time subscriptions.

-- ============================================================
-- Schema (idempotent — already created by the 20260427010000 migration)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "tenant_facilities";

-- ============================================================
-- CreateTable: tenant_facilities.facilities
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant_facilities"."facilities" (
    "tenant_id"      UUID           NOT NULL,
    "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
    "name"           TEXT           NOT NULL,
    "code"           TEXT,
    "facility_type"  TEXT           NOT NULL DEFAULT 'kitchen',
    "address_line1"  TEXT,
    "address_line2"  TEXT,
    "city"           TEXT,
    "state"          TEXT,
    "postal_code"    TEXT,
    "country"        TEXT,
    "phone"          TEXT,
    "status"         TEXT           NOT NULL DEFAULT 'active',
    "notes"          TEXT,
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"     TIMESTAMPTZ(6),

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Indexes: facilities
-- Per-tenant unique code (matches the @@unique([tenantId, code]) in Prisma).
CREATE UNIQUE INDEX IF NOT EXISTS "facilities_tenant_id_code_key"
    ON "tenant_facilities"."facilities"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "facilities_tenant_id_status_idx"
    ON "tenant_facilities"."facilities"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "facilities_tenant_id_facility_type_idx"
    ON "tenant_facilities"."facilities"("tenant_id", "facility_type");

-- ============================================================
-- Foreign Keys
-- ============================================================

-- facilities.tenant_id -> platform.accounts.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'facilities_tenant_id_fkey'
    ) THEN
        ALTER TABLE "tenant_facilities"."facilities"
            ADD CONSTRAINT "facilities_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ============================================================
-- RLS: tenant_facilities.facilities
-- ============================================================
ALTER TABLE "tenant_facilities"."facilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_facilities"."facilities" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facilities_select" ON "tenant_facilities"."facilities";
CREATE POLICY "facilities_select" ON "tenant_facilities"."facilities"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "facilities_insert" ON "tenant_facilities"."facilities";
CREATE POLICY "facilities_insert" ON "tenant_facilities"."facilities"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "facilities_update" ON "tenant_facilities"."facilities";
CREATE POLICY "facilities_update" ON "tenant_facilities"."facilities"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- Hard DELETE is disabled — soft-delete via deleted_at only. Matches the
-- facility_assets policy (line 281 of 20260427010000_add_logistics_facilities_tables).
DROP POLICY IF EXISTS "facilities_delete" ON "tenant_facilities"."facilities";
CREATE POLICY "facilities_delete" ON "tenant_facilities"."facilities"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "facilities_service" ON "tenant_facilities"."facilities";
CREATE POLICY "facilities_service" ON "tenant_facilities"."facilities"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Triggers
-- ============================================================
DROP TRIGGER IF EXISTS "facilities_update_timestamp" ON "tenant_facilities"."facilities";
CREATE TRIGGER "facilities_update_timestamp"
    BEFORE UPDATE ON "tenant_facilities"."facilities"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "facilities_prevent_tenant_mutation" ON "tenant_facilities"."facilities";
CREATE TRIGGER "facilities_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_facilities"."facilities"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================
-- REPLICA IDENTITY for real-time support
-- ============================================================
ALTER TABLE "tenant_facilities"."facilities" REPLICA IDENTITY FULL;
