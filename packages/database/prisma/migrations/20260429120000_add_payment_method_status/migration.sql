-- Migration: Add status column to payment_methods
-- Date: 2026-04-29
-- Description: Add status field to PaymentMethod model to track payment method
--              lifecycle states (ACTIVE, VERIFIED, FLAGGED, EXPIRED)
--
-- Conventions: Add column to existing tenant_accounting.payment_methods table
--              with default value 'ACTIVE' and proper constraints.

-- ============================================================
-- AlterTable: Add status column to payment_methods
-- ============================================================
ALTER TABLE "tenant_accounting"."payment_methods" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- ============================================================
-- Indexes: payment_methods_status_idx
-- ============================================================
CREATE INDEX IF NOT EXISTS "payment_methods_tenant_id_status_idx"
    ON "tenant_accounting"."payment_methods"("tenant_id", "status");

-- ============================================================
-- RLS: Update existing policies to include status column
-- ============================================================

-- Default policy already exists - this just ensures status can be queried
-- The existing policy at line 4670 of schema.prisma should cover this