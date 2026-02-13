-- Add deleted_at column to event_imports for soft deletes

ALTER TABLE tenant_events.event_imports
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ(6);
