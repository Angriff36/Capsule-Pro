-- Add FSA Compliance Tracking to Inventory Items
-- Migration: 20260110000001_add_fsa_fields.sql
-- Description: Add FSA compliance fields to inventory_items table for tracking food safety requirements

-- Add FSA compliance columns
ALTER TABLE tenant_inventory.inventory_items
ADD COLUMN IF NOT EXISTS fsa_status text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS fsa_temp_logged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fsa_allergen_info boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fsa_traceable boolean DEFAULT false;

-- Add check constraint for fsa_status values
ALTER TABLE tenant_inventory.inventory_items
ADD CONSTRAINT fsa_status_check
  CHECK (fsa_status IN ('unknown', 'compliant', 'non-compliant', 'pending'));

-- Add comment for documentation
COMMENT ON COLUMN tenant_inventory.inventory_items.fsa_status IS 'FSA compliance status: unknown, compliant, non-compliant, pending';
COMMENT ON COLUMN tenant_inventory.inventory_items.fsa_temp_logged IS 'Whether temperature logging has been completed for this item';
COMMENT ON COLUMN tenant_inventory.inventory_items.fsa_allergen_info IS 'Whether allergen information is documented for this item';
COMMENT ON COLUMN tenant_inventory.inventory_items.fsa_traceable IS 'Whether the item source is traceable to origin';
