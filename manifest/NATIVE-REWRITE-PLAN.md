# Native Manifest Source Rewrite Plan

**Date:** 2026-07-06 (compiler bumped 2026-07-07) · **Installed compiler:** `@angriff36/manifest` **3.4.25** (was 3.4.22 when this line was written, 3.3.1 at first draft) · **Scope:** `manifest/source/**/*.manifest` (104 files, ~212 entities)

> **2026-07-12 — WS1 fork discovered (NEEDS-RYAN, gates AC-003).** WS1 is NOT mechanical: `user.role in [...]` literals (461 sites / 102 files / 52 distinct sets, re-verified via node count) are string-membership checks over hand-picked role **subsets**, but the 6 declared capabilities are role-hierarchy **closures** (subtrees). The dominant literal `{"admin","manager"}` (~90 sites) would map to `manageAccess`, which resolves to the **18-role** `manager` subtree — a **16-role widening** (grants `kitchen_manager`/`hr_admin`/`payroll_admin`/`billing_admin`/`owner`/`system`/…). The plan's own diff-guard ("fail on any widening/narrowing") would **reject** the plan's own proposed vocabulary. No literal exactly equals any capability closure, and `{admin,manager}` cannot be expressed as an inheritance closure without `deny`-carving (which would break the already-migrated time-entry/payroll `roleAllows` sites). **Decision needed:** widen-to-closed-subtree (align auth with the hierarchy) vs preserve-exactly (WS1 461→0 unreachable). Filed: [`canonical/unresolved/manifest.ws1.capability-closure-fork.md`](../canonical/unresolved/manifest.ws1.capability-closure-fork.md). Until resolved: **DO NOT migrate any site** (silent widening = privilege escalation). Also audit time-entry/payroll — their `manageAccess` widening already shipped; confirm it was intended.

> **2026-07-11 — recount + compiler ≥3.4.23 resolved.** Verified with bare `rg` over `*.manifest` (ref files excluded): `uuid … = ""` = **187 / 69 files**; `user.role in [` = **461**; `status: string` = **140 raw / 92 `validStatus`**; native `schedule`/`fanOut` in source = **0/0**. Compiler is **3.4.25** ≥ 3.4.23, so trusted `from context.*` params project as optional in zod — the pre-flight-gate 400 caveat in the note below no longer applies. Phase-0 P1–P9 remain formally unanswered here (record answers in the table below before starting gated work). See `IMPLEMENTATION_PLAN.md` for the per-domain batch breakdown.

> **2026-07-11 — WS0 body-seed mechanism confirmed; schema-drift audit has a blind spot (gates 5 accounting fields).** The engine's `create` path persists a constraint-validated instance **from the command body** BEFORE running mutates (`manifest/runtime/src/run-manifest-command-core.ts:458-463`, `shouldAutoCreateInstance`) — i.e. body-present values (incl. parent-context-inherited FKs) seed the INSERT, overriding property defaults. (This corrects the earlier note below that said the INSERT is only "defaults + same-named params".) BUT the schema-drift audit `manifest/scripts/audit-schema-drift.mjs` does NOT model body-seed: it covers a required column only via create-param / property-default / create-mutate-target. So a required `uuid` FK that is body-seeded, not a param (parent-context audit forbids it), and not a mutate target has `= ""` as its only audit coverage. Dropping `= ""` → NEW `missing` violation → manifest:ci RED. Blocked fields (NEEDS-RYAN): CollectionCase.{eventId,clientId}, Payment.{eventId,clientId}, Invoice.clientId. Fork: teach the audit that `belongsTo`-FK fields are body-seed-covered, or approve an allowlist class. Done this batch (clean — no create command ⇒ audit skips): CollectionAction/CollectionPaymentPlan.collectionCaseId.
>
> **2026-07-11 — WS0 administrative batch (13/14 IR-only).** Dropped `= ""` from 13 administrative uuid fields — 7 nullable + 6 required-but-param-seeded (each has a same-named create param that seeds the bootstrap INSERT, so dropping the bogus default keeps the column NOT NULL with zero schema change; same proven pattern as the platform batch). Also fixed `admin-task-rules` `mutate sourceId = sourceId != null ? sourceId : ""` → `: null` — the mutate fallback was itself writing a bad `""` into `@db.Uuid` (same WS0 bug class; `null` is valid for the nullable column whereas `""` is not). `manifest:ci` green; `manifest.prisma` byte-identical (no migration, no `db:dev`). Deferred (1): `AdminChatParticipant.userId` — required `uuid`, NO create param, filled only by `mutate userId = user.id` (context) → the bootstrap INSERT writes `""` to a NOT NULL `@db.Uuid` before the mutate runs. **⚠ 2026-07-11 correction: the previously-suggested "clean IR-only fix" (add a trusted `userId from context.user.id` param) is NOT viable — it's a FORK.** Verified: callers pass ARBITRARY userIds in the create body for multi-participant thread creation (`apps/api/.../chat/threads/route.ts:209/457/481`, `threads/[threadId]/route.ts:81`, `threads/[threadId]/messages/route.ts:108`). Freezing `userId = context.user.id` would make every participant the current user and break multi-participant chat. Real options need Ryan sign-off: (a) caller-supplied `userId: string` param (server-mediated today; close the dispatcher spoofing hole with an execute policy, not by freezing the value), or (b) split `create` (self-scoped) + admin `addParticipant(userId)`. Fallback: make column nullable → migration. Live recount after this batch: **164 `uuid=""` / 57 files** (115 nullable + 49 required); the "187/69" cited elsewhere in this doc was stale (real pre-batch figure was 177/64).

> **2026-07-10 — wiring-mismatch signature sweep (in progress) + first `from context.*` trusted params.** `pnpm manifest:wiring:inspect` proved 218 contract mismatches were real runtime 400s with two source-level root causes: (1) `param: type?` means nullable-value/required-KEY — authors meant the `optional` keyword; (2) actor/audit params (`userId`, `requestedBy`, `canceledBy`…) declared as client params (also a spoofing hole — clients could send any userId). Sweep applied: `optional` + coalesce-to-self mutates (`mutate x = x != null ? x : self.x`, loose `==` makes omitted==null) on partial-update commands, and `param: string from context.user.id` trusted params (capsule engine context is `{user:{id,tenantId,role}, tenantId}` — use `context.user.id`, NOT `context.actorId`, which capsule never sets). Also declared the missing governed `Invoice.create`/`Payment.create` (routes invoked them; engine has NO implicit create → 404/500). ⚠ Trusted params require `@angriff36/manifest` ≥ 3.4.23: the 3.4.22 zod.command projection emits them as required, so the capsule pre-flight gate would 400 requests that correctly omit them (fixed upstream in Manifest repo commit 135914a, pending release).

> **2026-07-07 — compiler 3.3.0→3.3.1 create-regression fix (shipped).** 3.3.0 introduced composite-key runtime identity and (in `RuntimeEngine.prepareCreateData`) wrote the encoded key tuple `"tenantId|id"` into the persisted `id` for every `key`-declaring entity, so `store.create()` received `id="tenantId|id"` → Postgres `invalid input syntax for type uuid` on every generic-store create. Fixed upstream in 3.3.1 (`!entity.key.includes("id")` guard; regression test added) and pinned here. **This fix UNMASKED the empty-string-UUID-default bug below** — creates now reach the DB and every `uuid … = ""` field fails. See new **WS0**.

**Reference style:** `manifest/source/manifest-example.manifest.bak` (the Event-domain showcase) and `manifest/CLAUDE.md` (IR contract). This plan rewrites *source files only* — pipeline glue divergences live in `MANIFEST-DIVERGENCES.md` (D-series); this plan continues its U-series at the source-authoring level.

**Companion register:** MANIFEST-DIVERGENCES.md is written against manifest 2.5.0. Installed compiler here is **3.3.1** (see header) — re-verify any "blocked upstream" claim before citing it. Verified today: enum→Prisma emission works (17 `enum` blocks in generated `manifest.prisma`), bare `money` already projects to `Decimal`.

---

## Verified gap matrix (counted 2026-07-06, bare `rg`/grep on source, `.bak` excluded)

| Construct                                                                | Example demonstrates                          | Capsule source today                                                                                                                                                      | Gap class                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **`uuid` defaults**                                                      | `uuid?` (null) vs `uuid` (real value)         | **188 `uuid … = ""` across 69 files** — empty string used as a fake UUID                                                                                                  | **⛔ CRITICAL (WS0) — active create-breaking bug post-3.3.1** |
| `enum`                                                                   | every closed set                              | 17 enums; **82 `status: string` fields** (bare `rg 'status: string'` today = 151, incl. command params); vocab repeated in `validStatus` constraints + transition strings | **Major (U7)**                                               |
| roles + `roleAllows`                                                     | capability checks, no role lists              | 28 roles declared in `_base`; **12 `roleAllows` vs 464 inline `user.role in [...]`**                                                                                      | **Major (U1)**                                               |
| `transition` FSM                                                         | every state has a rule incl. terminal `to []` | 295 transitions / 64 files; only 1 status-bearing file lacks an FSM; CI dead-command scanner exists                                                                       | Minor                                                        |
| named `constraint` w/ code, `messageTemplate`, `details`, `overrideable` | rich block constraints                        | 758 constraints exist, mostly inline one-liners; commands lean on guard-soup (e.g. `Event.update` = 9 bare guards)                                                        | Moderate                                                     |
| `value` objects                                                          | `EventAddress`                                | **0**                                                                                                                                                                     | Moderate (DB shape)                                          |
| `module` blocks                                                          | `module events { }`                           | **0** (directory layout + `entity-domain-map.mjs` instead)                                                                                                                | Structural                                                   |
| `external entity`                                                        | Client/Venue refs                             | 0 — **not needed**: all 104 files merge into one IR via `_base`; every entity is internal                                                                                 | Non-goal                                                     |
| composite `unique [ ]`                                                   | `unique [tenantId, eventNumber]`              | **0** (20 inline `unique property`)                                                                                                                                       | Moderate (DB)                                                |
| `masked` / `encrypted`                                                   | contact PII, `unmask when`                    | 1 masked / 32 encrypted                                                                                                                                                   | Gated (read-path)                                            |
| `money(p,s)`                                                             | `money(12,2)`                                 | bare `money` — already projects `Decimal(10,2)`/`(12,2)`                                                                                                                  | Minor                                                        |
| `versionProperty`                                                        | OCC everywhere                                | 8 entities                                                                                                                                                                | Gated (OCC bug history)                                      |
| `timestamps`                                                             | yes                                           | 101 files                                                                                                                                                                 | ✅ done                                                       |
| `approval`                                                               | confirm workflow                              | 3 (procurement only)                                                                                                                                                      | Fork per flow                                                |
| `saga`                                                                   | ConfirmEventWorkflow + compensation           | 2                                                                                                                                                                         | Fork per flow                                                |
| `schedule`                                                               | cron sweep                                    | **0** — 10 crons hand-bound in `apps/api/vercel.json` (U8)                                                                                                                | **Major**                                                    |
| `webhook`                                                                | HMAC + idempotency inbound                    | **0** — inbound webhooks are hand-written API routes                                                                                                                      | Fork                                                         |
| `async command`                                                          | recalculateReadiness                          | **0**                                                                                                                                                                     | Fork                                                         |
| `retry` / `rateLimit`                                                    | on commands                                   | 11 / 5 (one file)                                                                                                                                                         | Minor                                                        |
| reactions / `fanOut` / `count()`                                         | 8 reactions + 3 fanOut                        | 10 reactions, **0 fanOut**, 0 count-aggregates; **69 `create*Middleware(` call sites** in `manifest-runtime-factory.ts` carry the load                                    | **Major**                                                    |
| typed event payloads                                                     | yes                                           | ✅ all 1041 events have typed payload blocks                                                                                                                               | ✅ done                                                       |
| explicit `emit X { }` payload mapping                                    | yes                                           | 0 — all 1072 emits are bare                                                                                                                                               | Optional                                                     |
| computed `cache`                                                         | request-cache on hot computeds                | 66 cache clauses / 660 computeds                                                                                                                                          | See HARD STOP below                                          |
| `realtime`                                                               | projection hint                               | 0 — capsule runs its own SSE (`reactionLogSink`, `tenant:{id}` channels)                                                                                                  | Non-goal                                                     |

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

> **2026-07-12 — Phase 0 preflight answers (P1, P5, P6, P7, P8) recorded.** Investigated via parallel subagents + direct code/binomial verification. P2/P3 (enum pilot), P4 (OCC repro), P9 (fanOut port) remain — each IS its workstream's first step (WS7/WS16/WS3) and gets a dedicated iteration.
>
> - **P1 → RESOLVED (fix applied; unblocks WS1).** `roleAllows`/`roleHasPermission` exact-matches `roleIndex.get(roleName)` with **no case normalization** (`@angriff36/manifest` runtime-engine.js `buildRoleIndex`:571 keys verbatim by `role.name`; `roleHasPermission`:583). Capsule injects **snake_case** `user.role` raw from the DB (`User.role @default("staff")` → dispatcher `route.ts:32` → `execute-command.ts:165,323` — no transform anywhere), but the IR carried **PascalCase** role names → every `roleAllows(user.role,…)` policy site resolved `get("manager")` against a `"Manager"`-keyed index → undefined → **denied every real user** (live pre-existing auth bug, hidden by the near-empty dev DB). **Fix:** renamed all 28 `_base` roles PascalCase→snake_case (pure rename — capabilities + inheritance unchanged; `manifest.prisma` byte-identical ⇒ IR-only, no migration). **Verified:** 11/11 regression test (positives resolve, negatives deny, legacy `"Manager"` denies); IR diff confined to role names + provenance metadata. The 461 literal sites are unaffected (they compare `user.role` to snake strings). New caps (`kitchenAccess`/`hrPayrollAccess`/`eventAccess`/…) + literal-migration drift analysis are deferred to the WS1 vocabulary-freeze iteration (guard-verified). Enum-only ghost roles (`super_admin`/`tenant_admin`/`operations_manager`/`staff_manager`/`read_only`) appear in NO manifest literal → don't block WS1 (enum cleanup, minor fork). → AC-003 gate cleared.
> - **P5 → CONFIRMED INERT.** 0 `masked` fields in source today; constitution §10 + prior audit confirm reads bypass the runtime → `masked`/`unmask when` is a no-op. **WS11 is a fork** (route sensitive reads through the runtime, or mask at read-projection). Do NOT sweep-add `masked` (false sense of protection).
> - **P6 → RESOLVED (unblocks WS5).** `schedule` projects to working cron routes: `app/api/cron/<kebab-name>/route.ts` → `runtime.runSchedule("<name>")` (CRON_SECRET-guarded GET), vercel.json auto-emitted (`@angriff36/manifest` nextjs schedule-generator). Path fits capsule's `app/api/cron/…` convention (+ app→api rewrite). Of the 10 current crons: **2 already target a manifest command** (`inventory-audit`→`CycleCountSession.create`, `async-reactions/drain`), **2 hybrid** (`contract-expiration-alerts`, `email-reminders` — orchestrate but call `EmailWorkflow.recordTriggered`), **6 infra** (`sentry-fixer`, `webhook-retry`, `idempotency-cleanup`, `integration-auto-sync`, `outbox/publish`, `keep-alive` — need a thin command or stay hand-written).
> - **P7 → INERT.** Upstream ships a full webhook handler (HMAC + idempotency + transform) + a nextjs webhook-route generator, BUT capsule wires **zero** webhook routes through the runtime (Stripe/Clerk/Sentry are hand-written). **WS14 fork.**
> - **P8 → PARTIAL.** Upstream `async`/JobQueue IR is inert in capsule (0 consumption). BUT capsule's **own** durable async-reaction system is live (`PostgresAsyncReactionStore` + `apps/api/…/async-reactions/drain` worker + 9+ registered handlers). **WS14 builds on capsule's system, not upstream `async`.**

| #   | Verify                                                                                                                                                                               | Gates | How                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Role-name matching**: `user.role` values in data are snake_case (`"kitchen_lead"`); declared roles are PascalCase (`KitchenLead`). Does `roleAllows("kitchen_lead", cap)` resolve? | WS1   | Unit test against runtime `resolveRoleGraph`/`roleAllows` builtin; if exact-match, either re-declare roles snake_case in `_base` (preferred — matches data) or normalize at context enrichment |
| P2  | **Enum end-to-end on 3.2.1**: source `enum` → IR → Prisma `enum` column + zod/hooks/client regen + a migration on ONE low-traffic entity                                             | WS7   | Pilot on `EventContract.status` or similar; run full regen chain + `pnpm db:dev --create-only`; check `verify-invariants` D22 gate                                                             |
| P3  | **Do transitions/guards accept enum members** or still compare strings post-enum-typing?                                                                                             | WS7   | Compile the pilot; inspect IR transitions + run FSM conformance test                                                                                                                           |
| P4  | **OCC status**: is the GenericPrismaStore version-in-compound-key bug (2026-06-18) fixed on 3.2.1?                                                                                   | WS16  | Re-run the silent-data-loss repro against a versioned entity                                                                                                                                   |
| P5  | **Read-path masking**: do any read routes evaluate `masked`/`unmask when`? (Reads bypass runtime → likely inert)                                                                     | WS11  | Trace one detail GET for an entity with a masked field                                                                                                                                         |
| P6  | **Schedule projection**: does `nextjs` projection on 3.2.1 emit cron route handlers from `schedule` decls, and what path shape?                                                      | WS5   | Scratch compile of example's `schedule` block; compare to `apps/api` route conventions + rewrite requirements                                                                                  |
| P7  | **Webhook projection**: same question for `webhook` (route emission, HMAC verify, idempotency store)                                                                                 | WS14  | Scratch compile; grep runtime for signature/idempotency implementations — IR shape ≠ working feature (manifest/CLAUDE.md)                                                                      |
| P8  | **Async command runtime**: JobQueue adapter wired in capsule? (`durable` store / job drain)                                                                                          | WS14  | grep runtime factory for job queue setup                                                                                                                                                       |
| P9  | **`fanOut` + `count()` on 3.2.1**: conformance-test one fanOut reaction end-to-end in the capsule runtime harness                                                                    | WS3   | Port one existing cascade middleware to `fanOut` in a test IR                                                                                                                                  |

---

## WS0 — Empty-string UUID defaults (⛔ CRITICAL, do FIRST — active create-breaking bug)

**What:** 188 `uuid … = ""` defaults across 69 source files. An empty string is not a UUID; when a create persists such a field it hits a `@db.Uuid` column and Postgres rejects it (`invalid input syntax for type uuid: ""`). Hidden until now by the 3.3.0 composite-id regression (creates never reached the DB); the 3.3.1 fix exposed all 188.

**Why FIRST:** every governed create touching one of these fields is currently broken (verified: `TrainingAssignment.create` → `employeeId=""`; `Notification.create` succeeds only because it has no such field). This blocks real user flows today — it is not modernization, it is a live regression surface.

**The persist-before-mutate wrinkle (important — a blind `s/= ""//` is NOT sufficient):** the engine inserts the row from the create *bootstrap* (defaults + same-named params) and runs the command's `mutate` actions *afterward* as an update. So a field whose value is supplied by a `mutate` from a **differently-named param or context** (`mutate employeeId = staffMemberId`, `mutate assignedBy = user.id`) is NOT populated at the first insert — it lands on its default.

> **PROVEN (2026-07-07, engine store-op trace of `TrainingAssignment.create`):** `[ ["CREATE", ""], ["UPDATE", "c4a2402f-…"] ]`. The INSERT carries `employeeId=""` (default; param is `staffMemberId`, field is `employeeId` — names differ, so no bootstrap seed), then a second UPDATE writes the real value. In-memory stores accept the `""` insert then update (unit tests pass, hiding the bug); Postgres `@db.Uuid` rejects the `""` INSERT before the UPDATE runs. Contrast `TimeOffRequest.create`, whose param IS `employeeId` (matches the field) → filled at insert, no separate update needed. **Rule of thumb: a create param that feeds a `@db.Uuid`/required field via a rename-mutate (`field = otherParam`) or context (`= user.id`) is broken against Postgres.**

Two cases:
- **Nullable UUID (`uuid? = ""`):** drop the `= ""` → inserts as `null` (valid), the later `mutate` fills it. **IR-only change — NO migration** (verified 2026-07-11, compiler 3.4.25 + post-`20260710142245_reconcile_schema_truth`). The prisma projection no longer emits `@default("")` on `@db.Uuid` columns — bare `rg '@default("".*@db.Uuid|@db.Uuid.*@default("")' packages/database/prisma/schema/manifest.prisma` → 0 matches (the 614 `@default("")` lines are all String/Text/array). So dropping the source `= ""` removes only the IR `defaultValue` block; `manifest.prisma` is byte-identical and `db:check` stays clean. **129 of 186 fields are nullable → these are fast Phase-1-style batches** (edit → `manifest:build` → `manifest:ci` → commit; no `db:dev`, no "awaiting deploy"). Proven end-to-end on `KnowledgeBaseEntry.authorId` (`manifest:ci` green, zero-line `manifest.prisma` diff). The earlier "needs a migration (drop default)" below was true pre-3.4.22; it is stale now.
- **Required/NOT-NULL UUID set only by a mutate (e.g. `assignedBy`):** null/`""` both fail at insert. Fix at the source so the value is present at bootstrap — rename the create param to match the field (so it seeds), OR accept the field as a create param, OR make the column nullable. Decide per field; don't auto-null a NOT-NULL column. **57 of 186 fields are required (`uuid = ""`)** — these still need case-by-case persist-before-mutate analysis and MAY touch schema (nullability) → migration.

**✅ PILOT DONE (2026-07-07, `TrainingAssignment`):** `employeeId: uuid? = "" → required uuid` with the create param renamed `staffMemberId → employeeId` (same-named → seeds the INSERT); `assignedBy: uuid → uuid?` (filled by the post-insert `mutate assignedBy = user.id` UPDATE — proven to persist). Migration `20260707125708_training_assignment_uuid_not_null` (repair-diff trimmed to the two ALTER clauses; `migrate dev` unusable while the accepted drift residual stands — use `pnpm db:repair` + trim + `db:deploy` per batch). Full assign→start→complete→refresh flow proven against Postgres in the real UI. Two pre-existing blockers fixed en route in `apps/api/app/api/training/complete/route.ts`: phantom `employees.user_id` column (→ `auth_user_id`, 3 raw queries) and scoreless document-module completes defaulting `score=0` (failed the `scorePercent >= passThresholdPercent` guard; now defaults to 100 when `passed`). Known residual: `on TrainingCompleted → StaffTrainingSignal.recordSchedulabilityGranted` logs success + emits but persists NO row (`staff_training_signals` empty; reaction `resolve uuid()` never matches an instance → ephemeral bootstrap, no INSERT) — same silent-persist class, fix when sweeping.

**How:**
1. Enumerate: `rg 'uuid.*= ""' manifest/source` (188 lines / 69 files as of 2026-07-07; TrainingAssignment done). Classify each as nullable-vs-required and mutate-filled-vs-param-seeded.
2. ~~Pilot on `TrainingAssignment`~~ — done, see above.
3. Batch per domain, each: manifest edit → full regen (`compile · generate · schema:check · generate-metadata · client · generate-hooks`; `schema:full` was deleted in PR #78 — `manifest:generate` writes `manifest.prisma` natively) → `pnpm db:dev --create-only` → review SQL (dropped defaults / nullability) → deploy → `db:check`.
4. Pre-flight per table: `SELECT DISTINCT <col>` — reconcile any rows already holding `""` before the column default is dropped.

**Gates:** `manifest:audit:strict` (schema-drift), `db:check`, and a real create smoke-test per touched entity (unit tests miss it — they use in-memory stores that accept `""`; the failure only appears against Postgres `@db.Uuid`).

**Ordering vs the rest:** WS0 precedes WS1. It overlaps WS7 (enum) mechanically (both are schema-touching per-domain batches) — interleave per domain if convenient, but do not gate WS0 behind the enum pilot.

---

## Phase 1 — IR-only rewrites (no DB migration, per-domain batches, each batch = one commit + green `manifest:ci`)

### WS1 — Role capability migration (U1) · ~~the biggest mechanical win~~ ⛔ FORK (NEEDS-RYAN)

> **⛔ 2026-07-12 — FORK (NEEDS-RYAN), blocks this whole workstream + AC-003.** See the top-of-file blockquote and [`canonical/unresolved/manifest.ws1.capability-closure-fork.md`](../canonical/unresolved/manifest.ws1.capability-closure-fork.md). The literal→capability mapping is a **security-relevant widening** for the dominant patterns (e.g. `{"admin","manager"}` → `manageAccess` widens 2→18 roles). The plan's own diff-guard ("fail on any widening/narrowing") would reject it. Do NOT migrate any site until Ryan decides widen-to-closure vs preserve-exactly. The "biggest mechanical win" framing is **incorrect** — this is a per-site authorization decision, not a mechanical replacement; the mapping table below is the *proposal* awaiting sign-off, not an approved plan.

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
5. Regen: `compile · generate · schema:check · client · generate-hooks · generate-metadata · openapi` (`schema:full` no longer exists — PR #78). App-side: enum unions flow into generated types — fix consumer type errors per batch (bounded by domain).
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

0. `uuid … = ""` count in source: 188 → 0 (WS0); every touched entity has a passing Postgres-backed create smoke-test.
1. `user.role in [` count in source: 464 → 0 (WS1).
2. `status: string` count: 82 → 0 for true closed sets (WS7).
3. Wired middleware count reduced by every portable handler, each with a ported passing test (WS3).
4. 10/10 crons declared as `schedule` (WS5).
5. `manifest:ci` green at every commit; no new governance-allowlist entries.
6. All Phase-3 forks have a written NEEDS-RYAN entry in `canonical/` instead of silent implementation.
