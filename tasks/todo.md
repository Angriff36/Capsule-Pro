# Event Board: propagation, duplicate keys, perf — fix plan (2026-06-11)

Evidence base: 4-agent investigation (workflow wf_06ac6191-09b), all findings DB-verified
against local ep-square-dust. Symptoms: (1) event info not propagating to BattleBoard,
(2) duplicate React key `committed-<staffMemberId>` in branch-leaf.tsx, (3) poor perf.

## Wave A — runtime + board correctness (parallel, sonnet builders)

### Agent R: manifest runtime datetime contract — DONE (172 runtime tests pass)
- [x] R1. `run-manifest-command-core.ts`: IR-driven coercion — datetime-typed command
      params AND (for create) entity properties accept ISO string / Date → epoch ms.
- [x] R2. `parent-context-resolver.ts` inheritFromParents: Date → `.getTime()`.
- [x] R3. `parent-context-resolver.ts` refreshParentContext: empty skip-set (verified
      safe: ALWAYS_EXCLUDED + type-match + declared-mutates-only fence over-inheritance).
- [x] R4. `runtime-engine.ts`: command failures logged (reaction failures now visible).
- [x] R5. +7h timestamps root-caused: Neon driver serializes Date in LOCAL time by
      default → `parseInputDatesAsUTC = true` in packages/database/{index,standalone}.ts.
      (Prod unaffected — UTC servers; dev-only skew. Pre-fix rows keep the skew.)
- [x] R6. Conformance tests: datetime-coercion-conformance.test.ts (13 tests).

### Agent B1: board correctness (apps/app + apps/api) — DONE (13/13 commit tests)
- [x] B1a. Committed tokens keyed by EventStaff row id.
- [x] B1b. Commit dedupe + idempotency + skippedDuplicates reporting.
- [x] B1c. Draft duplicate guard (server returns existing card; client short-circuits).
- [x] B1d. Board create race convergence + StrictMode mount guard.
- [x] B1e. Staff page handleAssign now passes staffMemberId.
- [~] B1f. metadata IR param is STRING-typed → write change deferred to Agent M (reads
      already tolerant). Finding in notes.md §37.
- DISCOVERED: ~93 pre-existing api test failures (stale manifest/source flat paths after
  domain-subdir reorg) → new Wave B Agent T.

## Wave B — manifest source + perf (after Wave A)

### Agent M: policy alignment + recompile
- [ ] M1. battle-board-rules.manifest: BattleBoardDefaultAccess roles must include the
      EventDefaultAccess roles (staff, catering_manager, event_manager) since
      BattleBoard.create is a system cascade of Event.create. Recompile + drift gates.

### Agent B2: perf (event detail page + board tab)
- [ ] B2a. getEventBoardData: Promise.all the independent queries (9 RTT → 2-3).
- [ ] B2b. page.tsx: render EventBoardTab only when the board tab is active.
- [ ] B2c. resolveEventBattleBoardHref: run concurrently with main fetch.
- [ ] B2d. getRelatedEvents: add take + narrow select (currently ALL tenant events, full
      rows, serialized into client payload).
- [ ] B2e. Palettes: cap (take) staff/dish queries.
- [ ] B2f (deferred, note only): experimental.staleTimes, 30s clock interval re-render,
      React.cache dedupe of per-render auth/tenant lookups.

## Wave C — data repair + verification
- [ ] C1. Backfill board 8a2e158b snapshot via fixed governed BattleBoard.syncFromEvent.
- [ ] C2. Remove duplicate EventStaff row + orphan CommandBoard 125b0e98 via governed
      commands if they exist (NO direct SQL without user approval).
- [ ] C3. Full verification: runtime tests, api/app typecheck, targeted vitest, manifest:ci.
- [ ] C4. Commit in atomic chunks with explicit paths (no git add -A).

## Known non-goals (flagged, not fixed here)
- CSV/PDF importer bypasses runtime (raw SQL insert; already on the violations list).
- manifest_outbox_entries never drained in dev (reactions are in-process; telemetry only).
- Partial unique index on event_staff (tenantId,eventId,staffMemberId) — needs a product
  decision on multi-shift assignments before a migration.

## Review
(to be filled at completion)
