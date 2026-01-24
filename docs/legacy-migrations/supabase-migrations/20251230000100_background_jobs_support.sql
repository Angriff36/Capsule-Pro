-- MIGRATION: 20251230000100_background_jobs_support.sql
-- Background Jobs Support: sent_emails table, correlation_id columns
-- Adds support for Inngest background job idempotency

-- ============================================
-- PLATFORM.SENT_EMAILS
-- ============================================

-- Table for tracking sent emails for idempotency
CREATE TABLE IF NOT EXISTS platform.sent_emails (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  correlation_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Ensure idempotency per tenant when correlation_id is provided.
-- (Allows multiple NULL correlation_id values.)
CREATE UNIQUE INDEX IF NOT EXISTS sent_emails_tenant_correlation_uidx
ON platform.sent_emails(tenant_id, correlation_id)
WHERE correlation_id IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS sent_emails_tenant_idx ON platform.sent_emails(tenant_id);
CREATE INDEX IF NOT EXISTS sent_emails_correlation_idx ON platform.sent_emails(correlation_id) WHERE correlation_id IS NOT NULL;

-- RLS Policies
ALTER TABLE platform.sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.sent_emails FORCE ROW LEVEL SECURITY;

CREATE POLICY sent_emails_select ON platform.sent_emails
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY sent_emails_insert ON platform.sent_emails
  FOR INSERT WITH CHECK (false); -- Only service_role can insert

CREATE POLICY sent_emails_update ON platform.sent_emails
  FOR UPDATE USING (false);

CREATE POLICY sent_emails_delete ON platform.sent_emails
  FOR DELETE USING (false);

CREATE POLICY sent_emails_service ON platform.sent_emails
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- ADD CORRELATION_ID COLUMN TO NOTIFICATIONS
-- ============================================

ALTER TABLE tenant_admin.notifications
ADD COLUMN IF NOT EXISTS correlation_id text;

-- Create index for correlation_id lookups
CREATE INDEX IF NOT EXISTS notifications_correlation_idx
ON tenant_admin.notifications(tenant_id, correlation_id)
WHERE correlation_id IS NOT NULL;

-- ============================================
-- ADD CORRELATION_ID COLUMN TO CLIENT_INTERACTIONS
-- ============================================

ALTER TABLE tenant_crm.client_interactions
ADD COLUMN IF NOT EXISTS correlation_id text;

-- Create index for correlation_id lookups
CREATE INDEX IF NOT EXISTS client_interactions_correlation_idx
ON tenant_crm.client_interactions(tenant_id, correlation_id)
WHERE correlation_id IS NOT NULL;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables created
SELECT 'platform.sent_emails' as table_name, COUNT(*) as record_count
FROM platform.sent_emails;

-- Verify columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'tenant_admin'
  AND table_name = 'notifications'
  AND column_name = 'correlation_id';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'tenant_crm'
  AND table_name = 'client_interactions'
  AND column_name = 'correlation_id';
