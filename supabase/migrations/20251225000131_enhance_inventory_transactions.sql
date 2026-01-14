-- MIGRATION: 20251225000131_enhance_inventory_transactions.sql
-- Enhances existing inventory_transactions table for "Record Immutable Transactions" feature
-- Adds missing columns, updates constraints, and fixes RLS policies

-- The existing table has:
-- - transaction_type: 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'
-- - Columns: unit_cost, total_cost, reference (combined text field)
-- - Missing: storage_location_id, reason, reference_type, reference_id, employee_id

-- Add new columns to existing table
ALTER TABLE tenant_inventory.inventory_transactions
  ADD COLUMN IF NOT EXISTS storage_location_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id uuid,
  ADD COLUMN IF NOT EXISTS employee_id uuid;

-- Drop the old transaction_type check constraint
ALTER TABLE tenant_inventory.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

-- Add new transaction_type check constraint with expanded types
ALTER TABLE tenant_inventory.inventory_transactions
  ADD CONSTRAINT inventory_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'IN',           -- Legacy: keep for compatibility
    'OUT',          -- Legacy: keep for compatibility
    'ADJUSTMENT',   -- Legacy: keep for compatibility
    'TRANSFER',     -- Legacy: keep for compatibility
    'receipt',      -- New: Stock received (purchase, donation, return)
    'issue',        -- New: Stock issued (consumed, transferred, waste)
    'adjustment',   -- New: Manual adjustment (lowercase alias)
    'transfer_in',  -- New: Stock transferred in from another location
    'transfer_out', -- New: Stock transferred out to another location
    'count'         -- New: Physical count result
  ));

-- Add check constraint for quantity <> 0 (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_transactions_quantity_not_zero'
  ) THEN
    ALTER TABLE tenant_inventory.inventory_transactions
      ADD CONSTRAINT inventory_transactions_quantity_not_zero
      CHECK (quantity <> 0);
  END IF;
END $$;

-- Add check constraint for storage_location_id and item_id (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_transactions_storage_location_id_check'
  ) THEN
    ALTER TABLE tenant_inventory.inventory_transactions
      ADD CONSTRAINT inventory_transactions_storage_location_id_check
      CHECK (storage_location_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_transactions_item_id_check'
  ) THEN
    ALTER TABLE tenant_inventory.inventory_transactions
      ADD CONSTRAINT inventory_transactions_item_id_check
      CHECK (item_id IS NOT NULL);
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS inventory_transactions_tenant_location_idx
  ON tenant_inventory.inventory_transactions (tenant_id, storage_location_id);

CREATE INDEX IF NOT EXISTS inventory_transactions_tenant_reference_idx
  ON tenant_inventory.inventory_transactions (tenant_id, reference_type, reference_id)
  WHERE reference_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_transactions_tenant_employee_idx
  ON tenant_inventory.inventory_transactions (tenant_id, employee_id, transaction_date DESC)
  WHERE employee_id IS NOT NULL;

-- Drop old UPDATE policy (transactions should be immutable for users)
DROP POLICY IF EXISTS inventory_transactions_update ON tenant_inventory.inventory_transactions;

-- Create new UPDATE policy that blocks all user updates
CREATE POLICY inventory_transactions_update ON tenant_inventory.inventory_transactions
  FOR UPDATE USING (false);

-- Fix SELECT policy to use core.fn_get_jwt_tenant_id()
DROP POLICY IF EXISTS inventory_transactions_select ON tenant_inventory.inventory_transactions;
CREATE POLICY inventory_transactions_select ON tenant_inventory.inventory_transactions
  FOR SELECT USING (tenant_id = core.fn_get_jwt_tenant_id());

-- Fix INSERT policy to use core.fn_get_jwt_tenant_id()
DROP POLICY IF EXISTS inventory_transactions_insert ON tenant_inventory.inventory_transactions;
CREATE POLICY inventory_transactions_insert ON tenant_inventory.inventory_transactions
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

-- Verification queries
SELECT
  schemaname as schema_name,
  tablename as table_name
FROM pg_tables
WHERE schemaname = 'tenant_inventory'
  AND tablename = 'inventory_transactions';

SELECT
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'tenant_inventory'
  AND rel.relname = 'inventory_transactions'
  AND con.contype = 'c'
ORDER BY con.conname;
