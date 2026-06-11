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

## Wave B — manifest source + perf — DONE

### Agent M: policy alignment + recompile — DONE
- [x] M1. BattleBoardDefaultAccess = union of both role lists (8 roles). manifest:ci green.
- [x] M2 (investigation): `json` IR type EXISTS (prisma projection maps json→Json).
      Implementing for CommandBoardCard.metadata = source type change + app-side
      object-writes + client regen. DEFERRED — decision needed (reads stay tolerant).

### Agent B2: perf — DONE (app typecheck green)
- [x] B2a. getEventBoardData: 9 sequential RTTs → 2 Promise.all batches.
- [x] B2b. EventBoardTab server content only renders when ?tab=board.
- [x] B2c. resolveEventBattleBoardHref concurrent with main fetch.
- [x] B2d. getRelatedEvents: 14-field select + take 50.
- [x] B2e. Palettes capped (take 200).
- [~] B2f deferred: staleTimes, 30s clock interval, React.cache auth dedupe.

### Agent T: pre-existing api test failures — DONE
- [x] 93 ENOENT failures (stale flat manifest/source paths) → 0. Full suite 5,259 pass.

## Wave C — data repair + verification — DONE
- [x] C1. syncFromEvent backfilled ALL 32 battle boards (live proof of runtime fix);
      board 8a2e158b snapshot verified (eventDate/guests/venue/client populated).
- [x] C2. Duplicate EventStaff 487e0ecc governed-unassigned (keeper b1b1b60b);
      orphan CommandBoard 125b0e98 archived+soft-deleted. BONUS root-cause fix:
      EventStaff transition table omitted "unassigned" → unassign could never
      succeed; fixed in source + recompiled (user can veto — unpushed).
- [x] C3. Verification: runtime 172 pass; api suite 5,259 pass; app+api typecheck
      green; manifest:ci green (validate-ai 100/100, zero schema drift).
- [x] C4. Commits: f257af45b (runtime datetime), 3809f3af2 (board correctness),
      1dcc0d8b3 (policy), 4d2c75031 (perf), 5eb27c829 (test paths),
      9dec7158b (EventStaff transitions). Nothing pushed.

## Known non-goals (flagged, not fixed here)
- CSV/PDF importer bypasses runtime (raw SQL insert; already on the violations list).
- manifest_outbox_entries never drained in dev (reactions are in-process; telemetry only).
- Partial unique index on event_staff (tenantId,eventId,staffMemberId) — needs a product
  decision on multi-shift assignments before a migration.

## Review

All three user symptoms root-caused and fixed; 6 commits on main (unpushed).
1. Propagation: engine epoch-ms datetime contract broke the chain at 3 points
   (form ISO strings, reaction-inherited Date objects, syncFromEvent skip-set) —
   plus silent reaction failure swallowing and a policy role gap. All fixed at
   the runtime layer (one boundary coercion fixes every HTTP caller forever).
2. Duplicate key: real duplicate data (no dedupe at any layer) + keying by
   staffMemberId. Fixed render keys + commit idempotency + draft guards + the
   underlying never-working unassign transition.
3. Perf: board queries ran on every tab click (now conditional), 9-RTT
   sequential loader (now 2 batches), unbounded queries (now bounded).
Bonus fixes: Neon local-time serialization (+7h dev skew), staff page assign
never sending staffMemberId, 93 stale-path test failures, orphan board rows.
Open items: CommandBoardCard.metadata json-type migration (decision),
importer runtime bypass (pre-existing violation list), event_staff partial
unique index (product decision on multi-shift).
User action: restart both dev servers to load the new runtime code.
