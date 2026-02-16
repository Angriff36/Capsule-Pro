ALTER TABLE "tenant_kitchen"."recipe_versions"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "cuisine_type" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "tags" TEXT[];

UPDATE "tenant_kitchen"."recipe_versions" rv
SET
  "name" = r."name",
  "category" = r."category",
  "cuisine_type" = r."cuisine_type",
  "description" = r."description",
  "tags" = r."tags"
FROM "tenant_kitchen"."recipes" r
WHERE r."tenant_id" = rv."tenant_id"
  AND r."id" = rv."recipe_id"
  AND rv."name" IS NULL;

ALTER TABLE "tenant_kitchen"."recipe_versions"
  ALTER COLUMN "name" SET NOT NULL;
