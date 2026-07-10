-- SampleDataRow: sole clear-authority ledger for IR sample seed packs.
CREATE TABLE IF NOT EXISTS "public"."sample_data_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "pack_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "seed_key" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    CONSTRAINT "sample_data_rows_pkey" PRIMARY KEY ("tenant_id", "id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sample_data_row_pack_seed_uidx"
  ON "public"."sample_data_rows" ("tenant_id", "pack_id", "version", "entity", "seed_key");

CREATE INDEX IF NOT EXISTS "sample_data_row_pack_idx"
  ON "public"."sample_data_rows" ("tenant_id", "pack_id", "version");
