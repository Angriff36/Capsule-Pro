-- AlterTable
ALTER TABLE "tenant"."knowledge_base_entries" ADD COLUMN     "slug" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "tenant_accounting"."payment_refund_attempts" ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "original_gateway_transaction_id" TEXT,
ADD COLUMN     "refund_transaction_id" TEXT;

-- AlterTable
ALTER TABLE "tenant_events"."event_imports" ADD COLUMN     "content" BYTEA;

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfer_items" ADD COLUMN     "received_quantity" DECIMAL(12,3);

-- AlterTable
ALTER TABLE "tenant_inventory"."inventory_transfers" ADD COLUMN     "transfer_number" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "tenant_kitchen"."menus" ADD COLUMN     "is_template" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenant_kitchen"."prep_tasks" ADD COLUMN     "container_id" UUID,
ADD COLUMN     "method_id" UUID,
ADD COLUMN     "recipe_version_id" UUID;
