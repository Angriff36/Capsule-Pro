CREATE SCHEMA IF NOT EXISTS "tenant_logistics";

CREATE TABLE IF NOT EXISTS "tenant_admin"."ActivityFeed" (
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

    CONSTRAINT "ActivityFeed_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."payment_methods" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "card_last_four" CHAR(4),
    "card_network" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_accounting"."payments" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "amount" MONEY NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method_type" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "gateway_transaction_id" TEXT,
    "gateway_payment_method_id" TEXT,
    "processor" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "refunded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_logistics"."delivery_routes" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "event_id" UUID,
    "scheduled_date" DATE,
    "start_time" TIMESTAMPTZ(6),
    "end_time" TIMESTAMPTZ(6),
    "total_distance" DECIMAL(10,2),
    "total_duration" INTEGER,
    "optimization_score" DECIMAL(5,2),
    "optimization_algorithm" TEXT,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "actual_start_time" TIMESTAMPTZ(6),
    "actual_end_time" TIMESTAMPTZ(6),
    "actual_distance" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "delivery_routes_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE TABLE IF NOT EXISTS "tenant_logistics"."route_stops" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "route_id" UUID NOT NULL,
    "stop_number" INTEGER NOT NULL,
    "location_id" UUID,
    "venue_id" UUID,
    "name" TEXT NOT NULL,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country_code" CHAR(2),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "stopType" TEXT NOT NULL DEFAULT 'delivery',
    "planned_arrival" TIMESTAMPTZ(6),
    "planned_duration" INTEGER,
    "notes" TEXT,
    "distance_from_previous" DECIMAL(10,2),
    "time_from_previous" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "actual_arrival" TIMESTAMPTZ(6),
    "actual_departure" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("tenant_id","id")
);

CREATE INDEX IF NOT EXISTS "ActivityFeed_tenant_id_created_at_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "ActivityFeed_tenant_id_activity_type_created_at_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "activity_type", "created_at");

CREATE INDEX IF NOT EXISTS "ActivityFeed_tenant_id_entity_type_entity_id_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "ActivityFeed_tenant_id_performed_by_created_at_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "performed_by", "created_at");

CREATE INDEX IF NOT EXISTS "ActivityFeed_tenant_id_correlation_id_idx" ON "tenant_admin"."ActivityFeed"("tenant_id", "correlation_id");

CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_idx" ON "tenant_accounting"."payment_methods"("tenant_id");

CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_client_id_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "client_id");

CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_is_default_idx" ON "tenant_accounting"."payment_methods"("tenant_id", "is_default");

CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_id_key" ON "tenant_accounting"."payment_methods"("id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_idx" ON "tenant_accounting"."payments"("tenant_id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_status_idx" ON "tenant_accounting"."payments"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_invoice_id_idx" ON "tenant_accounting"."payments"("tenant_id", "invoice_id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_event_id_idx" ON "tenant_accounting"."payments"("tenant_id", "event_id");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_client_id_idx" ON "tenant_accounting"."payments"("tenant_id", "client_id");

CREATE UNIQUE INDEX IF NOT EXISTS "payments_id_key" ON "tenant_accounting"."payments"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_routes_id_key" ON "tenant_logistics"."delivery_routes"("id");

CREATE INDEX IF NOT EXISTS "delivery_routes_tenant_id_status_idx" ON "tenant_logistics"."delivery_routes"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "delivery_routes_tenant_id_scheduled_date_idx" ON "tenant_logistics"."delivery_routes"("tenant_id", "scheduled_date");

CREATE UNIQUE INDEX IF NOT EXISTS "delivery_routes_tenant_id_route_number_key" ON "tenant_logistics"."delivery_routes"("tenant_id", "route_number");

CREATE UNIQUE INDEX IF NOT EXISTS "route_stops_id_key" ON "tenant_logistics"."route_stops"("id");

CREATE INDEX IF NOT EXISTS "route_stops_route_id_status_idx" ON "tenant_logistics"."route_stops"("route_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "route_stops_route_id_stop_number_key" ON "tenant_logistics"."route_stops"("route_id", "stop_number");;
