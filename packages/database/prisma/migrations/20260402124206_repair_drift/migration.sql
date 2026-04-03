ALTER TABLE "tenant_inventory"."inventory_suppliers" ADD COLUMN IF NOT EXISTS "connector_credentials" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "connector_type" TEXT;

CREATE TABLE IF NOT EXISTS "tenant_inventory"."supplier_sync_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "products_synced" INTEGER NOT NULL DEFAULT 0,
    "products_created" INTEGER NOT NULL DEFAULT 0,
    "products_updated" INTEGER NOT NULL DEFAULT 0,
    "products_deactivated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "supplier_sync_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."provider_syncs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMPTZ(6),
    "calendar_id" TEXT,
    "calendar_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_sync_at" TIMESTAMPTZ(6),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "syncDirection" TEXT NOT NULL DEFAULT 'import',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "provider_syncs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "supplier_sync_logs_tenant_supplier_idx" ON "tenant_inventory"."supplier_sync_logs"("tenant_id", "supplier_id");

CREATE INDEX IF NOT EXISTS "supplier_sync_logs_connector_idx" ON "tenant_inventory"."supplier_sync_logs"("connector_id");

CREATE INDEX IF NOT EXISTS "supplier_sync_logs_status_idx" ON "tenant_inventory"."supplier_sync_logs"("status");

CREATE INDEX IF NOT EXISTS "supplier_sync_logs_created_at_idx" ON "tenant_inventory"."supplier_sync_logs"("created_at");

CREATE INDEX IF NOT EXISTS "provider_syncs_tenant_id_status_idx" ON "tenant_admin"."provider_syncs"("tenant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "provider_syncs_tenant_id_provider_key" ON "tenant_admin"."provider_syncs"("tenant_id", "provider");;
