# Current Task

## Task 8.3 increment — Govern EmployeeAvailability create + batch-create + soft-delete — 2026-06-05

### Context
`apps/app/app/(authenticated)/scheduling/availability/actions.ts` has 4 direct
`database.employeeAvailability.*` writes that bypass the Manifest runtime (constitution §9).
Manifest entity `EmployeeAvailability` is durable with commands `create`, `update`, `suspend`,
`reinstate`, `softDelete` and a default access policy (`hr_admin`/`payroll_admin`/`manager`/`admin`).

### Persistence-drift verification (done before coding)
- `startTime`/`endTime` are `DateTime @db.Time(6)`; `effectiveFrom`/`effectiveUntil` are `@db.Date`.
- `EmployeeAvailability` uses `GenericPrismaStore` → coerces string params via `new Date(value)`
  (`asNullableDate`). A bare `"09:00"` → invalid Date → NULL → NOT-NULL violation.
  **Fix:** pass ISO strings built from the already-validated Date objects.
- `softDelete` only patches `deletedAt` (buildPatch skips untouched fields) → Time/Date columns safe.
- `update` does unconditional full-field mutate + needs HH:MM→ISO on unchanged columns → **DEFERRED**
  (larger/riskier; its own increment).

### Plan
- [ ] Migrate `createAvailability` → `EmployeeAvailability.create` (ISO time/date strings).
- [ ] Migrate `createBatchAvailability` → loop of `EmployeeAvailability.create` (also fixes a latent
      bug: it passed raw `"HH:MM"` straight to a DateTime column).
- [ ] Migrate `deleteAvailability` → `EmployeeAvailability.softDelete` (body `{ id }`).
- [ ] Leave `updateAvailability` direct write in place (documented deferral).
- [ ] Add runtime conformance test (compile IR + inMemoryStoreProvider): create happy-path + event,
      softDelete + guard, policy denies non-admin, + regression guard for the @db.Time ISO fix.
- [ ] `pnpm --filter app typecheck` green; run the new test; `pnpm manifest:audit-direct-writes`
      shows this file's create/batch/delete writes gone (update remains, documented).
- [ ] Update IMPLEMENTATION_PLAN.md + phase-out-registry.md; commit; push; tag.

### Behavior change to surface (not silent)
Creation/deletion of availability is now gated by the Manifest policy
(`hr_admin`/`payroll_admin`/`manager`/`admin`). The prior direct writes had NO role gate. This is
governance-correct (the policy is the authority per constitution §16) and documented here + in commit.

### Review (DONE 2026-06-05)
- Migrated `createAvailability`, `createBatchAvailability`, `deleteAvailability` → Manifest runtime
  (`EmployeeAvailability.create` / `softDelete`) in `scheduling/availability/actions.ts`. ISO-string
  conversion for the `@db.Time(6)`/`@db.Date` columns; batch path's prior raw-`"HH:MM"`→DateTime
  latent bug fixed in passing. `updateAvailability` left as a documented deferral (unconditional
  full-field mutate + HH:MM→ISO on unchanged columns = its own increment).
- New test `apps/api/__tests__/staff/employee-availability-lifecycle.test.ts` — **4/4 pass**:
  create+event, softDelete+double-delete guard, staff-role policy denial, @db.Time ISO regression guard.
- `pnpm --filter app typecheck` exit 0 (file clean). `pnpm manifest:audit-direct-writes`: the file's
  governed write-hits 4 → 1 (only `updateAvailability` remains, as intended).
- Behavior change (documented, not silent): create/delete now gated by the entity default policy
  (hr_admin/payroll_admin/manager/admin); prior direct writes had no role gate.
