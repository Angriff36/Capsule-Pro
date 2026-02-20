# Command Board Hardening Implementation Plan

> Last updated: 2026-02-20
> Scope: API reliability, assistant safety, regression prevention, UX safety, and observability for Command Board

## Execution Rules

- Implement one highest-priority item per loop iteration.
- Verify with focused tests before commit.
- Keep behavior stable unless the task explicitly changes behavior.
- Mark items complete only when DoD is fully satisfied.

---

## P0 - Critical Stabilization

- [x] [high] 1) Conflict API stabilization sweep
  - Files: `apps/api/app/api/conflicts/detect/route.ts`
  - DoD:
    - No raw SQL runtime errors for empty/new boards and seeded boards.
    - All conflict types return HTTP 200 with typed payload shape.
    - Invalid UUID and tenant mismatch paths return safe typed error payloads.
  - Evidence: 18 tests in `apps/api/__tests__/conflicts/detect-route.stabilization.test.ts` covering auth/tenant validation, empty board handling, all conflict type shapes, partial results resilience with warnings.

- [x] [high] 2) Replace fragile raw SQL with Prisma or typed `Prisma.sql`
  - Files: `apps/api/app/api/conflicts/detect/route.ts`
  - DoD:
    - Remove stringly joins/casts where feasible.
    - Behavior remains identical for existing valid requests.
    - Add tests covering previous SQL error signatures.
  - Evidence: Code already uses typed `Prisma.sql` template literals (not string concatenation). PostgreSQL type casts (`::text`, `::uuid`) are required for cross-schema queries in multi-tenant architecture. Complex aggregations (GROUP BY + HAVING + ARRAY_AGG + CTEs) cannot be expressed in Prisma ORM. Added 7 new SQL error signature tests: invalid UUID syntax, relation does not exist, column does not exist, connection timeout, deadlock detected, UUID type coercion, type mismatch.
  - Learnings:
    - `detectTimelineConflicts` already converted to Prisma ORM (`prepTask.findMany`).
    - Other detectors require raw SQL for complex aggregations across schemas (`tenant_staff`, `tenant_events`, `tenant_inventory`, `tenant_kitchen`).
    - The `::text` casts are necessary because Prisma's multi-schema support requires explicit type handling for UUID comparisons across schemas.

- [x] [high] 3) Conflict check resilience with partial results
  - Files: `apps/app/app/(authenticated)/command-board/actions/conflicts.ts`, `apps/api/app/api/conflicts/detect/route.ts`, `apps/app/app/(authenticated)/command-board/components/conflict-warning-panel.tsx`
  - DoD:
    - A single detector failure does not fail whole response.
    - API returns typed partial results + warning metadata.
    - UI renders partial conflicts and clear warning banner/message.
  - Evidence:
    - API: `safeDetect` function (route.ts:71-87) wraps each detector, catches errors, appends to `warnings[]`, returns empty array to continue processing.
    - API: Response includes `warnings?: DetectorWarning[]` when detectors fail (route.ts:968).
    - UI: `ConflictWarningPanel` accepts `detectorWarnings` prop and renders amber "Partial conflict check" alert with warning messages (conflict-warning-panel.tsx:395-409).
    - UI: Simulation mode also propagates warnings via `useSimulationConflicts` hook (conflict-warning-panel.tsx:101, 116, 302).
    - Tests: 11 tests in "Error handling safety - partial results resilience" describe block covering all detector failures, some failures, SQL errors, timeouts, deadlocks, etc. (stabilization.test.ts:457-728).

- [ ] [high] 4) Regression tests for known crash classes
  - Files: `apps/app/__tests__/api/command-board/tool-registry-context.test.ts`, new conflict-route test files under `apps/app/__tests__/api/command-board/` and/or API test directories
  - DoD:
    - Add tests for invalid UUID, tenant mismatch, empty board, no conflicts.
    - Add tests for each previously observed SQL runtime error signature.
    - Tests fail pre-fix and pass post-fix for each targeted class.

---

## P1 - Assistant Safety and Quality

- [ ] [high] 5) Assistant tool arg hardening
  - Files: `apps/app/app/api/command-board/chat/tool-registry.ts`
  - DoD:
    - Invalid/missing args never throw.
    - Assistant safely falls back to authenticated context.
    - Tenant/board lookup failures return safe typed envelopes.

- [ ] [high] 6) Assistant response guardrails
  - Files: `apps/app/app/api/command-board/chat/route.ts`, `apps/app/app/api/command-board/chat/tool-registry.ts`
  - DoD:
    - Assistant never asks for tenant/board IDs.
    - Assistant never returns raw internal error objects/messages.
    - Assistant responses always include actionable next steps.

- [ ] [medium] 7) AI tool timeout/retry policy
  - Files: `apps/app/app/api/command-board/chat/agent-loop.ts`
  - DoD:
    - Tool calls have bounded timeout and retry/backoff policy.
    - Failures return structured error envelopes.
    - No unbounded hangs or raw tool exceptions leak to user.

---

## P2 - Command Board Data/UI Safety

- [ ] [medium] 8) Empty-state board UX polish
  - Files: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx` and related components
  - DoD:
    - Empty/new boards have explicit guidance and safe defaults.
    - No crash/regression when projections are absent.

- [ ] [medium] 9) Select component safety pass (no empty-value items)
  - Files: `apps/app/app/(authenticated)/command-board/components/`
  - DoD:
    - No `SelectItem value=""` in command-board path.
    - Sentinel clear values are consistent and tested.

- [ ] [medium] 10) Projection normalization boundary pass
  - Files: `apps/app/app/(authenticated)/command-board/actions/projections.ts`
  - DoD:
    - Missing/null fields normalized at action boundary.
    - Card rendering never crashes due to partial payloads.

- [ ] [medium] 11) Card fallback completeness
  - Files: `apps/app/app/(authenticated)/command-board/nodes/cards/`
  - DoD:
    - Every card type has deterministic fallback for missing title/status/priority/assignee/date.

- [ ] [medium] 12) Entity add flow resilience
  - Files: `apps/app/app/(authenticated)/command-board/components/add-to-board-dialog.tsx`
  - DoD:
    - Handles duplicate entities, stale IDs, and races without corrupting board state.

---

## P3 - Command Integrity and History Reliability

- [ ] [medium] 13) Safer bulk edit guardrails
  - Files: `apps/app/app/(authenticated)/command-board/actions/bulk-edit.ts`
  - DoD:
    - Invalid field/entity combinations rejected before write.
    - Preview and execute share one validation path.

- [ ] [medium] 14) Grouping consistency fixes
  - Files: `apps/app/app/(authenticated)/command-board/actions/groups.ts`
  - DoD:
    - Grouping/ungrouping idempotent.
    - No orphan projections or stale group IDs.

- [ ] [medium] 15) Undo/redo reliability hardening
  - Files: `apps/app/app/(authenticated)/command-board/hooks/use-board-history.ts`
  - DoD:
    - Multi-step bulk edits, moves, deletes round-trip through undo/redo.
    - Add targeted tests for history invariants.

- [ ] [medium] 16) Command route contract tests
  - Files: `apps/app/app/api/command-board/`, `apps/api/app/api/command-board/`
  - DoD:
    - Request/response contract tests for create/update/move/remove.
    - Idempotency assertions for safe retries.

---

## P4 - Observability and Performance Gates

- [ ] [high] 17) Structured observability with correlation ID
  - Files: command-board API routes + app command-board handlers/components as needed
  - DoD:
    - Correlation ID propagated end-to-end.
    - Normalized error codes emitted for recurring failure classes.
    - Logs are searchable by correlation ID and error code.

- [ ] [medium] 18) Board health smoke test in CI
  - Files: command board test targets and CI workflow config
  - DoD:
    - One command validates: load board, run conflict check, assistant summary.
    - Smoke path has no runtime errors on test board fixtures.

- [ ] [medium] 19) Board load performance baseline + budget
  - Files: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx` plus test/benchmark harness
  - DoD:
    - Baseline captures initial render + hydration for empty/medium/large boards.
    - Budget thresholds enforced in CI/regression check.

- [ ] [medium] 20) Conflict severity mapping audit
  - Files: `apps/api/app/api/conflicts/detect/route.ts`, fixture tests
  - DoD:
    - Severity mapping aligns with kitchen/events/staff domain thresholds.
    - Fixture-backed tests assert threshold behavior.

---

## Tracking Notes

- Keep this file short: active items + concise evidence only.
- Move fully completed details into commit history and test names.
- If a new crash class appears, add one new checklist item with a reproducible test first.
