-- EventSummary.generatedAt now declares `= now()` in source (engine persists
-- auto-created instances before mutates run; a required datetime with no
-- default is invalid at the live store — same class as prep_lists 20260705001810).

ALTER TABLE "tenant_events"."event_summaries" ALTER COLUMN "generated_at" SET DEFAULT now();
