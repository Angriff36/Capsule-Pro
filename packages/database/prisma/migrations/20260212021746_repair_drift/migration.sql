ALTER TABLE "tenant_events"."command_board_cards" ADD COLUMN IF NOT EXISTS "vector_clock" JSONB,
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
