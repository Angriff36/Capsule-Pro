-- Add shareId and isPublic fields to CommandBoard for template sharing
-- Enable sharing of board configurations via shareable links

ALTER TABLE "tenant_events"."command_boards"
ADD COLUMN "share_id" TEXT UNIQUE,
ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster lookups by shareId
CREATE INDEX "command_boards_share_id_idx" ON "tenant_events"."command_boards"("share_id");

-- Add index for filtering templates
CREATE INDEX "command_boards_is_template_idx" ON "tenant_events"."command_boards"("is_template");
