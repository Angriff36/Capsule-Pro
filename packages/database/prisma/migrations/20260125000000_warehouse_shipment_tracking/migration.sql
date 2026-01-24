-- CreateEnum
CREATE TYPE "public"."ShipmentStatus" AS ENUM ('draft', 'scheduled', 'preparing', 'in_transit', 'delivered', 'returned', 'cancelled');

-- CreateTable
CREATE TABLE "tenant_inventory"."shipments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_number" TEXT NOT NULL,
    "status" "public"."ShipmentStatus" NOT NULL DEFAULT 'draft',
    "event_id" UUID,
    "supplier_id" UUID,
    "location_id" UUID,
    "scheduled_date" TIMESTAMPTZ(6),
    "shipped_date" TIMESTAMPTZ(6),
    "estimated_delivery_date" TIMESTAMPTZ(6),
    "actual_delivery_date" TIMESTAMPTZ(6),
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "shipping_cost" NUMERIC(12,2),
    "total_value" NUMERIC(12,2),
    "tracking_number" TEXT,
    "carrier" TEXT,
    "shipping_method" TEXT,
    "delivered_by" UUID,
    "received_by" TEXT,
    "signature" TEXT,
    "notes" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "tenant_inventory"."shipments"("shipment_number");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tenant_id_id_key" ON "tenant_inventory"."shipments"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "tenant_inventory"."shipments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "shipments_event_idx" ON "tenant_inventory"."shipments"("tenant_id", "event_id");

-- CreateIndex
CREATE INDEX "shipments_supplier_idx" ON "tenant_inventory"."shipments"("tenant_id", "supplier_id");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "tenant_inventory"."shipments"("tracking_number");

-- CreateTable
CREATE TABLE "tenant_inventory"."shipment_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity_shipped" NUMERIC(12,3) NOT NULL DEFAULT 0,
    "quantity_received" NUMERIC(12,3) NOT NULL DEFAULT 0,
    "quantity_damaged" NUMERIC(12,3) NOT NULL DEFAULT 0,
    "unit_id" SMALLINT,
    "unit_cost" NUMERIC(10,4),
    "total_cost" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "condition" TEXT DEFAULT 'good',
    "condition_notes" TEXT,
    "lot_number" TEXT,
    "expiration_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("tenant_id","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_items_tenant_id_id_key" ON "tenant_inventory"."shipment_items"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "shipment_items_shipment_idx" ON "tenant_inventory"."shipment_items"("tenant_id", "shipment_id");

-- CreateIndex
CREATE INDEX "shipment_items_item_idx" ON "tenant_inventory"."shipment_items"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "shipment_items_lot_number_idx" ON "tenant_inventory"."shipment_items"("tenant_id", "lot_number");

-- RLS Policies for shipments
ALTER TABLE "tenant_inventory"."shipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."shipments" FORCE ROW LEVEL SECURITY;

CREATE POLICY "shipments_select" ON "tenant_inventory"."shipments"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "shipments_insert" ON "tenant_inventory"."shipments"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "shipments_update" ON "tenant_inventory"."shipments"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "shipments_delete" ON "tenant_inventory"."shipments"
    FOR DELETE USING (false);

CREATE POLICY "shipments_service" ON "tenant_inventory"."shipments"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for shipment_items
ALTER TABLE "tenant_inventory"."shipment_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_inventory"."shipment_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY "shipment_items_select" ON "tenant_inventory"."shipment_items"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

CREATE POLICY "shipment_items_insert" ON "tenant_inventory"."shipment_items"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

CREATE POLICY "shipment_items_update" ON "tenant_inventory"."shipment_items"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

CREATE POLICY "shipment_items_delete" ON "tenant_inventory"."shipment_items"
    FOR DELETE USING (false);

CREATE POLICY "shipment_items_service" ON "tenant_inventory"."shipment_items"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Triggers for shipments
CREATE TRIGGER "shipments_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."shipments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "shipments_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."shipments"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- Triggers for shipment_items
CREATE TRIGGER "shipment_items_update_timestamp"
    BEFORE UPDATE ON "tenant_inventory"."shipment_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();

CREATE TRIGGER "shipment_items_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_inventory"."shipment_items"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();

-- REPLICA IDENTITY for real-time
ALTER TABLE "tenant_inventory"."shipments" REPLICA IDENTITY FULL;

ALTER TABLE "tenant_inventory"."shipment_items" REPLICA IDENTITY FULL;
