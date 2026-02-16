CREATE TABLE IF NOT EXISTS "tenant_events"."command_board_connections" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "from_card_id" UUID NOT NULL,
    "to_card_id" UUID NOT NULL,
    "relationship_type" TEXT NOT NULL DEFAULT 'generic',
    "label" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "command_board_connections_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "command_board_connections_board_id_idx" ON "tenant_events"."command_board_connections"("board_id");

CREATE INDEX IF NOT EXISTS "command_board_connections_from_card_id_idx" ON "tenant_events"."command_board_connections"("from_card_id");

CREATE INDEX IF NOT EXISTS "command_board_connections_to_card_id_idx" ON "tenant_events"."command_board_connections"("to_card_id");

CREATE UNIQUE INDEX IF NOT EXISTS "unique_connection_per_board" ON "tenant_events"."command_board_connections"("board_id", "from_card_id", "to_card_id", "relationship_type");
