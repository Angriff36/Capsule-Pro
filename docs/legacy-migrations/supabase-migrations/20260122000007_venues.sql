-- MIGRATION: 20260122000007_venues.sql
-- Purpose: Add venue management to tenant_crm schema for tracking event venues
-- Dependencies: None (new feature)
-- Reviewed: Schema Contract v2 sections B/D/E/L

-- Create venues table in tenant_crm schema
CREATE TABLE tenant_crm.venues (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  venue_type text,  -- 'banquet_hall', 'outdoor', 'restaurant', 'hotel', 'private_home', 'corporate', 'other'
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country_code char(2),
  capacity integer,
  contact_name text,
  contact_phone text,
  contact_email text,
  equipment_list jsonb DEFAULT '[]'::jsonb,  -- Array of equipment available at venue
  preferred_vendors jsonb DEFAULT '{}'::jsonb,  -- Preferred vendors for this venue
  access_notes text,  -- Loading dock info, parking, setup restrictions
  catering_notes text,  -- Kitchen facilities, prep areas, storage
  layout_image_url text,  -- URL to floor plan or layout image
  is_active boolean NOT NULL DEFAULT true,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  CONSTRAINT venues_capacity_positive CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT venues_email_format CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for efficient querying
CREATE INDEX idx_venues_tenant_id ON tenant_crm.venues(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_active ON tenant_crm.venues(tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_type ON tenant_crm.venues(tenant_id, venue_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_city ON tenant_crm.venues(tenant_id, city) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_capacity ON tenant_crm.venues(tenant_id, capacity) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_name_search ON tenant_crm.venues USING gin(to_tsvector('english', name)) WHERE deleted_at IS NULL;
CREATE INDEX idx_venues_tags ON tenant_crm.venues USING gin(tags) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_venues_unique_name ON tenant_crm.venues(tenant_id, lower(name)) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE tenant_crm.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.venues FORCE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY venues_select ON tenant_crm.venues
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

-- INSERT policy
CREATE POLICY venues_insert ON tenant_crm.venues
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

-- UPDATE policy
CREATE POLICY venues_update ON tenant_crm.venues
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- DELETE policy (block hard deletes)
CREATE POLICY venues_delete ON tenant_crm.venues
  FOR DELETE USING (false);

-- SERVICE ROLE policy (for migrations/admin)
CREATE POLICY venues_service ON tenant_crm.venues
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Triggers for timestamp updates and tenant mutation prevention
CREATE TRIGGER venues_update_timestamp
  BEFORE UPDATE ON tenant_crm.venues
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER venues_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.venues
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger
CREATE TRIGGER venues_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.venues
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_audit_trigger();

-- Function to check if venue can be deleted (no active events)
CREATE OR REPLACE FUNCTION tenant_crm.fn_can_delete_venue(p_tenant_id uuid, p_venue_id uuid)
  RETURNS boolean AS $$
  DECLARE
    active_events integer;
  BEGIN
    -- Check for active events (not deleted, not completed) at this venue
    SELECT COUNT(*) INTO active_events
    FROM tenant_events.events
    WHERE tenant_id = p_tenant_id
      AND id = p_venue_id
      AND deleted_at IS NULL
      AND status NOT IN ('completed', 'cancelled');

    RETURN active_events = 0;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get venue event history
CREATE OR REPLACE FUNCTION tenant_crm.fn_venue_event_history(p_tenant_id uuid, p_venue_id uuid)
  RETURNS TABLE (
    event_id uuid,
    event_name text,
    event_date date,
    guest_count integer,
    status text
  ) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      e.id,
      e.title AS event_name,
      e.event_date,
      e.guest_count,
      e.status
    FROM tenant_events.events e
    WHERE e.tenant_id = p_tenant_id
      AND e.venue_id = p_venue_id
      AND e.deleted_at IS NULL
    ORDER BY e.event_date DESC;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add venue_id column to events table for linking events to venues
ALTER TABLE tenant_events.events ADD COLUMN IF NOT EXISTS venue_id uuid;

-- Create index for venue_id on events
CREATE INDEX idx_events_venue_id ON tenant_events.events(tenant_id, venue_id) WHERE deleted_at IS NULL AND venue_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN tenant_events.events.venue_id IS 'Optional reference to tenant_crm.venues for structured venue data';

-- Verification
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'tenant_crm' AND tablename = 'venues';
SELECT * FROM pg_indexes WHERE schemaname = 'tenant_crm' AND tablename LIKE 'venue%';
