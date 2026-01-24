-- MIGRATION: 20260122000005_event_contracts.sql
-- Event contracts module: event_contracts, contract_signatures
-- Follows Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_EVENTS.EVENT_CONTRACTS
-- ============================================
-- Stores contracts for events with client relationships
-- Auto-generates contract numbers in format: CONT-YYYY-XXXX

CREATE TABLE tenant_events.event_contracts (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,  -- Phase 1 FK to tenant_events.events (no REFERENCES yet)
  client_id uuid NOT NULL,  -- Phase 1 FK to tenant_crm.clients (no REFERENCES yet)
  contract_number text,  -- Auto-generated in format: CONT-YYYY-XXXX
  title text NOT NULL DEFAULT 'Untitled Contract',
  status text NOT NULL DEFAULT 'draft',
  document_url text,
  document_type text,  -- pdf, image
  notes text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  -- Business constraints
  CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'cancelled')),
  CHECK (document_type IS NULL OR document_type IN ('pdf', 'image')),
  CHECK (expires_at IS NULL OR expires_at > now()),
  CHECK (length(trim(coalesce(title, ''))) BETWEEN 3 AND 200),
  CHECK (document_url IS NULL OR length(trim(document_url)) <= 1000),
  CHECK (notes IS NULL OR length(trim(notes)) <= 10000),
  -- Unique constraint for contract numbers per tenant (soft delete aware)
  UNIQUE (tenant_id, contract_number) WHERE deleted_at IS NULL
);

-- Indexes
CREATE INDEX event_contracts_tenant_status_idx
  ON tenant_events.event_contracts (tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX event_contracts_tenant_event_idx
  ON tenant_events.event_contracts (tenant_id, event_id) WHERE deleted_at IS NULL AND event_id IS NOT NULL;

CREATE INDEX event_contracts_tenant_client_idx
  ON tenant_events.event_contracts (tenant_id, client_id) WHERE deleted_at IS NULL AND client_id IS NOT NULL;

CREATE INDEX event_contracts_tenant_expires_idx
  ON tenant_events.event_contracts (tenant_id, expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

CREATE INDEX event_contracts_tenant_number_idx
  ON tenant_events.event_contracts (tenant_id, lower(contract_number)) WHERE deleted_at IS NULL AND contract_number IS NOT NULL;

CREATE INDEX event_contracts_document_type_idx
  ON tenant_events.event_contracts (tenant_id, document_type) WHERE deleted_at IS NULL AND document_type IS NOT NULL;

-- Phase 1 indexes for future FK references
CREATE INDEX event_contracts_event_id_idx
  ON tenant_events.event_contracts (event_id) WHERE event_id IS NOT NULL;

CREATE INDEX event_contracts_client_id_idx
  ON tenant_events.event_contracts (client_id) WHERE client_id IS NOT NULL;

-- Auto-numbering function for contract numbers
CREATE OR REPLACE FUNCTION tenant_events.fn_generate_contract_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year text;
  v_sequence_num int;
  v_contract_number text;
BEGIN
  -- Extract year from current date
  v_year := to_char(CURRENT_DATE, 'YYYY');

  -- Get next sequence number for this tenant and year
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 10) AS integer)), 0) + 1
  INTO v_sequence_num
  FROM tenant_events.event_contracts
  WHERE tenant_id = NEW.tenant_id
  AND contract_number LIKE 'CONT-' || v_year || '-%'
  AND deleted_at IS NULL;  -- Only consider active contracts

  -- Format as CONT-YYYY-XXXX with leading zeros for XXXX
  v_contract_number := 'CONT-' || v_year || '-' || LPAD(v_sequence_num::text, 4, '0');

  -- Set the contract number if not already set (for new records)
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := v_contract_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for auto-numbering
CREATE TRIGGER event_contracts_generate_contract_number
  BEFORE INSERT OR UPDATE ON tenant_events.event_contracts
  FOR EACH ROW EXECUTE FUNCTION tenant_events.fn_generate_contract_number();

-- Status transition validation function
CREATE OR REPLACE FUNCTION tenant_events.fn_validate_contract_status_transition(
  p_old_status text,
  p_new_status text,
  p_tenant_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_allowed_transitions JSONB;
BEGIN
  -- Define allowed status transitions (draft -> sent -> signed)
  v_allowed_transitions := '{
    "draft": ["sent", "cancelled"],
    "sent": ["signed", "cancelled"],
    "signed": ["expired"],
    "expired": [],
    "cancelled": []
  }'::JSONB;

  -- Check if transition is allowed
  RETURN EXISTS (
    SELECT 1
    FROM jsonb_each_text(v_allowed_transitions)
    WHERE key = p_old_status AND value = p_new_status
  );
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER event_contracts_update_timestamp
  BEFORE UPDATE ON tenant_events.event_contracts
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER event_contracts_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.event_contracts
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER event_contracts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.event_contracts
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_events.event_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.event_contracts FORCE ROW LEVEL SECURITY;

CREATE POLICY event_contracts_select ON tenant_events.event_contracts
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY event_contracts_insert ON tenant_events.event_contracts
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY event_contracts_update ON tenant_events.event_contracts
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY event_contracts_delete ON tenant_events.event_contracts
  FOR DELETE USING (false);

CREATE POLICY event_contracts_service ON tenant_events.event_contracts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TENANT_EVENTS.CONTRACT_SIGNATURES
-- ============================================
-- Stores signature data for contracts (soft delete for admin purposes)

CREATE TABLE tenant_events.contract_signatures (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,  -- Phase 1 FK to event_contracts
  signed_at timestamptz NOT NULL DEFAULT now(),
  signature_data text NOT NULL,  -- Base64 encoded signature
  signer_name text NOT NULL,
  signer_email text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,  -- Soft delete for admin purposes
  PRIMARY KEY (tenant_id, id),
  -- Business constraints
  CHECK (length(trim(coalesce(signer_name, ''))) BETWEEN 1 AND 100),
  CHECK (signer_email IS NULL OR signer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CHECK (signature_data IS NOT NULL AND length(trim(signature_data)) > 0),
  CHECK (ip_address IS NULL OR length(trim(ip_address)) <= 45)
);

-- Indexes
CREATE INDEX contract_signatures_tenant_contract_idx
  ON tenant_events.contract_signatures (tenant_id, contract_id) WHERE deleted_at IS NULL;

CREATE INDEX contract_signatures_tenant_signed_idx
  ON tenant_events.contract_signatures (tenant_id, signed_at) WHERE deleted_at IS NULL;

CREATE INDEX contract_signatures_tenant_signer_idx
  ON tenant_events.contract_signatures (tenant_id, lower(signer_email)) WHERE deleted_at IS NULL AND signer_email IS NOT NULL;

-- Phase 1 index for future FK reference
CREATE INDEX contract_signatures_contract_id_idx
  ON tenant_events.contract_signatures (contract_id) WHERE contract_id IS NOT NULL;

-- Triggers
CREATE TRIGGER contract_signatures_update_timestamp
  BEFORE UPDATE ON tenant_events.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER contract_signatures_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER contract_signatures_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_events.contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.contract_signatures FORCE ROW LEVEL SECURITY;

CREATE POLICY contract_signatures_select ON tenant_events.contract_signatures
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY contract_signatures_insert ON tenant_events.contract_signatures
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY contract_signatures_update ON tenant_events.contract_signatures
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY contract_signatures_delete ON tenant_events.contract_signatures
  FOR DELETE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY contract_signatures_service ON tenant_events.contract_signatures
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- CROSS-MODULE FOREIGN KEY CONSTRAINTS (Phase 2)
-- ============================================
-- Add FK constraints for event_contracts references

-- 1. EVENT_CONTRACTS → TENANT_EVENTS.EVENTS
-- Contracts reference their associated event
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'event_contracts'
    AND column_name = 'event_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'events'
    AND column_name = 'id'
  ) THEN
    ALTER TABLE tenant_events.event_contracts
      ADD CONSTRAINT event_contracts_event_fk
      FOREIGN KEY (tenant_id, event_id)
      REFERENCES tenant_events.events (tenant_id, id)
      ON DELETE CASCADE;  -- Cascade delete contract if event is deleted
    RAISE NOTICE 'Added event_contracts_event_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping event_contracts_event_fk: event_id column does not exist in tenant_events.event_contracts or events table';
  END IF;
END $$;

-- 2. EVENT_CONTRACTS → TENANT_CRM.CLIENTS
-- Contracts reference their associated client
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'event_contracts'
    AND column_name = 'client_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_crm'
    AND table_name = 'clients'
    AND column_name = 'id'
  ) THEN
    ALTER TABLE tenant_events.event_contracts
      ADD CONSTRAINT event_contracts_client_fk
      FOREIGN KEY (tenant_id, client_id)
      REFERENCES tenant_crm.clients (tenant_id, id)
      ON DELETE CASCADE;  -- Cascade delete contract if client is deleted
    RAISE NOTICE 'Added event_contracts_client_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping event_contracts_client_fk: client_id column does not exist in tenant_events.event_contracts or clients table';
  END IF;
END $$;

-- 3. CONTRACT_SIGNATURES → EVENT_CONTRACTS
-- Signatures reference their contract
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'contract_signatures'
    AND column_name = 'contract_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'tenant_events'
    AND table_name = 'event_contracts'
    AND column_name = 'id'
  ) THEN
    ALTER TABLE tenant_events.contract_signatures
      ADD CONSTRAINT contract_signatures_contract_fk
      FOREIGN KEY (tenant_id, contract_id)
      REFERENCES tenant_events.event_contracts (tenant_id, id)
      ON DELETE CASCADE;  -- Cascade delete signature if contract is deleted
    RAISE NOTICE 'Added contract_signatures_contract_fk constraint';
  ELSE
    RAISE NOTICE 'Skipping contract_signatures_contract_fk: contract_id column does not exist in tenant_events.contract_signatures or event_contracts table';
  END IF;
END $$;

-- ============================================
-- REAL-TIME SUPPORT
-- ============================================
-- Enable real-time subscriptions for contract changes

ALTER TABLE tenant_events.event_contracts REPLICA IDENTITY FULL;
ALTER TABLE tenant_events.contract_signatures REPLICA IDENTITY FULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Verify the contract tables structure is correct

SELECT
  'EVENT_CONTRACTS TABLE STRUCTURE' as check_type,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_records,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_records,
  COUNT(DISTINCT status) as status_types,
  COUNT(DISTINCT document_type) as document_types_count,
  COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at <= now() THEN 1 END) as expired_contracts,
  COUNT(CASE WHEN contract_number LIKE 'CONT-%' THEN 1 END) as numbered_contracts,
  MIN(created_at) as earliest_contract,
  MAX(created_at) as latest_contract,
  MIN(updated_at) as last_updated
FROM tenant_events.event_contracts;

SELECT
  'CONTRACT_SIGNATURES TABLE STRUCTURE' as check_type,
  COUNT(*) as total_signatures,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_signatures,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_signatures,
  COUNT(DISTINCT signer_email) as unique_signers,
  COUNT(CASE WHEN signed_at = created_at THEN 1 END) as newly_signed,
  MIN(signed_at) as earliest_signature,
  MAX(signed_at) as latest_signature
FROM tenant_events.contract_signatures;

-- Migration completed successfully
-- Follows Schema Contract v2 patterns: composite PK, RLS, soft delete, indexes, triggers, FK constraints