-- Same insert-hazard class as 20260705120000: schema declares
-- EventTimelineItem.completedAt as DateTime? (nullable) but the live column is
-- NOT NULL with no default — a Prisma insert that omits it (a not-yet-completed
-- timeline item, the normal case) would 23502 once the table has rows. Table is
-- currently empty; align live nullability to the schema before it fills.
ALTER TABLE "tenant_events"."event_timeline_items" ALTER COLUMN "completed_at" DROP NOT NULL;
