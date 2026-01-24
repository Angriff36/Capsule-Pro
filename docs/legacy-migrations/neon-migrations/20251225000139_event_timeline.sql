-- MIGRATION: 20251225000139_event_timeline.sql
-- Module: Events (Timeline Checkpoints)
-- Follows Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_EVENTS.EVENT_TIMELINE
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_events.event_timeline (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  timeline_time time NOT NULL,
  description text NOT NULL,
  responsible_role text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  -- Constraints
  CONSTRAINT event_timeline_description_check CHECK (length(trim(description)) > 0),
  CONSTRAINT event_timeline_notes_check CHECK (notes IS NULL OR length(trim(notes)) <= 2000)
);

-- Indexes for performance and ordering
CREATE INDEX event_timeline_event_time_idx
  ON tenant_events.event_timeline (tenant_id, event_id, timeline_time, sort_order)
  WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER event_timeline_update_timestamp
  BEFORE UPDATE ON tenant_events.event_timeline
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER event_timeline_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.event_timeline
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER event_timeline_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.event_timeline
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_events.event_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.event_timeline FORCE ROW LEVEL SECURITY;

CREATE POLICY event_timeline_select ON tenant_events.event_timeline
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY event_timeline_insert ON tenant_events.event_timeline
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY event_timeline_update ON tenant_events.event_timeline
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

CREATE POLICY event_timeline_delete ON tenant_events.event_timeline
  FOR DELETE USING (false);

-- Grant privileges
GRANT USAGE ON SCHEMA tenant_events TO authenticated;
GRANT ALL ON tenant_events.event_timeline TO authenticated;
GRANT ALL ON tenant_events.event_timeline TO service_role;

-- Phase 2 FK Constraint (to events table)
ALTER TABLE tenant_events.event_timeline
  ADD CONSTRAINT event_timeline_event_fk
  FOREIGN KEY (tenant_id, event_id)
  REFERENCES tenant_events.events (tenant_id, id)
  ON DELETE CASCADE;









