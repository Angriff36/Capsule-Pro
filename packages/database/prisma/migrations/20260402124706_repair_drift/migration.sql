ALTER TABLE "tenant_inventory"."inventory_suppliers" ALTER COLUMN "connector_credentials" SET NOT NULL;

ALTER TABLE "tenant_inventory"."supplier_sync_logs" ALTER COLUMN "errors" SET NOT NULL;
