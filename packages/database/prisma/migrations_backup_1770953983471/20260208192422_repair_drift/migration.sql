ALTER TABLE "tenant_events"."command_board_cards" ADD COLUMN IF NOT EXISTS "entity_id" UUID,
ADD COLUMN IF NOT EXISTS "entity_type" TEXT;

CREATE INDEX IF NOT EXISTS "command_board_cards_entity_id_entity_type_idx" ON "tenant_events"."command_board_cards"("entity_id", "entity_type");
