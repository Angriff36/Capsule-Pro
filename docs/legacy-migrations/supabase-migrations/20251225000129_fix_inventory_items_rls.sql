-- MIGRATION: 20251225000129_fix_inventory_items_rls.sql
-- Fixes RLS policies for inventory_items to use core.fn_get_jwt_tenant_id()
-- This enables local development testing with app_metadata fallback

-- Drop existing policies
DROP POLICY IF EXISTS inventory_items_select ON tenant_inventory.inventory_items;
DROP POLICY IF EXISTS inventory_items_insert ON tenant_inventory.inventory_items;
DROP POLICY IF EXISTS inventory_items_update ON tenant_inventory.inventory_items;
DROP POLICY IF EXISTS inventory_items_delete ON tenant_inventory.inventory_items;
DROP POLICY IF EXISTS inventory_items_service ON tenant_inventory.inventory_items;

-- Recreate policies with correct tenant_id function
CREATE POLICY inventory_items_select ON tenant_inventory.inventory_items
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY inventory_items_insert ON tenant_inventory.inventory_items
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY inventory_items_update ON tenant_inventory.inventory_items
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY inventory_items_delete ON tenant_inventory.inventory_items
  FOR DELETE USING (false);

CREATE POLICY inventory_items_service ON tenant_inventory.inventory_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verify policies
SELECT
  schemaname as schema_name,
  tablename as table_name,
  policyname as policy_name,
  cmd as command
FROM pg_policies
WHERE schemaname = 'tenant_inventory'
  AND tablename = 'inventory_items'
ORDER BY policyname;
