-- MIGRATION: 20251225000138_crm_fix_rls.sql
-- Fix CRM module RLS policies to use core.fn_get_jwt_tenant_id() for local dev compatibility.

-- 1. Clients
DROP POLICY IF EXISTS clients_select ON tenant_crm.clients;
DROP POLICY IF EXISTS clients_insert ON tenant_crm.clients;
DROP POLICY IF EXISTS clients_update ON tenant_crm.clients;

CREATE POLICY clients_select ON tenant_crm.clients
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY clients_insert ON tenant_crm.clients
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY clients_update ON tenant_crm.clients
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- 2. Client Contacts
DROP POLICY IF EXISTS client_contacts_select ON tenant_crm.client_contacts;
DROP POLICY IF EXISTS client_contacts_insert ON tenant_crm.client_contacts;
DROP POLICY IF EXISTS client_contacts_update ON tenant_crm.client_contacts;

CREATE POLICY client_contacts_select ON tenant_crm.client_contacts
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY client_contacts_insert ON tenant_crm.client_contacts
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY client_contacts_update ON tenant_crm.client_contacts
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- 3. Leads
DROP POLICY IF EXISTS leads_select ON tenant_crm.leads;
DROP POLICY IF EXISTS leads_insert ON tenant_crm.leads;
DROP POLICY IF EXISTS leads_update ON tenant_crm.leads;

CREATE POLICY leads_select ON tenant_crm.leads
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY leads_insert ON tenant_crm.leads
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY leads_update ON tenant_crm.leads
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- 4. Proposals
DROP POLICY IF EXISTS proposals_select ON tenant_crm.proposals;
DROP POLICY IF EXISTS proposals_insert ON tenant_crm.proposals;
DROP POLICY IF EXISTS proposals_update ON tenant_crm.proposals;

CREATE POLICY proposals_select ON tenant_crm.proposals
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY proposals_insert ON tenant_crm.proposals
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY proposals_update ON tenant_crm.proposals
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- 5. Proposal Line Items
DROP POLICY IF EXISTS proposal_line_items_select ON tenant_crm.proposal_line_items;
DROP POLICY IF EXISTS proposal_line_items_insert ON tenant_crm.proposal_line_items;
DROP POLICY IF EXISTS proposal_line_items_update ON tenant_crm.proposal_line_items;

CREATE POLICY proposal_line_items_select ON tenant_crm.proposal_line_items
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY proposal_line_items_insert ON tenant_crm.proposal_line_items
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY proposal_line_items_update ON tenant_crm.proposal_line_items
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- 6. Client Interactions
DROP POLICY IF EXISTS client_interactions_select ON tenant_crm.client_interactions;
DROP POLICY IF EXISTS client_interactions_insert ON tenant_crm.client_interactions;
DROP POLICY IF EXISTS client_interactions_update ON tenant_crm.client_interactions;

CREATE POLICY client_interactions_select ON tenant_crm.client_interactions
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY client_interactions_insert ON tenant_crm.client_interactions
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY client_interactions_update ON tenant_crm.client_interactions
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- 7. Client Preferences
DROP POLICY IF EXISTS client_preferences_select ON tenant_crm.client_preferences;
DROP POLICY IF EXISTS client_preferences_insert ON tenant_crm.client_preferences;
DROP POLICY IF EXISTS client_preferences_update ON tenant_crm.client_preferences;

CREATE POLICY client_preferences_select ON tenant_crm.client_preferences
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

CREATE POLICY client_preferences_insert ON tenant_crm.client_preferences
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

CREATE POLICY client_preferences_update ON tenant_crm.client_preferences
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );









