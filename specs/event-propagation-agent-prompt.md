# Agent Prompt: Event Hub Propagation + Board Consolidation

> **Repo:** `capsule-pro` (Capsule Pro monorepo)  
> **Epic:** Wire Event as the hub — governed writes propagate to Battle Boards, Command Boards, reports, prep, and related surfaces.  
> **Manifest:** `@angriff36/manifest@2.4.1` (root); align `apps/api` and `manifest/runtime` from **2.3.1 → 2.4.1** before starting.  
> **Realtime:** Use transactional outbox + `useRealtimeChannel` — **no Ably**, **no Manifest `realtime` SSE modifier** (serverless REJECT).

---

## 0. Read first (governing law)

1. `specs/parent-context-propagation.md` — parent FK → inherited fields on **child create only**; does NOT auto-sync on parent update.
2. `IMPLEMENTATION_PLAN.md` — baseline status; **ignore stale Known Blockers #13, 9.17, 11.3–11.11** (evaluated pre-2.4.0). Treat installed **2.4.1** CHANGELOG as truth.
3. `manifest/source/event-rules.manifest`, `battle-board-rules.manifest`, `command-board-rules.manifest`, `reactions.manifest`, `prep-list-rules.manifest`
4. `manifest/runtime/src/run-manifest-command-core.ts`, `parent-context-resolver.ts`, `manifest-runtime-factory.ts`
5. Constitution: governed writes (§9), reads bypass runtime (§10), fail loud — no permissive defaults.

---

## 1. Core diagnosis (do not re-litigate)

**IR `relationship` blocks ≠ propagation.** ~145 entities have relationships. They support validation, audits, and **one-time parent-context on child `create`**. They do **not**:

- Auto-update children when `Event.update` runs
- Unify UI reads across surfaces
- Fire reactions (reactions require **Manifest engine** command path + matching `on <Event> run …` rules)

**Event create bypasses Manifest today.** `apps/app/app/(authenticated)/events/actions.ts` uses direct `tx.event.create` → **no `EventCreated` emit** → **no reactions/sagas**. BattleBoard create is a separate governed step afterward (non-fatal).

**Three competing “battle board” surfaces:**

| Surface | Route | Entity / data | Verdict |
|--------|-------|---------------|---------|
| **KEEP** | `/events/battle-boards`, `/events/battle-boards/[boardId]` | `BattleBoard` + `apps/app/lib/battle-boards/` | Canonical Event battle boards |
| **DEPRECATE / merge** | `/events/[eventId]/battle-board` | Raw SQL on `timeline_tasks`; not `BattleBoard` | Migrate or redirect to canonical |
| **WRONG — migrate** | `/tools/battleboards` | UI types `CommandBoard*` but calls `listBattleBoards` / `getBattleBoard` | Migrate to `/command-board` + `CommandBoard` APIs |

**Command Boards (keep):** `/command-board`, `command-board-rules.manifest`, `apps/api/app/api/command-board/**`, `board-canvas.tsx`.

**Sagas in IR, not invoked from app:** `FinalizeEventWithReporting`, `AutoGeneratePrepList` — zero `runSaga` usage in `apps/` (only comments in `payment-rules.manifest`). **Saga DSL does not auto-run; app must call `runtime.runSaga`.**

**Reactions:** 10 in `reactions.manifest` (Payment→Invoice, ContractSigned→Event.confirm, etc.). **None** on `EventCreated` / `EventUpdated`. Engine **does** auto-dispatch `ir.reactions[]` when commands go through `RuntimeEngine` (see `reactions-conformance-runtime.test.ts`).

**Manual `onEvent` switch:** `manifest/runtime/src/index.ts` subscribes to prep/station events — **not** a substitute for Manifest reactions for Event hub propagation.

---

## 2. Manifest 2.4.x — previously “blocked”, now use

| Feature | 2.4.x status | Use in this epic |
|--------|--------------|------------------|
| **Reactions** | Engine dispatches on emit | Add `on EventCreated` / `on EventUpdated` after routing Event writes through engine |
| **Sagas** (`runSaga`) | Runtime API ships | Call `FinalizeEventWithReporting`, `AutoGeneratePrepList` from finalize/setup flows |
| **Scheduled commands** | `schedule` + `getSchedules()` / `runSchedule()` + `nextjs.schedule` cron | Optional: deferred board/report refresh (not required for core fix) |
| **Entity `extends` / `mixin`** | 2.4.0 compile-time merge | Optional DRY for shared child shapes |
| **`retry` / `rateLimit`** | 2.4.0 on commands | Hardening only |
| **Prisma store projection** | 2.4.1 metadata + `GenericPrismaStore` | Ensure `BattleBoard`, `CommandBoard`, `TimelineTask`, `EventReport` use typed stores — run `manifest:generate-metadata` after bridge changes |
| **Runtime profiling** | `getProfiles()` returns real phase timings when `profiling` enabled | Debug silent reaction/saga failures (`manifest-runtime-factory.ts` already accepts `profiling`) |
| **`manifest repl`** | CLI registered | Step through `Event.update` → emits → reactions without full app |
| **`@angriff36/manifest/debug`** | `CommandTraceRecorder` + `actionTraceHook` | Per-action snapshots while wiring |
| **Multi-file compile merge** | 2.4.1 CLI fix | Consider migrating flat `compile.mjs` merge to `manifest compile --merge --entry` |
| **`manifest generate-tests`** | 2.4.0+ CLI | Conformance for new Event reactions |

**Still REJECT / DEFER for Capsule (do not adopt as propagation fix):**

| Feature | Verdict | Reason |
|--------|---------|--------|
| **`realtime` modifier + Manifest SSE** | REJECT | Vercel serverless; use `apps/api/app/api/realtime/events/route.ts` + outbox + `apps/app/app/lib/use-realtime-channel.ts` |
| **`masked`** | NO-OP | Generated reads bypass runtime |
| **`async` commands** | DEFER | Needs job queue + worker |
| **`webhook` keyword** | DEFER | Unless you wire HTTP route projection |

---

## 3. Implementation phases

### Phase A — Version alignment + toolchain (prerequisite)

1. Bump `@angriff36/manifest` to **2.4.1** in:
   - `apps/api/package.json`
   - `manifest/runtime/package.json`
   - `packages/mcp-server/package.json` (if used on manifest path)
2. `pnpm install` at repo root.
3. Regen chain:
   ```bash
   pnpm manifest:compile && pnpm manifest:registries && pnpm manifest:generate-metadata
   pnpm manifest:ci
   pnpm run typecheck && pnpm test
   ```
4. Confirm IR byte-stable except `provenance.compilerVersion` if expected.

### Phase B — Governed Event writes (highest leverage)

**Goal:** Every Event create/update/delete flows through `Event.create` / `Event.update` / … so `EventCreated` / `EventUpdated` emit and reactions can fire.

**Primary file:** `apps/app/app/(authenticated)/events/actions.ts`

- Replace `tx.event.create` with `runManifestCommand({ entity: "Event", command: "create", … })` OR API route to `execute-command` canonical handler.
- Preserve `eventNumber` advisory-lock behavior — may require manifest source change (`templateId` already noted in file comment) or pre-command allocation passed as param.
- Keep BattleBoard auto-create **after** governed Event create (or move to reaction — see Phase C).
- Migrate `updateEvent` if still direct Prisma (verify current state).
- Add/extend tests: Event create emits → reaction chain (mirror `reactions-conformance-runtime.test.ts` pattern).

**Debug while wiring:**

```bash
pnpm exec manifest repl
# Enable profiling in manifest-runtime-factory deps for phase timings
```

### Phase C — Event reactions + saga invocation

**Add to `manifest/source/reactions.manifest` (examples — refine resolve/params against actual event payloads in `event-rules.manifest`):**

```manifest
on EventCreated run BattleBoard.create
  resolve payload.result.id   // verify payload shape from Event.create emit
  params { eventId: payload.result.id, boardName: ..., boardType: "event-specific" }

on EventUpdated run BattleBoard.syncFromEvent   // add command if missing
  resolve payload.eventId
  params { ... }
```

- Audit each child entity that should refresh on Event date/client/venue change: `BattleBoard`, `CateringOrder`, `EventSummary`, `TimelineTask`, reports, etc.
- Prefer **reactions** for single follow-on commands; **sagas** for multi-step with compensation.

**Wire sagas explicitly:**

| Saga | IR location | Call site (to implement) |
|------|-------------|--------------------------|
| `FinalizeEventWithReporting` | `event-rules.manifest` | Event finalize UI/API |
| `AutoGeneratePrepList` | `prep-list-rules.manifest` | Event setup / confirm flow |

Pattern (from `payment-rules.manifest` comment):

```typescript
const result = await runtime.runSaga("FinalizeEventWithReporting", {
  finalize: { entityName: "Event", instanceId: eventId, input: { userId } },
  calculateProfitability: { … },
  generateSummary: { … },
});
```

- Do **not** duplicate saga steps as imperative Prisma in routes.
- On failure: respect `on_failure: compensate` semantics; surface diagnostics to UI.

**Middleware vs reactions:** Middleware (`after-emit` audit/outbox) is wired (Task 7.4). Cross-entity side effects belong in **reactions** or **sagas**, not ad-hoc route SQL. Pick one pattern per flow; do not double-implement.

### Phase D — Board surface consolidation

1. **Battle Boards (canonical):** `/events/battle-boards/**` — keep improving; ensure reads use governed list/get (`apps/api/app/api/events/battle-boards/**`).
2. **Legacy timeline route:** `/events/[eventId]/battle-board` — audit `actions/tasks.ts` (mix of `runManifestCommand` + raw patterns). Plan redirect or data migration to `BattleBoard` + `TimelineTask` governed CRUD.
3. **Tools battleboards:** `/tools/battleboards` — `battleboards-client.tsx` casts `BattleBoard` API responses to `CommandBoard*` types. **Migrate UI to `/command-board`** using `CommandBoard` generated client functions and `apps/api/app/api/command-board/**`. Deprecate or remove tools route.
4. **Command Board realtime:** `board-canvas.tsx` does not use `useRealtimeChannel` yet — optional Phase D+; use outbox events, not Ably.

### Phase E — Typed stores + metadata bridge

1. Verify `ENTITY_TO_PRISMA_MODEL` / `manifest:generate-metadata` covers `BattleBoard`, `CommandBoard`, `TimelineTask`, `EventReport`, `EventSummary`.
2. Eliminate `store_json_fallback` for these entities where possible.
3. Re-run `pnpm manifest:generate-metadata` after any bridge map changes.

### Phase F — Verification + governance

```bash
pnpm manifest:compile && pnpm manifest:registries && pnpm manifest:generate-metadata
pnpm manifest:ci
pnpm manifest:audit-parent-context:strict
pnpm manifest:audit-direct-writes:baseline   # new violations must be fixed or baselined with justification
pnpm manifest:route-audit
pnpm run typecheck && pnpm test
```

**Manual smoke (required for “done”):**

1. Create Event → confirm `EventCreated` in outbox/realtime → BattleBoard exists at `/events/battle-boards`.
2. Update Event date/client → child surfaces reflect change (via reaction or explicit sync command).
3. Finalize Event → `FinalizeEventWithReporting` saga completes → profitability + summary exist.
4. Command Board at `/command-board` works; `/tools/battleboards` deprecated or redirects.
5. No new direct Prisma writes on governed entities (`audit-direct-writes`).

**Optional:** `pnpm exec manifest generate-tests` for new reaction fixtures.

---

## 4. Key file map

| Concern | Path |
|--------|------|
| Event create (broken path) | `apps/app/app/(authenticated)/events/actions.ts` |
| Event IR + sagas | `manifest/source/event-rules.manifest` |
| Battle board IR | `manifest/source/battle-board-rules.manifest` |
| Command board IR | `manifest/source/command-board-rules.manifest` |
| Reactions | `manifest/source/reactions.manifest` |
| Prep saga | `manifest/source/prep-list-rules.manifest` |
| Command execution | `manifest/runtime/src/run-manifest-command-core.ts` |
| Parent context | `manifest/runtime/src/parent-context-resolver.ts` |
| Runtime factory | `manifest/runtime/src/manifest-runtime-factory.ts` |
| Reaction conformance test | `manifest/runtime/src/__tests__/reactions-conformance-runtime.test.ts` |
| Battle board parent-context test | `apps/api/__tests__/events/battle-board-parent-context.test.ts` |
| Canonical battle boards UI | `apps/app/app/(authenticated)/events/battle-boards/**` |
| Legacy battle board | `apps/app/app/(authenticated)/events/[eventId]/battle-board/**` |
| Wrong tools UI | `apps/app/app/(authenticated)/tools/battleboards/**` |
| Command boards UI | `apps/app/app/(authenticated)/command-board/**` |
| Command boards API | `apps/api/app/api/command-board/**` |
| Realtime hook | `apps/app/app/lib/use-realtime-channel.ts` |
| SSE route | `apps/api/app/api/realtime/events/route.ts` |
| Merged IR | `manifest/ir/kitchen.ir.json` |
| Compile | `manifest/scripts/compile.mjs` |

---

## 5. Constraints (non-negotiable)

- **Do not** weaken conformance or make invalid programs succeed.
- **Do not** use Ably or Manifest `realtime` entity SSE for this work.
- **Do not** hand-edit `kitchen.ir.json` — compile from source.
- **Do not** assume relationships propagate updates — implement reactions/sagas/commands explicitly.
- **Do not** leave Event create on direct Prisma while claiming propagation works.
- **Commit in small units** (~15 min); run verification after each phase.
- **Fail loud:** board create failure after event create is currently non-fatal — document and test; do not silently swallow saga/reaction errors in production paths.

---

## 6. Success criteria

- [ ] `@angriff36/manifest@2.4.1` aligned across workspace packages used at runtime
- [ ] Event create/update through governed Manifest commands
- [ ] `EventCreated` / `EventUpdated` reactions defined and covered by runtime test
- [ ] `FinalizeEventWithReporting` and `AutoGeneratePrepList` invoked from app where appropriate
- [ ] `/events/battle-boards` is canonical; legacy/tools routes migrated or deprecated
- [ ] `/command-board` is the Command Board surface (not `/tools/battleboards`)
- [ ] `pnpm test` + `pnpm manifest:ci` green
- [ ] Manual smoke flows completable in browser

---

## 7. Out of scope (unless explicitly requested)

- Migrating all 1,330 generated client functions to consumers
- Adopting `async` commands / job queue
- Manifest `masked` / `realtime` modifiers
- Full flat→`--merge` compile migration (optional improvement)
- Prisma snake_case `GenericPrismaStore` gaps for peripheral entities
