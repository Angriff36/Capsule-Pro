# Current Task

## Task 8.3 — AdminTask state-machine reconciliation + updateAdminTaskStatus governance migration — 2026-06-05

Continuation of the prior increment's documented "Out of scope" follow-up.

### Problem (verified)
- Kanban UI (`apps/app/.../administrative/kanban/page.tsx`) is a free-movement `<select>` over 4
  columns `backlog, in_progress, review, done`. App type/validation, the passing app create test,
  and overview-boards query ALL already use these 4 states.
- Manifest (`manifest/source/admin-task-rules.manifest`) still uses OLD `backlog, todo, in_progress,
  cancelled, done` (no `review`); `backlog→in_progress` is illegal (must pass `todo`) → kanban broken.
- `updateAdminTaskStatus` does a DIRECT `database.adminTask.update` (constitution §3/§9; last open
  governed direct-write in that file).
- API `validation.ts` lists `todo`, lacks `review`. API route `[id]/route.ts` maps old commands.

### Plan
- [ ] 1. Rewrite AdminTask commands+transitions in `manifest/source/admin-task-rules.manifest`:
      states `backlog/in_progress/review/done` + `cancelled`; remove `todo`. Commands one-per-target:
      `moveToBacklog, startProgress, submitForReview, complete, cancel`; remove `moveToTodo, reopen`.
      Transitions allow free movement among the 4 active columns + cancel/reopen edges. `create` unchanged.
- [ ] 2. `pnpm manifest:compile` → regen kitchen.ir.json / kitchen.commands.json / commands.registry.json.
- [ ] 3. `validation.ts`: ADMIN_TASK_STATUSES → `[backlog, in_progress, review, done, cancelled]`.
- [ ] 4. `[id]/route.ts`: statusCommandMap → backlog:moveToBacklog, in_progress:startProgress,
      review:submitForReview, done:complete, cancelled:cancel.
- [ ] 5. `kanban/actions.ts`: migrate `updateAdminTaskStatus` to `runManifestCommand` (read current
      status first to skip no-op self-selects). Remove direct write.
- [ ] 6. Update `admin-tasks.quarantine.test.ts` PATCH mappings; run `pnpm test:quarantine`;
      un-quarantine only if clean.
- [ ] 7. New `apps/app/__tests__/administrative/admin-task-status-action.test.ts` (governance + no-op).
- [ ] 8. `pnpm manifest:generate` if needed; route-drift:strict = 0.
- [ ] 9. Verify: runtime/api/app typecheck 0; admin-task tests; audit-direct-writes (kanban off list
      OR file-count drops); audit-parent-context:strict 0.

### Review
- **State machine reconciled** (`manifest/source/admin-task-rules.manifest`): AdminTask now models
  the shipped Kanban — states `backlog/in_progress/review/done` + `cancelled` side-state; `todo`
  removed (no product surface used it). Commands are one-per-target-column
  (`moveToBacklog/startProgress/submitForReview/complete` + `cancel`), with transitions allowing
  free movement among the four active columns + cancel/reopen edges. `create` unchanged.
- **Governance migration** (`kanban/actions.ts`): `updateAdminTaskStatus` migrated off its direct
  `database.adminTask.update` to `runManifestCommand` (constitution §3/§9). Reads current status
  first (allowed read §10) to short-circuit no-op self-selects — the `<select>` defaults to the
  current column, and the runtime rejects no-op self-transitions. `kanban/actions.ts` is now CLEAN
  in `manifest:audit-direct-writes` (file count 112→111).
- **API surfaces aligned**: `tasks/validation.ts` ADMIN_TASK_STATUSES (`todo`→`review`); `[id]/route.ts`
  statusCommandMap → new commands.
- **Derived surfaces regenerated** (deterministic from IR): `kitchen.ir.json`/`kitchen.commands.json`/
  `commands.registry.json` (compile), `manifest-client.generated.ts`/`manifest-types.generated.ts`
  (client), `routes.ts`/`routes.manifest.json` (routes:ir). The client/routes.ts diffs are
  AdminTask-only; the types + routes.manifest diffs ALSO re-synced pre-existing drift from prior
  commits (EventStaffAssignment/PayrollLineItem/ApiKey/PaymentMethod) that earlier loops left
  un-regenerated — constitution §10/§16 requires generated == IR.
- **Tests**: new `apps/app/__tests__/administrative/admin-task-status-action.test.ts` (7 tests) proves
  the governed dispatch, 1:1 column→command map, no-op short-circuit, validation, not-found, and
  failure surfacing. Existing create test still passes → app admin-task suite 16/16.
- **Gates green**: runtime/api/app typecheck 0; route-drift:strict 0; parent-context:strict 0;
  audit-direct-writes kanban CLEAN.
- **Un-quarantine BLOCKED (documented, not done)**: `admin-tasks.quarantine.test.ts` PATCH mappings
  were corrected, but the file has ~18 PRE-EXISTING failures unrelated to this work — the `[id]` route
  uses `resolveCurrentUser` but the test only mocks `requireCurrentUser`/`getTenantIdForOrg`, and the
  dispatcher `POST /commands/create` flow drifted (createManifestRuntime/runCommand mocks stale). A
  separate increment must repair those mocks before the file can leave quarantine. Kept quarantined.
