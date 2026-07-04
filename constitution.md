
# CAPSULE_PRO_CONSTITUTION.md

## Capsule-Pro Constitution

Manifest Integration Charter

Version: 4
Status: Binding  
Audience: Humans, agents, CI checks, repo auditors, implementation plans

---

## 0. Purpose

This constitution defines how Capsule-Pro integrates with Manifest.

Its purpose is to remove architectural ambiguity.

Agents and contributors must not ask whether governed domain mutations should use Manifest. They must. If existing code disagrees, the code is nonconforming unless it is explicitly listed as an approved bypass.

Manifest is not an optional helper, route generator, convenience wrapper, or permission utility. Manifest is the semantic authority for governed Capsule-Pro domain behavior.

Capsule-Pro integrates with Manifest. Capsule-Pro does not redefine Manifest semantics.

---

## 1. Normative Authority

Normative authority for governed domain semantics resides exclusively in Manifest Tier A documentation and conformance evidence.

Authoritative sources include:

- `docs/DOCUMENTATION_GOVERNANCE.md`
- `docs/spec/ir/ir-v1.schema.json`
- `docs/spec/semantics.md`
- `docs/spec/builtins.md`
- `docs/spec/adapters.md`
- `docs/spec/conformance.md`
- `src/manifest/conformance/**`
- `docs/REPO_GUARDRAILS.md`
- compiled Manifest IR used by Capsule-Pro runtime
- runtime conformance tests proving command behavior

If Capsule-Pro code conflicts with Manifest specification or compiled IR, Capsule-Pro code is wrong.

The correct response is to bring Capsule-Pro into conformance, not to preserve the conflicting implementation.

---

## 2. Definitions

### Governed entity

A governed entity is any application/domain entity whose mutation represents business meaning, tenant state, operational state, workflow state, financial state, scheduling state, inventory state, staff state, customer state, supplier state, or other product-domain state.

Tenant-scoped entities are governed by default.

Entities are not considered ungoverned merely because they currently lack Manifest coverage.

### Governed mutation

A governed mutation is any create, update, delete, transition, command, workflow step, invariant-sensitive change, event-producing change, or semantically meaningful modification to governed domain state.

Governed mutations must execute through Manifest runtime.

### Bypass

A bypass is a direct mutation that does not use Manifest runtime.

Bypasses are forbidden unless explicitly listed in the approved bypass registry.

### Read path

A read path loads or projects state without changing governed domain truth.

Read paths may bypass Manifest, but they must not define behavior, enforce domain invariants, invent state machines, or synthesize semantic events.

### Semantic event

A semantic event is a domain event representing the result of successful governed command execution.

Semantic events may only originate from Manifest runtime execution.

Operational logs, analytics events, infrastructure notifications, debug traces, and UI telemetry are not semantic events.

---

## 3. Default Decision Rules

These rules are binding defaults.

If a task involves changing governed domain state, use `RuntimeEngine.runCommand` with compiled IR.

If a task involves reading governed domain state, direct database reads are allowed, but the read must not define domain meaning.

If a route, server action, background job, cron job, workflow, script, or UI handler directly writes governed state, it is nonconforming unless explicitly bypass-approved.

If a command behavior is unclear, inspect Manifest spec, compiled IR, runtime adapter, and conformance tests. Do not infer semantics from old route code.

If old route code conflicts with Manifest, treat the old route as legacy/nonconforming.

If generated concrete command routes confuse or duplicate runtime behavior, they are not authoritative. The canonical path is the runtime dispatcher.

If an entity is tenant-scoped and not listed as bypass-approved, assume it is governed.

If a mutation emits or persists a semantic event outside runtime, it is nonconforming.

If a test mutates governed state directly instead of invoking runtime, the test is nonconforming.

If a behavior change affects governed semantics, update Manifest specification/conformance first, then Capsule-Pro integration.

---

## 4. System Boundaries

### Clerk

Clerk is the identity and organization context provider.

Clerk answers:

- who the actor is
- which organization or tenant context is active
- what session is being used
- what Clerk-side roles, memberships, or permissions are available

Clerk does not define Capsule-Pro domain semantics.

Clerk does not replace Manifest.

Clerk does not make Prisma writes safe by itself.

Clerk does not make RLS redundant by itself.

Capsule-Pro must translate Clerk request context into Manifest command context before executing governed commands.

### Manifest

Manifest answers:

- what command exists
- what entity the command belongs to
- what the command means
- what inputs are valid
- what tenant or organization context is required
- what actor context is required
- what policy or permission rule applies
- what state transitions are legal
- what invariants must hold
- what adapter/effect boundaries may execute
- what semantic events are emitted
- what conformance evidence proves behavior

Manifest is the source of truth for governed mutations.

### Prisma

Prisma is a persistence mechanism.

Prisma may execute database operations only inside approved integration boundaries for governed mutations.

For governed writes, Prisma operations belong inside Manifest runtime adapters/effects, not scattered through routes, server actions, jobs, or UI-triggered handlers.

Direct Prisma reads are allowed for read models, projections, dashboards, and reporting, provided they do not define domain semantics.

### RLS

RLS is a database-level safety boundary.

RLS does not define domain semantics.

RLS does not replace Manifest.

Manifest does not automatically replace RLS.

RLS protects against bypasses, direct database access mistakes, missing tenant filters, raw SQL mistakes, legacy routes, reporting paths, admin tools, jobs, and future regressions.

RLS policies must use real runtime tenant context if enforced. Hardcoded stub claim functions, fake Supabase JWT helpers, or zero-UUID tenant claims do not count as working runtime RLS.

If RLS conflicts with valid Manifest runtime execution, the RLS integration is broken and must be fixed. The solution is not to bypass Manifest.

### Next.js routes and server actions

Next.js routes and server actions are transport surfaces.

They may receive requests, parse input, authenticate actor context, and invoke runtime.

They must not own governed domain behavior.

They must not perform direct governed writes.

They must not duplicate Manifest transition rules, invariant checks, or semantic event logic.

### UI and Command Board

The UI may visualize state, collect user intent, and orchestrate command invocations.

The UI must not encode authoritative state machines, transition graphs, validation rules, or domain invariants.

The Command Board is an orchestration surface, not a semantic authority.

Every governed mutation triggered by UI or Command Board workflows must invoke Manifest runtime.

---

## 4a. Manifest Workspace Layout Rule

Capsule-Pro-owned Manifest artifacts live under the top-level `manifest/` directory. The `@angriff36/manifest` package (published on [npm](https://www.npmjs.com/package/@angriff36/manifest); workspace currently pins 2.18.x) owns generic Manifest compiler, parser, projection, and runtime primitives. Capsule-Pro does not vendor, fork, or reimplement upstream Manifest package code. No generated Manifest artifacts may live under `packages/`. No new `packages/manifest-*` workspace packages may be created without updating this constitution.

The retired packages `packages/manifest-runtime`, `packages/manifest-ir`, and `packages/manifest-adapters` are forbidden resurrection paths. Agents must treat the directory paths `packages/manifest-runtime/`, `packages/manifest-ir/`, and `packages/manifest-adapters/` as non-existent for all new code, imports, and config.

### Canonical homes

| Artifact                                                                         | Canonical Path                                                   | Classification                   |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| Capsule-owned .manifest source and projection config                             | `manifest/source/`                                               | Capsule source                   |
| Generated merged IR, commands JSON, merge report, provenance                     | `manifest/ir/`                                                   | Generated IR (script consumers)  |
| `@repo/manifest-runtime` workspace package (shared Capsule runtime adapter code) | `manifest/runtime/`                                              | Shared runtime workspace package |
| Generated runtime registry, routes manifest, route implementations               | `manifest/runtime/`                                              | Generated runtime artifacts      |
| Governance registries: commands, entities, bypasses, baselines, allowlists       | `manifest/governance/`                                           | Governance data                  |
| Compile, build, audit, generation, and utility scripts                           | `manifest/scripts/`                                              | Build pipeline scripts           |
| Human-readable audit and normalization reports                                   | `manifest/reports/`                                              | Reports                          |
| API-side runtime glue: command resolver, execution wrapper, outbox, telemetry    | `apps/api/lib/manifest/`                                         | API transport glue               |
| API runtime factory (Sentry/DB injection)                                        | `apps/api/lib/manifest-runtime.ts`                               | API transport glue               |
| API command handler for REST domain adapters                                     | `apps/api/lib/manifest-command-handler.ts`                       | API transport glue               |
| Canonical Next.js App Router HTTP dispatcher                                     | `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` | API dispatcher route             |

### Dispatcher Execution Wrapper Rule

Only `apps/api/lib/manifest/execute-command.ts` may perform HTTP transport command resolution, runtime creation, `RuntimeEngine.runCommand` invocation, and success/error normalization for governed commands. The dispatcher route (`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`) and narrow approved domain adapters (`apps/api/app/api/user/*`) must delegate command execution to this wrapper. Other routes, server actions, jobs, workflows, and scripts must not call `RuntimeEngine.runCommand` directly unless this constitution is updated or an approved bypass/governance exception exists.

The command resolver (`apps/api/lib/manifest/command-resolver.ts`) must resolve against the generated command registry exposed by `@repo/manifest-runtime/commands-registry` via `getCommandsRegistry()`. It must not reference old `packages/manifest-ir` paths.

---

## 5. Canonical Write Path

The canonical governed write path is:

1. Request enters route, server action, job, workflow, or command board.
2. Capsule-Pro authenticates actor context.
3. Capsule-Pro resolves tenant/organization context.
4. Capsule-Pro builds Manifest command context.
5. Capsule-Pro invokes `RuntimeEngine.runCommand` with compiled IR.
6. Runtime evaluates command semantics.
7. Runtime invokes approved adapters/effects.
8. Runtime persists governed state through approved boundaries.
9. Runtime emits semantic events.
10. Runtime returns result, diagnostics, validation failures, or execution errors.
11. Application surfaces the runtime result.

No governed mutation may skip this path unless bypass-approved.

---

## 6. Canonical Routing Rule

Capsule-Pro must prefer one canonical Manifest dispatcher for governed commands.

Canonical command shape:

```txt
POST /api/manifest/{entity}/commands/{command}
````

The dispatcher must resolve `{entity}` and `{command}` against compiled IR/command registry and invoke `RuntimeEngine.runCommand`.

Generated concrete per-command routes are not semantic authority.

Generated concrete routes are prohibited unless they are documented as thin compatibility aliases that do not duplicate behavior, do not define semantics, and immediately delegate to the canonical runtime path.

Agents must not create new concrete command routes for governed commands.

If a concrete route and dispatcher disagree, the dispatcher plus compiled IR wins.

---

## 7. Command Coverage Rule

A governed command is not considered covered merely because a route exists.

A command is covered only when the answer to each question is discoverable from Manifest specification, compiled IR, runtime adapter mapping, or conformance evidence:

* What entity does this command govern?
* What tenant or organization context is required?
* What actor context is required?
* What permission or policy applies?
* What inputs are accepted?
* What validation rules apply?
* What state transition or invariant is enforced?
* What adapter/effect performs persistence?
* What Prisma operation or storage operation occurs through the approved boundary?
* What semantic event is emitted?
* What audit or outbox behavior occurs?
* What test or conformance evidence proves it?
* What happens on failure or rollback?

If these answers live only in a route, server action, UI component, job, or ad hoc service, the command is not Manifest-covered.

---

## 8. Governed Entity Registry

Capsule-Pro must maintain a governed entity registry.

The registry must classify entities as one of:

* `governed`
* `read_only_projection`
* `infrastructure`
* `bypass_allowed`
* `unknown_nonconforming`

Tenant-scoped entities default to `governed`.

Any `bypass_allowed` entity must include:

* entity name
* file/path where bypass occurs
* reason bypass is safe
* why runtime governance is not required
* what tenant/security boundary still applies
* owner
* date approved
* expiration or review date

Any entity classified as `unknown_nonconforming` is technical debt, not permission to continue the pattern.

Agents must not invent bypasses.

---

## 9. Direct Write Prohibition

Capsule-Pro must not directly mutate governed entities from:

* Next.js routes
* server actions
* React components
* background jobs
* cron jobs
* workflow orchestrators
* API handlers
* import/export scripts
* test helpers
* seed scripts
* admin tools
* generated routes
* one-off repair scripts

Exception: direct writes are allowed only when listed in the approved bypass registry or when operating inside a Manifest runtime adapter/effect boundary.

A direct write includes:

* `prisma.model.create`
* `prisma.model.update`
* `prisma.model.upsert`
* `prisma.model.delete`
* `prisma.model.createMany`
* `prisma.model.updateMany`
* `prisma.model.deleteMany`
* raw SQL mutation
* transaction mutation
* repository/helper mutation that wraps any of the above

Renaming the write behind a helper does not make it conforming.

---

## 10. Read Path Freedom

Read paths may bypass Manifest runtime.

Allowed read surfaces include:

* dashboards
* reports
* projections
* materialized views
* list/detail pages
* search
* analytics
* denormalized read models
* server components
* API GET handlers

Read paths must still respect tenant isolation and product security.

Read paths must not:

* mutate governed state
* define state transitions
* enforce alternate domain rules
* synthesize semantic events
* become hidden command paths
* override runtime outcomes
* treat cached/projection state as semantic truth

If a read model implies behavior not defined by Manifest IR/runtime, the read model is wrong.

### Generated and AI surface boundary

Generated artifacts, MCP descriptors, Agent SDK schemas, generated clients, generated route shells, generated registries, generated reports, and read projections are derived surfaces. They are not semantic authority.

If any generated or AI-facing surface disagrees with compiled IR or runtime behavior, compiled IR/runtime wins. The surface must be classified as stale, generated-surface drift, projection drift, or missing enforcement. The fix is to update the producer/projection/wrapper and regenerate, not to hand-edit generated output or route around runtime.

AI surfaces may inspect, explain, plan, and invoke approved command paths. They must not directly mutate governed state, fabricate semantic events, treat tool availability as bypass approval, or retry runtime denials through Prisma/raw SQL. Governed AI-triggered writes must follow the same command path as application writes: command/entity resolution → canonical dispatcher/wrapper → `RuntimeEngine.runCommand` → approved adapters/effects.

Projection conformance requires minimum proof that output is deterministic from the same IR/config/package version, dispatcher-aligned for governed writes, and explicitly non-authoritative when compared with IR/runtime.

See:

* `manifest/governance/generated-surfaces.md`
* `manifest/governance/ai-surfaces.md`
* `manifest/governance/projection-conformance.md`
* `manifest/governance/audit-checklist.md`

---

## 11. Events and Outbox Discipline

Semantic events are runtime-emitted consequences of successful command execution.

Capsule-Pro must not synthesize semantic events outside runtime.

Routes, jobs, UI components, tests, scripts, and services must not fabricate domain events.

Where transactional persistence is supported, state mutation and semantic event persistence must share the same transaction boundary.

If command execution fails or rolls back, semantic events must not be recorded.

Operational logs, analytics signals, telemetry, notifications, and debug records may exist outside runtime, but they must not be treated as semantic events.

---

## 12. Audit Discipline

Every governed command must produce or connect to audit behavior defined by Manifest semantics, runtime adapters, or conformance rules.

Audit behavior must answer:

* who invoked the command
* which tenant/org context was used
* what entity/record was targeted
* what command executed
* whether execution succeeded or failed
* which semantic event resulted, if any
* what runtime diagnostics were produced

Application code must not create a separate, conflicting audit meaning.

---

## 13. Testing and Conformance

Tests for governed behavior must invoke `RuntimeEngine.runCommand` with compiled IR.

Tests must assert against runtime results, state changes, emitted semantic events, diagnostics, and failure behavior.

Tests must not directly mutate governed state to simulate successful commands.

When deterministic mode is enabled, effect boundary violations must fail tests.

Test helpers that bypass runtime for governed behavior are nonconforming unless explicitly marked as infrastructure setup and isolated from behavior assertions.

CI must include checks for:

* direct governed writes outside approved runtime boundaries
* concrete generated command route drift
* command registry/runtime mismatch
* semantic event emission outside runtime
* bypass registry violations
* conformance test failures
* tenant-scoped entity coverage gaps
* generated surface drift against IR/runtime
* AI/MCP/Agent SDK write bypass paths
* projection dispatcher alignment
* migration boundary misuse where persistence shape is treated as command authority

---

## 14. Change Protocol

Any behavior change affecting governed semantics must follow this order:

1. Update Manifest specification or IR source.
2. Update conformance expectations.
3. Update runtime/adapters if needed.
4. Update Capsule-Pro integration.
5. Update read models/UI projections.
6. Update tests and audits.

Capsule-Pro must not implement semantic behavior first and retrofit Manifest later.

If temporary divergence exists, it must be documented as nonconformance with owner, reason, risk, and removal plan.

---

## 15. Agent Operating Rules

Agents working in Capsule-Pro must follow these rules.

Before changing code, classify the task:

* governed mutation
* read path
* UI orchestration
* runtime adapter/effect
* infrastructure/bypass
* test/conformance
* unknown

If governed mutation, use Manifest runtime.

If read path, direct Prisma reads are allowed but must preserve tenant isolation.

If UI orchestration, call commands; do not implement rules.

If runtime adapter/effect, keep behavior aligned with Manifest spec and compiled IR.

If infrastructure/bypass, verify bypass registry before writing.

If unknown, inspect Manifest docs, IR, registry, adapters, and conformance tests. Do not ask the user to re-decide the architecture.

Agents must treat this constitution as binding.

When code conflicts with this constitution, agents must report:

```txt
NONCONFORMANCE:
- file:
- behavior:
- violated rule:
- safer replacement:
- whether patch was applied:
```

Agents must not preserve nonconforming patterns merely because they already exist.

Agents must not create new generated concrete command routes.

Agents must not duplicate command behavior in app code.

Agents must not invent Manifest semantics from route names.

Agents must not treat Clerk permissions as a replacement for Manifest command semantics.

Agents must not treat RLS as a replacement for Manifest command semantics.

Agents must not treat Prisma helpers as a replacement for Manifest command semantics.

---

## 16. Implementation Conflict Rule

Existing code is not automatically authoritative.

If implementation contradicts this constitution, the implementation is legacy or nonconforming.

The existence of a direct Prisma write does not prove the write is allowed.

The existence of a route does not prove the route is canonical.

The existence of generated code does not prove generated code is desired.

The existence of a passing test does not prove conformance if the test bypasses runtime.

The existence of an RLS policy does not prove runtime tenant isolation.

The existence of Clerk auth does not prove domain authorization.

The existence of a UI validation rule does not prove semantic correctness.

---

## 17. Required Repo Artifacts

Capsule-Pro must maintain these artifacts or equivalent machine-readable replacements:

### Governed entity registry

`manifest/governance/entities.json` — Lists governed, projection, infrastructure, bypass-approved, and unknown/nonconforming entities.

### Bypass registry

`manifest/governance/bypasses.json` — Lists all approved direct mutation bypasses with justification, owner, and review date.

### Command registry

`manifest/runtime/commands.registry.json` and the typed `@repo/manifest-runtime/commands-registry` export — Maps entity/command pairs to compiled IR/runtime command definitions. The `@repo/manifest-runtime/commands-registry` helper is the canonical runtime API for consuming the registry.

### Runtime adapter map

`manifest/runtime/` package exports and source — Shows which adapters/effects are allowed to persist governed state. The package.json exports field is the canonical list of available adapters.

### Route audit

`manifest/governance/` (baselines, allowlists, exemptions) and `manifest/reports/` — Identifies direct writes in routes/server actions/jobs and classifies them as conforming, bypass-approved, or nonconforming.

### Event audit

`manifest/governance/` or `manifest/reports/` — Identifies semantic event creation and verifies runtime origin.

### Generated surface governance

`manifest/governance/generated-surfaces.md` — Defines derived artifacts and the required response when generated output disagrees with IR/runtime.

### Contract import allowlist

`manifest/governance/contract-import-allowlist.json` — Registers feature-code consumers permitted to reference generated Manifest artifacts by path (build tracing, the drift-gated IR embed, the OpenAPI-serving route, the MCP introspection server, IR-reading test fixtures), each with a reason. Enforced by `pnpm manifest:contract:check` (`manifest/scripts/audit-contract-imports.mjs`, wired into `manifest:ci`), which fails CI on any other import/path reference to `manifest/ir/`, `manifest/api-docs/`, `manifest/generated/`, the generated runtime artifacts (`manifest/runtime/src/generated/`, `routes.manifest.json`, `routes.ts`, `command-source-map.json`, `commands.registry.json`), `generated-schema.prisma`, or `*.generated.json`. This is the import-level enforcement of §4a (contract-package boundary) and §13's "generated surface drift against IR/runtime" CI check.

### AI surface governance

`manifest/governance/ai-surfaces.md` — Defines allowed Agent SDK/MCP/AI behavior and forbidden AI bypass paths.

### Projection conformance governance

`manifest/governance/projection-conformance.md` — Defines minimum proof that projections are deterministic, dispatcher-aligned, and non-authoritative.

### Governance audit checklist

`manifest/governance/audit-checklist.md` — Lightweight review checklist for generated surface drift, AI bypass paths, projection dispatcher alignment, migration boundary misuse, relocation guardrails, and route guardrails.

### Conformance test index

Current repo: no centralized conformance test index exists. Status: MISSING ENFORCEMENT. Agents must classify this absence as a tooling gap, not permission to skip conformance testing.

Without these artifacts, agents must classify missing information as missing evidence, not as permission to guess.

---

## 18. RLS Runtime Rule

RLS is allowed and encouraged as a defense-in-depth boundary.

However, RLS only counts as effective when runtime database roles and request/tenant context are actually wired to policy evaluation.

Hardcoded JWT claim stubs, zero-UUID tenant claims, fake Supabase helper functions, or policies that are bypassed by the application database role do not count as working RLS.

If RLS is enforced, valid Manifest runtime commands must receive the database context required to pass tenant policies.

If RLS is not enforced, Capsule-Pro must treat Manifest/runtime tenant checks, Prisma tenant discipline, and route audits as higher-risk and must document that RLS is not the active isolation boundary.

---

## 19. Clerk-to-Manifest Context Rule

Every governed command invocation must include command context derived from authenticated request state.

The context must include, where applicable:

* actor/user id
* tenant id or organization id
* active organization
* role/membership/permission claims
* request id
* source surface
* deterministic/test mode flags
* audit metadata

Application code may adapt Clerk context into Manifest context.

Application code may not use Clerk context to bypass Manifest semantics.

If Clerk and Manifest disagree, the command must fail closed unless the Manifest specification defines a valid resolution.

---

## 19a. Relocation Enforcement Rule

The 2026-05-25 Manifest relocation moved all Capsule-Pro-owned Manifest artifacts from `packages/manifest-*` to the top-level `manifest/` workspace. The following rules enforce this layout:

If any non-historical code, config, import, script, or CI pipeline references `packages/manifest-ir`, `packages/manifest-runtime`, `packages/manifest-adapters`, `@repo/manifest-adapters`, `@repo/manifest-ir`, or the old `@repo/manifest-runtime` package path, agents must report NONCONFORMANCE unless the reference is inside migration notes, historical docs, or test fixture data documenting the pre-relocation state.

Runtime imports must use `@repo/manifest-runtime` (the active workspace package at `manifest/runtime/`) or app-local Manifest glue paths (`apps/api/lib/manifest/*`). No runtime code may import from retired package paths.

Build and audit scripts must read from and write to `manifest/` paths exclusively. Script-generated artifacts must land in `manifest/ir/`, `manifest/runtime/`, `manifest/reports/`, or `manifest/governance/` as specified by the Canonical Homes table in §4a.

The directory paths `packages/manifest-runtime/`, `packages/manifest-ir/`, and `packages/manifest-adapters/` must not be recreated. If a tool, script, or developer accidentally recreates them, agents must treat the recreated directories as nonconforming and report them for removal.

---

## 20. Plain Terms

Manifest defines what governed Capsule-Pro domain changes mean.

Clerk tells the app who is acting.

Prisma stores data.

RLS protects database rows.

Next.js routes receive requests.

The UI displays and orchestrates.

Only Manifest runtime governs domain mutations.

Reads can be flexible. Writes cannot.

If a governed change does not go through Manifest runtime, it is either an approved bypass or a bug.

If the repo disagrees with this constitution, fix the repo.

## Implementation Status Rule

This constitution is binding even when current Manifest or Capsule-Pro tooling lacks full mechanical enforcement.

Missing enforcement is a tooling gap, not permission to bypass the constitution.

When a required enforcement surface does not exist, agents must classify it as MISSING ENFORCEMENT and recommend the smallest Manifest-side or Capsule-Pro-side artifact needed to make the rule machine-checkable.
