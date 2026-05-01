-- Migration: Add tenant.venues table with RLS
-- Date: 2026-05-01
-- Description: The Venue Prisma model has existed for some time, but no
--              migration ever created the underlying table. Frontend server
--              actions in apps/app/app/(authenticated)/crm/venues/actions.ts
--              call database.venue.findMany/create/update — those calls would
--              fail in any environment that ran migrate deploy from a clean
--              database. The corresponding API surface at
--              apps/api/app/api/crm/venues/* was previously stubbed out with
--              "Venue model does not exist in schema - this module is disabled"
--              comments. This migration creates the table, indexes, foreign
--              key, RLS policies, and standard tenant-mutation triggers,
--              matching the model exactly.
--
-- Conventions match 20260427030000_add_facilities_table and the standard
-- tenant table pattern: composite PK (tenant_id, id), RLS via auth.jwt() ->>
-- 'tenant_id', service_role bypass, prevent_tenant_mutation trigger.

-- ============================================================
-- Schema (tenant schema already exists from 0_init)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "tenant";

-- ============================================================
-- CreateTable: tenant.venues
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant"."venues" (
    "tenant_id"          UUID           NOT NULL,
    "id"                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    "name"               TEXT           NOT NULL,
    "venue_type"         TEXT           NOT NULL DEFAULT 'other',
    "address_line1"      TEXT,
    "address_line2"      TEXT,
    "city"               TEXT,
    "state_province"     TEXT,
    "postal_code"        TEXT,
    "country_code"       CHAR(2),
    "capacity"           INTEGER        DEFAULT 0,
    "contact_name"       TEXT,
    "contact_phone"      TEXT,
    "contact_email"      TEXT,
    "equipment_list"     JSONB,
    "preferred_vendors"  JSONB,
    "access_notes"       TEXT,
    "catering_notes"     TEXT,
    "layout_image_url"   TEXT,
    "is_active"          BOOLEAN        NOT NULL DEFAULT true,
    "tags"               TEXT[],
    "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"         TIMESTAMPTZ(6),

    CONSTRAINT "venues_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Prisma's @@unique([tenantId, id]) — already covered by the composite PK,
-- but Prisma still requires the explicit unique index for the tenantId_id
-- compound key generator.
CREATE UNIQUE INDEX IF NOT EXISTS "venues_tenant_id_id_key"
    ON "tenant"."venues"("tenant_id", "id");

-- Indexes match the @@index declarations in the Prisma model.
CREATE INDEX IF NOT EXISTS "venues_tenant_id_city_idx"
    ON "tenant"."venues"("tenant_id", "city");
CREATE INDEX IF NOT EXISTS "venues_tenant_id_venue_type_idx"
    ON "tenant"."venues"("tenant_id", "venue_type");
CREATE INDEX IF NOT EXISTS "venues_tenant_id_is_active_idx"
    ON "tenant"."venues"("tenant_id", "is_active");

-- ============================================================
-- Foreign Keys
-- ============================================================
-- venues.tenant_id -> platform.accounts.id  (matches Prisma onDelete: Restrict)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'venues_tenant_id_fkey'
    ) THEN
        ALTER TABLE "tenant"."venues"
            ADD CONSTRAINT "venues_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ============================================================
-- RLS: tenant.venues
-- Soft-delete-aware (deleted_at IS NULL gates SELECT/UPDATE), DELETE locked
-- to false so callers must soft-delete via deleted_at, service_role bypass.
-- ============================================================
ALTER TABLE "tenant"."venues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant"."venues" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venues_select" ON "tenant"."venues";
CREATE POLICY "venues_select" ON "tenant"."venues"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "venues_insert" ON "tenant"."venues";
CREATE POLICY "venues_insert" ON "tenant"."venues"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "venues_update" ON "tenant"."venues";
CREATE POLICY "venues_update" ON "tenant"."venues"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- Hard DELETE is disabled — soft-delete via deleted_at only.
DROP POLICY IF EXISTS "venues_delete" ON "tenant"."venues";
CREATE POLICY "venues_delete" ON "tenant"."venues"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "venues_service" ON "tenant"."venues";
CREATE POLICY "venues_service" ON "tenant"."venues"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Triggers
-- ============================================================
DROP TRIGGER IF EXISTS "venues_update_timestamp" ON "tenant"."venues";
CREATE TRIGGER "venues_update_timestamp"
    BEFORE UPDATE ON "tenant"."venues"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "venues_prevent_tenant_mutation" ON "tenant"."venues";
CREATE TRIGGER "venues_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant"."venues"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================
-- REPLICA IDENTITY for real-time support (matches facilities pattern)
-- ============================================================
ALTER TABLE "tenant"."venues" REPLICA IDENTITY FULL;
