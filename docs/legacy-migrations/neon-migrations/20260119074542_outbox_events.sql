-- MIGRATION: 20260119074542_outbox_events.sql
-- Outbox pattern for real-time event publishing via Ably

CREATE TABLE IF NOT EXISTS platform.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  error text
);

-- Indexes
CREATE INDEX outbox_events_tenant_idx ON platform.outbox_events(tenant_id);
CREATE INDEX outbox_events_status_created_idx ON platform.outbox_events(tenant_id, status, created_at);

-- RLS Policies
ALTER TABLE platform.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.outbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY outbox_events_select ON platform.outbox_events
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY outbox_events_insert ON platform.outbox_events
  FOR INSERT WITH CHECK (false); -- Only service_role can insert

CREATE POLICY outbox_events_update ON platform.outbox_events
  FOR UPDATE USING (false);

CREATE POLICY outbox_events_delete ON platform.outbox_events
  FOR DELETE USING (false);

CREATE POLICY outbox_events_service ON platform.outbox_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
