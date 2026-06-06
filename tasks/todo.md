# Current Task

## Task 8.3 — Govern AdminTask creation from the kanban server action — 2026-06-05

**Why:** `apps/app/.../administrative/kanban/actions.ts` `createAdminTask` does a direct
`database.adminTask.create` (governed-entity direct-write violation; 1 of 57 remaining).

**Root-cause discovery:** the governed `AdminTask.create` command is currently **BROKEN**. It does
`mutate status = status`, and the runtime evaluates state transitions on every status mutation
WITHOUT exempting no-op self-transitions (runtime-engine.js:1205). The seeded status (e.g.
`backlog`) is re-applied, and `backlog`'s transition `to` list is `[todo, cancelled]` (excludes
`backlog`), so create FAILS for backlog/in_progress/todo/cancelled. This is why the API test is
`*.quarantine.test.ts` (skipped) and the kanban still uses a direct write.

**Fix:** remove `mutate status = status` from `AdminTask.create`. `createInstance` already seeds
`status` from the full command body (notes §15a), so status is set correctly without a false
self-transition. Repairs BOTH the kanban migration and the already-wired API POST route.

- [ ] Edit `manifest/source/admin-task-rules.manifest`: drop `mutate status = status`; comment why.
- [ ] `pnpm manifest:compile`; verify IR/commands intact, status mutate gone.
- [ ] `pnpm manifest:generate` if needed; `manifest:audit-route-drift:strict` = 0 (commit regen).
- [ ] Rewrite `createAdminTask` → `runManifestCommand` via `requireCurrentUser()`; dueDate epoch-ms|null;
      createdBy/assignedTo = user.id; keep UI pre-validation; throw on !ok; keep revalidatePath x2.
      Leave `listAdminTasks` + `updateAdminTaskStatus` unchanged.
- [ ] New test `apps/app/__tests__/administrative/admin-task-create-action.test.ts` (Lead template).
- [ ] Verify: compile; app typecheck 0; api typecheck 0; new + existing admin-task tests;
      audit-direct-writes (count drops); parent-context:strict 0; route-drift:strict 0.
- [ ] Update IMPLEMENTATION_PLAN.md (subagent). Commit, push, tag v0.12.115.

### Out of scope (documented as follow-up)
`updateAdminTaskStatus` migration + full AdminTask state-machine reconciliation to the real kanban
lifecycle (backlog/in_progress/review/done + cancelled), the API command-map, and the quarantine
test. Genuine cross-surface conflict (kanban `review` has no command; manifest uses `todo`/`cancelled`
which the UI lacks) — separate increment.

### Review
- **Migrated** `createAdminTask` (apps/app kanban) from a direct `database.adminTask.create` to the
  governed `AdminTask.create` Manifest command via `requireCurrentUser()` + `runManifestCommand`.
  Creator self-assigns (assignedTo = createdBy = user.id); dueDate sent epoch-ms|null (GenericPrismaStore
  coerces via asNullableDate); status flows through the body as the initial state.
- **Root-cause bug fixed:** the governed `AdminTask.create` was broken — `mutate status = status` tripped
  the runtime's transition validator (no-op self-transitions are NOT exempt, runtime-engine.js:1195-1209),
  so create failed for backlog/in_progress/todo/cancelled. Removing the mutate repairs BOTH the kanban
  migration AND the already-wired API POST route (`.../administrative/tasks/route.ts`). Documented in
  notes.md §21 + IMPLEMENTATION_PLAN.md + persistent memory.
- **Tests:** new `apps/app/__tests__/administrative/admin-task-create-action.test.ts` — 9/9 pass (routes
  through §9, canonical body, dispatches for all 4 kanban statuses, dueDate epoch-ms|null, title/status/
  priority pre-validation, failure surfaced, no direct prisma write).
- **Gates green:** manifest:compile OK; app typecheck 0; api typecheck 0; route-drift:strict 0;
  parent-context:strict 0. The IR confirms AdminTask.create has 7 mutates (no status).
- **Honest scope note:** direct-writes governed-entity count is FILE-level and holds at 57 — kanban/actions.ts
  still appears because `updateAdminTaskStatus` (line 187) remains a direct write. It is a genuine
  state-machine conflict (kanban `review` status has no command; manifest uses `todo`/`cancelled` the UI
  lacks) and is deferred to a separate increment that must reconcile the AdminTask state machine + the API
  command-map + un-quarantine `admin-tasks.quarantine.test.ts` (Rule 7).
