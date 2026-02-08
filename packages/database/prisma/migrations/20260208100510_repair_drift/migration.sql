ALTER TABLE "tenant_events"."command_board_cards" ADD COLUMN IF NOT EXISTS "group_id" UUID;

CREATE TABLE IF NOT EXISTS "tenant_events"."command_board_groups" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 300,
    "height" INTEGER NOT NULL DEFAULT 200,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "command_board_groups_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "command_board_groups_board_id_idx" ON "tenant_events"."command_board_groups"("board_id");

CREATE INDEX IF NOT EXISTS "command_board_cards_group_id_idx" ON "tenant_events"."command_board_cards"("group_id");
