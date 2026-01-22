-- Migration: Add event_profitability table for tracking per-event profitability metrics
-- Schema Contract v2 compliance: tenant_events schema, composite PK, RLS, triggers

-- Table: tenant_events.event_profitability
CREATE TABLE IF NOT EXISTS tenant_events.event_profitability (
  tenant_id uuid NOT NULL,
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  
  -- Budgeted amounts
  budgeted_revenue numeric(12,2) NOT NULL DEFAULT 0,
  budgeted_food_cost numeric(12,2) NOT NULL DEFAULT 0,
  budgeted_labor_cost numeric(12,2) NOT NULL DEFAULT 0,
  budgeted_overhead numeric(12,2) NOT NULL DEFAULT 0,
  budgeted_total_cost numeric(12,2) NOT NULL DEFAULT 0,
  budgeted_gross_margin numeric(12,2) NOT NULL DEFAULT 0,
  budgeted_gross_margin_pct numeric(5,2) NOT NULL DEFAULT 0,
  
  -- Actual amounts
  actual_revenue numeric(12,2) NOT NULL DEFAULT 0,
  actual_food_cost numeric(12,2) NOT NULL DEFAULT 0,
  actual_labor_cost numeric(12,2) NOT NULL DEFAULT 0,
  actual_overhead numeric(12,2) NOT NULL DEFAULT 0,
  actual_total_cost numeric(12,2) NOT NULL DEFAULT 0,
  actual_gross_margin numeric(12,2) NOT NULL DEFAULT 0,
  actual_gross_margin_pct numeric(5,2) NOT NULL DEFAULT 0,
  
  -- Variance analysis
  revenue_variance numeric(12,2) NOT NULL DEFAULT 0,
  food_cost_variance numeric(12,2) NOT NULL DEFAULT 0,
  labor_cost_variance numeric(12,2) NOT NULL DEFAULT 0,
  total_cost_variance numeric(12,2) NOT NULL DEFAULT 0,
  margin_variance_pct numeric(5,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculation_method text NOT NULL DEFAULT 'auto', -- 'auto', 'manual', 'hybrid'
  notes text,
  
  -- Standard audit columns
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  
  -- Constraints
  CONSTRAINT event_profitability_pk PRIMARY KEY (tenant_id, id),
  CONSTRAINT event_profitability_event_fk 
    FOREIGN KEY (tenant_id, event_id) 
    REFERENCES tenant_events.events(tenant_id, id) 
    ON DELETE CASCADE,
  CONSTRAINT event_profitability_margin_pct_check 
    CHECK (budgeted_gross_margin_pct >= -100 AND budgeted_gross_margin_pct <= 100),
  CONSTRAINT event_profitability_actual_margin_pct_check 
    CHECK (actual_gross_margin_pct >= -100 AND actual_gross_margin_pct <= 100)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_profitability_event 
  ON tenant_events.event_profitability(event_id);
CREATE INDEX IF NOT EXISTS idx_event_profitability_tenant_event 
  ON tenant_events.event_profitability(tenant_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_profitability_calculated_at 
  ON tenant_events.event_profitability(calculated_at DESC);

-- Add composite foreign key constraint (enforced at DB level)
ALTER TABLE tenant_events.event_profitability 
  ADD CONSTRAINT event_profitability_tenant_fk 
  FOREIGN KEY (tenant_id) 
  REFERENCES platform.accounts(id) 
  ON DELETE RESTRICT;

-- Enable Row Level Security
ALTER TABLE tenant_events.event_profitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.event_profitability FORCE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "event_profitability_select" ON tenant_events.event_profitability
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY "event_profitability_insert" ON tenant_events.event_profitability
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY "event_profitability_update" ON tenant_events.event_profitability
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "event_profitability_delete" ON tenant_events.event_profitability
  FOR DELETE USING (false);

CREATE POLICY "event_profitability_service" ON tenant_events.event_profitability
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Attach standard triggers
CREATE TRIGGER event_profitability_update_timestamp
  BEFORE UPDATE ON tenant_events.event_profitability
  EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER event_profitability_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.event_profitability
  FOR EACH ROW
  EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Enable replica identity for real-time support
ALTER TABLE tenant_events.event_profitability REPLICA IDENTITY FULL;

-- Add comment
COMMENT ON TABLE tenant_events.event_profitability IS 'Tracks profitability metrics per event including revenue, food costs, labor costs, overhead allocation, and margin analysis';
