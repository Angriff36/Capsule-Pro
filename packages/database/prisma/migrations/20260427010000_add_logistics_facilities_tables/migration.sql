-- Migration: Add Logistics and Facilities tables
-- Date: 2026-04-27
-- Description: Create drivers, vehicles (tenant_logistics) and facility_assets
--              (tenant_facilities) tables referenced by raw-SQL route handlers
--              but never created by any prior migration.

-- ============================================================
-- Schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "tenant_facilities";

-- ============================================================
-- CreateTable: tenant_logistics.vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant_logistics"."vehicles" (
    "tenant_id"        UUID           NOT NULL,
    "id"               UUID           NOT NULL DEFAULT gen_random_uuid(),
    "make"             TEXT           NOT NULL,
    "model"            TEXT           NOT NULL,
    "year"             SMALLINT,
    "plate_number"     TEXT,
    "vin"              TEXT,
    "capacity_weight"  NUMERIC,
    "capacity_volume"  NUMERIC,
    "fuel_type"        TEXT,
    "mileage"          NUMERIC,
    "status"           TEXT           NOT NULL DEFAULT 'available',
    "notes"            TEXT,
    "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"       TIMESTAMPTZ(6),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Indexes: vehicles
CREATE INDEX IF NOT EXISTS "vehicles_tenant_id_status_idx"
    ON "tenant_logistics"."vehicles"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "vehicles_tenant_id_plate_number_idx"
    ON "tenant_logistics"."vehicles"("tenant_id", "plate_number");

-- ============================================================
-- CreateTable: tenant_logistics.drivers
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant_logistics"."drivers" (
    "tenant_id"       UUID           NOT NULL,
    "id"              UUID           NOT NULL DEFAULT gen_random_uuid(),
    "name"            TEXT           NOT NULL,
    "phone"           TEXT,
    "email"           TEXT,
    "license_number"  TEXT,
    "license_expiry"  DATE,
    "vehicle_id"      UUID,
    "status"          TEXT           NOT NULL DEFAULT 'available',
    "notes"           TEXT,
    "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"      TIMESTAMPTZ(6),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Indexes: drivers
CREATE INDEX IF NOT EXISTS "drivers_tenant_id_status_idx"
    ON "tenant_logistics"."drivers"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "drivers_tenant_id_vehicle_id_idx"
    ON "tenant_logistics"."drivers"("tenant_id", "vehicle_id");

-- ============================================================
-- CreateTable: tenant_facilities.facility_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS "tenant_facilities"."facility_assets" (
    "tenant_id"        UUID            NOT NULL,
    "id"               UUID            NOT NULL DEFAULT gen_random_uuid(),
    "name"             TEXT            NOT NULL,
    "asset_type"       TEXT            NOT NULL DEFAULT 'other',
    "serial_number"    TEXT,
    "manufacturer"     TEXT,
    "model"            TEXT,
    "purchase_date"    DATE,
    "purchase_cost"    NUMERIC,
    "warranty_expiry"  DATE,
    "area_id"          UUID,
    "status"           TEXT            NOT NULL DEFAULT 'active',
    "notes"            TEXT,
    "created_at"       TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMPTZ(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"       TIMESTAMPTZ(6),

    CONSTRAINT "facility_assets_pkey" PRIMARY KEY ("tenant_id", "id")
);

-- Indexes: facility_assets
CREATE INDEX IF NOT EXISTS "facility_assets_tenant_id_status_idx"
    ON "tenant_facilities"."facility_assets"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "facility_assets_tenant_id_asset_type_idx"
    ON "tenant_facilities"."facility_assets"("tenant_id", "asset_type");
CREATE INDEX IF NOT EXISTS "facility_assets_tenant_id_area_id_idx"
    ON "tenant_facilities"."facility_assets"("tenant_id", "area_id");

-- ============================================================
-- Foreign Keys
-- ============================================================

-- drivers.tenant_id -> platform.accounts.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'drivers_tenant_id_fkey'
    ) THEN
        ALTER TABLE "tenant_logistics"."drivers"
            ADD CONSTRAINT "drivers_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- drivers.vehicle_id -> vehicles.id (composite with tenant_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'drivers_vehicle_id_fkey'
    ) THEN
        ALTER TABLE "tenant_logistics"."drivers"
            ADD CONSTRAINT "drivers_vehicle_id_fkey"
            FOREIGN KEY ("tenant_id", "vehicle_id")
            REFERENCES "tenant_logistics"."vehicles"("tenant_id", "id")
            ON DELETE SET NULL;
    END IF;
END $$;

-- vehicles.tenant_id -> platform.accounts.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_tenant_id_fkey'
    ) THEN
        ALTER TABLE "tenant_logistics"."vehicles"
            ADD CONSTRAINT "vehicles_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- facility_assets.tenant_id -> platform.accounts.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'facility_assets_tenant_id_fkey'
    ) THEN
        ALTER TABLE "tenant_facilities"."facility_assets"
            ADD CONSTRAINT "facility_assets_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
            ON DELETE RESTRICT;
    END IF;
END $$;

-- facility_assets.area_id -> tenant_facilities.facility_areas (composite with tenant_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'facility_assets_area_id_fkey'
    ) THEN
        ALTER TABLE "tenant_facilities"."facility_assets"
            ADD CONSTRAINT "facility_assets_area_id_fkey"
            FOREIGN KEY ("tenant_id", "area_id")
            REFERENCES "tenant_facilities"."facility_areas"("tenant_id", "id")
            ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- RLS: tenant_logistics.vehicles
-- ============================================================
ALTER TABLE "tenant_logistics"."vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_logistics"."vehicles" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select" ON "tenant_logistics"."vehicles";
CREATE POLICY "vehicles_select" ON "tenant_logistics"."vehicles"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "vehicles_insert" ON "tenant_logistics"."vehicles";
CREATE POLICY "vehicles_insert" ON "tenant_logistics"."vehicles"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "vehicles_update" ON "tenant_logistics"."vehicles";
CREATE POLICY "vehicles_update" ON "tenant_logistics"."vehicles"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "vehicles_delete" ON "tenant_logistics"."vehicles";
CREATE POLICY "vehicles_delete" ON "tenant_logistics"."vehicles"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "vehicles_service" ON "tenant_logistics"."vehicles";
CREATE POLICY "vehicles_service" ON "tenant_logistics"."vehicles"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- RLS: tenant_logistics.drivers
-- ============================================================
ALTER TABLE "tenant_logistics"."drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_logistics"."drivers" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_select" ON "tenant_logistics"."drivers";
CREATE POLICY "drivers_select" ON "tenant_logistics"."drivers"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "drivers_insert" ON "tenant_logistics"."drivers";
CREATE POLICY "drivers_insert" ON "tenant_logistics"."drivers"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "drivers_update" ON "tenant_logistics"."drivers";
CREATE POLICY "drivers_update" ON "tenant_logistics"."drivers"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "drivers_delete" ON "tenant_logistics"."drivers";
CREATE POLICY "drivers_delete" ON "tenant_logistics"."drivers"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "drivers_service" ON "tenant_logistics"."drivers";
CREATE POLICY "drivers_service" ON "tenant_logistics"."drivers"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- RLS: tenant_facilities.facility_assets
-- ============================================================
ALTER TABLE "tenant_facilities"."facility_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_facilities"."facility_assets" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facility_assets_select" ON "tenant_facilities"."facility_assets";
CREATE POLICY "facility_assets_select" ON "tenant_facilities"."facility_assets"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

DROP POLICY IF EXISTS "facility_assets_insert" ON "tenant_facilities"."facility_assets";
CREATE POLICY "facility_assets_insert" ON "tenant_facilities"."facility_assets"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

DROP POLICY IF EXISTS "facility_assets_update" ON "tenant_facilities"."facility_assets";
CREATE POLICY "facility_assets_update" ON "tenant_facilities"."facility_assets"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

DROP POLICY IF EXISTS "facility_assets_delete" ON "tenant_facilities"."facility_assets";
CREATE POLICY "facility_assets_delete" ON "tenant_facilities"."facility_assets"
    FOR DELETE USING (false);

DROP POLICY IF EXISTS "facility_assets_service" ON "tenant_facilities"."facility_assets";
CREATE POLICY "facility_assets_service" ON "tenant_facilities"."facility_assets"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- Triggers
-- ============================================================

-- vehicles
DROP TRIGGER IF EXISTS "vehicles_update_timestamp" ON "tenant_logistics"."vehicles";
CREATE TRIGGER "vehicles_update_timestamp"
    BEFORE UPDATE ON "tenant_logistics"."vehicles"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "vehicles_prevent_tenant_mutation" ON "tenant_logistics"."vehicles";
CREATE TRIGGER "vehicles_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_logistics"."vehicles"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- drivers
DROP TRIGGER IF EXISTS "drivers_update_timestamp" ON "tenant_logistics"."drivers";
CREATE TRIGGER "drivers_update_timestamp"
    BEFORE UPDATE ON "tenant_logistics"."drivers"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "drivers_prevent_tenant_mutation" ON "tenant_logistics"."drivers";
CREATE TRIGGER "drivers_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_logistics"."drivers"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- facility_assets
DROP TRIGGER IF EXISTS "facility_assets_update_timestamp" ON "tenant_facilities"."facility_assets";
CREATE TRIGGER "facility_assets_update_timestamp"
    BEFORE UPDATE ON "tenant_facilities"."facility_assets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

DROP TRIGGER IF EXISTS "facility_assets_prevent_tenant_mutation" ON "tenant_facilities"."facility_assets";
CREATE TRIGGER "facility_assets_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_facilities"."facility_assets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- ============================================================
-- REPLICA IDENTITY for real-time support
-- ============================================================
ALTER TABLE "tenant_logistics"."vehicles" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_logistics"."drivers" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_facilities"."facility_assets" REPLICA IDENTITY FULL;
