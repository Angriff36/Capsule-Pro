-- MIGRATION: 20260121000000_cross_module_fks_phase2.sql
-- Phase 2 Cross-module foreign keys to complete referential integrity between modules
-- Follows Schema Contract v2 pattern with composite tenant_id + id FKs

BEGIN;

-- ============================================
-- 1. TENANT_EVENTS.EVENTS → TENANT_STAFF.EMPLOYEES (assigned_to)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'events'
    AND column_name = 'assigned_to'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'events_assigned_to_fk'
      AND table_schema = 'tenant_events'
    ) THEN
      ALTER TABLE tenant_events.events
        ADD CONSTRAINT events_assigned_to_fk
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees (tenant_id, id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added events_assigned_to_fk constraint';
    ELSE
      RAISE NOTICE 'events_assigned_to_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping events_assigned_to_fk: assigned_to column does not exist';
  END IF;
END $$;

-- ============================================
-- 2. TENANT_CRM.CLIENTS → TENANT_STAFF.EMPLOYEES (assigned_to)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'clients'
    AND column_name = 'assigned_to'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'clients_assigned_to_fk'
      AND table_schema = 'tenant_crm'
    ) THEN
      ALTER TABLE tenant_crm.clients
        ADD CONSTRAINT clients_assigned_to_fk
        FOREIGN KEY (tenant_id, assigned_to)
        REFERENCES tenant_staff.employees (tenant_id, id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added clients_assigned_to_fk constraint';
    ELSE
      RAISE NOTICE 'clients_assigned_to_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping clients_assigned_to_fk: assigned_to column does not exist';
  END IF;
END $$;

-- ============================================
-- 3. TENANT_KITCHEN.CONTAINERS → TENANT.LOCATIONS (location_id)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_kitchen'
    AND table_name = 'containers'
    AND column_name = 'location_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'containers_location_fk'
      AND table_schema = 'tenant_kitchen'
    ) THEN
      ALTER TABLE tenant_kitchen.containers
        ADD CONSTRAINT containers_location_fk
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations (tenant_id, id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added containers_location_fk constraint';
    ELSE
      RAISE NOTICE 'containers_location_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping containers_location_fk: location_id column does not exist';
  END IF;
END $$;

-- ============================================
-- 4. TENANT_KITCHEN.PREP_TASKS → TENANT.LOCATIONS (location_id)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_kitchen'
    AND table_name = 'prep_tasks'
    AND column_name = 'location_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'prep_tasks_location_fk'
      AND table_schema = 'tenant_kitchen'
    ) THEN
      ALTER TABLE tenant_kitchen.prep_tasks
        ADD CONSTRAINT prep_tasks_location_fk
        FOREIGN KEY (tenant_id, location_id)
        REFERENCES tenant.locations (tenant_id, id)
        ON DELETE RESTRICT;
      RAISE NOTICE 'Added prep_tasks_location_fk constraint';
    ELSE
      RAISE NOTICE 'prep_tasks_location_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping prep_tasks_location_fk: location_id column does not exist';
  END IF;
END $$;

-- ============================================
-- 5. TENANT_EVENTS.EVENT_STAFF_ASSIGNMENTS → TENANT_EVENTS.EVENTS (event_id)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'tenant_events'
    AND table_name = 'event_staff_assignments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'event_staff_assignments_event_fk'
      AND table_schema = 'tenant_events'
    ) THEN
      ALTER TABLE tenant_events.event_staff_assignments
        ADD CONSTRAINT event_staff_assignments_event_fk
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events (tenant_id, id)
        ON DELETE CASCADE;
      RAISE NOTICE 'Added event_staff_assignments_event_fk constraint';
    ELSE
      RAISE NOTICE 'event_staff_assignments_event_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping event_staff_assignments_event_fk: table does not exist';
  END IF;
END $$;

-- ============================================
-- 6. TENANT_EVENTS.EVENT_STAFF_ASSIGNMENTS → TENANT_STAFF.EMPLOYEES (employee_id)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'tenant_events'
    AND table_name = 'event_staff_assignments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'event_staff_assignments_employee_fk'
      AND table_schema = 'tenant_events'
    ) THEN
      ALTER TABLE tenant_events.event_staff_assignments
        ADD CONSTRAINT event_staff_assignments_employee_fk
        FOREIGN KEY (tenant_id, employee_id)
        REFERENCES tenant_staff.employees (tenant_id, id)
        ON DELETE RESTRICT;
      RAISE NOTICE 'Added event_staff_assignments_employee_fk constraint';
    ELSE
      RAISE NOTICE 'event_staff_assignments_employee_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping event_staff_assignments_employee_fk: table does not exist';
  END IF;
END $$;

-- ============================================
-- 7. TENANT_CRM.LEADS → TENANT_CRM.CLIENTS (converted_to_client_id)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'leads'
    AND column_name = 'converted_to_client_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'leads_converted_to_client_fk'
      AND table_schema = 'tenant_crm'
    ) THEN
      ALTER TABLE tenant_crm.leads
        ADD CONSTRAINT leads_converted_to_client_fk
        FOREIGN KEY (tenant_id, converted_to_client_id)
        REFERENCES tenant_crm.clients (tenant_id, id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added leads_converted_to_client_fk constraint';
    ELSE
      RAISE NOTICE 'leads_converted_to_client_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping leads_converted_to_client_fk: column does not exist';
  END IF;
END $$;

-- ============================================
-- 8. TENANT_CRM.PROPOSALS → TENANT_EVENTS.EVENTS (event_id)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'proposals'
    AND column_name = 'event_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'proposals_event_fk'
      AND table_schema = 'tenant_crm'
    ) THEN
      ALTER TABLE tenant_crm.proposals
        ADD CONSTRAINT proposals_event_fk
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events (tenant_id, id)
        ON DELETE SET NULL;
      RAISE NOTICE 'Added proposals_event_fk constraint';
    ELSE
      RAISE NOTICE 'proposals_event_fk already exists';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping proposals_event_fk: event_id column does not exist';
  END IF;
END $$;

-- ============================================
-- 9. TENANT_KITCHEN.PREP_TASKS → TENANT_STAFF.EMPLOYEES (created_by/assigned)
-- Note: If there's a created_by or similar column, add FK
-- Currently prep_tasks doesn't have employee FK columns (only via task_claims)
-- This is intentional - employees claim tasks, not assigned directly
-- ============================================

-- ============================================
-- INDEXES FOR FK COLUMNS (if not already present)
-- ============================================

-- Events assigned_to index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_events'
    AND tablename = 'events'
    AND indexname = 'events_tenant_assigned_fk_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS events_tenant_assigned_fk_idx
      ON tenant_events.events (tenant_id, assigned_to) WHERE deleted_at IS NULL AND assigned_to IS NOT NULL;
    RAISE NOTICE 'Created events_tenant_assigned_fk_idx index';
  END IF;
END $$;

-- Clients assigned_to index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_crm'
    AND tablename = 'clients'
    AND indexname = 'clients_tenant_assigned_fk_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS clients_tenant_assigned_fk_idx
      ON tenant_crm.clients (tenant_id, assigned_to) WHERE deleted_at IS NULL AND assigned_to IS NOT NULL;
    RAISE NOTICE 'Created clients_tenant_assigned_fk_idx index';
  END IF;
END $$;

-- Containers location_id index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_kitchen'
    AND tablename = 'containers'
    AND indexname = 'containers_tenant_location_fk_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS containers_tenant_location_fk_idx
      ON tenant_kitchen.containers (tenant_id, location_id) WHERE deleted_at IS NULL AND location_id IS NOT NULL;
    RAISE NOTICE 'Created containers_tenant_location_fk_idx index';
  END IF;
END $$;

-- Prep tasks location_id index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_kitchen'
    AND tablename = 'prep_tasks'
    AND indexname = 'prep_tasks_tenant_location_fk_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS prep_tasks_tenant_location_fk_idx
      ON tenant_kitchen.prep_tasks (tenant_id, location_id) WHERE deleted_at IS NULL;
    RAISE NOTICE 'Created prep_tasks_tenant_location_fk_idx index';
  END IF;
END $$;

-- Event staff assignments indexes (for FK lookups)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'tenant_events'
    AND table_name = 'event_staff_assignments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'tenant_events'
      AND tablename = 'event_staff_assignments'
      AND indexname = 'event_staff_assignments_tenant_event_fk_idx'
    ) THEN
      CREATE INDEX IF NOT EXISTS event_staff_assignments_tenant_event_fk_idx
        ON tenant_events.event_staff_assignments (tenant_id, event_id) WHERE deleted_at IS NULL;
      RAISE NOTICE 'Created event_staff_assignments_tenant_event_fk_idx index';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'tenant_events'
      AND tablename = 'event_staff_assignments'
      AND indexname = 'event_staff_assignments_tenant_employee_fk_idx'
    ) THEN
      CREATE INDEX IF NOT EXISTS event_staff_assignments_tenant_employee_fk_idx
        ON tenant_events.event_staff_assignments (tenant_id, employee_id) WHERE deleted_at IS NULL;
      RAISE NOTICE 'Created event_staff_assignments_tenant_employee_fk_idx index';
    END IF;
  END IF;
END $$;

-- Leads converted_to_client_id index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_crm'
    AND tablename = 'leads'
    AND indexname = 'leads_tenant_converted_client_fk_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS leads_tenant_converted_client_fk_idx
      ON tenant_crm.leads (tenant_id, converted_to_client_id) WHERE deleted_at IS NULL AND converted_to_client_id IS NOT NULL;
    RAISE NOTICE 'Created leads_tenant_converted_client_fk_idx index';
  END IF;
END $$;

-- Proposals event_id index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'tenant_crm'
    AND tablename = 'proposals'
    AND indexname = 'proposals_tenant_event_fk_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS proposals_tenant_event_fk_idx
      ON tenant_crm.proposals (tenant_id, event_id) WHERE deleted_at IS NULL AND event_id IS NOT NULL;
    RAISE NOTICE 'Created proposals_tenant_event_fk_idx index';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT
  'CROSS_MODULE_FK_STATUS' as status_type,
  COUNT(*) as total_fks,
  COUNT(*) FILTER (WHERE conname LIKE '%_fk') as cross_module_fks,
  string_agg(
    conname || ': ' || conrelid::regclass::text || ' → ' || ccu.table_schema || '.' || ccu.table_name,
    E'\n'
    ORDER BY conrelid::regclass::text
  ) as fk_relationships
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN information_schema.key_column_usage kcu
  ON c.conname = kcu.constraint_name
  AND n.nspname = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = c.conname
WHERE c.contype = 'f'
  AND n.nspname IN ('tenant_crm', 'tenant_events', 'tenant_inventory', 'tenant_kitchen', 'tenant_staff')
  AND ccu.table_schema IN ('tenant_crm', 'tenant_events', 'tenant_inventory', 'tenant_kitchen', 'tenant_staff', 'tenant');

COMMIT;
