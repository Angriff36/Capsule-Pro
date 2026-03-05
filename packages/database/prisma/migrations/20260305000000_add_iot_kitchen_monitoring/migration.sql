-- Migration: Add IoT Kitchen Monitoring
-- Date: 2026-03-05
-- Description: Add real-time IoT sensor monitoring for kitchen equipment and food safety compliance

-- Add IoT fields to equipment table
ALTER TABLE "tenant_kitchen"."equipment" ADD COLUMN "iot_device_id" TEXT;
ALTER TABLE "tenant_kitchen"."equipment" ADD COLUMN "iot_device_type" TEXT;
ALTER TABLE "tenant_kitchen"."equipment" ADD COLUMN "connection_status" TEXT NOT NULL DEFAULT 'disconnected';
ALTER TABLE "tenant_kitchen"."equipment" ADD COLUMN "last_heartbeat" TIMESTAMPTZ(6);
ALTER TABLE "tenant_kitchen"."equipment" ADD COLUMN "current_sensor_data" JSONB;

-- Create index for iot_device_id
CREATE INDEX "equipment_tenant_iot_device_idx" ON "tenant_kitchen"."equipment"("tenant_id", "iot_device_id");

-- Create sensor_readings table for time-series sensor data
CREATE TABLE "tenant_kitchen"."sensor_readings" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "sensor_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "metadata" JSONB,
    "correlation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    PRIMARY KEY ("tenant_id", "id")
);

-- Create indexes for sensor_readings
CREATE INDEX "sensor_readings_tenant_equipment_timestamp_idx" ON "tenant_kitchen"."sensor_readings"("tenant_id", "equipment_id", "timestamp" DESC);
CREATE INDEX "sensor_readings_tenant_sensor_timestamp_idx" ON "tenant_kitchen"."sensor_readings"("tenant_id", "sensor_type", "timestamp" DESC);
CREATE INDEX "sensor_readings_tenant_status_timestamp_idx" ON "tenant_kitchen"."sensor_readings"("tenant_id", "status", "timestamp" DESC);

-- Add foreign key for sensor_readings
ALTER TABLE "tenant_kitchen"."sensor_readings"
    ADD CONSTRAINT "sensor_readings_equipment_tenant_fkey"
    FOREIGN KEY ("equipment_id", "tenant_id")
    REFERENCES "tenant_kitchen"."equipment"("id", "tenant_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key to accounts
ALTER TABLE "tenant_kitchen"."sensor_readings"
    ADD CONSTRAINT "sensor_readings_tenant_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "platform"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create iot_alert_rules table for automated alert configuration
CREATE TABLE "tenant_kitchen"."iot_alert_rules" (
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
    "notify_roles" TEXT[] NOT NULL DEFAULT '{}',
    "notify_channels" TEXT[] NOT NULL DEFAULT '{"in_app"}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id"),
    UNIQUE ("tenant_id", "id")
);

-- Create indexes for iot_alert_rules
CREATE INDEX "iot_alert_rules_tenant_equipment_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "equipment_id");
CREATE INDEX "iot_alert_rules_tenant_active_idx" ON "tenant_kitchen"."iot_alert_rules"("tenant_id", "is_active");

-- Add foreign keys for iot_alert_rules
ALTER TABLE "tenant_kitchen"."iot_alert_rules"
    ADD CONSTRAINT "iot_alert_rules_equipment_tenant_fkey"
    FOREIGN KEY ("equipment_id", "tenant_id")
    REFERENCES "tenant_kitchen"."equipment"("id", "tenant_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_kitchen"."iot_alert_rules"
    ADD CONSTRAINT "iot_alert_rules_tenant_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "platform"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create iot_alerts table for generated alerts
CREATE TABLE "tenant_kitchen"."iot_alerts" (
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
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "acknowledged_at" TIMESTAMPTZ(6),
    "acknowledged_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "notes" TEXT,
    "requires_haccp_action" BOOLEAN NOT NULL DEFAULT false,
    "haccp_action_taken" TEXT,
    "corrective_action_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    PRIMARY KEY ("tenant_id", "id"),
    UNIQUE ("tenant_id", "id")
);

-- Create indexes for iot_alerts
CREATE INDEX "iot_alerts_tenant_equipment_status_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "equipment_id", "status");
CREATE INDEX "iot_alerts_tenant_severity_status_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "severity", "status");
CREATE INDEX "iot_alerts_tenant_triggered_idx" ON "tenant_kitchen"."iot_alerts"("tenant_id", "triggered_at" DESC);

-- Add foreign keys for iot_alerts
ALTER TABLE "tenant_kitchen"."iot_alerts"
    ADD CONSTRAINT "iot_alerts_equipment_tenant_fkey"
    FOREIGN KEY ("equipment_id", "tenant_id")
    REFERENCES "tenant_kitchen"."equipment"("id", "tenant_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_kitchen"."iot_alerts"
    ADD CONSTRAINT "iot_alerts_tenant_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "platform"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create food_safety_logs table for HACCP compliance tracking
CREATE TABLE "tenant_kitchen"."food_safety_logs" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "log_type" TEXT NOT NULL,
    "log_date" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    PRIMARY KEY ("tenant_id", "id"),
    UNIQUE ("tenant_id", "id")
);

-- Create indexes for food_safety_logs
CREATE INDEX "food_safety_logs_tenant_equipment_date_idx" ON "tenant_kitchen"."food_safety_logs"("tenant_id", "equipment_id", "log_date" DESC);
CREATE INDEX "food_safety_logs_tenant_type_date_idx" ON "tenant_kitchen"."food_safety_logs"("tenant_id", "log_type", "log_date" DESC);

-- Add foreign keys for food_safety_logs
ALTER TABLE "tenant_kitchen"."food_safety_logs"
    ADD CONSTRAINT "food_safety_logs_tenant_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "platform"."accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add comment for documentation
COMMENT ON TABLE "tenant_kitchen"."sensor_readings" IS 'Time-series IoT sensor readings for real-time kitchen monitoring';
COMMENT ON TABLE "tenant_kitchen"."iot_alert_rules" IS 'Automated alert rules for IoT sensor threshold monitoring';
COMMENT ON TABLE "tenant_kitchen"."iot_alerts" IS 'Generated alerts from IoT sensors for food safety compliance';
COMMENT ON TABLE "tenant_kitchen"."food_safety_logs" IS 'HACCP compliance tracking logs with optional IoT auto-generation';
