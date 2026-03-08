DROP INDEX IF EXISTS "tenant_admin"."rate_limit_config_priority_idx";

DROP INDEX IF EXISTS "tenant_admin"."rate_limit_events_timestamp_idx";

DROP INDEX IF EXISTS "tenant_admin"."rate_limit_usage_time_idx";

DROP INDEX IF EXISTS "tenant_events"."command_boards_is_template_idx";

DROP INDEX IF EXISTS "tenant_events"."command_boards_share_id_idx";

DROP INDEX IF EXISTS "tenant_events"."command_boards_share_id_key";

DROP INDEX IF EXISTS "tenant_events"."event_contracts_tenant_id_auto_renew_enabled_idx";

DROP INDEX IF EXISTS "tenant_events"."event_contracts_tenant_id_compliance_status_idx";

DROP INDEX IF EXISTS "tenant_events"."event_contracts_tenant_id_last_compliance_check_idx";

DROP INDEX IF EXISTS "tenant_inventory"."bulk_order_rules_id_key";

DROP INDEX IF EXISTS "tenant_inventory"."bulk_order_rules_tenant_id_id_key";

DROP INDEX IF EXISTS "tenant_inventory"."pricing_tiers_id_key";

DROP INDEX IF EXISTS "tenant_inventory"."pricing_tiers_tenant_id_id_key";

ALTER TABLE "tenant_admin"."rate_limit_configs" ALTER COLUMN "burst_allowance" DROP NOT NULL,
ALTER COLUMN "burst_allowance" DROP DEFAULT;

ALTER TABLE "tenant_admin"."rate_limit_events" ALTER COLUMN "response_time" SET DATA TYPE INTEGER;

ALTER TABLE "tenant_admin"."rate_limit_usage" ALTER COLUMN "request_count" SET DEFAULT 0,
ALTER COLUMN "avg_response_time" SET DATA TYPE INTEGER,
ALTER COLUMN "max_response_time" SET DATA TYPE INTEGER;

ALTER TABLE "tenant_inventory"."bulk_order_rules" ALTER COLUMN "minimum_quantity" DROP DEFAULT,
ALTER COLUMN "threshold_quantity" DROP NOT NULL,
ALTER COLUMN "threshold_quantity" DROP DEFAULT,
ALTER COLUMN "discount_percent" DROP NOT NULL,
ALTER COLUMN "discount_percent" DROP DEFAULT,
ALTER COLUMN "free_item_quantity" DROP NOT NULL,
ALTER COLUMN "free_item_quantity" DROP DEFAULT,
ALTER COLUMN "shipping_included" SET DEFAULT false;

ALTER TABLE "tenant_inventory"."pricing_tiers" ALTER COLUMN "min_quantity" DROP DEFAULT,
ALTER COLUMN "unit_cost" DROP DEFAULT,
ALTER COLUMN "discount_percent" DROP NOT NULL,
ALTER COLUMN "discount_percent" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "tenant_admin"."webhook_dead_letter_queue" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID,
    "original_delivery_id" UUID NOT NULL,
    "eventType" "tenant_admin"."webhook_event_type" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "final_error_message" TEXT,
    "total_attempts" INTEGER NOT NULL DEFAULT 1,
    "original_url" VARCHAR(2048) NOT NULL,
    "moved_to_dlq_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "retried_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_dead_letter_queue_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "platform"."api_keys" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "hashed_key" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."manifest_command_telemetry" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "command_name" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "instance_id" UUID,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_code" TEXT,
    "duration_ms" INTEGER,
    "guard_eval_ms" INTEGER,
    "action_exec_ms" INTEGER,
    "guards_evaluated" INTEGER DEFAULT 0,
    "guards_passed" INTEGER DEFAULT 0,
    "guards_failed" INTEGER DEFAULT 0,
    "failed_guards" JSONB,
    "idempotency_key" TEXT,
    "was_idempotent_hit" BOOLEAN NOT NULL DEFAULT false,
    "events_emitted" INTEGER DEFAULT 0,
    "performed_by" UUID,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_command_telemetry_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_staff"."role_policies" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "role_name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_policies_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."vendor_catalog" (
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

    CONSTRAINT "vendor_catalog_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "webhook_dead_letter_queue_tenant_id_webhook_id_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "webhook_id");

CREATE INDEX IF NOT EXISTS "webhook_dead_letter_queue_tenant_id_entity_type_entity_id_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "webhook_dead_letter_queue_tenant_id_moved_to_dlq_at_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "moved_to_dlq_at" DESC);

CREATE INDEX IF NOT EXISTS "webhook_dead_letter_queue_tenant_id_reviewed_at_idx" ON "tenant_admin"."webhook_dead_letter_queue"("tenant_id", "reviewed_at");

CREATE INDEX IF NOT EXISTS "api_keys_tenant_id_key_prefix_idx" ON "platform"."api_keys"("tenant_id", "key_prefix");

CREATE INDEX IF NOT EXISTS "api_keys_tenant_id_created_by_user_id_idx" ON "platform"."api_keys"("tenant_id", "created_by_user_id");

CREATE INDEX IF NOT EXISTS "api_keys_tenant_id_expires_at_idx" ON "platform"."api_keys"("tenant_id", "expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_tenant_id_name_key" ON "platform"."api_keys"("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_command_name_executed__idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "command_name", "executed_at");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_entity_name_executed_a_idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "entity_name", "executed_at");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_status_executed_at_idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "status", "executed_at");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_performed_by_executed__idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "performed_by", "executed_at");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_correlation_id_idx" ON "tenant_admin"."manifest_command_telemetry"("tenant_id", "correlation_id");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_executed_at_idx" ON "tenant_admin"."manifest_command_telemetry"("executed_at");

CREATE INDEX IF NOT EXISTS "role_policies_tenant_id_is_active_idx" ON "tenant_staff"."role_policies"("tenant_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "role_policies_tenant_id_role_id_key" ON "tenant_staff"."role_policies"("tenant_id", "role_id");

CREATE INDEX IF NOT EXISTS "vendor_catalog_tenant_id_supplier_id_idx" ON "tenant_inventory"."vendor_catalog"("tenant_id", "supplier_id");

CREATE INDEX IF NOT EXISTS "vendor_catalog_tenant_id_item_number_idx" ON "tenant_inventory"."vendor_catalog"("tenant_id", "item_number");

CREATE INDEX IF NOT EXISTS "vendor_catalog_tenant_id_category_idx" ON "tenant_inventory"."vendor_catalog"("tenant_id", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_catalog_tenant_id_supplier_id_item_number_key" ON "tenant_inventory"."vendor_catalog"("tenant_id", "supplier_id", "item_number");

CREATE INDEX IF NOT EXISTS "rate_limit_configs_tenant_id_priority_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "priority");

CREATE INDEX IF NOT EXISTS "rate_limit_events_tenant_id_timestamp_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "timestamp");

CREATE INDEX IF NOT EXISTS "rate_limit_usage_tenant_id_bucket_start_idx" ON "tenant_admin"."rate_limit_usage"("tenant_id", "bucket_start");
