-- MIGRATION: 20251222000105_crm.sql
-- CRM module: clients, client_contacts, client_preferences, leads, client_interactions,
-- proposals, proposal_line_items
-- All tables follow Schema Contract v2 with composite PK (tenant_id, id)

-- ============================================
-- TENANT_CRM.CLIENTS
-- ============================================

CREATE TABLE tenant_crm.clients (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  client_type text NOT NULL DEFAULT 'company',
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country_code char(2),
  default_payment_terms smallint DEFAULT 30,
  tax_exempt boolean NOT NULL DEFAULT false,
  tax_id text,
  notes text,
  tags text[],
  source text,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Phase 1 FK column (no REFERENCES until 090_cross_module_fks.sql)
  -- Client type validation: company requires company_name, individual requires first_name
  CHECK (
    (client_type = 'company' AND company_name IS NOT NULL) OR
    (client_type = 'individual' AND first_name IS NOT NULL)
  ),
  CHECK (client_type IN ('company', 'individual')),
  CHECK (default_payment_terms >= 0 AND default_payment_terms <= 365),
  CHECK (country_code IS NULL OR length(country_code) = 2),
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CHECK (website IS NULL OR website ~* '^https?://'),
  CHECK (length(trim(coalesce(company_name, ''))) <= 200),
  CHECK (length(trim(coalesce(first_name, ''))) <= 100),
  CHECK (length(trim(coalesce(last_name, ''))) <= 100),
  CHECK (length(trim(coalesce(phone, ''))) <= 50),
  CHECK (length(trim(coalesce(tax_id, ''))) <= 50),
  CHECK (notes IS NULL OR length(trim(notes)) <= 5000)
);

-- Indexes
CREATE INDEX clients_tenant_type_idx
  ON tenant_crm.clients(tenant_id, client_type) WHERE deleted_at IS NULL;

CREATE INDEX clients_tenant_assigned_idx
  ON tenant_crm.clients(tenant_id, assigned_to) WHERE deleted_at IS NULL AND assigned_to IS NOT NULL;

CREATE INDEX clients_tenant_email_idx
  ON tenant_crm.clients(tenant_id, lower(email)) WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE INDEX clients_source_idx
  ON tenant_crm.clients(lower(source)) WHERE deleted_at IS NULL AND source IS NOT NULL;

CREATE INDEX clients_tags_idx
  ON tenant_crm.clients USING GIN(tags) WHERE deleted_at IS NULL AND tags IS NOT NULL;

-- Index for future FK (Phase 1)
CREATE INDEX clients_assigned_to_idx
  ON tenant_crm.clients(assigned_to) WHERE assigned_to IS NOT NULL;

-- Triggers
CREATE TRIGGER clients_update_timestamp
  BEFORE UPDATE ON tenant_crm.clients
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER clients_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.clients
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER clients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.clients
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_crm.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.clients FORCE ROW LEVEL SECURITY;

CREATE POLICY clients_select ON tenant_crm.clients
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY clients_insert ON tenant_crm.clients
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY clients_update ON tenant_crm.clients
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY clients_delete ON tenant_crm.clients
  FOR DELETE USING (false);

CREATE POLICY clients_service ON tenant_crm.clients
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_CRM.CLIENT_CONTACTS
-- ============================================

CREATE TABLE tenant_crm.client_contacts (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  email text,
  phone text,
  phone_mobile text,
  is_primary boolean NOT NULL DEFAULT false,
  is_billing_contact boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FK (clients exists in this migration)
  FOREIGN KEY (tenant_id, client_id)
    REFERENCES tenant_crm.clients(tenant_id, id)
    ON DELETE CASCADE,
  CHECK (length(trim(first_name)) <= 100),
  CHECK (length(trim(last_name)) <= 100),
  CHECK (title IS NULL OR length(trim(title)) <= 100),
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CHECK (length(trim(coalesce(phone, ''))) <= 50),
  CHECK (length(trim(coalesce(phone_mobile, ''))) <= 50),
  CHECK (notes IS NULL OR length(trim(notes)) <= 1000)
);

-- Indexes
CREATE INDEX client_contacts_client_idx
  ON tenant_crm.client_contacts(client_id) WHERE deleted_at IS NULL;

CREATE INDEX client_contacts_tenant_primary_idx
  ON tenant_crm.client_contacts(tenant_id, client_id, is_primary)
  WHERE deleted_at IS NULL AND is_primary = true;

CREATE INDEX client_contacts_tenant_billing_idx
  ON tenant_crm.client_contacts(tenant_id, client_id, is_billing_contact)
  WHERE deleted_at IS NULL AND is_billing_contact = true;

CREATE INDEX client_contacts_email_idx
  ON tenant_crm.client_contacts(tenant_id, lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Triggers
CREATE TRIGGER client_contacts_update_timestamp
  BEFORE UPDATE ON tenant_crm.client_contacts
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER client_contacts_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.client_contacts
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER client_contacts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.client_contacts
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_crm.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.client_contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY client_contacts_select ON tenant_crm.client_contacts
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY client_contacts_insert ON tenant_crm.client_contacts
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY client_contacts_update ON tenant_crm.client_contacts
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY client_contacts_delete ON tenant_crm.client_contacts
  FOR DELETE USING (false);

CREATE POLICY client_contacts_service ON tenant_crm.client_contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_CRM.CLIENT_PREFERENCES
-- ============================================

CREATE TABLE tenant_crm.client_preferences (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  preference_type text NOT NULL,
  preference_key text NOT NULL,
  preference_value jsonb NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FK (clients exists in this migration)
  FOREIGN KEY (tenant_id, client_id)
    REFERENCES tenant_crm.clients(tenant_id, id)
    ON DELETE CASCADE,
  CHECK (preference_type IN ('dietary', 'service', 'communication', 'venue', 'other')),
  CHECK (length(trim(preference_type)) <= 50),
  CHECK (length(trim(preference_key)) <= 100),
  CHECK (jsonb_typeof(preference_value) IN ('object', 'array', 'string', 'number', 'boolean')),
  CHECK (notes IS NULL OR length(trim(notes)) <= 1000)
);

-- Indexes
CREATE INDEX client_preferences_client_idx
  ON tenant_crm.client_preferences(client_id) WHERE deleted_at IS NULL;

CREATE INDEX client_preferences_tenant_type_idx
  ON tenant_crm.client_preferences(tenant_id, preference_type) WHERE deleted_at IS NULL;

CREATE INDEX client_preferences_tenant_client_type_idx
  ON tenant_crm.client_preferences(tenant_id, client_id, preference_type) WHERE deleted_at IS NULL;

-- Partial unique index after table creation
CREATE UNIQUE INDEX client_preferences_tenant_client_type_key_active_idx
  ON tenant_crm.client_preferences(tenant_id, client_id, preference_type, preference_key)
  WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER client_preferences_update_timestamp
  BEFORE UPDATE ON tenant_crm.client_preferences
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER client_preferences_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.client_preferences
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER client_preferences_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.client_preferences
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_crm.client_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.client_preferences FORCE ROW LEVEL SECURITY;

CREATE POLICY client_preferences_select ON tenant_crm.client_preferences
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY client_preferences_insert ON tenant_crm.client_preferences
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY client_preferences_update ON tenant_crm.client_preferences
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY client_preferences_delete ON tenant_crm.client_preferences
  FOR DELETE USING (false);

CREATE POLICY client_preferences_service ON tenant_crm.client_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_CRM.LEADS
-- ============================================

CREATE TABLE tenant_crm.leads (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  source text,
  company_name text,
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  event_type text,
  event_date date,
  estimated_guests int,
  estimated_value numeric(12,2),
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid,
  notes text,
  converted_to_client_id uuid,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Phase 1 FK columns (no REFERENCES until 090_cross_module_fks.sql)
  -- Lead status references core.status_types category='lead'
  CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost')),
  CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CHECK (length(trim(contact_name)) <= 200),
  CHECK (length(trim(coalesce(company_name, ''))) <= 200),
  CHECK (length(trim(coalesce(contact_phone, ''))) <= 50),
  CHECK (length(trim(coalesce(event_type, ''))) <= 100),
  CHECK (estimated_guests IS NULL OR (estimated_guests > 0 AND estimated_guests <= 100000)),
  CHECK (estimated_value IS NULL OR estimated_value >= 0),
  CHECK (notes IS NULL OR length(trim(notes)) <= 5000),
  CHECK (
    (status = 'converted' AND converted_to_client_id IS NOT NULL AND converted_at IS NOT NULL) OR
    (status != 'converted' AND converted_to_client_id IS NULL)
  )
);

-- Indexes
CREATE INDEX leads_tenant_status_idx
  ON tenant_crm.leads(tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX leads_tenant_assigned_idx
  ON tenant_crm.leads(tenant_id, assigned_to) WHERE deleted_at IS NULL AND assigned_to IS NOT NULL;

CREATE INDEX leads_tenant_event_date_idx
  ON tenant_crm.leads(tenant_id, event_date) WHERE deleted_at IS NULL AND event_date IS NOT NULL;

CREATE INDEX leads_tenant_source_idx
  ON tenant_crm.leads(tenant_id, lower(source)) WHERE deleted_at IS NULL AND source IS NOT NULL;

CREATE INDEX leads_email_idx
  ON tenant_crm.leads(tenant_id, lower(contact_email))
  WHERE deleted_at IS NULL AND contact_email IS NOT NULL;

-- Indexes for future FKs (Phase 1)
CREATE INDEX leads_assigned_to_idx
  ON tenant_crm.leads(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX leads_converted_to_client_idx
  ON tenant_crm.leads(converted_to_client_id) WHERE converted_to_client_id IS NOT NULL;

-- Triggers
CREATE TRIGGER leads_update_timestamp
  BEFORE UPDATE ON tenant_crm.leads
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER leads_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.leads
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER leads_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.leads
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_crm.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.leads FORCE ROW LEVEL SECURITY;

CREATE POLICY leads_select ON tenant_crm.leads
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY leads_insert ON tenant_crm.leads
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY leads_update ON tenant_crm.leads
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY leads_delete ON tenant_crm.leads
  FOR DELETE USING (false);

CREATE POLICY leads_service ON tenant_crm.leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_CRM.CLIENT_INTERACTIONS
-- ============================================

CREATE TABLE tenant_crm.client_interactions (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  client_id uuid,
  lead_id uuid,
  employee_id uuid NOT NULL,
  interaction_type text NOT NULL,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  subject text,
  description text,
  follow_up_date date,
  follow_up_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FKs (clients and leads exist in this migration)
  FOREIGN KEY (tenant_id, client_id)
    REFERENCES tenant_crm.clients(tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, lead_id)
    REFERENCES tenant_crm.leads(tenant_id, id)
    ON DELETE CASCADE,
  -- Phase 1 FK column (no REFERENCES until 090_cross_module_fks.sql)
  -- Must be linked to either client OR lead, not both
  CHECK ((client_id IS NOT NULL) OR (lead_id IS NOT NULL)),
  CHECK (NOT (client_id IS NOT NULL AND lead_id IS NOT NULL)),
  CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'other')),
  CHECK (length(trim(subject)) <= 200),
  CHECK (description IS NULL OR length(trim(description)) <= 5000)
);

-- Indexes
CREATE INDEX client_interactions_client_idx
  ON tenant_crm.client_interactions(client_id) WHERE deleted_at IS NULL AND client_id IS NOT NULL;

CREATE INDEX client_interactions_lead_idx
  ON tenant_crm.client_interactions(lead_id) WHERE deleted_at IS NULL AND lead_id IS NOT NULL;

CREATE INDEX client_interactions_tenant_employee_idx
  ON tenant_crm.client_interactions(tenant_id, employee_id, interaction_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX client_interactions_tenant_type_idx
  ON tenant_crm.client_interactions(tenant_id, interaction_type) WHERE deleted_at IS NULL;

CREATE INDEX client_interactions_follow_up_idx
  ON tenant_crm.client_interactions(tenant_id, employee_id, follow_up_completed, follow_up_date)
  WHERE deleted_at IS NULL AND follow_up_date IS NOT NULL AND NOT follow_up_completed;

-- Index for future FK (Phase 1)
CREATE INDEX client_interactions_employee_idx
  ON tenant_crm.client_interactions(employee_id);

-- Triggers
CREATE TRIGGER client_interactions_update_timestamp
  BEFORE UPDATE ON tenant_crm.client_interactions
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER client_interactions_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.client_interactions
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER client_interactions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.client_interactions
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_crm.client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.client_interactions FORCE ROW LEVEL SECURITY;

CREATE POLICY client_interactions_select ON tenant_crm.client_interactions
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY client_interactions_insert ON tenant_crm.client_interactions
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY client_interactions_update ON tenant_crm.client_interactions
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY client_interactions_delete ON tenant_crm.client_interactions
  FOR DELETE USING (false);

CREATE POLICY client_interactions_service ON tenant_crm.client_interactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- PROPOSAL AUTO-NUMBERING FUNCTION
-- ============================================

-- Function to generate proposal numbers per tenant (format: PROP-YYYY-NNNN)
CREATE FUNCTION tenant_crm.fn_generate_proposal_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year text;
  v_sequence_num int;
  v_proposal_number text;
BEGIN
  -- Extract year from current date
  v_year := to_char(CURRENT_DATE, 'YYYY');

  -- Get next sequence number for this tenant+year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(proposal_number FROM '\d+$') AS integer)
  ), 0) + 1
  INTO v_sequence_num
  FROM tenant_crm.proposals
  WHERE tenant_id = NEW.tenant_id
    AND proposal_number LIKE 'PROP-' || v_year || '-%';

  -- Generate proposal number
  v_proposal_number := 'PROP-' || v_year || '-' || lpad(v_sequence_num::text, 4, '0');

  -- Set the proposal_number
  NEW.proposal_number := v_proposal_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';


-- ============================================
-- TENANT_CRM.PROPOSALS
-- ============================================

CREATE TABLE tenant_crm.proposals (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  proposal_number text NOT NULL,
  client_id uuid,
  lead_id uuid,
  event_id uuid,
  title text NOT NULL,
  event_date date,
  event_type text,
  guest_count int,
  venue_name text,
  venue_address text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,4) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  valid_until date,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  notes text,
  terms_and_conditions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FKs (clients and leads exist in this migration)
  FOREIGN KEY (tenant_id, client_id)
    REFERENCES tenant_crm.clients(tenant_id, id)
    ON DELETE SET NULL,
  FOREIGN KEY (tenant_id, lead_id)
    REFERENCES tenant_crm.leads(tenant_id, id)
    ON DELETE SET NULL,
  -- Phase 1 FK column (no REFERENCES until 090_cross_module_fks.sql)
  -- Must be linked to either client OR lead, not both
  CHECK ((client_id IS NOT NULL) OR (lead_id IS NOT NULL)),
  CHECK (NOT (client_id IS NOT NULL AND lead_id IS NOT NULL)),
  -- Proposal status references core.status_types category='proposal'
  CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'withdrawn')),
  CHECK (length(trim(title)) <= 200),
  CHECK (length(trim(coalesce(venue_name, ''))) <= 200),
  CHECK (length(trim(coalesce(venue_address, ''))) <= 500),
  CHECK (guest_count IS NULL OR (guest_count > 0 AND guest_count <= 100000)),
  CHECK (subtotal >= 0),
  CHECK (tax_rate >= 0 AND tax_rate <= 1),
  CHECK (tax_amount >= 0),
  CHECK (discount_amount >= 0),
  CHECK (total >= 0),
  CHECK (notes IS NULL OR length(trim(notes)) <= 5000),
  CHECK (terms_and_conditions IS NULL OR length(trim(terms_and_conditions)) <= 10000),
  CHECK (
    (status = 'draft' AND sent_at IS NULL AND viewed_at IS NULL AND accepted_at IS NULL AND rejected_at IS NULL) OR
    (status = 'sent' AND sent_at IS NOT NULL AND viewed_at IS NULL AND accepted_at IS NULL AND rejected_at IS NULL) OR
    (status = 'viewed' AND sent_at IS NOT NULL AND viewed_at IS NOT NULL AND accepted_at IS NULL AND rejected_at IS NULL) OR
    (status = 'accepted' AND accepted_at IS NOT NULL) OR
    (status = 'rejected' AND rejected_at IS NOT NULL) OR
    (status = 'expired' AND sent_at IS NOT NULL) OR
    (status = 'withdrawn')
  )
);

-- Indexes
CREATE INDEX proposals_tenant_number_idx
  ON tenant_crm.proposals(tenant_id, proposal_number) WHERE deleted_at IS NULL;

CREATE INDEX proposals_tenant_status_idx
  ON tenant_crm.proposals(tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX proposals_tenant_client_idx
  ON tenant_crm.proposals(tenant_id, client_id) WHERE deleted_at IS NULL AND client_id IS NOT NULL;

CREATE INDEX proposals_tenant_lead_idx
  ON tenant_crm.proposals(tenant_id, lead_id) WHERE deleted_at IS NULL AND lead_id IS NOT NULL;

CREATE INDEX proposals_tenant_event_date_idx
  ON tenant_crm.proposals(tenant_id, event_date) WHERE deleted_at IS NULL AND event_date IS NOT NULL;

CREATE INDEX proposals_valid_until_idx
  ON tenant_crm.proposals(tenant_id, valid_until)
  WHERE deleted_at IS NULL AND status IN ('sent', 'viewed') AND valid_until IS NOT NULL;

-- Partial unique index after table creation
CREATE UNIQUE INDEX proposals_tenant_number_active_idx
  ON tenant_crm.proposals(tenant_id, proposal_number)
  WHERE deleted_at IS NULL;

-- Index for future FK (Phase 1)
CREATE INDEX proposals_event_id_idx
  ON tenant_crm.proposals(event_id) WHERE event_id IS NOT NULL;

-- Trigger to auto-generate proposal_number on insert
CREATE TRIGGER proposals_generate_number
  BEFORE INSERT ON tenant_crm.proposals
  FOR EACH ROW
  WHEN (NEW.proposal_number IS NULL)
  EXECUTE FUNCTION tenant_crm.fn_generate_proposal_number();

-- Triggers
CREATE TRIGGER proposals_update_timestamp
  BEFORE UPDATE ON tenant_crm.proposals
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER proposals_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.proposals
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER proposals_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.proposals
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_crm.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.proposals FORCE ROW LEVEL SECURITY;

CREATE POLICY proposals_select ON tenant_crm.proposals
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY proposals_insert ON tenant_crm.proposals
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY proposals_update ON tenant_crm.proposals
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY proposals_delete ON tenant_crm.proposals
  FOR DELETE USING (false);

CREATE POLICY proposals_service ON tenant_crm.proposals
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_CRM.PROPOSAL_LINE_ITEMS
-- ============================================

CREATE TABLE tenant_crm.proposal_line_items (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0,
  item_type text NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL,
  total numeric(12,2) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FK (proposals exists in this migration)
  FOREIGN KEY (tenant_id, proposal_id)
    REFERENCES tenant_crm.proposals(tenant_id, id)
    ON DELETE CASCADE,
  CHECK (item_type IN ('dish', 'service', 'rental', 'labor', 'other')),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (total >= 0),
  CHECK (sort_order >= 0 AND sort_order <= 32767),
  CHECK (length(trim(description)) <= 500),
  CHECK (notes IS NULL OR length(trim(notes)) <= 1000)
);

-- Indexes
CREATE INDEX proposal_line_items_proposal_idx
  ON tenant_crm.proposal_line_items(proposal_id) WHERE deleted_at IS NULL;

CREATE INDEX proposal_line_items_tenant_proposal_sort_idx
  ON tenant_crm.proposal_line_items(tenant_id, proposal_id, sort_order) WHERE deleted_at IS NULL;

CREATE INDEX proposal_line_items_tenant_type_idx
  ON tenant_crm.proposal_line_items(tenant_id, item_type) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER proposal_line_items_update_timestamp
  BEFORE UPDATE ON tenant_crm.proposal_line_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER proposal_line_items_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_crm.proposal_line_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER proposal_line_items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_crm.proposal_line_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_crm.proposal_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_crm.proposal_line_items FORCE ROW LEVEL SECURITY;

CREATE POLICY proposal_line_items_select ON tenant_crm.proposal_line_items
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY proposal_line_items_insert ON tenant_crm.proposal_line_items
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY proposal_line_items_update ON tenant_crm.proposal_line_items
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY proposal_line_items_delete ON tenant_crm.proposal_line_items
  FOR DELETE USING (false);

CREATE POLICY proposal_line_items_service ON tenant_crm.proposal_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables created
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'tenant_crm'
ORDER BY tablename;

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'tenant_crm'
ORDER BY tablename, indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'tenant_crm'
ORDER BY tablename;

-- Verify proposal_number function created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'tenant_crm'
  AND routine_name = 'fn_generate_proposal_number';
