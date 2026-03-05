-- Ensure schemas exist
CREATE SCHEMA IF NOT EXISTS "tenant_accounting";
CREATE SCHEMA IF NOT EXISTS "tenant_facility";

-- Create missing enum types before table creation
DO $$ BEGIN
  CREATE TYPE "core"."InterLocationTransferStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'scheduled', 'in_transit', 'received', 'partially_received', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tenant_events"."command_boards" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "share_id" TEXT;

ALTER TABLE "tenant_events"."event_contracts" ADD COLUMN IF NOT EXISTS "auto_renew_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "compliance_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "contract_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_compliance_check" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "payment_terms" TEXT,
ADD COLUMN IF NOT EXISTS "renewal_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "renewal_term_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "special_terms" TEXT;

ALTER TABLE "tenant_kitchen"."ingredients" ADD COLUMN IF NOT EXISTS "calories_per_100g" INTEGER,
ADD COLUMN IF NOT EXISTS "carbohydrates_per_100g" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "cholesterol_per_100mg" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "fat_per_100g" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "fiber_per_100g" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "protein_per_100g" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "sodium_per_100mg" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "sugar_per_100g" DECIMAL(10,2);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."equipment" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'active',
    "serial_number" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "purchase_date" DATE,
    "warranty_expiry" DATE,
    "last_maintenance_date" DATE,
    "next_maintenance_date" DATE,
    "maintenance_interval_days" INTEGER NOT NULL DEFAULT 90,
    "usage_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_usage_hours" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "iot_device_id" TEXT,
    "iot_device_type" TEXT,
    "connection_status" TEXT NOT NULL DEFAULT 'disconnected',
    "last_heartbeat" TIMESTAMPTZ(6),
    "current_sensor_data" JSONB
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."work_orders" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "equipment_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'repair',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT,
    "assigned_to" UUID,
    "estimated_cost" DOUBLE PRECISION,
    "actual_cost" DOUBLE PRECISION DEFAULT 0,
    "scheduled_date" TIMESTAMPTZ(6),
    "completed_date" TIMESTAMPTZ(6),
    "parts_used" TEXT,
    "vendor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."vendor_catalogs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "item_number" TEXT NOT NULL,
    "item_name" TEXT,
    "description" TEXT,
    "category" TEXT,
    "base_unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "unit_of_measure" TEXT NOT NULL DEFAULT 'each',
    "lead_time_days" INTEGER NOT NULL DEFAULT 0,
    "lead_time_min_days" INTEGER NOT NULL DEFAULT 0,
    "lead_time_max_days" INTEGER NOT NULL DEFAULT 0,
    "minimum_order_quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "order_multiple" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "supplier_sku" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_cost_update" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_catalogs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."pricing_tiers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_entry_id" UUID NOT NULL,
    "tier_name" TEXT NOT NULL,
    "min_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "max_quantity" DECIMAL(12,3),
    "unit_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."bulk_order_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_entry_id" UUID NOT NULL,
    "rule_name" TEXT NOT NULL,
    "minimum_quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "rule_type" TEXT NOT NULL,
    "threshold_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "action" TEXT NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "free_item_quantity" INTEGER NOT NULL DEFAULT 0,
    "shipping_included" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMPTZ(6),
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bulk_order_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."purchase_requisitions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requisition_number" TEXT NOT NULL,
    "requested_by" UUID NOT NULL,
    "request_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "required_by" DATE,
    "location_id" UUID,
    "department" TEXT,
    "justification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "manager_approval_by" UUID,
    "manager_approval_at" TIMESTAMPTZ(6),
    "finance_approval_by" UUID,
    "finance_approval_at" TIMESTAMPTZ(6),
    "converted_to_po_id" UUID,
    "converted_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "submitted_at" TIMESTAMPTZ(6),
    "item_category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."purchase_requisition_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requisition_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "item_name" TEXT,
    "quantity_requested" DECIMAL(10,2) NOT NULL,
    "unit_id" SMALLINT,
    "estimated_unit_cost" DECIMAL(10,4) NOT NULL,
    "estimated_total_cost" DECIMAL(12,2) NOT NULL,
    "suggested_vendor_id" UUID,
    "suggested_vendor_name" TEXT,
    "specifications" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_requisition_items_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."vendor_contracts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_number" TEXT NOT NULL,
    "vendor_id" UUID NOT NULL,
    "vendor_name" TEXT,
    "contract_type" TEXT NOT NULL DEFAULT 'purchase',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "renewal_term_days" SMALLINT NOT NULL DEFAULT 365,
    "notice_days_before_renewal" SMALLINT NOT NULL DEFAULT 30,
    "payment_terms" TEXT NOT NULL DEFAULT 'NET_30',
    "delivery_terms" TEXT,
    "minimum_order_quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "annual_spend_commitment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "spend_to_period" DATE,
    "currency_code" TEXT NOT NULL DEFAULT 'USD',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "terminated_by" UUID,
    "terminated_at" TIMESTAMPTZ(6),
    "termination_reason" TEXT,
    "contract_url" TEXT,
    "notes" TEXT,
    "compliance_score" SMALLINT NOT NULL DEFAULT 100,
    "last_compliance_review" TIMESTAMPTZ(6),
    "sla_breach_count" INTEGER NOT NULL DEFAULT 0,
    "on_time_delivery_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "quality_rating" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vendor_contracts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."inter_location_transfers" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_number" TEXT NOT NULL,
    "status" "core"."InterLocationTransferStatus" NOT NULL DEFAULT 'draft',
    "from_location_id" UUID NOT NULL,
    "to_location_id" UUID NOT NULL,
    "scheduled_date" TIMESTAMPTZ(6),
    "shipped_date" TIMESTAMPTZ(6),
    "received_date" TIMESTAMPTZ(6),
    "requested_by" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "reason" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inter_location_transfers_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_inventory"."inter_location_transfer_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity_requested" DECIMAL(12,3) NOT NULL,
    "quantity_shipped" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantity_received" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit_id" SMALLINT,
    "unit_cost" DECIMAL(10,4) DEFAULT 0,
    "condition" TEXT DEFAULT 'good',
    "condition_notes" TEXT,
    "lot_number" TEXT,
    "expiration_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "inter_location_transfer_items_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant"."location_resource_shares" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "share_with_all" BOOLEAN NOT NULL DEFAULT false,
    "shared_with_location_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_fork" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "location_resource_shares_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."role_policies" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "role_name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_policies_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."activity_feed" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "performed_by" UUID,
    "performer_name" TEXT,
    "correlation_id" UUID,
    "parent_id" UUID,
    "source_type" TEXT,
    "source_id" UUID,
    "importance" TEXT NOT NULL DEFAULT 'normal',
    "visibility" TEXT NOT NULL DEFAULT 'all',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."sensor_readings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "sensor_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "correlation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."iot_alert_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sensor_type" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "threshold_min" DOUBLE PRECISION,
    "threshold_max" DOUBLE PRECISION,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "alert_action" TEXT NOT NULL DEFAULT 'notification',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notify_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notify_channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "iot_alert_rules_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."iot_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "alert_rule_id" UUID,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reading_value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ(6),
    "acknowledged_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "notes" TEXT,
    "requires_haccp_action" BOOLEAN NOT NULL DEFAULT false,
    "haccp_action_taken" TEXT,
    "corrective_action_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "iot_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."food_safety_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "log_type" TEXT NOT NULL,
    "log_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DOUBLE PRECISION,
    "target_temp_min" DOUBLE PRECISION,
    "target_temp_max" DOUBLE PRECISION,
    "is_in_safe_zone" BOOLEAN NOT NULL DEFAULT true,
    "logged_by" UUID NOT NULL,
    "verified_by" UUID,
    "requires_action" BOOLEAN NOT NULL DEFAULT false,
    "action_taken" TEXT,
    "iot_generated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_safety_logs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant"."manifest_command_telemetry" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "command_name" TEXT NOT NULL,
    "entity_name" TEXT,
    "instance_id" UUID,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_code" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "guard_eval_ms" INTEGER,
    "action_exec_ms" INTEGER,
    "guards_evaluated" INTEGER NOT NULL DEFAULT 0,
    "guards_passed" INTEGER NOT NULL DEFAULT 0,
    "guards_failed" INTEGER NOT NULL DEFAULT 0,
    "failed_guards" JSONB,
    "idempotency_key" TEXT,
    "was_idempotent_hit" BOOLEAN,
    "events_emitted" INTEGER NOT NULL DEFAULT 0,
    "performed_by" UUID,
    "correlation_id" UUID,
    "causation_id" UUID,
    "request_id" TEXT,
    "ip_address" INET,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifest_command_telemetry_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."api_keys" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "hashed_key" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."rate_limit_configs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "endpoint_pattern" TEXT NOT NULL,
    "window_ms" INTEGER NOT NULL,
    "max_requests" INTEGER NOT NULL,
    "burst_allowance" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rate_limit_configs_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."rate_limit_usage" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "bucket_start" TIMESTAMPTZ(6) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 1,
    "blocked_count" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" DOUBLE PRECISION,
    "max_response_time" DOUBLE PRECISION,
    "user_hashes" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_usage_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."rate_limit_events" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "requests_in_window" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "user_id" UUID,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "response_time" DOUBLE PRECISION,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_workspaces" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "share_token" TEXT,
    "layout_config" JSONB,
    "filter_config" JSONB,
    "created_by" UUID,
    "last_accessed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_workspaces_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_workspace_members" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_read_at" TIMESTAMPTZ(6),
    "notify_on_task" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_chat" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_doc" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_workspace_members_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_workspace_tasks" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigned_to_tenant_id" UUID,
    "assigned_to" UUID,
    "due_date" TIMESTAMPTZ(6),
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "linked_entity_type" TEXT,
    "linked_entity_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_tenant_id" UUID,
    "created_by" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_workspace_tasks_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_workspace_task_comments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "version" INTEGER NOT NULL DEFAULT 1,
    "author_id" UUID NOT NULL,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_workspace_task_comments_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_events"."event_workspace_documents" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'text/markdown',
    "content" TEXT,
    "storage_url" TEXT,
    "storage_key" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_version_id" UUID,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "created_by_tenant_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "event_workspace_documents_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."payments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method_type" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "client_id" UUID,
    "gateway_transaction_id" TEXT,
    "gateway_payment_method_id" TEXT,
    "processor" TEXT,
    "processor_response_code" TEXT,
    "processor_response_message" TEXT,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "chargeback_at" TIMESTAMPTZ(6),
    "fraud_status" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "fraud_score" DECIMAL(5,2),
    "fraud_reasons" TEXT[],
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "description" TEXT,
    "external_reference" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "original_payment_id" UUID,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."invoices" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_number" TEXT NOT NULL,
    "invoice_type" TEXT NOT NULL DEFAULT 'FINAL_PAYMENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "client_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "deposit_percentage" DECIMAL(5,2),
    "deposit_required" DECIMAL(12,2),
    "deposit_paid" DECIMAL(12,2),
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "viewed_at" TIMESTAMPTZ(6),
    "overdue_since" TIMESTAMPTZ(6),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "last_reminder_at" TIMESTAMPTZ(6),
    "quickbooks_id" TEXT,
    "goodshuffle_id" TEXT,
    "external_sync_status" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "line_items" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."payment_methods" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "external_method_id" TEXT,
    "type" TEXT NOT NULL,
    "card_last_four" TEXT,
    "card_network" TEXT,
    "card_expiry_month" INTEGER,
    "card_expiry_year" INTEGER,
    "card_holder_name" TEXT,
    "bank_account_last_four" TEXT,
    "bank_account_type" TEXT,
    "bank_routing_number" TEXT,
    "wallet_provider" TEXT,
    "wallet_email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "fraud_flagged" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "verification_method" TEXT,
    "nickname" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."payment_reconciliations" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "gateway_transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'AUTO',
    "reconciliation_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_amount" DECIMAL(12,2),
    "actual_amount" DECIMAL(12,2),
    "discrepancy_amount" DECIMAL(10,2),
    "discrepancy_reason" TEXT,
    "gateway_raw_data" JSONB,
    "gateway_processor" TEXT,
    "gateway_fee_amount" DECIMAL(10,2),
    "gateway_net_amount" DECIMAL(12,2),
    "matched_by" TEXT,
    "matched_at" TIMESTAMPTZ(6),
    "confidence_score" DECIMAL(3,2),
    "review_required" BOOLEAN NOT NULL DEFAULT false,
    "review_reason" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_notes" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_action" TEXT,
    "resolution_notes" TEXT,
    "batch_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_reconciliations_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_facility"."facility_spaces" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "capacity" INTEGER,
    "area" DOUBLE PRECISION,
    "floor" TEXT,
    "section" TEXT,
    "amenities" TEXT[],
    "features" JSONB,
    "is_bookable" BOOLEAN NOT NULL DEFAULT true,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "min_booking_hours" INTEGER NOT NULL DEFAULT 1,
    "max_booking_hours" INTEGER NOT NULL DEFAULT 24,
    "lead_time_hours" INTEGER NOT NULL DEFAULT 0,
    "operationalHours" JSONB,
    "unavailableDates" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "tenant_facility"."facility_bookings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "space_id" UUID NOT NULL,
    "space_name" TEXT NOT NULL,
    "booked_for" UUID NOT NULL,
    "booked_for_name" TEXT NOT NULL,
    "booked_for_email" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "bookingType" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "duration" INTEGER,
    "recurrence" JSONB,
    "expected_attendees" INTEGER,
    "actual_attendees" INTEGER,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "checked_in_at" TIMESTAMPTZ(6),
    "checked_in_by" UUID,
    "checked_out_at" TIMESTAMPTZ(6),
    "checked_out_by" UUID,
    "event_id" UUID,
    "event_type" TEXT,
    "cost" DOUBLE PRECISION,
    "cost_center" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "tenant_facility"."utility_meters" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "space_id" UUID,
    "meter_type" TEXT NOT NULL,
    "utility_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serial_number" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kWh',
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "install_date" DATE,
    "install_location" TEXT,
    "service_account" TEXT,
    "utility_provider" TEXT,
    "rate_schedule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "tenant_facility"."utility_readings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "meter_id" UUID NOT NULL,
    "meter_name" TEXT NOT NULL,
    "reading_date" DATE NOT NULL,
    "reading_value" DOUBLE PRECISION NOT NULL,
    "previous_value" DOUBLE PRECISION,
    "usage" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "readingType" TEXT NOT NULL DEFAULT 'actual',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "read_by" UUID,
    "is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "estimated_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6)
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."quality_checklists" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "checklist_data" JSONB NOT NULL DEFAULT '{}',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "quality_checklists_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."quality_checklist_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklist_id" UUID NOT NULL,
    "item_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "pass_criteria" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "quality_checklist_items_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."quality_inspections" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "inspection_number" TEXT NOT NULL,
    "inspection_name" TEXT NOT NULL,
    "inspection_type" TEXT NOT NULL DEFAULT 'routine',
    "scheduled_date" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "inspection_data" JSONB NOT NULL DEFAULT '{}',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "passed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "skipped_items" INTEGER NOT NULL DEFAULT 0,
    "pass_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assigned_to_id" UUID,
    "inspected_by_id" UUID,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."quality_inspection_items" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_id" UUID NOT NULL,
    "checklist_item_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_value" TEXT,
    "numeric_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "temperature_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photo_url" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_corrective_action_required" BOOLEAN NOT NULL DEFAULT false,
    "corrective_action_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "quality_inspection_items_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."corrective_actions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "action_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT 'other',
    "source_entity" TEXT,
    "source_entity_id" UUID,
    "source_inspection_item_id" UUID,
    "assigned_to_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "due_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "prevention_notes" TEXT,
    "cost_estimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."quality_reports" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "report_number" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "report_period_start" TIMESTAMPTZ(6) NOT NULL,
    "report_period_end" TIMESTAMPTZ(6) NOT NULL,
    "report_data" JSONB NOT NULL DEFAULT '{}',
    "total_inspections" INTEGER NOT NULL DEFAULT 0,
    "passed_inspections" INTEGER NOT NULL DEFAULT 0,
    "failed_inspections" INTEGER NOT NULL DEFAULT 0,
    "overall_pass_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "open_corrective_actions" INTEGER NOT NULL DEFAULT 0,
    "closed_corrective_actions" INTEGER NOT NULL DEFAULT 0,
    "critical_issues" INTEGER NOT NULL DEFAULT 0,
    "generated_by_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "quality_reports_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."knowledge_entries" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty_level" TEXT,
    "related_recipe_id" TEXT,
    "related_equipment" TEXT,
    "related_event_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "search_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "not_helpful_count" INTEGER NOT NULL DEFAULT 0,
    "author_id" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "approved_by" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."knowledge_versions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "change_reason" TEXT,
    "change_type" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_versions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."knowledge_attachments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(255),
    "description" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_attachments_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_kitchen"."knowledge_feedback" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "was_helpful" BOOLEAN NOT NULL,
    "comment" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_feedback_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."revenue_recognition_schedules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "contract_id" UUID,
    "client_id" UUID NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "recognized_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "recognition_period" INTEGER,
    "service_start_date" TIMESTAMPTZ(6),
    "service_end_date" TIMESTAMPTZ(6),
    "total_milestones" INTEGER NOT NULL DEFAULT 0,
    "completed_milestones" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "revenue_recognition_schedules_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."revenue_recognition_lines" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL,
    "recognized_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMPTZ(6) NOT NULL,
    "recognized_at" TIMESTAMPTZ(6),
    "milestone_id" UUID,
    "milestone_name" TEXT,
    "milestone_description" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "revenue_recognition_lines_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."collection_cases" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "original_amount" DECIMAL(12,2) NOT NULL,
    "outstanding_amount" DECIMAL(12,2) NOT NULL,
    "collected_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dunning_stage" TEXT NOT NULL DEFAULT 'CURRENT',
    "days_overdue" INTEGER NOT NULL DEFAULT 0,
    "aging_bucket" TEXT,
    "assigned_to" UUID,
    "assigned_at" TIMESTAMPTZ(6),
    "has_payment_plan" BOOLEAN NOT NULL DEFAULT false,
    "payment_plan_id" UUID,
    "next_payment_due" TIMESTAMPTZ(6),
    "is_disputed" BOOLEAN NOT NULL DEFAULT false,
    "dispute_reason" TEXT,
    "dispute_resolved_at" TIMESTAMPTZ(6),
    "is_escalated_to_legal" BOOLEAN NOT NULL DEFAULT false,
    "legal_case_number" TEXT,
    "legal_firm" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "last_activity_at" TIMESTAMPTZ(6),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "collection_cases_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."collection_actions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "contacted_by" UUID,
    "contact_name" TEXT,
    "contact_method" TEXT,
    "subject" TEXT,
    "description" TEXT,
    "outcome" TEXT,
    "next_action_date" TIMESTAMPTZ(6),
    "promise_amount" DECIMAL(12,2),
    "promise_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_actions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."collection_payment_plans" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "installment_amount" DECIMAL(12,2) NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "completed_installments" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "frequency" TEXT,
    "next_payment_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "defaulted_at" TIMESTAMPTZ(6),

    CONSTRAINT "collection_payment_plans_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."versioned_entities" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_name" TEXT NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMPTZ(6),
    "locked_by" UUID,
    "current_version_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "versioned_entities_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."entity_versions" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versioned_entity_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "change_reason" TEXT,
    "change_summary" TEXT,
    "change_type" TEXT NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "entity_versions_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_admin"."version_approvals" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_version_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "comments" TEXT,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "version_approvals_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_location_id_idx" ON "tenant_kitchen"."equipment"("tenant_id", "location_id");

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_status_idx" ON "tenant_kitchen"."equipment"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_next_maintenance_date_idx" ON "tenant_kitchen"."equipment"("tenant_id", "next_maintenance_date");

CREATE INDEX IF NOT EXISTS "equipment_tenant_id_iot_device_id_idx" ON "tenant_kitchen"."equipment"("tenant_id", "iot_device_id");

CREATE UNIQUE INDEX IF NOT EXISTS "equipment_tenant_id_id_key" ON "tenant_kitchen"."equipment"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_equipment_id_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "equipment_id");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_status_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_priority_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "priority");

CREATE INDEX IF NOT EXISTS "work_orders_tenant_id_scheduled_date_idx" ON "tenant_kitchen"."work_orders"("tenant_id", "scheduled_date");

CREATE UNIQUE INDEX IF NOT EXISTS "work_orders_tenant_id_id_key" ON "tenant_kitchen"."work_orders"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_catalogs_id_key" ON "tenant_inventory"."vendor_catalogs"("id");

CREATE INDEX IF NOT EXISTS "vendor_catalogs_tenant_supplier_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id");

CREATE INDEX IF NOT EXISTS "vendor_catalogs_tenant_item_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "item_number");

CREATE INDEX IF NOT EXISTS "vendor_catalogs_tenant_category_idx" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_catalogs_tenant_id_id_key" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_catalogs_tenant_id_supplier_id_item_number_key" ON "tenant_inventory"."vendor_catalogs"("tenant_id", "supplier_id", "item_number");

CREATE UNIQUE INDEX IF NOT EXISTS "pricing_tiers_id_key" ON "tenant_inventory"."pricing_tiers"("id");

CREATE INDEX IF NOT EXISTS "pricing_tiers_tenant_catalog_idx" ON "tenant_inventory"."pricing_tiers"("tenant_id", "catalog_entry_id");

CREATE INDEX IF NOT EXISTS "pricing_tiers_tenant_catalog_qty_idx" ON "tenant_inventory"."pricing_tiers"("tenant_id", "catalog_entry_id", "min_quantity");

CREATE UNIQUE INDEX IF NOT EXISTS "pricing_tiers_tenant_id_id_key" ON "tenant_inventory"."pricing_tiers"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "bulk_order_rules_id_key" ON "tenant_inventory"."bulk_order_rules"("id");

CREATE INDEX IF NOT EXISTS "bulk_order_rules_tenant_catalog_idx" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "catalog_entry_id");

CREATE INDEX IF NOT EXISTS "bulk_order_rules_tenant_type_idx" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "rule_type");

CREATE UNIQUE INDEX IF NOT EXISTS "bulk_order_rules_tenant_id_id_key" ON "tenant_inventory"."bulk_order_rules"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_id_key" ON "tenant_inventory"."purchase_requisitions"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_requisition_number_key" ON "tenant_inventory"."purchase_requisitions"("requisition_number");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_converted_to_po_id_key" ON "tenant_inventory"."purchase_requisitions"("converted_to_po_id");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_status_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_requester_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "requested_by");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_department_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "department");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_tenant_date_idx" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "request_date");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisitions_tenant_id_id_key" ON "tenant_inventory"."purchase_requisitions"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requisition_items_id_key" ON "tenant_inventory"."purchase_requisition_items"("id");

CREATE INDEX IF NOT EXISTS "purchase_requisition_items_tenant_req_idx" ON "tenant_inventory"."purchase_requisition_items"("tenant_id", "requisition_id");

CREATE INDEX IF NOT EXISTS "purchase_requisition_items_tenant_item_idx" ON "tenant_inventory"."purchase_requisition_items"("tenant_id", "item_id");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_contracts_id_key" ON "tenant_inventory"."vendor_contracts"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_contracts_contract_number_key" ON "tenant_inventory"."vendor_contracts"("contract_number");

CREATE INDEX IF NOT EXISTS "vendor_contracts_tenant_vendor_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "vendor_id");

CREATE INDEX IF NOT EXISTS "vendor_contracts_tenant_status_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "vendor_contracts_tenant_end_date_idx" ON "tenant_inventory"."vendor_contracts"("tenant_id", "end_date");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_contracts_tenant_id_id_key" ON "tenant_inventory"."vendor_contracts"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "inter_location_transfers_id_key" ON "tenant_inventory"."inter_location_transfers"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "inter_location_transfers_transfer_number_key" ON "tenant_inventory"."inter_location_transfers"("transfer_number");

CREATE INDEX IF NOT EXISTS "inter_location_transfers_tenant_id_status_idx" ON "tenant_inventory"."inter_location_transfers"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "inter_location_transfers_tenant_id_from_location_id_idx" ON "tenant_inventory"."inter_location_transfers"("tenant_id", "from_location_id");

CREATE INDEX IF NOT EXISTS "inter_location_transfers_tenant_id_to_location_id_idx" ON "tenant_inventory"."inter_location_transfers"("tenant_id", "to_location_id");

CREATE INDEX IF NOT EXISTS "inter_location_transfers_tenant_id_scheduled_date_idx" ON "tenant_inventory"."inter_location_transfers"("tenant_id", "scheduled_date");

CREATE UNIQUE INDEX IF NOT EXISTS "inter_location_transfers_tenant_id_id_key" ON "tenant_inventory"."inter_location_transfers"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "inter_location_transfer_items_tenant_id_transfer_id_idx" ON "tenant_inventory"."inter_location_transfer_items"("tenant_id", "transfer_id");

CREATE INDEX IF NOT EXISTS "inter_location_transfer_items_tenant_id_item_id_idx" ON "tenant_inventory"."inter_location_transfer_items"("tenant_id", "item_id");

CREATE UNIQUE INDEX IF NOT EXISTS "inter_location_transfer_items_tenant_id_id_key" ON "tenant_inventory"."inter_location_transfer_items"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "location_resource_shares_tenant_id_resource_type_idx" ON "tenant"."location_resource_shares"("tenant_id", "resource_type");

CREATE INDEX IF NOT EXISTS "location_resource_shares_tenant_id_share_with_all_idx" ON "tenant"."location_resource_shares"("tenant_id", "share_with_all");

CREATE UNIQUE INDEX IF NOT EXISTS "location_resource_shares_tenant_id_id_key" ON "tenant"."location_resource_shares"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "location_resource_shares_tenant_id_resource_type_resource_i_key" ON "tenant"."location_resource_shares"("tenant_id", "resource_type", "resource_id");

CREATE INDEX IF NOT EXISTS "role_policy_active_idx" ON "tenant_admin"."role_policies"("tenant_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "role_policy_role_unique" ON "tenant_admin"."role_policies"("tenant_id", "role_id");

CREATE INDEX IF NOT EXISTS "activity_feed_created_at_idx" ON "tenant_admin"."activity_feed"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "activity_feed_type_idx" ON "tenant_admin"."activity_feed"("tenant_id", "activity_type", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "activity_feed_entity_idx" ON "tenant_admin"."activity_feed"("tenant_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "activity_feed_performer_idx" ON "tenant_admin"."activity_feed"("tenant_id", "performed_by", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "activity_feed_correlation_idx" ON "tenant_admin"."activity_feed"("tenant_id", "correlation_id");

CREATE INDEX IF NOT EXISTS "sensor_readings_tenant_id_equipment_id_timestamp_idx" ON "tenant_kitchen"."sensor_readings"("tenant_id", "equipment_id", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "sensor_readings_tenant_id_sensor_type_timestamp_idx" ON "tenant_kitchen"."sensor_readings"("tenant_id", "sensor_type", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "sensor_readings_tenant_id_status_timestamp_idx" ON "tenant_kitchen"."sensor_readings"("tenant_id", "status", "timestamp" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "sensor_readings_tenant_id_id_key" ON "tenant_kitchen"."sensor_readings"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "iot_alert_rules_tenant_id_equipment_id_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "equipment_id");

CREATE INDEX IF NOT EXISTS "iot_alert_rules_tenant_id_is_active_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "iot_alert_rules_tenant_id_id_key" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "iot_alerts_tenant_id_equipment_id_status_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "equipment_id", "status");

CREATE INDEX IF NOT EXISTS "iot_alerts_tenant_id_severity_status_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "severity", "status");

CREATE INDEX IF NOT EXISTS "iot_alerts_tenant_id_triggered_at_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "triggered_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "iot_alerts_tenant_id_id_key" ON "tenant_kitchen"."iot_alerts"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "food_safety_logs_tenant_id_equipment_id_log_date_idx" ON "tenant_kitchen"."food_safety_logs"("tenant_id", "equipment_id", "log_date" DESC);

CREATE INDEX IF NOT EXISTS "food_safety_logs_tenant_id_log_type_log_date_idx" ON "tenant_kitchen"."food_safety_logs"("tenant_id", "log_type", "log_date" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "food_safety_logs_tenant_id_id_key" ON "tenant_kitchen"."food_safety_logs"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_command_name_executed__idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "command_name", "executed_at" DESC);

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_entity_name_executed_a_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "entity_name", "executed_at" DESC);

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_status_executed_at_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "status", "executed_at" DESC);

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_performed_by_executed__idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "performed_by", "executed_at" DESC);

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_tenant_id_correlation_id_idx" ON "tenant"."manifest_command_telemetry"("tenant_id", "correlation_id");

CREATE INDEX IF NOT EXISTS "manifest_command_telemetry_executed_at_idx" ON "tenant"."manifest_command_telemetry"("executed_at" DESC);

CREATE INDEX IF NOT EXISTS "api_keys_tenant_prefix_idx" ON "tenant_admin"."api_keys"("tenant_id", "key_prefix");

CREATE INDEX IF NOT EXISTS "api_keys_tenant_status_idx" ON "tenant_admin"."api_keys"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "api_keys_tenant_created_by_idx" ON "tenant_admin"."api_keys"("tenant_id", "created_by_user_id");

CREATE INDEX IF NOT EXISTS "api_keys_tenant_expires_idx" ON "tenant_admin"."api_keys"("tenant_id", "expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_tenant_name_unique" ON "tenant_admin"."api_keys"("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "rate_limit_config_tenant_active_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "is_active");

CREATE INDEX IF NOT EXISTS "rate_limit_config_priority_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "priority" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_config_tenant_name_unique" ON "tenant_admin"."rate_limit_configs"("tenant_id", "name");

CREATE INDEX IF NOT EXISTS "rate_limit_usage_time_idx" ON "tenant_admin"."rate_limit_usage"("tenant_id", "bucket_start" DESC);

CREATE INDEX IF NOT EXISTS "rate_limit_usage_endpoint_idx" ON "tenant_admin"."rate_limit_usage"("tenant_id", "endpoint");

CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_usage_unique_bucket" ON "tenant_admin"."rate_limit_usage"("tenant_id", "endpoint", "method", "bucket_start");

CREATE INDEX IF NOT EXISTS "rate_limit_events_timestamp_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "rate_limit_events_endpoint_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "endpoint");

CREATE INDEX IF NOT EXISTS "rate_limit_events_allowed_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "allowed");

CREATE INDEX IF NOT EXISTS "rate_limit_events_user_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "event_workspaces_share_token_key" ON "tenant_events"."event_workspaces"("share_token");

CREATE INDEX IF NOT EXISTS "event_workspaces_tenant_id_event_id_idx" ON "tenant_events"."event_workspaces"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "event_workspaces_tenant_id_status_idx" ON "tenant_events"."event_workspaces"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "event_workspaces_share_token_idx" ON "tenant_events"."event_workspaces"("share_token");

CREATE UNIQUE INDEX IF NOT EXISTS "event_workspace_tenant_event_unique" ON "tenant_events"."event_workspaces"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "event_workspace_members_tenant_id_workspace_id_idx" ON "tenant_events"."event_workspace_members"("tenant_id", "workspace_id");

CREATE INDEX IF NOT EXISTS "event_workspace_members_tenant_id_user_id_idx" ON "tenant_events"."event_workspace_members"("tenant_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "event_workspace_member_unique" ON "tenant_events"."event_workspace_members"("tenant_id", "workspace_id", "user_id");

CREATE INDEX IF NOT EXISTS "event_workspace_tasks_tenant_id_workspace_id_idx" ON "tenant_events"."event_workspace_tasks"("tenant_id", "workspace_id");

CREATE INDEX IF NOT EXISTS "event_workspace_tasks_tenant_id_workspace_id_status_idx" ON "tenant_events"."event_workspace_tasks"("tenant_id", "workspace_id", "status");

CREATE INDEX IF NOT EXISTS "event_workspace_tasks_tenant_id_assigned_to_idx" ON "tenant_events"."event_workspace_tasks"("tenant_id", "assigned_to");

CREATE INDEX IF NOT EXISTS "event_workspace_tasks_tenant_id_linked_entity_id_idx" ON "tenant_events"."event_workspace_tasks"("tenant_id", "linked_entity_id");

CREATE INDEX IF NOT EXISTS "event_workspace_task_comments_tenant_id_task_id_created_at_idx" ON "tenant_events"."event_workspace_task_comments"("tenant_id", "task_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "event_workspace_documents_tenant_id_workspace_id_idx" ON "tenant_events"."event_workspace_documents"("tenant_id", "workspace_id");

CREATE INDEX IF NOT EXISTS "event_workspace_documents_tenant_id_document_type_idx" ON "tenant_events"."event_workspace_documents"("tenant_id", "document_type");

CREATE INDEX IF NOT EXISTS "event_workspace_documents_tenant_id_parent_version_id_idx" ON "tenant_events"."event_workspace_documents"("tenant_id", "parent_version_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payments_id_key" ON "tenant_accounting"."payments"("id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_status_idx" ON "tenant_accounting"."payments"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_invoice_id_idx" ON "tenant_accounting"."payments"("tenant_id", "invoice_id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_event_id_idx" ON "tenant_accounting"."payments"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_client_id_idx" ON "tenant_accounting"."payments"("tenant_id", "client_id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_gateway_transaction_id_idx" ON "tenant_accounting"."payments"("tenant_id", "gateway_transaction_id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_processed_at_idx" ON "tenant_accounting"."payments"("tenant_id", "processed_at");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_fraud_status_idx" ON "tenant_accounting"."payments"("tenant_id", "fraud_status");

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_id_key" ON "tenant_accounting"."invoices"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoice_number_key" ON "tenant_accounting"."invoices"("invoice_number");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_status_idx" ON "tenant_accounting"."invoices"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_client_id_idx" ON "tenant_accounting"."invoices"("tenant_id", "client_id");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_event_id_idx" ON "tenant_accounting"."invoices"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_invoice_number_idx" ON "tenant_accounting"."invoices"("tenant_id", "invoice_number");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_due_date_idx" ON "tenant_accounting"."invoices"("tenant_id", "due_date");

CREATE INDEX IF NOT EXISTS "invoices_tenant_id_invoice_type_idx" ON "tenant_accounting"."invoices"("tenant_id", "invoice_type");

CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_client_id_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "client_id");

CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_status_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_type_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "type");

CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_is_default_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "is_default");

CREATE INDEX IF NOT EXISTS "payment_reconciliations_tenant_id_status_idx" ON "tenant_accounting"."payment_reconciliations"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "payment_reconciliations_tenant_id_payment_id_idx" ON "tenant_accounting"."payment_reconciliations"("tenant_id", "payment_id");

CREATE INDEX IF NOT EXISTS "payment_reconciliations_tenant_id_invoice_id_idx" ON "tenant_accounting"."payment_reconciliations"("tenant_id", "invoice_id");

CREATE INDEX IF NOT EXISTS "payment_reconciliations_tenant_id_reconciliation_date_idx" ON "tenant_accounting"."payment_reconciliations"("tenant_id", "reconciliation_date");

CREATE INDEX IF NOT EXISTS "payment_reconciliations_tenant_id_batch_id_idx" ON "tenant_accounting"."payment_reconciliations"("tenant_id", "batch_id");

CREATE UNIQUE INDEX IF NOT EXISTS "facility_spaces_id_key" ON "tenant_facility"."facility_spaces"("id");

CREATE INDEX IF NOT EXISTS "facility_spaces_tenant_id_location_id_idx" ON "tenant_facility"."facility_spaces"("tenant_id", "location_id");

CREATE INDEX IF NOT EXISTS "facility_spaces_tenant_id_status_idx" ON "tenant_facility"."facility_spaces"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "facility_spaces_tenant_id_type_idx" ON "tenant_facility"."facility_spaces"("tenant_id", "type");

CREATE INDEX IF NOT EXISTS "facility_spaces_tenant_id_is_bookable_idx" ON "tenant_facility"."facility_spaces"("tenant_id", "is_bookable");

CREATE UNIQUE INDEX IF NOT EXISTS "facility_spaces_tenant_id_id_key" ON "tenant_facility"."facility_spaces"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "facility_bookings_tenant_id_space_id_idx" ON "tenant_facility"."facility_bookings"("tenant_id", "space_id");

CREATE INDEX IF NOT EXISTS "facility_bookings_tenant_id_booked_for_idx" ON "tenant_facility"."facility_bookings"("tenant_id", "booked_for");

CREATE INDEX IF NOT EXISTS "facility_bookings_tenant_id_start_at_idx" ON "tenant_facility"."facility_bookings"("tenant_id", "start_at");

CREATE INDEX IF NOT EXISTS "facility_bookings_tenant_id_end_at_idx" ON "tenant_facility"."facility_bookings"("tenant_id", "end_at");

CREATE INDEX IF NOT EXISTS "facility_bookings_tenant_id_status_idx" ON "tenant_facility"."facility_bookings"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "facility_bookings_tenant_id_event_id_idx" ON "tenant_facility"."facility_bookings"("tenant_id", "event_id");

CREATE UNIQUE INDEX IF NOT EXISTS "facility_bookings_tenant_id_id_key" ON "tenant_facility"."facility_bookings"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "utility_meters_id_key" ON "tenant_facility"."utility_meters"("id");

CREATE INDEX IF NOT EXISTS "utility_meters_tenant_id_location_id_idx" ON "tenant_facility"."utility_meters"("tenant_id", "location_id");

CREATE INDEX IF NOT EXISTS "utility_meters_tenant_id_space_id_idx" ON "tenant_facility"."utility_meters"("tenant_id", "space_id");

CREATE INDEX IF NOT EXISTS "utility_meters_tenant_id_meter_type_idx" ON "tenant_facility"."utility_meters"("tenant_id", "meter_type");

CREATE INDEX IF NOT EXISTS "utility_meters_tenant_id_status_idx" ON "tenant_facility"."utility_meters"("tenant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "utility_meters_tenant_id_id_key" ON "tenant_facility"."utility_meters"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "utility_readings_tenant_id_meter_id_idx" ON "tenant_facility"."utility_readings"("tenant_id", "meter_id");

CREATE INDEX IF NOT EXISTS "utility_readings_tenant_id_reading_date_idx" ON "tenant_facility"."utility_readings"("tenant_id", "reading_date");

CREATE UNIQUE INDEX IF NOT EXISTS "utility_readings_tenant_id_id_key" ON "tenant_facility"."utility_readings"("tenant_id", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "utility_readings_tenant_id_meter_id_reading_date_key" ON "tenant_facility"."utility_readings"("tenant_id", "meter_id", "reading_date");

CREATE INDEX IF NOT EXISTS "quality_checklists_tenant_id_category_idx" ON "tenant_kitchen"."quality_checklists"("tenant_id", "category");

CREATE INDEX IF NOT EXISTS "quality_checklists_tenant_id_is_active_idx" ON "tenant_kitchen"."quality_checklists"("tenant_id", "is_active");

CREATE INDEX IF NOT EXISTS "quality_checklist_items_tenant_id_checklist_id_idx" ON "tenant_kitchen"."quality_checklist_items"("tenant_id", "checklist_id");

CREATE INDEX IF NOT EXISTS "quality_checklist_items_tenant_id_category_idx" ON "tenant_kitchen"."quality_checklist_items"("tenant_id", "category");

CREATE UNIQUE INDEX IF NOT EXISTS "quality_inspections_inspection_number_key" ON "tenant_kitchen"."quality_inspections"("inspection_number");

CREATE INDEX IF NOT EXISTS "quality_inspections_tenant_id_location_id_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "location_id");

CREATE INDEX IF NOT EXISTS "quality_inspections_tenant_id_status_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "quality_inspections_tenant_id_scheduled_date_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "scheduled_date");

CREATE INDEX IF NOT EXISTS "quality_inspections_tenant_id_inspection_type_idx" ON "tenant_kitchen"."quality_inspections"("tenant_id", "inspection_type");

CREATE INDEX IF NOT EXISTS "quality_inspection_items_tenant_id_inspection_id_idx" ON "tenant_kitchen"."quality_inspection_items"("tenant_id", "inspection_id");

CREATE INDEX IF NOT EXISTS "quality_inspection_items_tenant_id_corrective_action_id_idx" ON "tenant_kitchen"."quality_inspection_items"("tenant_id", "corrective_action_id");

CREATE UNIQUE INDEX IF NOT EXISTS "corrective_actions_action_number_key" ON "tenant_kitchen"."corrective_actions"("action_number");

CREATE INDEX IF NOT EXISTS "corrective_actions_tenant_id_location_id_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "location_id");

CREATE INDEX IF NOT EXISTS "corrective_actions_tenant_id_status_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "corrective_actions_tenant_id_severity_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "severity");

CREATE INDEX IF NOT EXISTS "corrective_actions_tenant_id_priority_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "priority");

CREATE INDEX IF NOT EXISTS "corrective_actions_tenant_id_assigned_to_id_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "assigned_to_id");

CREATE INDEX IF NOT EXISTS "corrective_actions_tenant_id_due_date_idx" ON "tenant_kitchen"."corrective_actions"("tenant_id", "due_date");

CREATE UNIQUE INDEX IF NOT EXISTS "quality_reports_report_number_key" ON "tenant_kitchen"."quality_reports"("report_number");

CREATE INDEX IF NOT EXISTS "quality_reports_tenant_id_location_id_idx" ON "tenant_kitchen"."quality_reports"("tenant_id", "location_id");

CREATE INDEX IF NOT EXISTS "quality_reports_tenant_id_report_type_idx" ON "tenant_kitchen"."quality_reports"("tenant_id", "report_type");

CREATE INDEX IF NOT EXISTS "quality_reports_tenant_id_report_period_start_idx" ON "tenant_kitchen"."quality_reports"("tenant_id", "report_period_start");

CREATE INDEX IF NOT EXISTS "knowledge_entries_tenant_id_status_idx" ON "tenant_kitchen"."knowledge_entries"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "knowledge_entries_tenant_id_category_idx" ON "tenant_kitchen"."knowledge_entries"("tenant_id", "category");

CREATE INDEX IF NOT EXISTS "knowledge_entries_tenant_id_slug_idx" ON "tenant_kitchen"."knowledge_entries"("tenant_id", "slug");

CREATE INDEX IF NOT EXISTS "knowledge_entries_tenant_id_author_id_idx" ON "tenant_kitchen"."knowledge_entries"("tenant_id", "author_id");

CREATE INDEX IF NOT EXISTS "knowledge_entries_tenant_id_is_featured_idx" ON "tenant_kitchen"."knowledge_entries"("tenant_id", "is_featured");

CREATE INDEX IF NOT EXISTS "knowledge_entries_tenant_id_tags_idx" ON "tenant_kitchen"."knowledge_entries"("tenant_id", "tags");

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_entries_tenant_id_slug_key" ON "tenant_kitchen"."knowledge_entries"("tenant_id", "slug");

CREATE INDEX IF NOT EXISTS "knowledge_versions_tenant_id_entry_id_idx" ON "tenant_kitchen"."knowledge_versions"("tenant_id", "entry_id");

CREATE INDEX IF NOT EXISTS "knowledge_versions_tenant_id_created_by_idx" ON "tenant_kitchen"."knowledge_versions"("tenant_id", "created_by");

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_versions_tenant_id_entry_id_version_number_key" ON "tenant_kitchen"."knowledge_versions"("tenant_id", "entry_id", "version_number");

CREATE INDEX IF NOT EXISTS "knowledge_attachments_tenant_id_entry_id_idx" ON "tenant_kitchen"."knowledge_attachments"("tenant_id", "entry_id");

CREATE INDEX IF NOT EXISTS "knowledge_attachments_tenant_id_uploaded_by_idx" ON "tenant_kitchen"."knowledge_attachments"("tenant_id", "uploaded_by");

CREATE INDEX IF NOT EXISTS "knowledge_feedback_tenant_id_entry_id_idx" ON "tenant_kitchen"."knowledge_feedback"("tenant_id", "entry_id");

CREATE INDEX IF NOT EXISTS "knowledge_feedback_tenant_id_user_id_idx" ON "tenant_kitchen"."knowledge_feedback"("tenant_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_feedback_tenant_id_entry_id_user_id_key" ON "tenant_kitchen"."knowledge_feedback"("tenant_id", "entry_id", "user_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_invoice_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "invoice_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_event_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_client_id_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "client_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_status_idx" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "revenue_recognition_schedules_tenant_id_id_key" ON "tenant_accounting"."revenue_recognition_schedules"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_lines_tenant_id_schedule_id_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "schedule_id");

CREATE INDEX IF NOT EXISTS "revenue_recognition_lines_tenant_id_schedule_id_sequence_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "schedule_id", "sequence");

CREATE INDEX IF NOT EXISTS "revenue_recognition_lines_tenant_id_status_idx" ON "tenant_accounting"."revenue_recognition_lines"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "collection_cases_tenant_id_invoice_id_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "invoice_id");

CREATE INDEX IF NOT EXISTS "collection_cases_tenant_id_client_id_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "client_id");

CREATE INDEX IF NOT EXISTS "collection_cases_tenant_id_status_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "collection_cases_tenant_id_priority_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "priority");

CREATE INDEX IF NOT EXISTS "collection_cases_tenant_id_dunning_stage_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "dunning_stage");

CREATE INDEX IF NOT EXISTS "collection_cases_tenant_id_assigned_to_idx" ON "tenant_accounting"."collection_cases"("tenant_id", "assigned_to");

CREATE UNIQUE INDEX IF NOT EXISTS "collection_cases_tenant_id_id_key" ON "tenant_accounting"."collection_cases"("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "collection_actions_tenant_id_case_id_idx" ON "tenant_accounting"."collection_actions"("tenant_id", "case_id");

CREATE INDEX IF NOT EXISTS "collection_actions_tenant_id_status_idx" ON "tenant_accounting"."collection_actions"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "collection_actions_tenant_id_scheduled_for_idx" ON "tenant_accounting"."collection_actions"("tenant_id", "scheduled_for");

CREATE INDEX IF NOT EXISTS "collection_payment_plans_tenant_id_case_id_idx" ON "tenant_accounting"."collection_payment_plans"("tenant_id", "case_id");

CREATE INDEX IF NOT EXISTS "collection_payment_plans_tenant_id_status_idx" ON "tenant_accounting"."collection_payment_plans"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "versioned_entities_tenant_id_entity_type_idx" ON "tenant_admin"."versioned_entities"("tenant_id", "entity_type");

CREATE INDEX IF NOT EXISTS "versioned_entities_tenant_id_entity_type_entity_id_idx" ON "tenant_admin"."versioned_entities"("tenant_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "versioned_entities_locked_by_idx" ON "tenant_admin"."versioned_entities"("locked_by");

CREATE UNIQUE INDEX IF NOT EXISTS "versioned_entities_tenant_id_entity_type_entity_id_key" ON "tenant_admin"."versioned_entities"("tenant_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "entity_versions_tenant_id_versioned_entity_id_idx" ON "tenant_admin"."entity_versions"("tenant_id", "versioned_entity_id");

CREATE INDEX IF NOT EXISTS "entity_versions_tenant_id_versioned_entity_id_version_numbe_idx" ON "tenant_admin"."entity_versions"("tenant_id", "versioned_entity_id", "version_number");

CREATE INDEX IF NOT EXISTS "entity_versions_tenant_id_created_by_idx" ON "tenant_admin"."entity_versions"("tenant_id", "created_by");

CREATE INDEX IF NOT EXISTS "entity_versions_approved_by_idx" ON "tenant_admin"."entity_versions"("approved_by");

CREATE UNIQUE INDEX IF NOT EXISTS "entity_versions_tenant_id_versioned_entity_id_version_numbe_key" ON "tenant_admin"."entity_versions"("tenant_id", "versioned_entity_id", "version_number");

CREATE INDEX IF NOT EXISTS "version_approvals_tenant_id_entity_version_id_idx" ON "tenant_admin"."version_approvals"("tenant_id", "entity_version_id");

CREATE INDEX IF NOT EXISTS "version_approvals_tenant_id_approver_id_idx" ON "tenant_admin"."version_approvals"("tenant_id", "approver_id");

CREATE INDEX IF NOT EXISTS "version_approvals_tenant_id_status_idx" ON "tenant_admin"."version_approvals"("tenant_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "version_approvals_tenant_id_entity_version_id_approver_id_key" ON "tenant_admin"."version_approvals"("tenant_id", "entity_version_id", "approver_id");

CREATE UNIQUE INDEX IF NOT EXISTS "command_boards_share_id_key" ON "tenant_events"."command_boards"("share_id");

CREATE INDEX IF NOT EXISTS "command_boards_share_id_idx" ON "tenant_events"."command_boards"("share_id");

CREATE INDEX IF NOT EXISTS "command_boards_is_template_idx" ON "tenant_events"."command_boards"("is_template");

CREATE INDEX IF NOT EXISTS "event_contracts_tenant_id_auto_renew_enabled_idx" ON "tenant_events"."event_contracts"("tenant_id", "auto_renew_enabled");

CREATE INDEX IF NOT EXISTS "event_contracts_tenant_id_compliance_status_idx" ON "tenant_events"."event_contracts"("tenant_id", "compliance_status");

CREATE INDEX IF NOT EXISTS "event_contracts_tenant_id_last_compliance_check_idx" ON "tenant_events"."event_contracts"("tenant_id", "last_compliance_check");

CREATE UNIQUE INDEX IF NOT EXISTS "employees_id_key" ON "tenant_staff"."employees"("id");
