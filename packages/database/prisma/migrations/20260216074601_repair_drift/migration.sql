-- EntityType enum (must be created before board_projections references it)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'EntityType' AND n.nspname = 'tenant_events') THEN
        CREATE TYPE "tenant_events"."EntityType" AS ENUM ('event', 'client', 'prep_task', 'kitchen_task', 'employee', 'inventory_item', 'recipe', 'dish', 'proposal', 'shipment', 'note');
    END IF;
END $$;

-- Add scope and auto_populate columns to command_boards
ALTER TABLE "tenant_events"."command_boards" ADD COLUMN IF NOT EXISTS "auto_populate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "scope" JSONB;

-- Board projections: live entity views on a board
CREATE TABLE IF NOT EXISTS "tenant_events"."board_projections" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "entity_type" "tenant_events"."EntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "position_x" INTEGER NOT NULL DEFAULT 0,
    "position_y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 280,
    "height" INTEGER NOT NULL DEFAULT 180,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "color_override" TEXT,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "group_id" UUID,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "board_projections_pkey" PRIMARY KEY ("tenant_id","id")
);

-- Notes: first-class note entities
CREATE TABLE IF NOT EXISTS "tenant_events"."notes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "content" TEXT,
    "color" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("tenant_id","id")
);

-- Board annotations: manual connections/labels drawn by users
CREATE TABLE IF NOT EXISTS "tenant_events"."board_annotations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "annotation_type" TEXT NOT NULL DEFAULT 'connection',
    "from_projection_id" UUID,
    "to_projection_id" UUID,
    "label" TEXT,
    "color" TEXT,
    "style" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "board_annotations_pkey" PRIMARY KEY ("tenant_id","id")
);

-- Indexes for board_projections
CREATE INDEX IF NOT EXISTS "board_projections_board_id_idx" ON "tenant_events"."board_projections"("board_id");
CREATE INDEX IF NOT EXISTS "board_projections_entity_type_entity_id_idx" ON "tenant_events"."board_projections"("entity_type", "entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "board_projections_board_id_entity_type_entity_id_key" ON "tenant_events"."board_projections"("board_id", "entity_type", "entity_id");

-- Indexes for board_annotations
CREATE INDEX IF NOT EXISTS "board_annotations_board_id_idx" ON "tenant_events"."board_annotations"("board_id");

-- Tenant isolation indexes (standard pattern for all tenant tables)
CREATE INDEX IF NOT EXISTS "board_projections_tenant_deleted_idx" ON "tenant_events"."board_projections"("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "notes_tenant_deleted_idx" ON "tenant_events"."notes"("tenant_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "board_annotations_tenant_deleted_idx" ON "tenant_events"."board_annotations"("tenant_id", "deleted_at");

-- FK: board_projections.board_id → command_boards (CASCADE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_board_projections_board'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE "tenant_events"."board_projections"
        ADD CONSTRAINT fk_board_projections_board
        FOREIGN KEY ("tenant_id", "board_id")
        REFERENCES "tenant_events"."command_boards"("tenant_id", "id")
        ON DELETE CASCADE;
    END IF;
END $$;

-- FK: board_projections.group_id → command_board_groups (SET NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_board_projections_group'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE "tenant_events"."board_projections"
        ADD CONSTRAINT fk_board_projections_group
        FOREIGN KEY ("tenant_id", "group_id")
        REFERENCES "tenant_events"."command_board_groups"("tenant_id", "id")
        ON DELETE SET NULL;
    END IF;
END $$;

-- FK: board_annotations.board_id → command_boards (CASCADE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_board_annotations_board'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE "tenant_events"."board_annotations"
        ADD CONSTRAINT fk_board_annotations_board
        FOREIGN KEY ("tenant_id", "board_id")
        REFERENCES "tenant_events"."command_boards"("tenant_id", "id")
        ON DELETE CASCADE;
    END IF;
END $$;
