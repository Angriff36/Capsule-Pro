CREATE TABLE IF NOT EXISTS "tenant_events"."command_board_layouts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "viewport" JSONB NOT NULL,
    "visibleCards" TEXT[],
    "grid_size" INTEGER NOT NULL DEFAULT 40,
    "show_grid" BOOLEAN NOT NULL DEFAULT true,
    "snap_to_grid" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "command_board_layouts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "command_board_layouts_board_id_idx" ON "tenant_events"."command_board_layouts"("board_id");

CREATE INDEX IF NOT EXISTS "command_board_layouts_user_id_idx" ON "tenant_events"."command_board_layouts"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "command_board_layouts_board_id_user_id_name_key" ON "tenant_events"."command_board_layouts"("board_id", "user_id", "name");
