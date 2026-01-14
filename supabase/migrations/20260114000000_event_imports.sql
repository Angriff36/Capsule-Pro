-- MIGRATION: 20260114000000_event_imports.sql
-- Event imports table for storing source documents (CSV/PDF) per event.

CREATE TABLE IF NOT EXISTS tenant_events.event_imports (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS event_imports_event_idx
  ON tenant_events.event_imports (tenant_id, event_id);

CREATE INDEX IF NOT EXISTS event_imports_created_idx
  ON tenant_events.event_imports (tenant_id, created_at DESC);
