-- MIGRATION: 20251222000104_staff.sql
-- Staff module: employees (full schema), employee_locations, employee_certifications,
-- employee_availability, schedules, schedule_shifts, time_entries,
-- payroll_periods, payroll_runs, payroll_line_items
-- Employees table is ALTERed from existing stub (tenant_base migration)

-- Ensure btree_gist extension is available for EXCLUDE constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- TENANT_STAFF.EMPLOYEES (ALTER existing stub)
-- ============================================
-- Stub exists in 20251222000102_tenant_base.sql with:
--   tenant_id, id, email, first_name, last_name, role, created_at, updated_at, deleted_at
-- Adding remaining columns per Schema Registry v2

ALTER TABLE tenant_staff.employees
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS employee_number text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS employment_type core.employment_type NOT NULL DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS salary_annual numeric(12,2),
  ADD COLUMN IF NOT EXISTS hire_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS termination_date date,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add UNIQUE (tenant_id, id) for composite FK references
-- Note: PRIMARY KEY (tenant_id, id) already exists from stub
CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_id_unique_idx
  ON tenant_staff.employees (tenant_id, id);

-- Add constraints for employment type (must have either hourly_rate or salary_annual)
ALTER TABLE tenant_staff.employees
  ADD CONSTRAINT employees_compensation_check
  CHECK (
    (employment_type = 'contractor' AND hourly_rate IS NOT NULL) OR
    (employment_type IN ('full_time', 'part_time', 'temp') AND (hourly_rate IS NOT NULL OR salary_annual IS NOT NULL))
  );

-- Partial unique index for active employee numbers
CREATE UNIQUE INDEX IF NOT EXISTS employees_tenant_number_active_idx
  ON tenant_staff.employees (tenant_id, employee_number)
  WHERE deleted_at IS NULL AND employee_number IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS employees_tenant_type_idx
  ON tenant_staff.employees (tenant_id, employment_type) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employees_tenant_active_idx
  ON tenant_staff.employees (tenant_id, is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employees_auth_user_idx
  ON tenant_staff.employees (auth_user_id) WHERE auth_user_id IS NOT NULL;


-- ============================================
-- TENANT_STAFF.EMPLOYEE_LOCATIONS (junction)
-- ============================================

CREATE TABLE tenant_staff.employee_locations (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL,
  location_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, employee_id, location_id),
  -- Phase 1 FK columns (no REFERENCES until 090_cross_module_fks.sql)
  CHECK (employee_id IS NOT NULL),
  CHECK (location_id IS NOT NULL)
);

-- Indexes for future FK (Phase 1 - no REFERENCES yet)
CREATE INDEX employee_locations_employee_idx
  ON tenant_staff.employee_locations(employee_id);

CREATE INDEX employee_locations_location_idx
  ON tenant_staff.employee_locations(location_id);

-- Unique: one primary location per employee
CREATE UNIQUE INDEX employee_locations_employee_primary_idx
  ON tenant_staff.employee_locations(tenant_id, employee_id)
  WHERE is_primary = true AND deleted_at IS NULL;

-- Triggers
CREATE TRIGGER employee_locations_update_timestamp
  BEFORE UPDATE ON tenant_staff.employee_locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER employee_locations_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.employee_locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER employee_locations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.employee_locations
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.employee_locations FORCE ROW LEVEL SECURITY;

CREATE POLICY employee_locations_select ON tenant_staff.employee_locations
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY employee_locations_insert ON tenant_staff.employee_locations
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employee_locations_update ON tenant_staff.employee_locations
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY employee_locations_delete ON tenant_staff.employee_locations
  FOR DELETE USING (false);

CREATE POLICY employee_locations_service ON tenant_staff.employee_locations
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.EMPLOYEE_CERTIFICATIONS
-- ============================================

CREATE TABLE tenant_staff.employee_certifications (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  certification_type text NOT NULL,
  certification_name text NOT NULL,
  issued_date date NOT NULL,
  expiry_date date,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Phase 1 FK column (no REFERENCES until 090_cross_module_fks.sql)
  CHECK (employee_id IS NOT NULL),
  CHECK (issued_date <= COALESCE(expiry_date, issued_date + INTERVAL '100 years')),
  CHECK (certification_type ~ '^[a-z_]+$'),
  CHECK (length(certification_name) <= 200),
  CHECK (document_url IS NULL OR document_url ~ '^https?://')
);

-- Index for future FK (Phase 1)
CREATE INDEX employee_certifications_employee_idx
  ON tenant_staff.employee_certifications(employee_id);

-- Indexes for expiry tracking
CREATE INDEX employee_certifications_tenant_employee_expiry_idx
  ON tenant_staff.employee_certifications(tenant_id, employee_id, expiry_date)
  WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;

CREATE INDEX employee_certifications_type_idx
  ON tenant_staff.employee_certifications(lower(certification_type))
  WHERE deleted_at IS NULL;

-- Partial unique: one certification per employee+type (active records only)
-- NOTE: Expiry filtering handled at application layer
CREATE UNIQUE INDEX employee_certifications_employee_type_active_idx
  ON tenant_staff.employee_certifications(tenant_id, employee_id, certification_type)
  WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER employee_certifications_update_timestamp
  BEFORE UPDATE ON tenant_staff.employee_certifications
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER employee_certifications_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.employee_certifications
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER employee_certifications_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.employee_certifications
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.employee_certifications FORCE ROW LEVEL SECURITY;

CREATE POLICY employee_certifications_select ON tenant_staff.employee_certifications
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY employee_certifications_insert ON tenant_staff.employee_certifications
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employee_certifications_update ON tenant_staff.employee_certifications
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY employee_certifications_delete ON tenant_staff.employee_certifications
  FOR DELETE USING (false);

CREATE POLICY employee_certifications_service ON tenant_staff.employee_certifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.EMPLOYEE_AVAILABILITY
-- ============================================
-- NOTE: No overlap protection implemented here. Complex EXCLUDE constraint with
--       day_of_week + time ranges would require btree_gist + custom composite type.
--       Application layer should validate no overlapping availability entries.

CREATE TABLE tenant_staff.employee_availability (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Phase 1 FK column (no REFERENCES until 090_cross_module_fks.sql)
  CHECK (employee_id IS NOT NULL),
  CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CHECK (end_time > start_time),
  CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- Index for future FK (Phase 1)
CREATE INDEX employee_availability_employee_idx
  ON tenant_staff.employee_availability(employee_id);

-- Indexes for scheduling queries
-- NOTE: Effective date filtering handled at application layer
CREATE INDEX employee_availability_tenant_employee_day_idx
  ON tenant_staff.employee_availability(tenant_id, employee_id, day_of_week)
  WHERE deleted_at IS NULL;

CREATE INDEX employee_availability_effective_idx
  ON tenant_staff.employee_availability(tenant_id, employee_id, effective_from, effective_until)
  WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER employee_availability_update_timestamp
  BEFORE UPDATE ON tenant_staff.employee_availability
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER employee_availability_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.employee_availability
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER employee_availability_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.employee_availability
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.employee_availability FORCE ROW LEVEL SECURITY;

CREATE POLICY employee_availability_select ON tenant_staff.employee_availability
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY employee_availability_insert ON tenant_staff.employee_availability
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY employee_availability_update ON tenant_staff.employee_availability
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY employee_availability_delete ON tenant_staff.employee_availability
  FOR DELETE USING (false);

CREATE POLICY employee_availability_service ON tenant_staff.employee_availability
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.SCHEDULES
-- ============================================

CREATE TABLE tenant_staff.schedules (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  location_id uuid,
  schedule_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Phase 1 FK column (no REFERENCES until 090_cross_module_fks.sql)
  CHECK (location_id IS NOT NULL OR location_id IS NULL),
  CHECK (status IN ('draft', 'published', 'locked')),
  CHECK (published_at IS NULL OR status IN ('published', 'locked')),
  CHECK (published_by IS NULL OR published_at IS NOT NULL)
);

-- Partial unique: one schedule per location per date (NULL location = all locations)
CREATE UNIQUE INDEX schedules_tenant_location_date_active_idx
  ON tenant_staff.schedules(tenant_id, location_id, schedule_date)
  WHERE deleted_at IS NULL;

-- Index for future FK (Phase 1)
CREATE INDEX schedules_location_idx
  ON tenant_staff.schedules(location_id) WHERE location_id IS NOT NULL;

-- Indexes for scheduling
CREATE INDEX schedules_tenant_date_idx
  ON tenant_staff.schedules(tenant_id, schedule_date) WHERE deleted_at IS NULL;

CREATE INDEX schedules_tenant_status_idx
  ON tenant_staff.schedules(tenant_id, status) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER schedules_update_timestamp
  BEFORE UPDATE ON tenant_staff.schedules
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER schedules_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.schedules
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER schedules_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.schedules
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.schedules FORCE ROW LEVEL SECURITY;

CREATE POLICY schedules_select ON tenant_staff.schedules
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY schedules_insert ON tenant_staff.schedules
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY schedules_update ON tenant_staff.schedules
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY schedules_delete ON tenant_staff.schedules
  FOR DELETE USING (false);

CREATE POLICY schedules_service ON tenant_staff.schedules
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.SCHEDULE_SHIFTS
-- ============================================

CREATE TABLE tenant_staff.schedule_shifts (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  location_id uuid NOT NULL,
  shift_start timestamptz NOT NULL,
  shift_end timestamptz NOT NULL,
  role_during_shift text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FK (schedules exists in this migration)
  FOREIGN KEY (tenant_id, schedule_id)
    REFERENCES tenant_staff.schedules(tenant_id, id)
    ON DELETE CASCADE,
  -- Phase 1 FK columns (no REFERENCES until 090_cross_module_fks.sql)
  CHECK (employee_id IS NOT NULL),
  CHECK (location_id IS NOT NULL),
  CHECK (shift_end > shift_start),
  CHECK (role_during_shift IS NULL OR length(role_during_shift) <= 100),
  CHECK (notes IS NULL OR length(trim(notes)) <= 1000)
);

-- Indexes for future FKs (Phase 1)
CREATE INDEX schedule_shifts_employee_idx
  ON tenant_staff.schedule_shifts(employee_id);

CREATE INDEX schedule_shifts_location_idx
  ON tenant_staff.schedule_shifts(location_id);

-- Indexes for scheduling queries
CREATE INDEX schedule_shifts_tenant_employee_time_idx
  ON tenant_staff.schedule_shifts(tenant_id, employee_id, shift_start, shift_end)
  WHERE deleted_at IS NULL;

CREATE INDEX schedule_shifts_schedule_idx
  ON tenant_staff.schedule_shifts(schedule_id) WHERE deleted_at IS NULL;

CREATE INDEX schedule_shifts_location_time_idx
  ON tenant_staff.schedule_shifts(tenant_id, location_id, shift_start)
  WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER schedule_shifts_update_timestamp
  BEFORE UPDATE ON tenant_staff.schedule_shifts
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER schedule_shifts_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.schedule_shifts
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER schedule_shifts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.schedule_shifts
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.schedule_shifts FORCE ROW LEVEL SECURITY;

CREATE POLICY schedule_shifts_select ON tenant_staff.schedule_shifts
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY schedule_shifts_insert ON tenant_staff.schedule_shifts
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY schedule_shifts_update ON tenant_staff.schedule_shifts
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY schedule_shifts_delete ON tenant_staff.schedule_shifts
  FOR DELETE USING (false);

CREATE POLICY schedule_shifts_service ON tenant_staff.schedule_shifts
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.TIME_ENTRIES
-- ============================================

CREATE TABLE tenant_staff.time_entries (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  location_id uuid,
  shift_id uuid,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  break_minutes smallint NOT NULL DEFAULT 0,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FK (schedule_shifts exists in this migration)
  FOREIGN KEY (tenant_id, shift_id)
    REFERENCES tenant_staff.schedule_shifts(tenant_id, id)
    ON DELETE SET NULL,
  -- Phase 1 FK columns (no REFERENCES until 090_cross_module_fks.sql)
  CHECK (employee_id IS NOT NULL),
  CHECK (clock_out IS NULL OR clock_out > clock_in),
  CHECK (break_minutes >= 0 AND break_minutes <= 480),  -- Max 8 hours break
  CHECK (notes IS NULL OR length(trim(notes)) <= 1000),
  CHECK (approved_at IS NULL OR approved_by IS NOT NULL),
  CHECK (clock_out IS NOT NULL OR approved_at IS NULL)  -- Can't approve open entry
);

-- Indexes for future FKs (Phase 1)
CREATE INDEX time_entries_employee_idx
  ON tenant_staff.time_entries(employee_id);

CREATE INDEX time_entries_location_idx
  ON tenant_staff.time_entries(location_id) WHERE location_id IS NOT NULL;

-- Indexes for payroll queries (per Schema Contract v2)
CREATE INDEX time_entries_tenant_employee_clock_idx
  ON tenant_staff.time_entries(tenant_id, employee_id, clock_in DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX time_entries_tenant_approved_idx
  ON tenant_staff.time_entries(tenant_id, approved_at) WHERE deleted_at IS NULL AND approved_at IS NOT NULL;

-- Indexes for time entry tracking
CREATE INDEX time_entries_shift_idx
  ON tenant_staff.time_entries(shift_id) WHERE shift_id IS NOT NULL;

CREATE INDEX time_entries_open_idx
  ON tenant_staff.time_entries(tenant_id, employee_id) WHERE deleted_at IS NULL AND clock_out IS NULL;

-- Triggers
CREATE TRIGGER time_entries_update_timestamp
  BEFORE UPDATE ON tenant_staff.time_entries
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER time_entries_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.time_entries
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

-- Note: Audit configured per Schema Contract v2 (status_only - clock-in/out only, not GPS pings)
CREATE TRIGGER time_entries_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.time_entries
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.time_entries FORCE ROW LEVEL SECURITY;

CREATE POLICY time_entries_select ON tenant_staff.time_entries
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY time_entries_insert ON tenant_staff.time_entries
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY time_entries_update ON tenant_staff.time_entries
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY time_entries_delete ON tenant_staff.time_entries
  FOR DELETE USING (false);

CREATE POLICY time_entries_service ON tenant_staff.time_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.PAYROLL_PERIODS
-- ============================================

CREATE TABLE tenant_staff.payroll_periods (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  CHECK (period_end > period_start),
  CHECK (status IN ('open', 'processing', 'completed'))
);

-- Partial unique: no overlapping periods per tenant
CREATE UNIQUE INDEX payroll_periods_tenant_dates_active_idx
  ON tenant_staff.payroll_periods(tenant_id, period_start, period_end)
  WHERE deleted_at IS NULL;

-- EXCLUDE constraint: prevent overlapping payroll periods per tenant
ALTER TABLE tenant_staff.payroll_periods
  ADD CONSTRAINT payroll_periods_no_overlap_excl
  EXCLUDE USING GIST (
    tenant_id WITH =,
    daterange(period_start, period_end) WITH &&
  ) WHERE (deleted_at IS NULL);

-- Indexes
CREATE INDEX payroll_periods_tenant_status_idx
  ON tenant_staff.payroll_periods(tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX payroll_periods_tenant_dates_idx
  ON tenant_staff.payroll_periods(tenant_id, period_start DESC) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER payroll_periods_update_timestamp
  BEFORE UPDATE ON tenant_staff.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER payroll_periods_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER payroll_periods_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.payroll_periods FORCE ROW LEVEL SECURITY;

CREATE POLICY payroll_periods_select ON tenant_staff.payroll_periods
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY payroll_periods_insert ON tenant_staff.payroll_periods
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY payroll_periods_update ON tenant_staff.payroll_periods
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY payroll_periods_delete ON tenant_staff.payroll_periods
  FOR DELETE USING (false);

CREATE POLICY payroll_periods_service ON tenant_staff.payroll_periods
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.PAYROLL_RUNS
-- ============================================

CREATE TABLE tenant_staff.payroll_runs (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  payroll_period_id uuid NOT NULL,
  run_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  total_gross numeric(12,2) NOT NULL DEFAULT 0,
  total_deductions numeric(12,2) NOT NULL DEFAULT 0,
  total_net numeric(12,2) NOT NULL DEFAULT 0,
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FK (payroll_periods exists in this migration)
  FOREIGN KEY (tenant_id, payroll_period_id)
    REFERENCES tenant_staff.payroll_periods(tenant_id, id)
    ON DELETE RESTRICT,
  CHECK (status IN ('pending', 'approved', 'paid', 'void')),
  CHECK (total_gross >= 0),
  CHECK (total_deductions >= 0),
  CHECK (total_net >= 0),
  CHECK (approved_at IS NULL OR status IN ('approved', 'paid', 'void')),
  CHECK (paid_at IS NULL OR status IN ('paid', 'void')),
  CHECK (approved_by IS NULL OR approved_at IS NOT NULL)
);

-- Indexes
CREATE INDEX payroll_runs_tenant_period_idx
  ON tenant_staff.payroll_runs(tenant_id, payroll_period_id) WHERE deleted_at IS NULL;

CREATE INDEX payroll_runs_tenant_status_idx
  ON tenant_staff.payroll_runs(tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX payroll_runs_run_date_idx
  ON tenant_staff.payroll_runs(run_date DESC) WHERE deleted_at IS NULL;

-- Index for future FK (Phase 1)
CREATE INDEX payroll_runs_approved_by_idx
  ON tenant_staff.payroll_runs(approved_by) WHERE approved_by IS NOT NULL;

-- Triggers
CREATE TRIGGER payroll_runs_update_timestamp
  BEFORE UPDATE ON tenant_staff.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER payroll_runs_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER payroll_runs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.payroll_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY payroll_runs_select ON tenant_staff.payroll_runs
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY payroll_runs_insert ON tenant_staff.payroll_runs
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY payroll_runs_update ON tenant_staff.payroll_runs
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY payroll_runs_delete ON tenant_staff.payroll_runs
  FOR DELETE USING (false);

CREATE POLICY payroll_runs_service ON tenant_staff.payroll_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- TENANT_STAFF.PAYROLL_LINE_ITEMS
-- ============================================

CREATE TABLE tenant_staff.payroll_line_items (
  tenant_id uuid NOT NULL REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  id uuid DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  hours_regular numeric(6,2) NOT NULL DEFAULT 0,
  hours_overtime numeric(6,2) NOT NULL DEFAULT 0,
  rate_regular numeric(10,2) NOT NULL,
  rate_overtime numeric(10,2) NOT NULL,
  gross_pay numeric(10,2) NOT NULL,
  deductions jsonb NOT NULL DEFAULT '{}',
  net_pay numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, id),
  -- Same-table FK (payroll_runs exists in this migration)
  FOREIGN KEY (tenant_id, payroll_run_id)
    REFERENCES tenant_staff.payroll_runs(tenant_id, id)
    ON DELETE CASCADE,
  -- Phase 1 FK column (no REFERENCES until 090_cross_module_fks.sql)
  CHECK (employee_id IS NOT NULL),
  CHECK (hours_regular >= 0 AND hours_regular <= 168),  -- Max hours/week
  CHECK (hours_overtime >= 0 AND hours_overtime <= 168),
  CHECK (rate_regular > 0),
  CHECK (rate_overtime > 0),
  CHECK (gross_pay >= 0),
  CHECK (net_pay >= 0),
  CHECK (gross_pay >= net_pay),  -- Deductions should not increase pay
  CHECK (jsonb_typeof(deductions) = 'object')
);

-- Unique: one line item per employee per payroll run
CREATE UNIQUE INDEX payroll_line_items_run_employee_active_idx
  ON tenant_staff.payroll_line_items(tenant_id, payroll_run_id, employee_id)
  WHERE deleted_at IS NULL;

-- Index for future FK (Phase 1)
CREATE INDEX payroll_line_items_employee_idx
  ON tenant_staff.payroll_line_items(employee_id);

-- Indexes
CREATE INDEX payroll_line_items_tenant_run_idx
  ON tenant_staff.payroll_line_items(tenant_id, payroll_run_id) WHERE deleted_at IS NULL;

CREATE INDEX payroll_line_items_tenant_employee_idx
  ON tenant_staff.payroll_line_items(tenant_id, employee_id) WHERE deleted_at IS NULL;

-- Triggers
CREATE TRIGGER payroll_line_items_update_timestamp
  BEFORE UPDATE ON tenant_staff.payroll_line_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

CREATE TRIGGER payroll_line_items_prevent_tenant_mutation
  BEFORE UPDATE ON tenant_staff.payroll_line_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();

CREATE TRIGGER payroll_line_items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenant_staff.payroll_line_items
  FOR EACH ROW EXECUTE FUNCTION core.fn_audit_trigger();

-- RLS Policies
ALTER TABLE tenant_staff.payroll_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff.payroll_line_items FORCE ROW LEVEL SECURITY;

CREATE POLICY payroll_line_items_select ON tenant_staff.payroll_line_items
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  );

CREATE POLICY payroll_line_items_insert ON tenant_staff.payroll_line_items
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND tenant_id IS NOT NULL
  );

CREATE POLICY payroll_line_items_update ON tenant_staff.payroll_line_items
  FOR UPDATE USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND deleted_at IS NULL
  ) WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY payroll_line_items_delete ON tenant_staff.payroll_line_items
  FOR DELETE USING (false);

CREATE POLICY payroll_line_items_service ON tenant_staff.payroll_line_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables created
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'tenant_staff'
ORDER BY tablename;

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'tenant_staff'
ORDER BY tablename, indexname;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'tenant_staff'
ORDER BY tablename;

-- Verify employees table has all expected columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'tenant_staff'
  AND table_name = 'employees'
ORDER BY ordinal_position;
