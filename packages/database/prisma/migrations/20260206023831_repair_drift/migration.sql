CREATE TABLE IF NOT EXISTS "tenant_admin"."admin_chat_threads" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_type" TEXT NOT NULL,
    "slug" TEXT,
    "direct_key" TEXT,
    "created_by" UUID,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_threads_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."admin_chat_participants" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "archived_at" TIMESTAMPTZ(6),
    "cleared_at" TIMESTAMPTZ(6),
    "last_read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_participants_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."admin_chat_messages" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_chat_messages_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "admin_chat_thread_type_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id", "thread_type");

CREATE INDEX IF NOT EXISTS "admin_chat_thread_last_message_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id", "last_message_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_chat_thread_slug_unique" ON "tenant_admin"."admin_chat_threads"("tenant_id", "slug");

CREATE UNIQUE INDEX IF NOT EXISTS "admin_chat_thread_direct_key_unique" ON "tenant_admin"."admin_chat_threads"("tenant_id", "direct_key");

CREATE INDEX IF NOT EXISTS "admin_chat_participant_user_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "user_id");

CREATE INDEX IF NOT EXISTS "admin_chat_participant_thread_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "thread_id");

CREATE INDEX IF NOT EXISTS "admin_chat_participant_archived_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "archived_at");

CREATE UNIQUE INDEX IF NOT EXISTS "admin_chat_participant_unique" ON "tenant_admin"."admin_chat_participants"("tenant_id", "thread_id", "user_id");

CREATE INDEX IF NOT EXISTS "admin_chat_message_thread_created_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id", "thread_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "admin_chat_message_author_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id", "author_id");

CREATE INDEX IF NOT EXISTS "admin_chat_message_active_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id", "thread_id", "deleted_at");

CREATE INDEX IF NOT EXISTS "admin_chat_threads_active_idx" ON "tenant_admin"."admin_chat_threads"("tenant_id", "deleted_at") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "admin_chat_participants_active_idx" ON "tenant_admin"."admin_chat_participants"("tenant_id", "deleted_at") WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "admin_chat_messages_active_only_idx" ON "tenant_admin"."admin_chat_messages"("tenant_id", "deleted_at") WHERE "deleted_at" IS NULL;

-- RLS Policies for admin_chat_threads
ALTER TABLE "tenant_admin"."admin_chat_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."admin_chat_threads" FORCE ROW LEVEL SECURITY;

CREATE POLICY "admin_chat_threads_select" ON "tenant_admin"."admin_chat_threads"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "admin_chat_threads_insert" ON "tenant_admin"."admin_chat_threads"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "admin_chat_threads_update" ON "tenant_admin"."admin_chat_threads"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "admin_chat_threads_delete" ON "tenant_admin"."admin_chat_threads"
    FOR DELETE USING (false);

CREATE POLICY "admin_chat_threads_service" ON "tenant_admin"."admin_chat_threads"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for admin_chat_participants
ALTER TABLE "tenant_admin"."admin_chat_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."admin_chat_participants" FORCE ROW LEVEL SECURITY;

CREATE POLICY "admin_chat_participants_select" ON "tenant_admin"."admin_chat_participants"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "admin_chat_participants_insert" ON "tenant_admin"."admin_chat_participants"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "admin_chat_participants_update" ON "tenant_admin"."admin_chat_participants"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "admin_chat_participants_delete" ON "tenant_admin"."admin_chat_participants"
    FOR DELETE USING (false);

CREATE POLICY "admin_chat_participants_service" ON "tenant_admin"."admin_chat_participants"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for admin_chat_messages
ALTER TABLE "tenant_admin"."admin_chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_admin"."admin_chat_messages" FORCE ROW LEVEL SECURITY;

CREATE POLICY "admin_chat_messages_select" ON "tenant_admin"."admin_chat_messages"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "admin_chat_messages_insert" ON "tenant_admin"."admin_chat_messages"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "admin_chat_messages_update" ON "tenant_admin"."admin_chat_messages"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "admin_chat_messages_delete" ON "tenant_admin"."admin_chat_messages"
    FOR DELETE USING (false);

CREATE POLICY "admin_chat_messages_service" ON "tenant_admin"."admin_chat_messages"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for admin_chat_threads
CREATE TRIGGER "admin_chat_threads_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_threads"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "admin_chat_threads_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_threads"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- Triggers for admin_chat_participants
CREATE TRIGGER "admin_chat_participants_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_participants"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "admin_chat_participants_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_participants"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- Triggers for admin_chat_messages
CREATE TRIGGER "admin_chat_messages_update_timestamp"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_messages"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "admin_chat_messages_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_admin"."admin_chat_messages"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
