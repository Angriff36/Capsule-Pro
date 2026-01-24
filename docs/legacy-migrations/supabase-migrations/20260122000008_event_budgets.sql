-- Migration: Event Budget Management
-- Description: Create EventBudget and BudgetLineItem models for tracking event budgets with line items
-- Schema: tenant_events

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Event Budget Status Enum
-- ============================================
CREATE TYPE tenant_events.event_budget_status AS ENUM (
  'draft',      -- Budget is being created/edited
  'approved',   -- Budget approved for execution
  'locked'      -- Budget locked (after event completion)
);

-- ============================================
-- Budget Line Item Category Enum
-- ============================================
CREATE TYPE tenant_events.budget_line_item_category AS ENUM (
  'food',           -- Food and beverage costs
  'labor',          -- Staffing and labor costs
  'rentals',        -- Equipment and venue rentals
  'miscellaneous'   -- Other miscellaneous costs
);

-- ============================================
-- Event Budgets Table
-- ============================================
-- Main budget table for tracking event budgets with versioning support
CREATE TABLE tenant_events.event_budgets (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Event reference
  event_id UUID NOT NULL,

  -- Version tracking (allows multiple revisions)
  version INT NOT NULL DEFAULT 1,

  -- Budget status
  status event_budget_status NOT NULL DEFAULT 'draft',

  -- Budget totals (calculated from line items)
  total_budget_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_actual_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  variance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  variance_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,

  -- Additional information
  notes TEXT,

  -- Audit trail
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ(6),

  -- Foreign key constraints
  CONSTRAINT event_budgets_tenant_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.accounts(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT event_budgets_event_fkey
    FOREIGN KEY (event_id, tenant_id)
    REFERENCES tenant_events.events(id, tenant_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Business rule constraints
  CONSTRAINT event_budgets_total_budget_nonnegative
    CHECK (total_budget_amount >= 0),

  CONSTRAINT event_budgets_version_positive
    CHECK (version > 0)
);

-- ============================================
-- Budget Line Items Table
-- ============================================
-- Individual line items within a budget
CREATE TABLE tenant_events.budget_line_items (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Budget reference
  budget_id UUID NOT NULL,

  -- Line item details
  category budget_line_item_category NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Budget vs Actuals
  budgeted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  variance_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Display order
  sort_order INT NOT NULL DEFAULT 0,

  -- Additional information
  notes TEXT,

  -- Audit trail
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ(6),

  -- Foreign key constraints
  CONSTRAINT budget_line_items_tenant_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES public.accounts(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT budget_line_items_budget_fkey
    FOREIGN KEY (budget_id, tenant_id)
    REFERENCES tenant_events.event_budgets(id, tenant_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Business rule constraints
  CONSTRAINT budget_line_items_amounts_nonnegative
    CHECK (budgeted_amount >= 0 AND actual_amount >= 0)
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Event Budgets indexes
CREATE INDEX idx_event_budgets_tenant_id ON tenant_events.event_budgets(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_budgets_event_id ON tenant_events.event_budgets(event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_budgets_status ON tenant_events.event_budgets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_budgets_tenant_event ON tenant_events.event_budgets(tenant_id, event_id) WHERE deleted_at IS NULL;

-- Budget Line Items indexes
CREATE INDEX idx_budget_line_items_tenant_id ON tenant_events.budget_line_items(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_budget_line_items_budget_id ON tenant_events.budget_line_items(budget_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_budget_line_items_category ON tenant_events.budget_line_items(category) WHERE deleted_at IS NULL;

-- ============================================
-- Composite Unique Constraints
-- ============================================

-- Ensure one active budget per event (excluding deleted and previous versions)
-- This allows versioning while preventing duplicate active budgets
CREATE UNIQUE INDEX idx_event_budgets_unique_active
  ON tenant_events.event_budgets(event_id, tenant_id)
  WHERE deleted_at IS NULL AND status IN ('draft', 'approved');

-- ============================================
-- Helper Functions for Budget Calculations
-- ============================================

-- Function to update budget totals from line items
CREATE OR REPLACE FUNCTION tenant_events.update_budget_totals(p_budget_id UUID, p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_budget DECIMAL(12, 2);
  v_total_actual DECIMAL(12, 2);
  v_variance DECIMAL(12, 2);
  v_variance_pct DECIMAL(5, 2);
BEGIN
  -- Calculate totals from line items
  SELECT
    COALESCE(SUM(budgeted_amount), 0),
    COALESCE(SUM(actual_amount), 0)
  INTO v_total_budget, v_total_actual
  FROM tenant_events.budget_line_items
  WHERE budget_id = p_budget_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  -- Calculate variance
  v_variance := v_total_actual - v_total_budget;

  -- Calculate variance percentage (handle division by zero)
  IF v_total_budget > 0 THEN
    v_variance_pct := (v_variance / v_total_budget) * 100;
  ELSE
    v_variance_pct := 0;
  END IF;

  -- Update budget totals
  UPDATE tenant_events.event_budgets
  SET
    total_budget_amount = v_total_budget,
    total_actual_amount = v_total_actual,
    variance_amount = v_variance,
    variance_percentage = v_variance_pct,
    updated_at = NOW()
  WHERE id = p_budget_id
    AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update line item variance
CREATE OR REPLACE FUNCTION tenant_events.update_line_item_variance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate variance for the line item
  NEW.variance_amount := NEW.actual_amount - NEW.budgeted_amount;

  -- Update budget totals when line item changes
  PERFORM tenant_events.update_budget_totals(NEW.budget_id, NEW.tenant_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers for Automatic Calculations
-- ============================================

-- Trigger to update line item variance on insert/update
CREATE TRIGGER trigger_update_line_item_variance
  BEFORE INSERT OR UPDATE OF budgeted_amount, actual_amount
  ON tenant_events.budget_line_items
  FOR EACH ROW
  EXECUTE FUNCTION tenant_events.update_line_item_variance();

-- Trigger to update budget totals when line item is deleted
CREATE TRIGGER trigger_update_budget_on_line_item_delete
  AFTER DELETE
  ON tenant_events.budget_line_items
  FOR EACH ROW
  EXECUTE FUNCTION tenant_events.update_budget_totals(OLD.budget_id, OLD.tenant_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on both tables
ALTER TABLE tenant_events.event_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.budget_line_items ENABLE ROW LEVEL SECURITY;

-- Event Budgets RLS policies
CREATE POLICY "Allow tenant members to view budgets"
  ON tenant_events.event_budgets
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID AND deleted_at IS NULL);

CREATE POLICY "Allow tenant members to create budgets"
  ON tenant_events.event_budgets
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Allow tenant members to update own budgets"
  ON tenant_events.event_budgets
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID AND deleted_at IS NULL)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Allow tenant members to soft delete budgets"
  ON tenant_events.event_budgets
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID AND deleted_at IS NULL);

-- Budget Line Items RLS policies
CREATE POLICY "Allow tenant members to view line items"
  ON tenant_events.budget_line_items
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID AND deleted_at IS NULL);

CREATE POLICY "Allow tenant members to create line items"
  ON tenant_events.budget_line_items
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Allow tenant members to update own line items"
  ON tenant_events.budget_line_items
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID AND deleted_at IS NULL)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY "Allow tenant members to soft delete line items"
  ON tenant_events.budget_line_items
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID AND deleted_at IS NULL);

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE tenant_events.event_budgets IS 'Event budgets with versioning and line items';
COMMENT ON TABLE tenant_events.budget_line_items IS 'Individual line items within event budgets';
COMMENT ON COLUMN tenant_events.event_budgets.version IS 'Version number for budget revisions';
COMMENT ON COLUMN tenant_events.event_budgets.status IS 'Budget workflow status: draft, approved, locked';
COMMENT ON COLUMN tenant_events.event_budgets.variance_amount IS 'Total variance (actual - budget)';
COMMENT ON COLUMN tenant_events.event_budgets.variance_percentage IS 'Variance as percentage of budget';
COMMENT ON COLUMN tenant_events.budget_line_items.category IS 'Line item category: food, labor, rentals, miscellaneous';
COMMENT ON COLUMN tenant_events.budget_line_items.variance_amount IS 'Line item variance (actual - budgeted)';
