ALTER TABLE "tenant_kitchen"."prep_list_items" ALTER COLUMN "station_id" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."stations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "station_type" TEXT NOT NULL,
    "capacity_simultaneous_tasks" INTEGER NOT NULL DEFAULT 1,
    "equipmentList" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."override_audit" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "constraint_id" TEXT NOT NULL,
    "guard_expression" TEXT,
    "overridden_by" UUID NOT NULL,
    "override_reason" TEXT NOT NULL,
    "authorized_by" UUID,
    "authorized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "stations_tenant_id_location_id_idx" ON "tenant_kitchen"."stations"("tenant_id", "location_id");

CREATE UNIQUE INDEX IF NOT EXISTS "stations_tenant_id_id_key" ON "tenant_kitchen"."stations"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "override_audit_tenant_id_entity_type_entity_id_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "override_audit_tenant_id_overridden_by_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "overridden_by");

CREATE INDEX IF NOT EXISTS "override_audit_tenant_id_created_at_idx" ON "tenant_kitchen"."override_audit"("tenant_id", "created_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "override_audit_tenant_id_id_key" ON "tenant_kitchen"."override_audit"("tenant_id", "id");

-- ========================================================================
-- DROP UNUSED RLS POLICIES
-- These were created from Supabase template but are not used
-- Clerk handles authentication and tenant isolation at application level
-- ========================================================================

-- Drop RLS policies for admin_tasks (from migration 0020)
DROP POLICY IF EXISTS "admin_tasks_select" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_insert" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_update" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_delete" ON "tenant_admin"."admin_tasks";
DROP POLICY IF EXISTS "admin_tasks_service" ON "tenant_admin"."admin_tasks";

-- Disable RLS for admin_tasks
ALTER TABLE "tenant_admin"."admin_tasks" DISABLE ROW LEVEL SECURITY;

-- Drop triggers for admin_tasks
DROP TRIGGER IF EXISTS "admin_tasks_update_timestamp" ON "tenant_admin"."admin_tasks";
DROP TRIGGER IF EXISTS "admin_tasks_prevent_tenant_mutation" ON "tenant_admin"."admin_tasks";

-- Drop RLS policies for admin_chat_threads (from migration 0021)
DROP POLICY IF EXISTS "admin_chat_threads_select" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_insert" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_update" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_delete" ON "tenant_admin"."admin_chat_threads";
DROP POLICY IF EXISTS "admin_chat_threads_service" ON "tenant_admin"."admin_chat_threads";

-- Disable RLS for admin_chat_threads
ALTER TABLE "tenant_admin"."admin_chat_threads" DISABLE ROW LEVEL SECURITY;

-- Drop triggers for admin_chat_threads
DROP TRIGGER IF EXISTS "admin_chat_threads_update_timestamp" ON "tenant_admin"."admin_chat_threads";
DROP TRIGGER IF EXISTS "admin_chat_threads_prevent_tenant_mutation" ON "tenant_admin"."admin_chat_threads";

-- Drop RLS policies for admin_chat_participants
DROP POLICY IF EXISTS "admin_chat_participants_select" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_insert" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_update" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_delete" ON "tenant_admin"."admin_chat_participants";
DROP POLICY IF EXISTS "admin_chat_participants_service" ON "tenant_admin"."admin_chat_participants";

-- Disable RLS for admin_chat_participants
ALTER TABLE "tenant_admin"."admin_chat_participants" DISABLE ROW LEVEL SECURITY;

-- Drop triggers for admin_chat_participants
DROP TRIGGER IF EXISTS "admin_chat_participants_update_timestamp" ON "tenant_admin"."admin_chat_participants";
DROP TRIGGER IF EXISTS "admin_chat_participants_prevent_tenant_mutation" ON "tenant_admin"."admin_chat_participants";

-- Drop RLS policies for admin_chat_messages
DROP POLICY IF EXISTS "admin_chat_messages_select" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_insert" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_update" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_delete" ON "tenant_admin"."admin_chat_messages";
DROP POLICY IF EXISTS "admin_chat_messages_service" ON "tenant_admin"."admin_chat_messages";

-- Disable RLS for admin_chat_messages
ALTER TABLE "tenant_admin"."admin_chat_messages" DISABLE ROW LEVEL SECURITY;

-- Drop triggers for admin_chat_messages
DROP TRIGGER IF EXISTS "admin_chat_messages_update_timestamp" ON "tenant_admin"."admin_chat_messages";
DROP TRIGGER IF EXISTS "admin_chat_messages_prevent_tenant_mutation" ON "tenant_admin"."admin_chat_messages";
