# Manifest Native Runtime & Companion Ownership

Canonical ID: `manifest.runtime-native-ownership`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `partial` (native surfaces shipped in 3.1.3; Capsule still hand-rolls them with `emitCompanions:false`)

Last reviewed: `2026-07-04`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Manifest 3.1.3 (@angriff36/manifest) now ships first-class runtime, dispatcher, response envelope,
generic store, transaction/outbox/audit, and companion-module surfaces. This entry decides whether
Capsule-Pro keeps its hand-rolled equivalents or deletes them in favor of the native package surfaces.
```

Real app impact:

```text
When correct:
- One runtime options module binds Capsule concerns (Prisma client, auth-derived context, Sentry/log,
  feature flags, custom builtins, genuinely business-specific middleware) into native RuntimeOptions.
- Native companions (createManifestRuntime, manifest-response, database, auth/tenant helpers) are
  generated and consumed; Capsule stops hand-maintaining their twins.
- The Next.js dispatcher is generated natively (externalExecutor mode) instead of hand-written.

When wrong:
- Two runtimes, two response envelopes, two store layers drift apart → the exact failure class the
  constitution §10/§16 forbids (generated-surface drift).
- ~2,800 LOC of hand-rolled factory/dispatcher/response glue keeps bit-rotting against native behavior.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
The native surfaces exist (verified 2026-07-04 against @angriff36/manifest@3.1.3 dist). PR #78 (open,
branch feat/manifest-3.0-native) stages the flip in manifest.config.yaml but leaves
emitCompanions/dispatcher/concreteCommandRoutes disabled and the hand-rolled factory in place.
Whether to flip + delete is an architecture-affecting decision Ryan owns.
```

Do not do:

```text
Do not flip emitCompanions / dispatcher.enabled without Ryan's decision — it makes the current
apps/api/lib/manifest-runtime.ts + manifest/execute-command.ts + manifest-response.ts nonconforming.
Do not delete manifest-runtime-factory.ts until the binding logic it owns (Prisma client injection,
auth context, Sentry/log, flags, custom builtins) is moved into a thin Capsule options module.
Do not assume native GenericPrismaStore covers the 4 bespoke stores (Event advisory-lock,
InventoryTransfer sequence, PrepTask cross-table, KitchenTask) — their business logic must move to
.manifest source or an explicit options module first.
```

Agents may update evidence below, but may not overwrite this section unless Ryan explicitly gives the decision.

---

## 3. Current Status

Current recorded status:

```text
@angriff36/manifest@3.1.3 installed. Branch feat/manifest-3.0-native (PR #78, open).
manifest.config.yaml currently sets:
  dispatcher.enabled: false  (executionMode: externalExecutor, executorImportPath staged)
  concreteCommandRoutes.enabled: false
  emitCompanions: false
Capsule hand-rolls: manifest-runtime-factory.ts (2,050 LOC), apps/api/lib/manifest-runtime.ts (212 LOC),
  apps/api/lib/manifest/execute-command.ts (384 LOC dispatcher/executor),
  apps/api/lib/manifest-response.ts (200 LOC), manifest/runtime/src/prisma-stores/* + prisma-store.ts,
  middleware/, async-reactions/, event-bus.ts, saga/outbox glue.
```

Known gaps:

```text
- Native surfaces unused at runtime because emitCompanions/dispatcher are disabled.
- Bespoke store business logic (4 stores) not yet expressible as .manifest source or options config.
- constitution.md §4a currently BLESSES apps/api/lib/manifest-runtime.ts + execute-command.ts as
  canonical "API transport glue" — those rows become deletion targets once this decision is final.
```

Verified flip blockers (2026-07-04 deep investigation, evidence-cited — the flip is NOT purely a
decision; three native gaps must close or be adapted first):

```text
1. Native GenericPrismaStore (3.1.3 dist/manifest/stores/prisma-generic/store.js) STILL has the
   compound-key OCC bug: update() stuffs the version field into the tenantId_id compound selector,
   Prisma rejects, the catch swallows → HTTP 200 with dropped write (same class as the 2026-06-18
   Capsule incident). Bespoke/copied store layer must stay until fixed upstream.
2. Native dispatcher externalExecutor contract is {entityName, commandName, input, instanceId,
   context:{tenantId, orgId, actorId, requestId, source, user}} — Capsule's runManifestCommand takes
   {entity, command, body, user}; native auth emission (authProvider) differs from Capsule
   requireCurrentUser (DB tenant+role resolution, InvariantError→401). Needs a signature adapter.
3. Native manifest-response companion lacks Capsule's kind/friendlyError/sourceLocation/batch
   envelope; IR guards are bare IRExpression[] with no message slot, so the guard-message seam
   (generate-guard-messages.mjs) remains required.
Interim executed under the 2026-07-04 mission directive: dead twins DELETED (api-response.ts,
prep-list-autogeneration pipeline, kitchen/ alternate engine layer, manifest/generated/runtime
dual-write dir, manifest-hooks-pilot.ts) — see manifest/phase-out-registry.md. execute-command.ts
is reclassified KEEP_NARROW_APP_ADAPTER (designated external executor), manifest-response.ts
pending Q003 envelope audit.
```

Confidence: `high`

Evidence:

```text
- Installed: node_modules/@angriff36/manifest@3.1.3 (package.json version verified)
- Native GenericPrismaStore: dist/manifest/stores/prisma-generic/store.{js,d.ts}
- Native companions (createManifestRuntime generator): dist/manifest/projections/shared/companions.{js,d.ts}
- RuntimeOptions full surface: dist/manifest/runtime-engine.d.ts (middleware, storeProvider,
  idempotencyStore, auditSink, outboxStore, approvalStore, eventBus, customBuiltins,
  requireTenantContext, encryptionProvider, threaded transaction handle)
- Native dispatcher: dist/manifest/projections/nextjs/generator.js (externalExecutor mode)
- Capsule config: manifest.config.yaml lines 62-72 (dispatcher/emitCompanions all :false)
- Capsule hand-rolled: manifest/runtime/src/manifest-runtime-factory.ts (2,050 LOC),
  apps/api/lib/manifest/execute-command.ts (384), apps/api/lib/manifest-response.ts (200),
  apps/api/lib/manifest-runtime.ts (212)
- PR #78: https://github.com/Angriff36/Capsule-Pro/pull/78 (open)
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/runtime-native-ownership/README.md
```

Source location (Capsule hand-rolled, deletion candidates):

```text
manifest/runtime/src/manifest-runtime-factory.ts
manifest/runtime/src/prisma-store.ts
manifest/runtime/src/prisma-stores/*
manifest/runtime/src/middleware/*
manifest/runtime/src/async-reactions/*
manifest/runtime/src/event-bus.ts
apps/api/lib/manifest-runtime.ts
apps/api/lib/manifest/execute-command.ts
apps/api/lib/manifest/execute-saga.ts
apps/api/lib/manifest-response.ts
```

Generated output location (native, when enabled):

```text
Generated companions under apps/api/app/lib/manifest-companions/ (projected by nextjs companions)
Generated dispatcher: apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (native)
```

Runtime location:

```text
@angriff36/manifest (RuntimeEngine, RuntimeOptions, stores/prisma-generic, projections/shared/companions)
```

UI location:

```text
NONE
```

Test location:

```text
UNKNOWN — conformance tests must be re-pointed at native dispatcher when flipped
```

Docs location:

```text
manifest/notes.md §0b (RECONCILIATION 2026-07-04)
manifest/phase-out-registry.md §G (native companion/dispatcher flip)
constitution.md §4a (to be amended once decision is final)
```

---

## 5. Entry Points

User-facing route:

```text
NONE
```

Route file:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (currently Capsule template; native when dispatcher.enabled:true)
```

API route / dispatcher:

```text
POST /api/manifest/{entity}/commands/{command}
```

CLI command:

```text
pnpm manifest:generate  (would emit companions + native dispatcher when config flipped)
```

Background job / cron / worker:

```text
POST /api/async-reactions/drain (Capsule hand-written; native eventBus/outbox may own this when flipped)
```

---

## 6. What Consumes It

Direct consumers:

```text
- apps/api/lib/manifest/execute-command.ts → createManifestRuntime → @repo/manifest-runtime
- All governed command routes via the dispatcher
- constitution.md §4a (canonical-homes table blesses the current glue paths)
```

Indirect consumers:

```text
- Every governed write in the app
- SSE/realtime (event bus), audit log, outbox drain cron, async reactions
```

Generated consumers:

```text
- Generated read routes call database.* (native accessor config)
- Generated client/hooks call the dispatcher URL
```

Human consumers:

```text
Ryan (decision owner), coding agents (must not re-twin native surfaces)
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 213 entities (all flow through RuntimeEngine regardless of native vs hand-rolled)
```

Manifest commands:

```text
All 1,059 commands
```

Manifest events:

```text
All 1,034 events (outbox/eventBus delivery is one of the deletion-target surfaces)
```

Manifest policies / access rules:

```text
NONE (policies enforced inside RuntimeEngine either way)
```

Database tables / collections:

```text
manifest_outbox_entries, audit_log, manifest_idempotency, manifest_command_telemetry (runtime infra)
```

Generated types:

```text
CommandResult envelope (manifest-response companion when native)
```

Generated client/hooks:

```text
manifest-client/*.generated.ts, manifest-hooks/*.generated.ts (URLs unchanged; dispatcher URL is contract)
```

Forms/pages/components:

```text
NONE (transport-only consumers)
```

---

## 8. Canonical Behavior

Happy path:

```text
Native: manifest.config.yaml emitCompanions:true + dispatcher.enabled:true → projection emits
createManifestRuntime + manifest-response + dispatcher. Capsule's thin options module binds
{ prisma, authContext, sentry, flags, customBuiltins } into RuntimeOptions. All governed writes
flow through the generated dispatcher → RuntimeEngine.runCommand.
```

Failure behavior:

```text
If bespoke store logic isn't migrated before the factory deletion, the 4 bespoke-store entities
(Event/InventoryTransfer/PrepTask/KitchenTask) lose advisory locks / sequence generation /
cross-table mapping → silent correctness bugs. Mitigation: migrate that logic to .manifest source
or an explicit options-module factory BEFORE deleting the hand-rolled factory.
```

Forbidden behavior:

```text
Running half-native half-hand-rolled (the current state) indefinitely without a decision.
Keeping a second runtime engine, second response envelope, or second store layer once native is on.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Native Runtime & Companion Ownership
```

Allowed aliases:

```text
Native companions, generated dispatcher, runtime options module
```

Forbidden aliases:

```text
"Custom runtime" (implies it should exist alongside native — it shouldn't once flipped)
```

Casing / slug rules:

```text
Folder: runtime-native-ownership
Canonical ID: manifest.runtime-native-ownership
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Flip `emitCompanions` + `dispatcher.enabled` to `true` and delete the hand-rolled factory/dispatcher/response? | ~2,800 LOC deletion; closes the two-runtime drift class. PR #78 stages the config but leaves it off. | manifest.config.yaml:62-72; manifest-runtime-factory.ts 2,050 LOC; PR #78 open. | A: Flip + delete per directive (keep thin options module); B: Adopt native GenericPrismaStore only, keep dispatcher/factory; C: Defer until PR #78 merges | NEEDS-RYAN |
| Q002 | Where does bespoke store business logic (Event advisory-lock, InventoryTransfer sequence, PrepTask cross-table, KitchenTask) land? | Must move BEFORE factory deletion or those entities break. | 4 bespoke stores in manifest/runtime/src/prisma-stores/. | A: Author as .manifest source (reactions/commands); B: Keep as explicit options-module factories; C: Native GenericPrismaStore hooks/middleware | NEEDS-RYAN |
| Q003 | Does the Capsule response contract differ intentionally from native manifest-response? | If yes, an external executor stays; if no, manifest-response.ts (200 LOC) is deletable. | apps/api/lib/manifest-response.ts vs generated companion shape. | A: Identical → delete; B: Intentional divergence → keep thin executor; C: Audit diffs first | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-07-04 | Initial evidence gathered | agent | PR #78 + 2026-07-04 deletion directive. Verified @angriff36/manifest@3.1.3 ships native GenericPrismaStore + companions + full RuntimeOptions + native dispatcher. Capsule hand-rolls all of them with config flags :false. Decision to flip + delete is Ryan's. |
| 2026-07-04 | Dead twins deleted; flip found BLOCKED by 3 native gaps | agent (mission directive) | Ryan's product-completion mission authorized removing obsolete glue where native replaces it. Deep verification found native 3.1.3 does NOT yet safely replace the runtime layer (OCC bug, executor contract, response envelope — see Known gaps). Executed instead: zero-consumer dead-twin deletions + single-homed generated metadata. Q001 wholesale flip stays NEEDS-RYAN pending upstream fixes. |
