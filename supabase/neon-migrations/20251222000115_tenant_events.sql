-- MIGRATION: 20251222000115_tenant_events.sql
-- Events module: events (replaces existing stub)
-- Follows Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_EVENTS.EVENTS (REPLACE existing stub)
-- ============================================
-- Stub exists in 20251222000102_tenant_base.sql with:
--   tenant_id, id, event_name, event_date, status, created_at, updated_at, deleted_at
-- This migration will DROP and recreate the table with full schema

-- First, DROP the existing table and recreate with full schema
DROP TABLE IF EXISTS tenant_events.events CASCADE;

CREATE TABLE tenant_events.events (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_number text,
  title text NOT NULL DEFAULT 'Untitled Event',
  client_id uuid,  -- Phase 1 FK to tenant_crm.clients (no REFERENCES yet)
  location_id uuid,  -- Phase 1 FK to tenant.locations (no REFERENCES yet)
  event_type text NOT NULL,
  event_date date NOT NULL,
  guest_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'confirmed',
  budget numeric(12,2),
  assigned_to uuid,  -- Phase 1 FK to tenant_staff.employees
  venue_name text,
  venue_address text,
  notes text,
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  -- Business constraints
  CHECK (
    (event_type IS NOT NULL AND length(trim(event_type)) > 0) OR
    (title IS NOT NULL AND length(trim(title)) > 0)
  ),
  CHECK (guest_count >= 1),
  CHECK (status IN ('confirmed', 'tentative', 'cancelled', 'completed', 'postponed')),
  CHECK (budget IS NULL OR budget >= 0),
  CHECK (length(trim(coalesce(title, ''))) BETWEEN 3 AND 200),
  CHECK (length(trim(coalesce(venue_name, ''))) <= 200),
  CHECK (notes IS NULL OR length(trim(notes)) <= 5000)
);

-- Unique constraint for event_number per tenant
CREATE UNIQUE INDEX events_event_number_unique_idx
  ON tenant_events.events (tenant_id, event_number)
  WHERE event_number IS NOT NULL AND deleted_at IS NULL;

-- Indexes
CREATE INDEX events_tenant_type_idx
  ON tenant_events.events (tenant_id, event_type) WHERE deleted_at IS NULL;

CREATE INDEX events_tenant_status_idx
  ON tenant_events.events (tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX events_tenant_client_idx
  ON tenant_events.events (tenant_id, client_id) WHERE deleted_at IS NULL AND client_id IS NOT NULL;

CREATE INDEX events_tenant_location_idx
  ON tenant_events.events (tenant_id, location_id) WHERE deleted_at IS NULL AND location_id IS NOT NULL;

CREATE INDEX events_tenant_assigned_idx
  ON tenant_events.events (tenant_id, assigned_to) WHERE deleted_at IS NULL AND assigned_to IS NOT NULL;

CREATE INDEX events_tenant_date_idx
  ON tenant_events.events (tenant_id, event_date) WHERE deleted_at IS NULL;

CREATE INDEX events_guest_count_idx
  ON tenant_events.events (tenant_id, guest_count) WHERE deleted_at IS NULL;

CREATE INDEX events_tenant_budget_idx
  ON tenant_events.events (tenant_id, budget) WHERE deleted_at IS NULL AND budget IS NOT NULL;

CREATE INDEX events_tags_idx
  ON tenant_events.events USING GIN(tags) WHERE deleted_at IS NULL AND tags IS NOT NULL;

CREATE INDEX events_venue_name_idx
  ON tenant_events.events (tenant_id, lower(venue_name)) WHERE deleted_at IS NULL AND venue_name IS NOT NULL;

-- Indexes for future FK references (Phase 1)
CREATE INDEX events_client_id_idx
  ON tenant_events.events (client_id) WHERE client_id IS NOT NULL;

CREATE INDEX events_location_id_idx
  ON tenant_events.events (location_id) WHERE location_id IS NOT NULL;

CREATE INDEX events_assigned_to_idx
  ON tenant_events.events (assigned_to) WHERE assigned_to IS NOT NULL;

-- Triggers
CREATE TRIGGER events_update_timestamp
  BEFORE UPDATE ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER events_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER events_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_events.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.events FORCE ROW LEVEL SECURITY;

CREATE POLICY events_select ON tenant_events.events
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY events_insert ON tenant_events.events
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY events_update ON tenant_events.events
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY events_delete ON tenant_events.events
  FOR DELETE USING (false);

-- ============================================
-- EVENT AUTO-NUMBERING FUNCTION
-- ============================================
-- Function to generate event numbers per tenant (format: ENVT-YYYY-NNNN)
CREATE OR REPLACE FUNCTION tenant_events.fn_generate_event_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year text;
  v_sequence_num int;
  v_event_number text;
BEGIN
  -- Extract year from current date
  v_year := to_char(CURRENT_DATE, 'YYYY');

  -- Get next sequence number for this tenant and year
  SELECT COALESCE(MAX(CAST(SUBSTRING(event_number FROM 10) AS integer)), 0) + 1
  INTO v_sequence_num
  FROM tenant_events.events
  WHERE tenant_id = NEW.tenant_id
  AND event_number LIKE 'ENVT-' || v_year || '-%';

  -- Format as ENVT-YYYY-NNNN with leading zeros for NNNN
  v_event_number := 'ENVT-' || v_year || '-' || LPAD(v_sequence_num::text, 4, '0');

  -- Set the event number if not already set (for new records)
  IF NEW.event_number IS NULL OR NEW.event_number = '' THEN
    NEW.event_number := v_event_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for auto-numbering
CREATE TRIGGER events_generate_event_number
  BEFORE INSERT OR UPDATE ON tenant_events.events
  FOR EACH ROW EXECUTE FUNCTION tenant_events.fn_generate_event_number();

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Verify the events table structure is correct
SELECT
  'EVENTS TABLE STRUCTURE' as check_type,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_records,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_records,
  COUNT(DISTINCT event_type) as event_types_count,
  COUNT(DISTINCT status) as status_types_count,
  COUNT(DISTINCT assigned_to) as assigned_to_count,
  COUNT(DISTINCT location_id) as location_count,
  COUNT(DISTINCT client_id) as client_count,
  MIN(event_date) as earliest_event,
  MAX(event_date) as latest_event,
  SUM(guest_count) as total_guests,
  COALESCE(SUM(budget), 0) as total_budget
FROM tenant_events.events;

-- Migration completed successfully
