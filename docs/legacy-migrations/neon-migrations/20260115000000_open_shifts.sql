-- =====================================================================
-- OPEN SHIFTS MODULE
-- =====================================================================
-- Purpose: Track unassigned shifts that can be claimed or filled.
-- Schema: tenant_staff.open_shifts
-- =====================================================================

CREATE TABLE tenant_staff.open_shifts (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL,
  location_id uuid NOT NULL,
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  role_during_shift text,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'claimed', 'filled', 'canceled')
  ),
  claimed_by uuid,
  claimed_at timestamptz,
  assigned_shift_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, schedule_id)
    REFERENCES tenant_staff.schedules(tenant_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, assigned_shift_id)
    REFERENCES tenant_staff.schedule_shifts(tenant_id, id)
    ON DELETE SET NULL,
  CHECK (shift_end > shift_start),
  CHECK (role_during_shift IS NULL OR length(role_during_shift) <= 100),
  CHECK (notes IS NULL OR length(trim(notes)) <= 1000),
  CHECK (claimed_at IS NULL OR claimed_by IS NOT NULL)
);

CREATE INDEX open_shifts_tenant_status_idx
  ON tenant_staff.open_shifts(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX open_shifts_schedule_idx
  ON tenant_staff.open_shifts(schedule_id)
  WHERE deleted_at IS NULL;

CREATE INDEX open_shifts_location_time_idx
  ON tenant_staff.open_shifts(tenant_id, location_id, shift_start)
  WHERE deleted_at IS NULL;

CREATE INDEX open_shifts_tenant_time_idx
  ON tenant_staff.open_shifts(tenant_id, shift_start)
  WHERE deleted_at IS NULL;

CREATE INDEX open_shifts_claimed_idx
  ON tenant_staff.open_shifts(tenant_id, claimed_by)
  WHERE claimed_by IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER open_shifts_update_timestamp
  BEFORE UPDATE ON tenant_staff.open_shifts
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER open_shifts_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.open_shifts
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER open_shifts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.open_shifts
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

ALTER TABLE tenant_staff.open_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.open_shifts FORCE ROW LEVEL SECURITY;

CREATE POLICY open_shifts_select ON tenant_staff.open_shifts
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY open_shifts_insert ON tenant_staff.open_shifts
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY open_shifts_update ON tenant_staff.open_shifts
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY open_shifts_delete ON tenant_staff.open_shifts
  FOR DELETE USING (false);

CREATE POLICY open_shifts_service ON tenant_staff.open_shifts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
