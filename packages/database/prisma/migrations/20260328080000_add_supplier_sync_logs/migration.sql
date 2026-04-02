-- CreateTable: supplier_sync_logs
-- Tracks catalog synchronization events between external suppliers and internal VendorCatalog

CREATE TABLE "tenant_inventory"."supplier_sync_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "connector_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "products_synced" INTEGER NOT NULL DEFAULT 0,
    "products_created" INTEGER NOT NULL DEFAULT 0,
    "products_updated" INTEGER NOT NULL DEFAULT 0,
    "products_deactivated" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB DEFAULT '[]'::jsonb,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "supplier_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key to inventory_suppliers
ALTER TABLE "tenant_inventory"."supplier_sync_logs"
    ADD CONSTRAINT "supplier_sync_logs_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "tenant_inventory"."inventory_suppliers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for querying sync history
CREATE INDEX "supplier_sync_logs_tenant_supplier_idx" ON "tenant_inventory"."supplier_sync_logs"("tenant_id", "supplier_id");
CREATE INDEX "supplier_sync_logs_connector_idx" ON "tenant_inventory"."supplier_sync_logs"("connector_id");
CREATE INDEX "supplier_sync_logs_status_idx" ON "tenant_inventory"."supplier_sync_logs"("status");
CREATE INDEX "supplier_sync_logs_created_at_idx" ON "tenant_inventory"."supplier_sync_logs"("created_at");

-- Add connector_type and connector_credentials columns to inventory_suppliers
-- for storing per-supplier integration configuration
ALTER TABLE "tenant_inventory"."inventory_suppliers"
    ADD COLUMN IF NOT EXISTS "connector_type" TEXT,
    ADD COLUMN IF NOT EXISTS "connector_credentials" JSONB DEFAULT '{}'::jsonb;
