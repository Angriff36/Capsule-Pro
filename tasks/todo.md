# Task: TimecardEditApproved → TimeEntry correction (P1)

**Source of truth:** IMPLEMENTATION_PLAN.md P1 line 81 (scoped & verified 2026-06-14).

## Problem (the why)
`TimecardEditRequest.approve(userId)` only `mutate status = "approved"` + emits
`TimecardEditApproved`. The corrected values (`requestedClockIn/Out`,
`requestedBreakMinutes`) — the request's OWN fields, NOT approve params — NEVER reach
the `TimeEntry`. Approved edits are silently lost; payroll/labor uses uncorrected hours.
No `TimeEntry` command exists to apply a correction.

## Mechanism: command + middleware (NOT reaction)
The corrected values + `timeEntryId` are the request's own fields, so no reaction can
read them (engine payload = `{...commandInput, result}`). No double-apply (verified: the
non-governed bulk route never writes corrected clock values back). No migration
(`applyEdit` reuses existing `clockIn/clockOut/breakMinutes`).

## Design refinements (over the plan, justified)
- **Coalesce in the command, not the middleware** — mutate-RHS ternary
  (`x != null ? x : self.x`) is an established idiom (call-planning-session-rules:53).
  Makes `applyEdit` self-protecting; middleware just passes the request's raw fields.
- `requestedBreakMinutes` is `int=0` (never null, no migration) → clock times coalesce,
  break applies directly.
- Emit a new `TimeEntryEdited` event (convention + forward-compat for LaborBudget actuals).

## Steps
- [ ] Add `TimeEntry.applyEdit(clockIn, clockOut, breakMinutes)` + `TimeEntryEdited` event to source.
- [ ] Recompile IR (`pnpm manifest:compile`).
- [ ] Create `timecard-edit-approved-time-entry-apply-middleware.ts`.
- [ ] Barrel export + factory import + registration.
- [ ] Conformance test (real IR through engine).
- [ ] `pnpm --filter @repo/manifest-runtime typecheck` + runtime suite green.
- [ ] Update IMPLEMENTATION_PLAN.md, commit surgically (explicit paths), tag, push.

## Review
- **Files (source+IR):** `time-entry-rules.manifest` (applyEdit command + TimeEntryEdited
  event); recompiled `kitchen.ir.json`/`kitchen.commands.json`/merge-report/provenance/
  module-graph + `shards/staff-time-entry-rules.ir.json` + `runtime/commands.registry.json`.
- **Files (runtime):** new `timecard-edit-approved-time-entry-apply-middleware.ts` + its
  test; `middleware/index.ts` (barrel), `manifest-runtime-factory.ts` (import + register).
- **Verified:** new test 4/4; runtime suite 315 pass (56 files); runtime typecheck exit 0;
  `manifest:audit-reaction-payloads` 0 errors; `manifest:schema:check` no drift.
- **Coalesce in command, not middleware** (refinement over plan) — `applyEdit` self-protects
  via mutate-ternary; middleware is a thin pass-through. Documented in middleware doc-comment
  + plan.
- **Surgical staging** — only this increment's paths; left the 100 pre-existing
  provenance-noise shards + unrelated app/AGENTS workstream changes untouched
  ([[concurrent-loop-shared-tree]]).
- **Deferred (tracked, not silent):** the `timecards/bulk` route direct-Prisma bypass
  (constitution §9) stays a separate migration, noted under the same plan item.
