-- Add max_capacity to events
ALTER TABLE tenant_events.events ADD COLUMN IF NOT EXISTS max_capacity integer DEFAULT NULL;

-- Add RSVP status and waitlist fields to event_guests
ALTER TABLE tenant_events.event_guests ADD COLUMN IF NOT EXISTS rsvp_status varchar(20) DEFAULT 'pending';
ALTER TABLE tenant_events.event_guests ADD COLUMN IF NOT EXISTS waitlist_position integer DEFAULT NULL;
ALTER TABLE tenant_events.event_guests ADD COLUMN IF NOT EXISTS rsvp_responded_at timestamptz DEFAULT NULL;

-- Index for waitlist ordering
CREATE INDEX IF NOT EXISTS idx_event_guests_waitlist ON tenant_events.event_guests(event_id, waitlist_position) WHERE waitlist_position IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_guests_rsvp ON tenant_events.event_guests(event_id, rsvp_status) WHERE deleted_at IS NULL;
