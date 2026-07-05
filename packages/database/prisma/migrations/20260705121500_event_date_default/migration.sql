-- Event.eventDate now declares = now() in source (engine persists auto-created
-- instances before mutates; NULL into NOT NULL event_date 500'd quick-create).
ALTER TABLE "tenant_events"."events" ALTER COLUMN "event_date" SET DEFAULT now();
