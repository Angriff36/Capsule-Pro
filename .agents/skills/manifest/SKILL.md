---
name: manifest
description: "Use when writing, editing, generating, or reasoning about Manifest DSL (.manifest files), its IR, projections, or the capsule-pro manifest pipeline. A feature-recall catalog so agents reach for the right built-in construct (computed, constraints, policies, reactions, sagas, approvals, async, tenancy, projections) instead of hand-rolling it in app code."
---

# Manifest DSL

Manifest is an **IR-first DSL** for business rules. You write `.manifest` source → it compiles to **IR** (the single source of truth) → projections emit derivative views (Prisma, routes, Zod, hooks, OpenAPI…). **Never hand-edit generated code or projections; edit the `.manifest` and regenerate.** App code that writes entities directly (bypassing the runtime) bypasses every guard/policy/constraint/emit — that's drift, not optimization.

## The golden rule

If a behavior can be expressed in the `.manifest` (a guard, constraint, policy, computed value, event, reaction, schedule), express it there — not in TypeScript. The whole point is that agents emit declarative rules the runtime enforces deterministically. **Before writing app logic, check this catalog for a construct that already does it.**

## Workflow loop

```
edit source/*.manifest → compile to IR → generate projections → run drift/governance checks
```
Capsule-pro scripts: `pnpm manifest:compile` → `pnpm manifest:generate` → `pnpm manifest:build` (compile+generate+route-surface+audit) → `pnpm manifest:ci` (the blocking gate chain). Manifest repo: `pnpm test` must stay green (630 tests); conformance fixtures are **executable semantics**, not adjustable tests.

---

## Feature catalog — reach for these

### Entities & data
| Construct | Syntax | Use for |
|---|---|---|
| entity | `entity Order { ... }` | a domain object |
| property | `property required unique email: string` | stored field; modifiers BEFORE name |
| modifiers | `required` `optional`/`?` `readonly` `private` `unique` `indexed` `searchable` `encrypted` `masked(last4) … unmask when <expr>` | field semantics. `required` ≠ non-null; use `?` for nullable. defaults apply only when OMITTED |
| computed | `computed total: number = price * qty` | derived read-only value (spreadsheet-like); never store what you can compute |
| computed cache | `… cache request` / `cache session` / `cache ttl 300` | memoize hot computeds |
| value object | `value Money { property amount: decimal(12,2) property currency: string }` | reusable property-only type (no behavior) |
| enum | `enum Status { draft, sent = "Sent", urgent(2) }` | closed value set |
| timestamps | `timestamps` | auto inject readonly `createdAt`/`updatedAt` from deterministic clock |
| relationships | `hasMany lines: Line` `hasOne x` `belongsTo vendor: Vendor` `ref v with vId onDelete restrict` | typed links. `hasMany`→`[]`, others→instance/null. composite FK needs DB store |
| concurrency | `versionProperty version: number` + `guard self.version == currentVersion` | optimistic lock → `ConcurrencyConflict` |
| state transition | `transition status from "draft" to ["review","archived"]` | restrict legal state changes (validated BEFORE constraints) |
| inheritance/mixins | `entity X extends Base mixin Auditable, SoftDeletable` | composition; single `extends`, many `mixin` |
| external | `external entity X` | skip persistence projections |

### Types
`string number boolean any void` · `decimal(p,s) money(p,s)` (NEVER `number` for money) · `date time datetime duration` · `T[]` / `array<T>` / `list` · `map<string,V>` / `map` · `EnumName` `ValueObjectName` · `Type?` nullable.

### Behavior (commands)
**Execution order is immutable: policies → constraints → guards → actions → emits.**
```manifest
command transfer(amount: number, memo: string = "") returns Receipt {
  policy execute: user.role in ["admin","manager"]
  guard self.balance >= amount        // halts on first falsey, fail-fast, no retry
  constraint positive: amount > 0 "must be positive"
  mutate balance = balance - amount   // actions
  emit Transferred                    // fires after actions, in order
  retry { maxAttempts: 3, backoff: exponential, initialDelay: 1000 }  // actions only
  rateLimit { window: 60000, maxRequests: 10, scope: user.id }
}
```
Actions: `mutate` · `emit` · `compute x = now()` · `publish/persist/effect` (no-op without adapter). `async command …` validates sync, enqueues a job, returns `{jobId,status}`; synthesizes `{Cmd}Completed`/`{Cmd}Failed`; drain re-entry sets `context.source === "job"`.

### Guards, policies, constraints
- **guard** `guard not self.completed` — precondition, halts on first false, no fallback/auto-repair.
- **policy** `policy canApprove execute: user.role == "manager" "msg"` — auth. scopes: `execute read write all override`. `default policy …` covers commands without their own; a command policy REPLACES the default (no merge).
- **constraint** `constraint priceOk: self.price > 0 "msg"` or block form with `severity: ok|warn|block` (block halts, default), `message`, `messageTemplate`, `details`, and `overrideable … overridePolicy: <policy>` gated by an `override`-scope policy.

### Events, reactions, workflows
| Construct | Syntax | Use for |
|---|---|---|
| event | `event TaskDone: "task.done" { taskId: string }` (top-level/module, NOT in entity) | typed outbox entry, past-tense channel |
| reaction (1:1) | `on OrderSubmitted run Invoice.create resolve self.id == event.id params { total: event.amount }` | dispatch a command on an event |
| reaction fan-out | `on EventCancelled fanOut EventStaff where eventId = self.id run unassign params {...}` | 1:N cascade over all matches |
| count aggregate | `params { n: count(Child where fk == self.id) }` | recompute a stored parent count (equality predicates, ANDed) |
| approval | `approval x { command: submit stages { manager { policy: … required: 1 } director { … when: self.amount > 10000 } } timeout: 72 on_timeout: cancel }` | multi-stage human gates (after guards, before actions) |
| saga | `saga ProcessOrder { step reserve { command: Inv.reserve compensate: Inv.release } … on_failure: "compensate" }` | distributed txn with rollback |
| schedule | `schedule daily cron "0 6 * * *" run generate` / `interval 300000` / `every 24 hours` | time-triggered command (projection emits the cron route; runtime doesn't self-fire) |
| webhook | `webhook pay "/webhooks/pay" run Order.handle method: POST signature { algorithm: hmac-sha256 header: "X-Sig" secret: "context.s" }` | inbound HTTP → command, sig-verified |

### Cross-cutting
- **modules**: `use "./shared.manifest"` (must precede all decls) + `module billing { … }`. compile merged: `manifest compile --merge --entry app.manifest`.
- **roles**: `role Manager extends User { allow write deny impersonate }` — single parent, deny is absolute, unknown role → deny. builtins `hasPermission(user,"p")`, `roleAllows(user.role,"p")`.
- **tenancy**: one `tenant tenantId : string from context.tenantId` per program. auto-written on create; reads fail-closed (`MISSING_TENANT_CONTEXT`) and filter cross-tenant. enforced by runtime, not DB.
- **feature flags**: `guard flag("new-flow")` — off by default (no provider → false).

### Expressions
Bindings: `self`/`this` (instance), `user.*`, `context.*` (`tenantId orgId actorId requestId source`), command params by name. Operators: `+ - * / %`, `== != < <= > >=`, `is`/`is not` (strict), `and or not`/`&& || !`, `in`/`contains`, `?:`, `.` `?.` `[]`, lambdas `(a) => a.x`.
Builtins: `now() uuid()` · strings `trim split count startsWith endsWith replace toUpper/LowerCase length substring indexOf matches search` · math `abs round floor ceil min max between` · aggregates over `hasMany`: `sum(coll,(i)=>i.x) avg count_of min_of max_of filter map` · date `year month day hours minutes seconds` (UTC) · `flag(name) hasPermission roleAllows`.

---

## Projections — what you can generate (IR → views, read-only, deterministic)

`manifest generate ir/ -p <target> --surface <surface> -o <out>` (or `manifest build src -p <target>`).

- **DB schema**: `prisma` (all DBs, money→Decimal, multi-schema) · `drizzle` · `kysely` · `convex` (schema+queries+mutations+crons+http+sagas, standalone) · `materialized-views`
- **Backend routes**: `nextjs` (routes+command handlers+types+client) · `express` · `hono` (edge) · `remix` · `sveltekit`
- **Frontend**: `react-query` (hooks+invalidation) · `flutter`/dart (+Riverpod) · `pydantic` (+async client)
- **Contracts/validation**: `openapi` (3.1) · `graphql` (queries/mutations/subscriptions) · `zod` · `json-schema` · `pydantic`
- **Docs/AI**: `mermaid` (ER/state/sequence) · `storybook` · `llm-context` (full domain in one load for agents) · `analytics` (tracking plan) · `elasticsearch` · `terraform`

Pick by need: routes→nextjs/express/hono; schema→prisma/drizzle/convex; validation→zod/pydantic/json-schema; contract→openapi/graphql; docs→mermaid/llm-context.

## Stores & adapters
`store Order in memory|durable|postgres|supabase|localStorage|dynamodb|redis|turso|event-sourced`. memory=testing; durable needs a `storeProvider`. Custom = implement `Store<T>` (`getAll getById create update delete clear`). Durable events: pair a store with `OutboxStore` (at-least-once; consumers idempotent). `AuditSink` = one `AuditRecord` per `runCommand`.

> **UPDATE 2026-07-04 (PR #78 / `@angriff36/manifest@3.1.3`):** The package now ships a **native
> GenericPrismaStore** (`@angriff36/manifest/stores/prisma-generic`) and **companion modules**
> (`projections/shared/companions` emits `createManifestRuntime` + `manifest-response` + database +
> auth/tenant helpers) plus a **native Next.js dispatcher** (`externalExecutor` mode). `RuntimeOptions`
> is now first-class: `middleware`, `storeProvider`, `idempotencyStore`, `auditSink`, `outboxStore`,
> `approvalStore`, `eventBus`, `customBuiltins`, `requireTenantContext`, `encryptionProvider`, and a
> threaded transaction handle. **In capsule-pro:** the deletion directive says delete any local runtime
> subclass / factory / dispatcher template / response envelope / bespoke store / outbox-audit-eventBus
> middleware that twinned these — keep only a thin Capsule options/binding module (Prisma client, auth
> context, Sentry/log, flags, custom builtins, genuinely business-specific middleware) + optional
> external executor + domain adapters Manifest can't infer. Capsule currently runs
> `emitCompanions:false` / `dispatcher.enabled:false` — the flip is Ryan's decision
> (`canonical/manifest/runtime-native-ownership/`). Do NOT assume "Capsule hand-rolls these because the
> package lacks them" — that was true pre-3.0 and is now stale.

## Extensibility
- **Agent SDK** `@angriff36/manifest/agent-sdk`: `AgentRuntime.getToolDefinitions(format)` + `executeToolCall` → expose commands as LLM tools (Anthropic/OpenAI/Vercel).
- **MCP server** `@angriff36/manifest/mcp-server`: tools `compile execute validate explain`; resources `manifest://ir/*`.
- **Runtime middleware**: hooks `before-policy|guard|action`, `after-emit`; can `shortCircuit` or `contextPatch`.
- **Plugins** (config `plugins`): store adapter, audit sink, custom builtin fn, CLI command. **Federation**, **realtime SSE** (`realtime` entities → `nextjs.subscribe`), **IR version store** (`manifest versions …`).

## CLI essentials
`init` · `compile` · `generate` · `build` · `validate` · `validate-ai` (agent-scored) · `check` (compile+validate) · `scan`/`doctor` (drift) · `fmt [--check]` · `watch` · `diagram` · `docs` · `diff {source-vs-ir,ir-vs-ir,breaking}` · `migrate` · `versions {save,list,diff,tag,rollback,verify}` · `generate-tests` (LLM fixtures) · `mock` · `repl` · `coverage` · `routes`/`lint-routes`/`runtime-check` (drift) · `audit-governance`/`enforce-surface` · `config {validate,inspect,print-defaults}`.

---

## capsule-pro conventions (real-world consumer)

- **Layout**: `manifest/source/<domain>/*.manifest` (13 domains: ai, core, crm, events, finance, integrations, inventory, kitchen, operations, platform, procurement, quality, staff) — 104 files total (103 domain + `_base.manifest`), each domain file `use "../_base.manifest"`. `_base.manifest` holds the **single** `tenant` decl + role hierarchy + `TenantScoped`/`SoftDeletable` mixin sources. Duplicate `tenant` = compile error (by design). Merged IR: **213 entities**, **1059 commands**, **1034 events** (includes mixin source entities `TenantScoped`/`SoftDeletable`; `@angriff36/manifest@2.16.1`).
- **Pipeline**: `pnpm manifest:compile` (→ `manifest/ir/kitchen.ir.json` + provenance/merge-report/commands.json) → `manifest:generate` → `manifest:build` → blocking `manifest:ci` = `verify-invariants && doctor && openapi:check && react-query:check && audit:strict && coverage:ci`.
- **Schema placement** (`schema-placement.rules.json`): entities map to a Postgres schema by source-filename regex → name pattern → shared-infra → else FAIL `UNMAPPED_SCHEMA_PLACEMENT` (NEVER `public`). 13 schemas (`platform core tenant tenant_crm tenant_events tenant_kitchen …`). Add a rule when you add an entity.
- **Drift gates are per-field & blocking** (`manifest:audit:strict`): schema-drift, route-drift, parent-context, reaction-payloads, accessor-config. Fix order when a required Prisma field is missing: **manifest first, then adapter, then schema**. Allowlists in `manifest/governance/*.json` FREEZE known violations — don't add new ones casually.
- **Routes** (`capsule-conventions.json`): reads `/api/{domain}/list` & `/api/{domain}/{id}`; **all** commands via one dispatcher `/api/manifest/{entity}/commands/{command}` running `executeManifestCommand()`. Don't write per-command routes; don't write entities directly from server actions (that's the D1/D2/D3 drift — 205+ existing violations bypass the runtime).

## Gotchas
1. IR is authority — edit `.manifest`, regenerate; never hand-edit projections.
2. `required` ≠ non-nullable. Use `?` for null. Defaults only fire when the field is omitted.
3. Money/decimals: `money(p,s)`/`decimal(p,s)`, never `number`.
4. Events go top-level or in a module, never inside an entity.
5. Reactions: `resolve` = first match (silent skip if none); `fanOut where` = all matches; `count(... where ...)` predicates are equality-only, ANDed.
6. Guards/policies must reference spec bindings (`self.* user.* context.*`); no implicit fallback — a guard correctly fails if `user` is null.
7. Schedules/webhooks are declarative; the projection emits the route, your platform must invoke it.
8. Constraint severity `block` halts (default), `warn` logs, `ok` is info. Transitions validate before constraints.
9. Any change that makes an invalid program succeed is a language violation, not a UX win.
10. **Docs:** never `manifest docs manifest/source/` (per-file compile breaks mixins). Use **`pnpm manifest:docs`** → `manifest/scripts/generate-docs.mjs` reads `kitchen.ir.json`, writes gitignored `docs-site/`, and filters policies per entity (raw `manifest docs` dumps every global policy on every page).
