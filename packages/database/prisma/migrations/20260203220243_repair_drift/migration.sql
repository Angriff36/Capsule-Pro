DROP INDEX IF EXISTS "tenant_events"."event_reports_event_id_idx";

CREATE INDEX IF NOT EXISTS "event_reports_event_id_idx" ON "tenant_events"."event_reports"("tenant_id", "event_id");
