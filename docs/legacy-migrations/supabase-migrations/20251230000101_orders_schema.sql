-- MIGRATION: 20251230000100_orders_schema.sql
-- Orders module schema: catering_orders table with RLS policies
-- Follows the kitchen_tasks pattern for multi-tenant isolation

-- ============================================
-- NOTES
-- ============================================
-- Orders belong in tenant_events schema per Schema Contract v2
-- because they are event/catering operations with links to events and clients
-- No new schema created - using existing tenant_events schema
-- Grants handled by existing tenant_events schema
-- ============================================
-- TENANT_EVENTS.CATERING_ORDERS
-- ============================================

CREATE TABLE tenant_events.catering_orders (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,  -- References tenant_crm.clients.id (FK added separately)
  event_id uuid,  -- References tenant_events.events.id (FK added separately, nullable for advance orders)

  -- Order details
  order_number text NOT NULL UNIQUE,
  order_status text NOT NULL DEFAULT 'draft',

  -- Dates
  order_date timestamptz NOT NULL DEFAULT now(),
  delivery_date timestamptz NOT NULL,
  delivery_time text NOT NULL,  -- Format: "HH:MM AM/PM"

  -- Pricing
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  service_charge_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,

  -- Deposit
  deposit_required boolean NOT NULL DEFAULT false,
  deposit_amount numeric(12,2),
  deposit_paid boolean NOT NULL DEFAULT false,
  deposit_paid_at timestamptz,

  -- Venue info
  venue_name text,
  venue_address text,
  venue_city text,
  venue_state text,
  venue_zip text,
  venue_contact_name text,
  venue_contact_phone text,

  -- Special requirements
  guest_count integer NOT NULL DEFAULT 0,
  special_instructions text,
  dietary_restrictions text,

  -- Staffing
  staff_required integer DEFAULT 0,
  staff_assigned integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  PRIMARY KEY (tenant_id, id),
  UNIQUE (id),

  -- Order number format: ORD-YYYY-NNNN
  CHECK (order_number ~ '^ORD-\d{4}-\d{4}$'),

  -- Status validation (common order statuses)
  CHECK (order_status IN (
    'draft',           -- Initial state
    'pending_review',  -- Awaiting manager approval
    'confirmed',       -- Order confirmed
    'in_progress',     -- Order being prepared
    'ready',           -- Ready for delivery/pickup
    'delivered',       -- Order delivered
    'completed',       -- Order finalized
    'cancelled',       -- Order cancelled
    'on_hold'          -- Temporary hold
  )),

  -- Delivery time format validation (HH:MM AM/PM or HH:MM)
  CHECK (delivery_time ~ '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*(AM|PM|am|pm)?$'),

  -- Amount validations
  CHECK (subtotal_amount >= 0),
  CHECK (tax_amount >= 0),
  CHECK (discount_amount >= 0),
  CHECK (service_charge_amount >= 0),
  CHECK (total_amount >= 0),

  -- Deposit validation
  CHECK (
    NOT deposit_required OR
    (deposit_amount IS NOT NULL AND deposit_amount > 0)
  ),

  -- Guest count validation
  CHECK (guest_count > 0),

  -- Staff counts must be non-negative
  CHECK (staff_required >= 0),
  CHECK (staff_assigned >= 0)
);

-- ============================================
-- ORDER STATUS TRANSITION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION tenant_events.fn_validate_order_status_transition(
  p_current_status text,
  p_new_status text
)
RETURNS boolean AS $$
DECLARE
  v_valid_transition boolean := false;
BEGIN
  -- Define valid status transitions
  CASE p_current_status
    WHEN 'draft' THEN
      v_valid_transition := p_new_status IN ('pending_review', 'cancelled', 'on_hold');
    WHEN 'pending_review' THEN
      v_valid_transition := p_new_status IN ('draft', 'confirmed', 'cancelled', 'on_hold');
    WHEN 'confirmed' THEN
      v_valid_transition := p_new_status IN ('in_progress', 'cancelled', 'on_hold');
    WHEN 'in_progress' THEN
      v_valid_transition := p_new_status IN ('ready', 'confirmed', 'on_hold');
    WHEN 'ready' THEN
      v_valid_transition := p_new_status IN ('delivered', 'in_progress', 'on_hold');
    WHEN 'delivered' THEN
      v_valid_transition := p_new_status IN ('completed');
    WHEN 'completed' THEN
      v_valid_transition := false; -- Terminal state
    WHEN 'cancelled' THEN
      v_valid_transition := false; -- Terminal state
    WHEN 'on_hold' THEN
      v_valid_transition := p_new_status IN (p_current_status); -- Must return to previous state
    ELSE
      v_valid_transition := false;
  END CASE;

  RETURN v_valid_transition;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- ORDER STATUS TRANSITION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION tenant_events.fn_enforce_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_valid boolean;
BEGIN
  -- Skip validation if status hasn't changed
  IF NEW.order_status = OLD.order_status THEN
    RETURN NEW;
  END IF;

  -- Validate status transition
  v_valid := tenant_events.fn_validate_order_status_transition(
    OLD.order_status,
    NEW.order_status
  );

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %',
      OLD.order_status, NEW.order_status
    USING ERRCODE = 'DF003',
          HINT = 'Valid transitions are defined in tenant_events.fn_validate_order_status_transition';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- ORDER NUMBER GENERATION
-- ============================================

CREATE OR REPLACE FUNCTION tenant_events.fn_generate_order_number(p_tenant_id uuid, p_order_date timestamptz)
RETURNS text AS $$
DECLARE
  v_year text;
  v_sequence integer;
  v_order_number text;
BEGIN
  -- Extract year from order date
  v_year := to_char(p_order_date, 'YYYY');

  -- Get next sequence number for this tenant/year
  SELECT COALESCE(MAX(CAST(substring(order_number from 10 for 4) AS integer)), 0) + 1
  INTO v_sequence
  FROM tenant_events.catering_orders
  WHERE tenant_id = p_tenant_id
    AND order_number LIKE 'ORD-' || v_year || '-%';

  -- Format: ORD-YYYY-NNNN
  v_order_number := 'ORD-' || v_year || '-' || lpad(v_sequence::text, 4, '0');

  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- INDEXES
-- ============================================

-- Partial index for active orders (tenant + soft delete filtering)
CREATE INDEX catering_orders_tenant_active_idx
  ON tenant_events.catering_orders(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Order status index for dashboard queries
CREATE INDEX catering_orders_tenant_status_idx
  ON tenant_events.catering_orders(tenant_id, order_status)
  WHERE deleted_at IS NULL;

-- Delivery date index for upcoming orders
CREATE INDEX catering_orders_tenant_delivery_idx
  ON tenant_events.catering_orders(tenant_id, delivery_date)
  WHERE deleted_at IS NULL AND deleted_at IS NULL;

-- Customer index for customer order history
CREATE INDEX catering_orders_tenant_customer_idx
  ON tenant_events.catering_orders(tenant_id, customer_id)
  WHERE deleted_at IS NULL;

-- Event index (for event-linked orders)
CREATE INDEX catering_orders_event_idx
  ON tenant_events.catering_orders(event_id)
  WHERE event_id IS NOT NULL AND deleted_at IS NULL;

-- Order number lookup index (for quick reference)
CREATE INDEX catering_orders_order_number_idx
  ON tenant_events.catering_orders(order_number)
  WHERE deleted_at IS NULL;

-- GIN index for text search on special instructions
CREATE INDEX catering_orders_instructions_idx
  ON tenant_events.catering_orders USING GIN (to_tsvector('english', special_instructions));

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE TRIGGER catering_orders_update_timestamp
  BEFORE UPDATE ON tenant_events.catering_orders
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- Prevent tenant mutation trigger
CREATE TRIGGER catering_orders_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_events.catering_orders
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Audit trigger
CREATE TRIGGER catering_orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_events.catering_orders
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- Order status transition enforcement
CREATE TRIGGER catering_orders_enforce_status_transition
  BEFORE UPDATE ON tenant_events.catering_orders
  FOR EACH ROW
    WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status)
  EXECUTE FUNCTION tenant_events.fn_enforce_order_status_transition();

-- Auto-generate order number on insert if not provided
CREATE OR REPLACE FUNCTION tenant_events.fn_auto_generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := tenant_events.fn_generate_order_number(NEW.tenant_id, NEW.order_date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER catering_orders_generate_order_number
  BEFORE INSERT ON tenant_events.catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION tenant_events.fn_auto_generate_order_number();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE tenant_events.catering_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_events.catering_orders FORCE ROW LEVEL SECURITY;

-- SELECT policy - see only non-deleted orders from your tenant
CREATE POLICY catering_orders_select ON tenant_events.catering_orders
  FOR SELECT USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  );

-- INSERT policy - can only insert for your tenant
CREATE POLICY catering_orders_insert ON tenant_events.catering_orders
  FOR INSERT WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND tenant_id IS NOT NULL
  );

-- UPDATE policy - can update own tenant's orders, cannot change tenant_id
CREATE POLICY catering_orders_update ON tenant_events.catering_orders
  FOR UPDATE USING (
    tenant_id = core.fn_get_jwt_tenant_id()
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = core.fn_get_jwt_tenant_id()
  );

-- DELETE policy - soft delete only (hard DELETE blocked)
CREATE POLICY catering_orders_delete ON tenant_events.catering_orders
  FOR DELETE USING (false);

-- Service role bypass
CREATE POLICY catering_orders_service ON tenant_events.catering_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================

-- Grant SELECT, INSERT, UPDATE on table to authenticated
GRANT SELECT, INSERT, UPDATE ON tenant_events.catering_orders TO authenticated;

-- Grant ALL on table to service_role
GRANT ALL ON tenant_events.catering_orders TO service_role;

-- Grant usage on sequences (if any)
-- No sequences used - UUIDs are generated via gen_random_uuid()

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify table created
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'tenant_events' AND tablename = 'catering_orders';

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'tenant_events' AND tablename = 'catering_orders'
ORDER BY indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'tenant_events' AND tablename = 'catering_orders';

-- Verify CHECK constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'tenant_events.catering_orders'::regclass
  AND contype = 'c'
ORDER BY conname;

-- Verify triggers created
SELECT trigger_name, event_manipulation, action_timing, action_condition
FROM information_schema.triggers
WHERE event_object_schema = 'tenant_events'
  AND event_object_table = 'catering_orders'
ORDER BY trigger_name;

-- Verify RLS policies created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'tenant_events' AND tablename = 'catering_orders'
ORDER BY policyname;
