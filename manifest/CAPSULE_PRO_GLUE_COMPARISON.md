# Capsule Pro: Generated Assembly vs. Live Glue

> **Current-state correction — 2026-07-12:** This document began as the record of the original `CAPSULE_PRO_BROWSER_SAFE_104.zip` experiment. Claims invalidated by later fixes are preserved with ~~strikethrough~~ and immediately followed by the verified current state. Manifest commit `af76501` (released in 3.4.25), Builder commit `5a32b6b`, and Capsule Pro commit `195d12e6e` resolved most of the original generation defects. The architectural migration analysis remains applicable.

## Answer first

Do **not** copy this assembled directory over Capsule Pro or reorganize Capsule Pro to match it wholesale.

The useful target is narrower: keep Capsule Pro's monorepo and product structure, but replace selected Manifest-owned internals with native generated companions. Capsule Pro should converge on a **thin host binding around generated artifacts**, not become this standalone demo shell.

The assembly proves the compiler already owns a lot of valuable domain structure: compiled IR, command/event/policy contracts, projections, a generic dispatcher shape, documentation, diagrams, and a runnable Next.js shell. It does **not** produce the Capsule Pro product application by itself. The current Builder output now produces a self-consistent, buildable project with Prisma and durable-store scaffolding, but its generated auth is intentionally fail-closed and its generated Prisma store binding uses a fixed single-tenant key. Those host bindings must be replaced before production use.

## What was tested

Source ZIP: `C:\Users\Ryan\Downloads\CAPSULE_PRO_BROWSER_SAFE_104.zip`

Isolated project: `C:\Projects\CAPSULE_PRO_BROWSER_SAFE_104_TEST`

Live comparison checkout (read-only): `C:\Projects\capsule-pro`

The compiled domain is real and complete for the browser-safe source set:

| IR element | Count |
| --- | ---: |
| Entities | 213 |
| Commands | 1,070 |
| Events | 1,045 |
| Policies | 466 |
| Stores | 211 |
| Sagas | 2 |
| Reactions | 10 |

~~The generated project can be made to typecheck and complete a Next.js production build, but only after manually repairing multiple assembly/projection defects.~~

**Current state:** Builder commit `5a32b6b` and Manifest 3.4.25 incorporate the repairs into generation. Fresh Builder E2E verification on 2026-07-12 passed both generated-package scenarios: install, TypeScript validation, Prisma validation/generation, and Next.js production build. A successful generated build still does not supply Capsule Pro's production auth, request-aware tenancy, migrations, integrations, or product UI.

## The decisive runtime result — historical failure and current correction

~~The generated runtime factory always ends with the equivalent of:~~

```ts
return new RuntimeEngine(ir, context);
```

~~It provides no durable store adapter. Every sampled store in this IR is declared `durable`.~~

The original ZIP's direct smoke test failed while constructing the engine, before any command executed:

```text
Entity 'ActionMilestone' declares 'store ... in durable' but no storeProvider is bound.
'durable' is backend-neutral and requires a runtime store adapter supplied via the storeProvider option.
```

~~The current assembly does not emit that binding.~~

**Current state:** Manifest 3.4.25 now makes a zero-config companion fail closed with an explicit generation/runtime error when durable stores exist. When `runtimeConfigImport` is supplied, the companion composes and passes a `storeProvider`. Builder now supplies that configuration and emits `GenericPrismaStore` bindings for durable entities. Builder also warns that its fixed `__single_tenant__` binding must be replaced with request-aware tenant resolution before multi-tenant production use.

The enduring boundary is:

- Manifest owns domain semantics and the runtime engine.
- Capsule Pro must still bind that engine to its database and operational environment.
- Builder can scaffold a binding, but Capsule Pro must supply and validate its production database, transaction, tenant, and integration bindings.

## Concrete keep / migrate / delete / do-not-copy map

| Live Capsule Pro surface | Decision | Why |
| --- | --- | --- |
| `manifest/source/**/*.manifest` | **KEEP — source of truth** | This is the domain definition that produces the valuable IR and projections. |
| `manifest/ir/kitchen.ir.json` and generated IR loading | **MIGRATE to native emitted IR companion** | The assembly proves the full IR can be packaged. Preserve frozen/bundled loading semantics and drift checks. |
| `manifest/runtime/src/manifest-runtime-factory.ts` (2,060 lines) | **DELETE eventually; not now** | Native companions can own engine construction, but Capsule-specific bindings and bespoke behavior must move out first. ~~Current assembly omits the required options entirely.~~ **Current Builder output supplies basic Prisma options; Capsule's production options still need parity migration.** |
| `apps/api/lib/manifest-runtime.ts` (200 lines) | **SHRINK to thin host binding, then possibly delete** | Its database, tenant event bus, telemetry, feature flags, transaction client, and reaction log dependencies remain real. ~~The emitted factory currently provides none of them.~~ **Manifest exposes the option slots and Builder scaffolds storage, but Capsule's concrete integrations are still host-owned.** |
| `apps/api/lib/manifest/execute-command.ts` (371 lines) | **MIGRATE to native dispatcher/external-executor mode** | The generic dispatcher shape is Manifest-owned. Preserve Capsule's response contract, transaction behavior, diagnostics, and operational hooks during the flip. |
| `apps/api/lib/manifest-response.ts` (196 lines) | **MIGRATE after contract parity test** | Native response helpers may replace it, but 475 live files currently reference the response surface; silent response drift would have a huge blast radius. |
| `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` | **KEEP the singular route pattern; swap producer later** | Capsule already uses the correct thin dispatcher architecture. ~~The emitted version disables auth and hard-codes `__no_tenant__`.~~ **Current Builder output emits a fail-closed custom auth stub; Capsule must bind its Clerk and tenant implementation.** |
| `manifest/runtime/src/prisma-stores/*` | **DELETE generic duplicates; KEEP/migrate bespoke exceptions** | Upstream generic Prisma storage can replace generic store code. Cross-table queries and custom delete/transaction behavior still need explicit domain rules or host adapters. |
| `packages/database/prisma/schema/**` and migrations | **KEEP** | ~~The emitted Prisma schema is invalid.~~ **Current Builder standalone Prisma output validates, and Capsule's current schema also validates.** Keep Capsule's migration history and require schema/parity/drift proof before changing ownership. |
| `apps/app/app/lib/manifest-client*.generated.ts` | **KEEP current split client until replacement passes adoption tests** | ~~The emitted client omitted its own type imports and leaked Manifest primitives.~~ **Manifest 3.4.25 fixes both defects and compiles `ts.types` with `ts.client` in regression tests.** The live split client is still consumed by 103 files, so migration remains a consumer-parity decision. |
| Native generated React Query hooks | **OPTIONAL; no current Capsule need** | ~~The projection leaks `uuid/json/timestamp/bytes` and emits 188 invalid zero-input mutations.~~ **Manifest 3.4.25 fixes the shared type mapping and zero-argument mutation syntax.** Capsule previously removed the hooks because they had no consumers, not because the corrected projection is unusable. |
| Native generated Zod schemas | **ADOPT only at real validation boundaries** | ~~Zod incorrectly maps JSON fields to strings with object defaults.~~ **The bad output came from Capsule's invalid `string? = {}` source defaults; Capsule removed them and Manifest 3.4.25 now rejects incompatible defaults. Zod's native JSON mapping is `z.unknown()`.** |
| Product UI, design system, workflows, pages, domain-specific read models | **KEEP** | The generated homepage is an IR inventory. It does not implement Capsule Pro's product. |
| Auth, tenant resolution, authorization context | **KEEP as host binding** | ~~The generated demo silently disables auth.~~ **Current Builder output emits a fail-closed custom auth stub and an `AUTH_CONFIGURATION_REQUIRED` warning.** Manifest policies still require Capsule to supply trusted Clerk user and tenant context. |
| Sentry, issue logs, telemetry, realtime/SSE, feature flags | **KEEP as adapters** | These are operational integrations outside the domain IR. Native option slots can host them, but generation cannot infer their concrete services. |
| Idempotency, audit, outbox, approvals, async reaction jobs | **MIGRATE into native RuntimeOptions; do not drop** | The engine supports these surfaces. Builder's generic project does not reproduce Capsule's complete operational binding, so parity must be proven before deletion. |
| Custom builtins and genuinely business-specific middleware | **MOVE into a small Capsule options module** | If semantics can be expressed in `.manifest`, move them there. Keep only environment- or integration-specific behavior in TypeScript. |

## What the assembly revealed about the deletion target

The good news is that Capsule Pro's own current code already describes the right end state. Its shared runtime factory calls itself a deletion target and lists the intended native options surface: middleware, store provider, idempotency, audit, outbox, approvals, event bus, custom builtins, tenant enforcement, encryption, and transactions.

However, the current config still has all three ownership switches off:

```yaml
dispatcher:
  enabled: false
concreteCommandRoutes:
  enabled: false
emitCompanions: false
```

So the deletion opportunity is real. The **original downloaded output** was not proof that deletion was safe. Current generation is materially stronger, but Capsule still needs a native-companion comparison using its real config, response contract, host options, and behavioral tests before these files can be retired.

The immediately visible deletion campaign is roughly **2,827 lines across four central wrappers** before middleware/store cleanup:

| Candidate | Current lines |
| --- | ---: |
| Shared runtime factory | 2,060 |
| API runtime shim | 200 |
| Execute-command wrapper | 371 |
| Response helper | 196 |
| **Total** | **2,827** |

That number is a migration ceiling, not a safe-delete number. The factory currently contains both replaceable engine plumbing and required Capsule bindings/business exceptions. Those must be separated first.

## Prisma schema result — historical failure and current correction

The original downloaded schema omitted both `generator` and `datasource` blocks because Builder invoked the configurable Prisma projection without standalone-project options. Prisma initially reported 584 errors because it validated against a generic connector.

Adding a PostgreSQL datasource and Prisma Client generator in this isolated experiment reduced the failures to 97:

- 90 missing inverse relation fields.
- 7 invalid `EntityVersion` / `VersionedEntity` one-to-one relation declarations.

~~The remaining 97 failures prove the current Prisma projection emits an invalid schema.~~

**Current state:** Builder now invokes Prisma with `provider: postgresql` and `autoBackRelations: true`, preserves the correct artifact paths, includes a compatible Prisma CLI, and runs schema validation/generation in E2E tests. Fresh Builder E2E passed. Capsule's current multi-file Prisma schema also validates successfully. It reports `relationMode = "prisma"` index-performance warnings, which are a separate optimization issue rather than schema invalidity.

Persistence remains **KEEP** during migration because the generated project does not contain Capsule's live migration history, production connection/adapter choices, or proven schema parity—not because the current projection is syntactically invalid.

## Assembly defects found during the experiment — resolution status

These described the original ZIP. Their current resolution is recorded inline:

1. ~~Root `lib` and `src` companions were emitted under `app/lib` and `app/src` while imports use `@/lib` and `@/src`.~~ **Fixed in Builder `5a32b6b`; artifact `pathHint` is now authoritative and alias-resolution tests cover the output.**
2. ~~Package metadata omitted Prisma CLI and React type dependencies.~~ **Fixed in Builder `5a32b6b`; generated packages include Prisma when selected plus Node/React type dependencies and validation scripts.**
3. ~~The dispatcher passed optional error/diagnostic fields to required response types.~~ **Fixed in Manifest `af76501` with fallback error text and empty diagnostics; Builder also protects older 3.4.24 output.**
4. ~~The generated client referenced hundreds of entity interfaces without importing them.~~ **Fixed in Manifest `af76501`; client/type artifacts now use a computed relative type import and compile together in a regression test.**
5. ~~Generated TypeScript leaked Manifest primitives (`uuid`, `json`, `timestamp`, `bytes`).~~ **Fixed in Manifest `af76501` through the shared `irTypeToTypeScript` mapper.**
6. ~~React Query emitted 188 invalid `mutationFn: (: void) =>` functions.~~ **Fixed in Manifest `af76501`; zero-input commands emit `mutationFn: () =>`, with a regression test.**
7. ~~Zod mapped JSON/object fields to strings while retaining `{}` defaults.~~ **Corrected classification:** Zod followed an invalid Capsule declaration (`string? = {}`). Capsule commit `195d12e6e` removed those defaults, and Manifest `af76501` added a compiler error for incompatible defaults.
8. ~~Prisma omitted its generator/datasource header and emitted invalid relation topology.~~ **Corrected classification and fixed assembly:** provider omission is intentional in models-only projection mode. Builder failed to configure the standalone preset. Builder `5a32b6b` now supplies PostgreSQL and `autoBackRelations`; fresh Prisma E2E passes.
9. ~~The runtime companion silently omitted every durable host adapter and failed during engine construction.~~ **Manifest `af76501` now fails closed with an actionable message when durable stores lack config. Builder `5a32b6b` supplies `runtimeConfigImport` and generated Prisma-store bindings. Production request-aware tenancy remains host work.**

~~These should be fixed in Builder/Manifest projections.~~ **They have been fixed as described above.** Capsule Pro should consume the corrected upstream contracts rather than add new local compatibility shims. Builder currently remains installed on Manifest 3.4.24 and carries compatibility rewrites for several 3.4.25 fixes; it should upgrade and remove redundant rewrites after verifying byte/contract parity.

## Recommended target structure

Keep Capsule Pro's existing monorepo boundaries and organize generated versus host-owned code explicitly:

```text
capsule-pro/
├─ manifest/
│  ├─ source/                     # human-authored domain truth
│  ├─ generated/                  # regenerated IR, docs, OpenAPI, metadata
│  └─ host/
│     ├─ options.ts               # the one thin Capsule RuntimeOptions binding
│     ├─ stores/                  # only genuine bespoke store exceptions
│     ├─ builtins.ts              # Capsule-only deterministic builtins
│     └─ integrations.ts          # telemetry, flags, event bus, external effects
├─ apps/api/
│  └─ app/api/manifest/[entity]/commands/[command]/route.ts
│                                  # generated/native singular dispatcher
├─ apps/app/                       # actual Capsule product UI
└─ packages/database/              # live Prisma schema, client, migrations
```

Do not copy the generated standalone layout's giant embedded `lib/manifest-runtime.ts`, monolithic hook file, or flat pile of Zod command schemas into the live repo. In a monorepo those are build artifacts, not architecture.

## Safe migration order

1. ~~**Fix Builder outputs first**: paths, dependencies, TypeScript mapping, React Query syntax, Zod JSON mapping, Prisma headers/relations, and runtime option injection.~~ **Completed by Manifest `af76501`/3.4.25, Builder `5a32b6b`, and Capsule `195d12e6e`; fresh focused tests and Builder E2E pass. Remaining cleanup: upgrade Builder from installed Manifest 3.4.24 to 3.4.25 and delete redundant compatibility transforms.**
2. **Extract Capsule host options** from the 2,060-line factory without changing behavior.
3. **Move business semantics into `.manifest`** where native reactions, actions, policies, constraints, or schedules can express them.
4. **Retain explicit TypeScript adapters** only for database peculiarities, external effects, auth/tenant context, telemetry, flags, encryption, and truly bespoke store behavior.
5. **Enable companions in a comparison mode** and drift-test native versus live artifacts.
6. **Flip one surface at a time**: response helper, dispatcher/executor, runtime factory, then generic stores.
7. **Delete only after live consumer and behavioral tests pass**. The high import counts make a flag-day replacement unnecessarily risky.

## Current verification evidence

Verified against the active checkouts on 2026-07-12:

- **Builder:** `ASSEMBLY_E2E=1 npm test -- --run src/lib/assembler.e2e.test.ts` — 2/2 E2E tests passed. The tests materialize generated projects, install dependencies, run TypeScript, validate/generate Prisma, and run the Next.js production build.
- **Builder:** focused assembler tests — 10 passed; 2 E2E tests are skipped unless `ASSEMBLY_E2E=1`. `npm run typecheck` passed.
- **Manifest 3.4.25:** focused compiler, React Query, Next.js, and companion tests — 243 passed. Full workspace typecheck passed.
- **Capsule Pro:** `prisma validate --schema=./packages/database/prisma/schema` passed. Prisma emitted `relationMode = "prisma"` index-performance warnings; those are not schema validation failures.
- **Capsule ownership state:** `dispatcher.enabled`, `concreteCommandRoutes.enabled`, and `emitCompanions` remain `false`.
- **Capsule candidate size:** the four central wrappers remain 2,060 + 200 + 371 + 196 = **2,827 lines**.
- **Builder dependency follow-up:** Builder's lockfile still installs Manifest 3.4.24. Builder currently patches several corrected contracts during assembly; upgrading to 3.4.25 should be followed by removal of redundant transforms and a repeat of the E2E suite.

## Bottom line

Yes, this experiment shows Capsule Pro can shed a meaningful amount of glue. The strongest confirmed target is the central runtime/dispatcher/response construction layer plus generic store machinery. But the correct end state is **generated Manifest ownership + a small Capsule host adapter**, not “copy this project structure and add UI.”

The product still needs far more than UI: valid persistence, database migrations, authenticated tenant context, transactions, idempotency, audit/outbox/approvals, effects, async reactions, external integrations, realtime, observability, and the actual product workflows. Capsule already has most of that. The migration should preserve it while deleting only duplicated framework plumbing.
