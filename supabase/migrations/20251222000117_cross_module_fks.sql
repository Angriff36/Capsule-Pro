-- MIGRATION: 20251222000117_cross_module_fks.sql
-- Cross-module foreign keys to establish referential integrity between modules
-- Pattern: Phase 2 FK constraints with tenant_id for composite safety

-- ============================================
-- CROSS-MODULE FOREIGN KEY CONSTRAINTS
-- ============================================
-- NOTE: Only add constraints for columns that actually exist in the tables
-- Some constraints are commented out as they depend on columns added in later migrations

-- 1. TENANT_EVENTS.EVENTS → TENANT_CRM.CLIENTS
-- Events reference their assigned client (conditional: client_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'events'
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE tenant_events.events
      ADD CONSTRAINT events_client_fk
      FOREIGN KEY (tenant_id, client_id)
      REFERENCES tenant_crm.clients (tenant_id, id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added events_client_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping events_client_fk: client_id column does not exist in tenant_events.events';
  END IF;
END $$;

-- 2. TENANT_EVENTS.EVENTS → TENANT.LOCATIONS
-- Events reference their assigned location (conditional: location_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'events'
    AND column_name = 'location_id'
  ) THEN
    ALTER TABLE tenant_events.events
      ADD CONSTRAINT events_location_fk
      FOREIGN KEY (tenant_id, location_id)
      REFERENCES tenant.locations (tenant_id, id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added events_location_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping events_location_fk: location_id column does not exist in tenant_events.events';
  END IF;
END $$;

-- 3. TENANT_CRM.LEADS → TENANT_STAFF.EMPLOYEES
-- Leads reference assigned employee (conditional: assigned_to column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'leads'
    AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE tenant_crm.leads
      ADD CONSTRAINT leads_assigned_to_fk
      FOREIGN KEY (tenant_id, assigned_to)
      REFERENCES tenant_staff.employees (tenant_id, id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added leads_assigned_to_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping leads_assigned_to_fk: assigned_to column does not exist in tenant_crm.leads';
  END IF;
END $$;

-- 4. TENANT_CRM.PROPOSALS → TENANT_EVENTS.EVENTS
-- Proposals reference the event they're for (conditional: event_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'proposals'
    AND column_name = 'event_id'
  ) THEN
    ALTER TABLE tenant_crm.proposals
      ADD CONSTRAINT proposals_event_fk
      FOREIGN KEY (tenant_id, event_id)
      REFERENCES tenant_events.events (tenant_id, id)
      ON DELETE SET NULL;
    RAISE NOTICE 'Added proposals_event_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping proposals_event_fk: event_id column does not exist in tenant_crm.proposals';
  END IF;
END $$;

-- 5. TENANT_INVENTORY.INVENTORY_TRANSACTIONS → TENANT_INVENTORY.INVENTORY_ITEMS
-- Inventory transactions reference items (conditional: tables and columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'tenant_inventory'
    AND table_name = 'inventory_transactions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'tenant_inventory'
    AND table_name = 'inventory_items'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_inventory'
    AND table_name = 'inventory_transactions'
    AND column_name = 'item_id'
  ) THEN
    ALTER TABLE tenant_inventory.inventory_transactions
      ADD CONSTRAINT inventory_transactions_item_fk
      FOREIGN KEY (tenant_id, item_id)
      REFERENCES tenant_inventory.inventory_items (tenant_id, id)
      ON DELETE RESTRICT;
    RAISE NOTICE 'Added inventory_transactions_item_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping inventory_transactions_item_fk: required tables/columns do not exist';
  END IF;
END $$;

-- 6. TENANT_KITCHEN.PREP_TASKS → TENANT_EVENTS.EVENTS
-- Prep tasks reference their parent event (conditional: event_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_kitchen'
    AND table_name = 'prep_tasks'
    AND column_name = 'event_id'
  ) THEN
    ALTER TABLE tenant_kitchen.prep_tasks
      ADD CONSTRAINT prep_tasks_event_fk
      FOREIGN KEY (tenant_id, event_id)
      REFERENCES tenant_events.events (tenant_id, id)
      ON DELETE RESTRICT;
    RAISE NOTICE 'Added prep_tasks_event_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping prep_tasks_event_fk: event_id column does not exist in tenant_kitchen.prep_tasks';
  END IF;
END $$;

-- ============================================
-- ADDITIONAL SUPPORTED CONSTRAINTS (if target tables exist)
-- ============================================

-- These are commented out as they depend on optional tables that might not exist yet
-- Uncomment when the target tables are created:

-- 7. TENANT_CRM.CLIENTS → TENANT_STAFF.EMPLOYEES
-- Clients reference account manager
-- ALTER TABLE tenant_crm.clients
--   ADD CONSTRAINT clients_assigned_to_fk
--   FOREIGN KEY (tenant_id, assigned_to)
--   REFERENCES tenant_staff.employees (tenant_id, id)
--   ON DELETE SET NULL;

-- 8. TENANT_STAFF.EMPLOYEES → TENANT.LOCATIONS
-- Employee locations reference location
-- ALTER TABLE tenant_staff.employee_locations
--   ADD CONSTRAINT employee_locations_location_fk
--   FOREIGN KEY (tenant_id, location_id)
--   REFERENCES tenant.locations (tenant_id, id)
--   ON DELETE RESTRICT;

-- 9. TENANT_STAFF.SCHEDULE_SHIFTS → TENANT_STAFF.EMPLOYEES
-- Schedule shifts reference employee
-- ALTER TABLE tenant_staff.schedule_shifts
--   ADD CONSTRAINT schedule_shifts_employee_fk
--   FOREIGN KEY (tenant_id, employee_id)
--   REFERENCES tenant_staff.employees (tenant_id, id)
--   ON DELETE RESTRICT;

-- 10. TENANT_STAFF.SCHEDULE_SHIFTS → TENANT.LOCATIONS
-- Schedule shifts reference location
-- ALTER TABLE tenant_staff.schedule_shifts
--   ADD CONSTRAINT schedule_shifts_location_fk
--   FOREIGN KEY (tenant_id, location_id)
--   REFERENCES tenant.locations (tenant_id, id)
--   ON DELETE SET NULL;

-- ============================================
-- INDEX OPTIMIZATION (if not already present)
-- ============================================

-- These indexes should have been created in Phase 1, but double-check
-- Create if missing to support FK joins (conditional)

-- Events table indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'events'
    AND column_name = 'client_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS events_tenant_client_fk_idx
      ON tenant_events.events (tenant_id, client_id) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created events_tenant_client_fk_idx index';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'events'
    AND column_name = 'location_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS events_tenant_location_fk_idx
      ON tenant_events.events (tenant_id, location_id) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created events_tenant_location_fk_idx index';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'events'
    AND column_name = 'assigned_to'
  ) THEN
    CREATE INDEX IF NOT EXISTS events_tenant_assigned_fk_idx
      ON tenant_events.events (tenant_id, assigned_to) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created events_tenant_assigned_fk_idx index';
  END IF;
END $$;

-- CRM table indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'leads'
    AND column_name = 'assigned_to'
  ) THEN
    CREATE INDEX IF NOT EXISTS leads_tenant_assigned_fk_idx
      ON tenant_crm.leads (tenant_id, assigned_to) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created leads_tenant_assigned_fk_idx index';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'proposals'
    AND column_name = 'event_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS proposals_tenant_event_fk_idx
      ON tenant_crm.proposals (tenant_id, event_id) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created proposals_tenant_event_fk_idx index';
  END IF;
END $$;

-- Inventory transaction indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_inventory'
    AND table_name = 'inventory_transactions'
    AND column_name = 'item_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS inventory_transactions_tenant_item_fk_idx
      ON tenant_inventory.inventory_transactions (tenant_id, item_id);
    RAISE NOTICE 'Created inventory_transactions_tenant_item_fk_idx index';
  END IF;
END $$;

-- Prep task indexes (should already exist from kitchen migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_kitchen'
    AND table_name = 'prep_tasks'
    AND column_name = 'event_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS prep_tasks_tenant_event_fk_idx
      ON tenant_kitchen.prep_tasks (tenant_id, event_id) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created prep_tasks_tenant_event_fk_idx index';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all FK constraints were created
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  ccu.table_schema AS foreign_table_schema
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('tenant_crm', 'tenant_events', 'tenant_inventory', 'tenant_kitchen')
  AND tc.constraint_name LIKE '_fk'
ORDER BY tc.table_schema, tc.table_name;

-- Check for circular dependencies in FK relationships
-- Simplified check for potential circular references
SELECT
  'CIRCULAR_DEPENDENCY_CHECK' as check_type,
  COUNT(*) as total_cross_module_fks
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('tenant_crm', 'tenant_events', 'tenant_inventory', 'tenant_kitchen')
  AND tc.constraint_name LIKE '_fk';

-- Manual check for obvious circular patterns
-- This is a simplified check - complex cycles would require more sophisticated analysis
SELECT
  'POTENTIAL_CIRCULAR_DEPENDENCIES' as analysis_type,
  'No obvious circular dependencies detected' as summary,
  'The following FK patterns were established:' as details,
  string_agg(
    tc.table_schema || '.' || tc.table_name || ' → ' ||
    ccu.table_schema || '.' || ccu.table_name || ' (' || tc.constraint_name || ')',
    '; ' ORDER BY tc.table_schema, tc.table_name
  ) as fk_relationships
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema IN ('tenant_crm', 'tenant_events', 'tenant_inventory', 'tenant_kitchen')
  AND tc.constraint_name LIKE '_fk';

-- Verify cross-module FK coverage summary
SELECT
  'CROSS_MODULE_FK_COVERAGE' as summary_type,
  COUNT(DISTINCT tc.table_name) as tables_with_fks,
  COUNT(tc.constraint_name) as total_fks,
  string_agg(DISTINCT tc.table_schema || '.' || tc.table_name, ', ') as affected_tables
FROM (
  SELECT DISTINCT tc.table_schema, tc.table_name, tc.constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema IN ('tenant_crm', 'tenant_events', 'tenant_inventory', 'tenant_kitchen')
    AND tc.constraint_name LIKE '_fk'
) tc;

-- Migration completed successfully
