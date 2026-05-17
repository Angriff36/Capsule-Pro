-- Cleanup wrong-schema table duplicates from hand-written migrations and early repair_drift
-- passes. Canonical locations per schema.prisma; correct copies were added in
-- 20260308171626_repair_drift (and RLS in later migrations).

DROP TABLE IF EXISTS "tenant"."manifest_command_telemetry" CASCADE;

ALTER TABLE "platform"."accounts"
DROP COLUMN IF EXISTS "manifest_command_telemetry_id";

DROP TABLE IF EXISTS "tenant_admin"."role_policies" CASCADE;

DROP TABLE IF EXISTS "tenant_admin"."api_keys" CASCADE;
