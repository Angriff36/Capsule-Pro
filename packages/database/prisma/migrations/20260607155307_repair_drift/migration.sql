-- Repair: add menus.is_template column ( drifted from schema.prisma )
ALTER TABLE "tenant_kitchen"."menus" ADD COLUMN IF NOT EXISTS "is_template" BOOLEAN NOT NULL DEFAULT false;
