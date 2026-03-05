-- Add contract lifecycle management fields to EventContract
-- Enables: auto-renewal tracking, compliance monitoring, renewal reminders

ALTER TABLE "tenant_events"."event_contracts"
  ADD COLUMN "renewal_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "compliance_status" VARCHAR(255) NOT NULL DEFAULT 'pending',
  ADD COLUMN "last_compliance_check" TIMESTAMPTZ(6),
  ADD COLUMN "auto_renew_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "renewal_term_days" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "contract_value" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "payment_terms" VARCHAR(255),
  ADD COLUMN "special_terms" TEXT;

-- Add indexes for lifecycle queries
CREATE INDEX "event_contracts_tenantId_auto_renew_enabled_idx" ON "tenant_events"."event_contracts"("tenant_id", "auto_renew_enabled");
CREATE INDEX "event_contracts_tenantId_compliance_status_idx" ON "tenant_events"."event_contracts"("tenant_id", "compliance_status");
CREATE INDEX "event_contracts_tenantId_last_compliance_check_idx" ON "tenant_events"."event_contracts"("tenant_id", "last_compliance_check");

-- Add comments for documentation
COMMENT ON COLUMN "tenant_events"."event_contracts"."renewal_reminder_sent" IS 'Tracks whether a renewal reminder has been sent for the current expiration cycle';
COMMENT ON COLUMN "tenant_events"."event_contracts"."compliance_status" IS 'Current compliance status: pending, compliant, non_compliant, under_review';
COMMENT ON COLUMN "tenant_events"."event_contracts"."last_compliance_check" IS 'Timestamp of the last compliance review';
COMMENT ON COLUMN "tenant_events"."event_contracts"."auto_renew_enabled" IS 'Whether auto-renewal is enabled for this contract';
COMMENT ON COLUMN "tenant_events"."event_contracts"."renewal_term_days" IS 'Number of days for auto-renewal term';
COMMENT ON COLUMN "tenant_events"."event_contracts"."contract_value" IS 'Monetary value of the contract';
COMMENT ON COLUMN "tenant_events"."event_contracts"."payment_terms" IS 'Payment terms (e.g., NET_30, NET_60)';
COMMENT ON COLUMN "tenant_events"."event_contracts"."special_terms" IS 'Any special terms or conditions';
