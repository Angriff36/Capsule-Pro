ALTER TABLE "tenant_events"."events"
  ADD COLUMN "ticket_price" DECIMAL(10, 2),
  ADD COLUMN "ticket_tier" TEXT,
  ADD COLUMN "event_format" TEXT,
  ADD COLUMN "accessibility_options" TEXT[],
  ADD COLUMN "featured_media_url" TEXT;
