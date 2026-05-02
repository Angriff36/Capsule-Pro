ALTER TABLE "tenant_events"."event_guests" ALTER COLUMN "rsvp_status" SET NOT NULL,
ALTER COLUMN "rsvp_status" SET DATA TYPE TEXT;

CREATE TABLE IF NOT EXISTS "tenant_inventory"."vendor_catalogs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "item_number" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "base_unit_cost" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unit_of_measure" TEXT NOT NULL,
    "lead_time_days" INTEGER,
    "lead_time_min_days" INTEGER,
    "lead_time_max_days" INTEGER,
    "minimum_order_quantity" DECIMAL(12,3),
    "order_multiple" DECIMAL(12,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "supplier_sku" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "last_cost_update" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_catalogs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "vendor_catalogs_tenant_id_supplier_id_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id");

CREATE INDEX IF NOT EXISTS "vendor_catalogs_tenant_id_item_number_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "item_number");

CREATE INDEX IF NOT EXISTS "vendor_catalogs_tenant_id_category_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_catalogs_tenant_id_supplier_id_item_number_key" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id", "item_number");

CREATE INDEX IF NOT EXISTS "event_guests_event_id_waitlist_position_idx" ON "tenant_events"."event_guests"("event_id", "waitlist_position");

CREATE INDEX IF NOT EXISTS "event_guests_event_id_rsvp_status_idx" ON "tenant_events"."event_guests"("event_id", "rsvp_status");;
