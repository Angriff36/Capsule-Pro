-- Migration: Add rate limiting tables
-- Created: 2025-03-04
-- Description: Adds tables for per-tenant API rate limiting with configurable limits and usage analytics

-- Fix ApiKey model to add missing status column
ALTER TABLE "tenant_admin"."api_keys" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

-- Create rate_limit_configs table
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

    PRIMARY KEY ("tenant_id", "id"),
    CONSTRAINT "rate_limit_config_tenant_name_unique" UNIQUE ("tenant_id", "name"),
    CONSTRAINT "rate_limit_configs_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for rate_limit_configs
CREATE INDEX IF NOT EXISTS "rate_limit_config_tenant_active_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "is_active");
CREATE INDEX IF NOT EXISTS "rate_limit_config_priority_idx" ON "tenant_admin"."rate_limit_configs"("tenant_id", "priority" DESC);

-- Create rate_limit_usage table
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

    PRIMARY KEY ("tenant_id", "id"),
    CONSTRAINT "rate_limit_usage_unique_bucket" UNIQUE ("tenant_id", "endpoint", "method", "bucket_start"),
    CONSTRAINT "rate_limit_usage_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for rate_limit_usage
CREATE INDEX IF NOT EXISTS "rate_limit_usage_time_idx" ON "tenant_admin"."rate_limit_usage"("tenant_id", "bucket_start" DESC);
CREATE INDEX IF NOT EXISTS "rate_limit_usage_endpoint_idx" ON "tenant_admin"."rate_limit_usage"("tenant_id", "endpoint");

-- Create rate_limit_events table
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

    PRIMARY KEY ("tenant_id", "id"),
    CONSTRAINT "rate_limit_events_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for rate_limit_events
CREATE INDEX IF NOT EXISTS "rate_limit_events_timestamp_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "rate_limit_events_endpoint_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "endpoint");
CREATE INDEX IF NOT EXISTS "rate_limit_events_allowed_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "allowed");
CREATE INDEX IF NOT EXISTS "rate_limit_events_user_idx" ON "tenant_admin"."rate_limit_events"("tenant_id", "user_id");

-- Insert default rate limit configurations for existing tenants
-- This ensures all tenants have basic rate limiting from the start
INSERT INTO "tenant_admin"."rate_limit_configs" ("tenant_id", "name", "endpoint_pattern", "window_ms", "max_requests", "burst_allowance", "priority")
SELECT
    id AS tenant_id,
    'Default API Limits' AS name,
    '^/api/.*' AS endpoint_pattern,
    60000 AS window_ms, -- 1 minute window
    1000 AS max_requests, -- 1000 requests per minute
    100 AS burst_allowance, -- Allow 100 burst requests
    0 AS priority
FROM "platform"."accounts"
WHERE "deleted_at" IS NULL
ON CONFLICT ("tenant_id", "name") DO NOTHING;

-- Insert stricter limits for write operations
INSERT INTO "tenant_admin"."rate_limit_configs" ("tenant_id", "name", "endpoint_pattern", "window_ms", "max_requests", "burst_allowance", "priority")
SELECT
    id AS tenant_id,
    'Write Operations' AS name,
    '^/api/.*/commands/.*' AS endpoint_pattern,
    60000 AS window_ms, -- 1 minute window
    200 AS max_requests, -- 200 writes per minute
    20 AS burst_allowance,
    10 AS priority -- Higher priority, checked before default
FROM "platform"."accounts"
WHERE "deleted_at" IS NULL
ON CONFLICT ("tenant_id", "name") DO NOTHING;
