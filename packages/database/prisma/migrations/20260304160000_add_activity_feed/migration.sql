-- Create ActivityFeed table for unified activity feed
CREATE TABLE IF NOT EXISTS tenant_admin.activity_feed (
  tenant_id UUID NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  activity_type VARCHAR NOT NULL,
  entity_type VARCHAR,
  entity_id UUID,
  action VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  metadata JSONB,
  performed_by UUID,
  performer_name VARCHAR,
  correlation_id UUID,
  parent_id UUID,
  source_type VARCHAR,
  source_id UUID,
  importance VARCHAR NOT NULL DEFAULT 'normal',
  visibility VARCHAR NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (tenant_id, id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS activity_feed_created_at_idx ON tenant_admin.activity_feed(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_type_idx ON tenant_admin.activity_feed(tenant_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_entity_idx ON tenant_admin.activity_feed(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_feed_performer_idx ON tenant_admin.activity_feed(tenant_id, performed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_correlation_idx ON tenant_admin.activity_feed(tenant_id, correlation_id);
