# Native Manifest Source Rewrite Plan

**Date:** 2026-07-06 · **Installed compiler:** `@angriff36/manifest` 3.2.1 · **Scope:** `manifest/source/**/*.manifest` (104 files, ~212 entities)

**Reference style:** `manifest/source/manifest-example.manifest.bak` (the Event-domain showcase) and `manifest/CLAUDE.md` (IR contract). This plan rewrites *source files only* — pipeline glue divergences live in `MANIFEST-DIVERGENCES.md` (D-series); this plan continues its U-series at the source-authoring level.

**Companion register:** MANIFEST-DIVERGENCES.md is written against manifest 2.5.0. We are on 3.2.1 — re-verify any "blocked upstream" claim before citing it. Verified today: enum→Prisma emission works (17 `enum` blocks in generated `manifest.prisma`), bare `money` already projects to `Decimal`.

---

## Verified gap matrix (counted 2026-07-06, bare `rg`/grep on source, `.bak` excluded)

| Construct | Example demonstrates | Capsule source today | Gap class |
|---|---|---|---|
| `enum` | every closed set | 17 enums; **82 `status: string` fields**; vocab repeated in `validStatus` constraints + transition strings | **Major (U7)** |
| roles + `roleAllows` | capability checks, no role lists | 28 roles declared in `_base`; **12 `roleAllows` vs 464 inline `user.role in [...]`** | **Major (U1)** |
| `transition` FSM | every state has a rule incl. terminal `to []` | 295 transitions / 64 files; only 1 status-bearing file lacks an FSM; CI dead-command scanner exists | Minor |
| named `constraint` w/ code, `messageTemplate`, `details`, `overrideable` | rich block constraints | 758 constraints exist, mostly inline one-liners; commands lean on guard-soup (e.g. `Event.update` = 9 bare guards) | Moderate |
| `value` objects | `EventAddress` | **0** | Moderate (DB shape) |
| `module` blocks | `module events { }` | **0** (directory layout + `entity-domain-map.mjs` instead) | Structural |
| `external entity` | Client/Venue refs | 0 — **not needed**: all 104 files merge into one IR via `_base`; every entity is internal | Non-goal |
| composite `unique [ ]` | `unique [tenantId, eventNumber]` | **0** (20 inline `unique property`) | Moderate (DB) |
| `masked` / `encrypted` | contact PII, `unmask when` | 1 masked / 32 encrypted | Gated (read-path) |
| `money(p,s)` | `money(12,2)` | bare `money` — already projects `Decimal(10,2)`/`(12,2)` | Minor |
| `versionProperty` | OCC everywhere | 8 entities | Gated (OCC bug history) |
| `timestamps` | yes | 101 files | ✅ done |
| `approval` | confirm workflow | 3 (procurement only) | Fork per flow |
| `saga` | ConfirmEventWorkflow + compensation | 2 | Fork per flow |
| `schedule` | cron sweep | **0** — 10 crons hand-bound in `apps/api/vercel.json` (U8) | **Major** |
| `webhook` | HMAC + idempotency inbound | **0** — inbound webhooks are hand-written API routes | Fork |
| `async command` | recalculateReadiness | **0** | Fork |
| `retry` / `rateLimit` | on commands | 11 / 5 (one file) | Minor |
| reactions / `fanOut` / `count()` | 8 reactions + 3 fanOut | 10 reactions, **0 fanOut**, 0 count-aggregates; **69 `create*Middleware(` call sites** in `manifest-runtime-factory.ts` carry the load | **Major** |
| typed event payloads | yes | ✅ all 1041 events have typed payload blocks | ✅ done |
| explicit `emit X { }` payload mapping | yes | 0 — all 1072 emits are bare | Optional |
| computed `cache` | request-cache on hot computeds | 66 cache clauses / 660 computeds | See HARD STOP below |
| `realtime` | projection hint | 0 — capsule runs its own SSE (`reactionLogSink`, `tenant:{id}` channels) | Non-goal |

### Standing constraints (do not violate)
1. **⛔ HARD STOP — do not mint new `computed` aggregates without an app consumer.** Reads bypass the runtime (constitution §10); IR-only computeds are unobservable. Computeds referenced by guards/constraints in the command path are fine.
2. **Middleware retirement is eligible, not free.** Each of the 69 wired middleware has a rationale comment in `manifest-runtime-factory.ts` — read it before replacing. Justified categories (identity enrichment, multi-hop derivations, ratio rescales, FSM/dedupe/conditional, tenant-wide reconciles, async-enqueue) stay TS.
3. Schema changes go through `pnpm db:dev --create-only` — never hand-authored migration SQL (root CLAUDE.md rules).
4. New entities require an `entity-domain-map.mjs` entry FIRST (route-drift gate).
5. Never edit `packages/database/prisma/schema/manifest.prisma` or any generated artifact by hand.
6. Regen matrix + gates: see the manifest skill "Regenerate-when" table. When unsure: `pnpm manifest:build` then `pnpm manifest:ci`.

---

## Phase 0 — Preflight verifications (one session, blocks nothing else from being planned, blocks execution)

Each item is a cheap check that gates a workstream. Record answers in this file.

| # | Verify | Gates | How |
|---|---|---|---|
| P1 | **Role-name matching**: `user.role` values in data are snake_case (`"kitchen_lead"`); declared roles are PascalCase (`KitchenLead`). Does `roleAllows("kitchen_lead", cap)` resolve? | WS1 | Unit test against runtime `resolveRoleGraph`/`roleAllows` builtin; if exact-match, either re-declare roles snake_case in `_base` (preferred — matches data) or normalize at context enrichment |
| P2 | **Enum end-to-end on 3.2.1**: source `enum` → IR → Prisma `enum` column + zod/hooks/client regen + a migration on ONE low-traffic entity | WS7 | Pilot on `EventContract.status` or similar; run full regen chain + `pnpm db:dev --create-only`; check `verify-invariants` D22 gate |
| P3 | **Do transitions/guards accept enum members** or still compare strings post-enum-typing? | WS7 | Compile the pilot; inspect IR transitions + run FSM conformance test |
| P4 | **OCC status**: is the GenericPrismaStore version-in-compound-key bug (2026-06-18) fixed on 3.2.1? | WS16 | Re-run the silent-data-loss repro against a versioned entity |
| P5 | **Read-path masking**: do any read routes evaluate `masked`/`unmask when`? (Reads bypass runtime → likely inert) | WS11 | Trace one detail GET for an entity with a masked field |
| P6 | **Schedule projection**: does `nextjs` projection on 3.2.1 emit cron route handlers from `schedule` decls, and what path shape? | WS5 | Scratch compile of example's `schedule` block; compare to `apps/api` route conventions + rewrite requirements |
| P7 | **Webhook projection**: same question for `webhook` (route emission, HMAC verify, idempotency store) | WS14 | Scratch compile; grep runtime for signature/idempotency implementations — IR shape ≠ working feature (manifest/CLAUDE.md) |
| P8 | **Async command runtime**: JobQueue adapter wired in capsule? (`durable` store / job drain) | WS14 | grep runtime factory for job queue setup |
| P9 | **`fanOut` + `count()` on 3.2.1**: conformance-test one fanOut reaction end-to-end in the capsule runtime harness | WS3 | Port one existing cascade middleware to `fanOut` in a test IR |

---

## Phase 1 — IR-only rewrites (no DB migration, per-domain batches, each batch = one commit + green `manifest:ci`)

### WS1 — Role capability migration (U1) · the biggest mechanical win
**What:** Replace 464 `user.role in [...]` literals with `roleAllows(user.role, "<capability>")`.
**How:**
1. After P1, freeze the capability vocabulary. The top 8 literal patterns cover ~290 of 464 sites:
   - `["manager","admin"]` (89) → `manageAccess`
   - `["kitchen_lead","manager","admin"]` (44) → `leadAccess` (kitchen-scoped: `kitchenLeadAccess` if finer grain wanted)
   - `["staff",...all]` (36) → `staffAccess`
   - `["kitchen_staff","kitchen_lead","manager","admin"]` (34) → new `kitchenAccess` on `KitchenStaff`
   - `["kitchen_staff","kitchen_lead","inventory_manager","manager","admin"]` (26) → `kitchenAccess` + allow on `InventoryManager`
   - `["hr_admin","payroll_admin","manager","admin"]` (22) → new `hrPayrollAccess`
   - `["staff","event_coordinator","catering_manager","event_manager","manager","admin"]` (21) → `eventAccess`
   - `["finance","finance_manager","manager","admin"]` (16) → `financeAccess` (already declared)
2. Add the new capabilities to `_base.manifest` roles (single file change; Manager/Admin inherit).
3. Migrate domain-by-domain (kitchen → inventory → events → staff → finance → rest), keeping semantics **identical**: for each site, assert the resolved role set of the new capability equals the old literal array (write a one-off script that expands `effectivePermissions` from the IR and diffs against the removed literals — fail the batch on any widening/narrowing).
4. Long-tail (~170 sites with odd role mixes): where no clean capability exists, mint a narrow one (`allow collectionsWrite` etc.) rather than approximating. No semantic changes in this workstream — tightening/loosening is a separate reviewed decision.
**Regen:** `compile · openapi` per batch. **Gates:** `manifest:ci`, policy conformance tests, IR diff script above.
**Size:** ~464 sites / ~100 files, mechanical after vocabulary freeze. Riskiest part is P1 name matching.

### WS2 — Command hygiene: guard-soup → named constraints
**What:** Convert bare validation guards (message-less halts) into named `constraint` blocks with stable codes, `message`/`messageTemplate` + `details`, per the example's `Event.updateDetails`. Guards remain for *state* preconditions (`self.status == "draft"`); constraints own *input/business* validation.
**Why:** constraints surface structured errors to UI (`ConstraintOutcome`), support `severity: warn` and `overrideable ... overridePolicy`, and survive the guard-message compiler seam (guard messages historically dropped — extraction seam added 2026-07-04; constraints don't need the seam).
**How:** Per-domain sweep; priority order = commands backing user-facing forms (events, crm, finance) → rest. While in each command, also:
- Replace defensive ternary-defaulting in `create()` (`title != "" ? title : "Untitled Event"`) with property defaults where the engine's persist-before-mutate behavior allows (see the `eventDate = now()` comment in `event-rules.manifest` — that pattern is already correct; copy it).
- Add `overrideable` + an `override`-scope policy for the known human-override cases (capacity, credit-limit, variance approvals) — each such addition is a small product decision; batch them for Ryan review.
**Regen:** `compile · openapi`. **Gates:** `openapi:check`, existing command tests.

### WS3 — Reaction nativization: middleware → `on` / `fanOut` / `count()`
**What:** Retire eligible TS middleware in favor of source-declared reactions (0 `fanOut` and 0 `count()` exist today; 69 `create*Middleware(` sites wired).
**How (after P9):**
1. Inventory pass over `manifest-runtime-factory.ts`: classify each middleware per its rationale comment into (a) 1:1 command dispatch → `on X run E.cmd resolve ... params { }`, (b) unconditional cascade → `fanOut E where fk = payload.id run cmd`, (c) parent-count recompute → `count(Child where fk == self.id)` param, (d) justified-TS (leave).
2. Port (a)/(b)/(c) one middleware at a time: add the source reaction, delete the middleware wiring + its test, port the test to a reaction conformance test. **Never run both** — double-fire.
3. Conditional/thresholded flows (e.g. `PerformancePrediction` risk-notify) stay middleware unless the condition is expressible as a guard on the target command.
**Regen:** `compile · openapi` per port. **Gates:** `audit-reaction-payloads`, ported tests, reaction-log dashboard (tools/reactions-log) spot-check.
**Size:** expect roughly half the 69 to be portable; the per-handler comments decide. This drains incrementally — safe to pause anywhere.

### WS4 — Explicit `emit` payload mapping (optional, ride-along)
All 1041 events already have typed payload blocks, but all 1072 emits are bare. When touching a command in WS2/WS3 whose event feeds a reaction, make the emit explicit (`emit EventCancelled { eventId: self.id reason: reason }`) so `payload.X` in reactions is compiler-checked rather than runtime-conventional. Do not do a standalone sweep — no gate forces it.

### WS5 — Schedules (U8): declare the 10 vercel.json crons
**What:** Author `schedule <name> cron "<expr>" run <command>` for each of the 10 crons in `apps/api/vercel.json`, next to the command's domain file.
**How (after P6):** For each cron: identify the target as a manifest command (some crons may hit non-manifest routes — those need a thin global `command` first, like the example's `requestEventReminderSweep`). Point vercel.json at the projection-emitted route (or keep existing path and add the rewrite). Delete the hand-written cron route once traffic is proven on the generated one.
**Gates:** route-drift audit; a manual cron trigger test per migrated entry. Remember the app→api rewrite rule for any new route path.

### WS6 — Approvals + sagas expansion (fork-gated; survey now, implement per sign-off)
Procurement already uses `approval` (3) and there are 2 sagas. The example shows the richer patterns: staged approvals with `when:` conditions, saga steps with compensation. Candidates to survey and present to Ryan (each is a product decision, not a mechanical port):
- `Event.confirm`/finalize gate (mirrors example's `confirmationApproval` with a large-event director stage)
- Multi-entity flows currently hand-coded in routes/transactions (U9 list: invoice+payment application, PO receive+stock)
Deliverable of this WS: a one-page candidates table with the hand-coded flow location, proposed saga/approval shape, and NEEDS-RYAN status. No implementation without sign-off.

---

## Phase 2 — Schema-touching rewrites (each batch: manifest edit → full regen → `pnpm db:dev --create-only` → review SQL → deploy → `db:check`)

### WS7 — Enum migration (U7) · the flagship
**What:** Type the 82 `status: string` fields (plus other closed sets: priorities, types where vocab is stable) as source `enum`s. Enum→Prisma emission is confirmed working (17 blocks already generated).
**How:**
1. P2/P3 pilot first (one entity, full chain, one migration).
2. Extract the vocabulary per field from its `validStatus` constraint + transition table (they already agree — the FSM audit keeps them honest).
3. Batch per domain: declare `enum XStatus { ... }` top-level in the domain file → retype the property → **delete the now-redundant `validStatus` constraint** (the type is the constraint) → keep transitions (string-based unless P3 shows enum-awareness).
4. Migration per batch: Postgres enum type + column alter. Watch the known projection drift (~620-line accepted residual — don't fight it, but don't add to it: run `pnpm db:check` before and after and diff the drift).
5. Regen: `compile · client · generate-hooks · schema:full · generate-metadata · openapi`. App-side: enum unions flow into generated types — fix consumer type errors per batch (bounded by domain).
**Order:** low-write-volume domains first (quality, integrations) → kitchen/inventory → events/finance last.
**Risk:** enum column migrations lock briefly; values in DB that fall outside the declared vocab will fail the alter — run a pre-flight `SELECT DISTINCT status` per table and reconcile stragglers first.

### WS8 — Composite unique keys
`unique [tenantId, eventNumber]`-style declarations for natural keys currently enforced only by convention (0 today). Sweep for candidates (eventNumber, invoiceNumber, sku, email-per-tenant), verify no duplicate rows exist (`SELECT ... GROUP BY ... HAVING count(*)>1`), then declare + migrate per entity. Small, high-value integrity wins.

### WS9 — Referential actions (U2)
253 `belongsTo` but only 12 `onDelete` clauses. Repo rule is "no FK constraints in Prisma, flat keys" — so **verify first** whether `onDelete` on a manifest relationship projects an FK (conflicts with repo convention) or only IR metadata (safe). If it projects FKs, this WS is a NEEDS-RYAN fork on the no-FK convention; if metadata-only, sweep cascades for owned children (event-owned records, line items) to power runtime-side cascade semantics.

### WS10 — Money precision (ride-along only)
Bare `money` already projects `Decimal(10,2)`; `budget` shows `(12,2)`. Standardize explicit `money(12,2)` only when the schema-drift audit flags a mismatch or when touching a file anyway. No standalone sweep.

### WS11 — PII masking/encryption expansion — **gated on P5**
The example masks contact email/phone/access codes with `unmask when hasPermission(...)`. Capsule has 1 masked field. If P5 confirms reads bypass masking (expected), this is a **fork**: either route sensitive-entity reads through the runtime (architecture change, NEEDS-RYAN) or implement masking at the read-projection layer. Do not sweep-add `masked` modifiers that nothing enforces — that's worse than absent (false sense of protection).

---

## Phase 3 — Structural / organizational (each item NEEDS-RYAN before code)

### WS12 — `module` blocks per domain
0 today; the example wraps the domain in `module events { }`. Benefit: IR `modules[]` becomes the grouping authority, and `generate.mjs`'s `ENTITY_DOMAIN_MAP` could be **derived from `ir.modules`** instead of hand-maintained (retiring the "edit entity-domain-map.mjs FIRST" gotcha). Investigate: does `compileProjectToIR` accept `module` blocks per file merging into one program with the shared `_base` use? Pilot on one domain. If the map derivation works, this deletes a recurring failure mode; if not, modules are cosmetic — skip.

### WS13 — Value objects
0 today. Candidates: address clusters (`venueName`/`venueAddress` on Event; shipping/billing addresses in finance), contact triplets. **Investigate projection shape first** (Json column vs flattened columns) — this changes the DB and every consumer. Only worth it where the cluster repeats ≥3 entities.

### WS14 — Async commands + inbound webhooks
0 of each. Candidates: report generation, forecast recalcs (async); Stripe/calendar inbound (webhook, replacing hand-written routes with HMAC/idempotency config). Both are **platform features, not source rewrites** — gated on P7/P8 proving the runtime/projection actually executes them in capsule's Next.js setup. High effort; propose individually.

### WS15 — Non-goals (documented so loops don't re-litigate)
- `external entity` — meaningless in a single merged IR; every referenced entity is internal.
- `realtime` flags — capsule's SSE stack predates and supersedes `nextjs.subscribe`.
- New display-only `computed`s — HARD STOP stands (unobservable via bypass reads).
- Retiring the `generate.mjs` route remap — verified irreducible (routeSegments can't express the dispatcher infix).

### WS16 — versionProperty expansion — gated on P4
Only 8 entities have OCC today, and the store had a silent-data-loss bug with it (2026-06-18, Event fixed via bespoke store, 7 others pending producer fix). Expand only after P4 proves the generic store handles versions on 3.2.1.

---

## Sequencing & cadence

```
Phase 0 (1 session) → WS1 (roles) ┬→ WS2+WS4 (hygiene, ride-alongs) → WS3 (reactions)
                                   └→ WS5 (schedules)
Phase 2: WS7 pilot → WS7 domain batches (interleave WS8/WS9/WS10 per domain touched)
Phase 3: survey docs → NEEDS-RYAN forks
```

- One domain-batch = one commit (`[refactor(manifest)] <domain>: <workstream> — <what>`), staged by explicit pathspec.
- Every batch ends green on `pnpm manifest:ci`; Phase 2 batches also end on `pnpm db:check` clean (modulo the accepted residual).
- WS1/WS2/WS3 are safely pausable mid-stream; WS7 batches must complete per-domain (half-migrated vocab is worse than none).

## Success criteria

1. `user.role in [` count in source: 464 → 0 (WS1).
2. `status: string` count: 82 → 0 for true closed sets (WS7).
3. Wired middleware count reduced by every portable handler, each with a ported passing test (WS3).
4. 10/10 crons declared as `schedule` (WS5).
5. `manifest:ci` green at every commit; no new governance-allowlist entries.
6. All Phase-3 forks have a written NEEDS-RYAN entry in `canonical/` instead of silent implementation.
