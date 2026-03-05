-- Migration: Add Vendor Catalog Management
-- Date: 2026-03-06
-- Description: Add vendor catalog with pricing tiers, bulk ordering rules, lead times, and automatic cost updates

-- Create vendor_catalogs table for managing supplier pricing information
CREATE TABLE "tenant_inventory"."vendor_catalogs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "item_number" TEXT NOT NULL,
    "item_name" TEXT,
    "description" TEXT,
    "category" TEXT,
    "base_unit_cost" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unit_of_measure" TEXT NOT NULL DEFAULT 'each',
    "lead_time_days" INTEGER NOT NULL DEFAULT 0,
    "lead_time_min_days" INTEGER NOT NULL DEFAULT 0,
    "lead_time_max_days" INTEGER NOT NULL DEFAULT 0,
    "minimum_order_quantity" DECIMAL(12, 3) NOT NULL DEFAULT 1,
    "order_multiple" DECIMAL(12, 3) NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "supplier_sku" TEXT,
    "notes" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "last_cost_update" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Create indexes for vendor_catalogs
CREATE UNIQUE INDEX "vendor_catalogs_tenant_id_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "id");
CREATE UNIQUE INDEX "vendor_catalogs_tenant_supplier_item_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id", "item_number");
CREATE INDEX "vendor_catalogs_tenant_supplier_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id");
CREATE INDEX "vendor_catalogs_tenant_item_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "item_number");
CREATE INDEX "vendor_catalogs_tenant_category_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "category");

-- Create pricing_tiers table for volume-based pricing
CREATE TABLE "tenant_inventory"."pricing_tiers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_entry_id" UUID NOT NULL,
    "tier_name" TEXT NOT NULL,
    "min_quantity" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "max_quantity" DECIMAL(12, 3),
    "unit_cost" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "discount_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Create indexes for pricing_tiers
CREATE UNIQUE INDEX "pricing_tiers_tenant_id_idx" ON "tenant_inventory"."pricing_tiers"("tenant_id", "id");
CREATE INDEX "pricing_tiers_tenant_catalog_idx" ON "tenant_inventory"."pricing_tiers"("tenant_id", "catalog_entry_id");
CREATE INDEX "pricing_tiers_tenant_catalog_qty_idx" ON "tenant_inventory"."pricing_tiers"("tenant_id", "catalog_entry_id", "min_quantity");

-- Create bulk_order_rules table for bulk ordering discounts and rules
CREATE TABLE "tenant_inventory"."bulk_order_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_entry_id" UUID NOT NULL,
    "rule_name" TEXT NOT NULL,
    "minimum_quantity" DECIMAL(12, 3) NOT NULL DEFAULT 1,
    "rule_type" TEXT NOT NULL,
    "threshold_quantity" DECIMAL(12, 3) NOT NULL DEFAULT 0,
    "action" TEXT NOT NULL,
    "discount_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "free_item_quantity" INTEGER NOT NULL DEFAULT 0,
    "shipping_included" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id")
);

-- Create indexes for bulk_order_rules
CREATE UNIQUE INDEX "bulk_order_rules_tenant_id_idx" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "id");
CREATE INDEX "bulk_order_rules_tenant_catalog_idx" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "catalog_entry_id");
CREATE INDEX "bulk_order_rules_tenant_type_idx" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "rule_type");

-- Add foreign key for vendor_catalogs to inventory_suppliers
ALTER TABLE "tenant_inventory"."vendor_catalogs"
    ADD CONSTRAINT "vendor_catalogs_supplier_tenant_fkey"
    FOREIGN KEY ("supplier_id", "tenant_id")
    REFERENCES "tenant_inventory"."inventory_suppliers"("id", "tenant_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for vendor_catalogs to accounts
ALTER TABLE "tenant_inventory"."vendor_catalogs"
    ADD CONSTRAINT "vendor_catalogs_tenant_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "platform"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key for pricing_tiers to vendor_catalogs
ALTER TABLE "tenant_inventory"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_catalog_entry_tenant_fkey"
    FOREIGN KEY ("catalog_entry_id", "tenant_id")
    REFERENCES "tenant_inventory"."vendor_catalogs"("id", "tenant_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for pricing_tiers to accounts
ALTER TABLE "tenant_inventory"."pricing_tiers"
    ADD CONSTRAINT "pricing_tiers_tenant_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "platform"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key for bulk_order_rules to vendor_catalogs
ALTER TABLE "tenant_inventory"."bulk_order_rules"
    ADD CONSTRAINT "bulk_order_rules_catalog_entry_tenant_fkey"
    FOREIGN KEY ("catalog_entry_id", "tenant_id")
    REFERENCES "tenant_inventory"."vendor_catalogs"("id", "tenant_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for bulk_order_rules to accounts
ALTER TABLE "tenant_inventory"."bulk_order_rules"
    ADD CONSTRAINT "bulk_order_rules_tenant_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "platform"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add vendor_catalogs relation to accounts table
ALTER TABLE "platform"."accounts"
    ADD COLUMN IF NOT EXISTS "vendor_catalogs" TEXT[];

-- Add pricing_tiers relation to accounts table
ALTER TABLE "platform"."accounts"
    ADD COLUMN IF NOT EXISTS "pricing_tiers" TEXT[];

-- Add bulk_order_rules relation to accounts table
ALTER TABLE "platform"."accounts"
    ADD COLUMN IF NOT EXISTS "bulk_order_rules" TEXT[];
