-- Migration: Add Vendor Management Enhancements
-- Date: 2026-03-27
-- Description: Add address, tax ID, website, performance rating to suppliers.
--              Create vendor_contacts and vendor_ratings tables.

-- Add address and tax columns to inventory_suppliers
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'US';
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "tax_id" TEXT;
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "performance_rating" DECIMAL(2,1) DEFAULT NULL;

-- Create vendor_contacts table for multiple contacts per vendor
CREATE TABLE IF NOT EXISTS "tenant_inventory"."vendor_contacts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "contact_role" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

CREATE INDEX IF NOT EXISTS "vendor_contacts_tenant_supplier_idx"
    ON "tenant_inventory"."vendor_contacts"("tenant_id", "supplier_id");

-- Foreign key to inventory_suppliers
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vendor_contacts_supplier_tenant_fkey'
    ) THEN
        ALTER TABLE "tenant_inventory"."vendor_contacts"
            ADD CONSTRAINT "vendor_contacts_supplier_tenant_fkey"
            FOREIGN KEY ("supplier_id", "tenant_id")
            REFERENCES "tenant_inventory"."inventory_suppliers"("id", "tenant_id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create vendor_ratings table for performance ratings
CREATE TABLE IF NOT EXISTS "tenant_inventory"."vendor_ratings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'overall',
    "rating" SMALLINT NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
    "comment" TEXT,
    "rated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

CREATE INDEX IF NOT EXISTS "vendor_ratings_tenant_supplier_idx"
    ON "tenant_inventory"."vendor_ratings"("tenant_id", "supplier_id");

-- Foreign key to inventory_suppliers
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vendor_ratings_supplier_tenant_fkey'
    ) THEN
        ALTER TABLE "tenant_inventory"."vendor_ratings"
            ADD CONSTRAINT "vendor_ratings_supplier_tenant_fkey"
            FOREIGN KEY ("supplier_id", "tenant_id")
            REFERENCES "tenant_inventory"."inventory_suppliers"("id", "tenant_id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
