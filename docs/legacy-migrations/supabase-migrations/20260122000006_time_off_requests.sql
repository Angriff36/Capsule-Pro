-- =====================================================================
-- TIME OFF REQUESTS MODULE
-- =====================================================================
-- Purpose: Track employee time-off requests with approval workflow.
-- Schema: tenant_staff.employee_time_off_requests
-- Spec: scheduling-availability-tracking.md
-- =====================================================================

-- Create ENUM for time-off status
CREATE TYPE tenant_staff.time_off_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

-- Create ENUM for time-off type
CREATE TYPE tenant_staff.time_off_type AS ENUM (
  'VACATION',
  'SICK_LEAVE',
  'PERSONAL_DAY',
  'BEREAVEMENT',
  'MATERNITY_LEAVE',
  'PATERNITY_LEAVE',
  'OTHER'
);

CREATE TABLE tenant_staff.employee_time_off_requests (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status tenant_staff.time_off_status NOT NULL DEFAULT 'PENDING',
  request_type tenant_staff.time_off_type NOT NULL DEFAULT 'VACATION',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  processed_at timestamptz NULL,
  processed_by uuid,
  rejection_reason text,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, employee_id)
    REFERENCES tenant_staff.employees(tenant_id, id)
    ON DELETE CASCADE,
  CHECK (end_date >= start_date),
  CHECK (start_date >= CURRENT_DATE OR (status = 'APPROVED' AND start_date < CURRENT_DATE)),  -- No past date requests unless already approved
  CHECK (reason IS NULL OR length(trim(reason)) <= 500),
  CHECK (rejection_reason IS NULL OR length(trim(rejection_reason)) <= 500),
  CHECK (
    (status != 'APPROVED' AND status != 'REJECTED') OR
    (processed_at IS NOT NULL AND processed_by IS NOT NULL)
  ),  -- Approval/rejection requires processed_at and processed_by
  CHECK (
    status != 'REJECTED' OR rejection_reason IS NOT NULL
  ),  -- Rejection requires reason
  CHECK (
    (status = 'REJECTED' OR status = 'CANCELLED' OR status = 'APPROVED') OR
    processed_at IS NULL
  )  -- Pending requests have no processing info
);

-- Indexes for common queries
CREATE INDEX time_off_requests_tenant_status_idx
  ON tenant_staff.employee_time_off_requests(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX time_off_requests_employee_idx
  ON tenant_staff.employee_time_off_requests(employee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX time_off_requests_date_range_idx
  ON tenant_staff.employee_time_off_requests(start_date, end_date)
  WHERE deleted_at IS NULL AND status IN ('PENDING', 'APPROVED');

CREATE INDEX time_off_requests_tenant_date_idx
  ON tenant_staff.employee_time_off_requests(tenant_id, start_date)
  WHERE deleted_at IS NULL;

CREATE INDEX time_off_requests_processed_by_idx
  ON tenant_staff.employee_time_off_requests(tenant_id, processed_by)
  WHERE processed_by IS NOT NULL AND deleted_at IS NULL;

-- Triggers
CREATE TRIGGER time_off_requests_update_timestamp
  BEFORE UPDATE ON tenant_staff.employee_time_off_requests
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER time_off_requests_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.employee_time_off_requests
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER time_off_requests_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.employee_time_off_requests
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.employee_time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.employee_time_off_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY time_off_requests_select ON tenant_staff.employee_time_off_requests
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY time_off_requests_insert ON tenant_staff.employee_time_off_requests
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY time_off_requests_update ON tenant_staff.employee_time_off_requests
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY time_off_requests_delete ON tenant_staff.employee_time_off_requests
  FOR DELETE USING (false);

CREATE POLICY time_off_requests_service ON tenant_staff.employee_time_off_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to check for overlapping time-off requests
CREATE OR REPLACE FUNCTION tenant_staff.fn_check_time_off_overlap(
  p_employee_id uuid,
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_id uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_overlap_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_overlap_count
  FROM tenant_staff.employee_time_off_requests
  WHERE employee_id = p_employee_id
    AND tenant_id = p_tenant_id
    AND status IN ('PENDING', 'APPROVED')
    AND deleted_at IS NULL
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND (
      (start_date <= p_end_date)
      AND (end_date >= p_start_date)
    );

  RETURN v_overlap_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON FUNCTION tenant_staff.fn_check_time_off_overlap IS
  'Check if a time-off request overlaps with existing pending/approved requests for the same employee';
