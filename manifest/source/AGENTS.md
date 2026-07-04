# Manifest language — what you can write in a `.manifest` file

Every construct authorable in `.manifest` source, with a plain-English
description and a link to the official docs. Pulled from the Mintlify docs
(`manifest` repo, `mintlify/language/*`). Docs base:
`https://manifest-b1e8623f.mintlify.app`.

**Scope:** things you *write* in `.manifest` files. Projections, store adapters,
extensibility hooks, and the CLI are config / runtime / codegen — not `.manifest`
syntax — so they are excluded. Use this as the checklist of language features
before hand-rolling logic in app code or middleware.

---

## File anatomy & ordering — [`manifest-files`](https://manifest-b1e8623f.mintlify.app/language/manifest-files)

- **[Anatomy of a file](https://manifest-b1e8623f.mintlify.app/language/manifest-files#anatomy-of-a-file)** — A `.manifest` file is a flat list of top-level declarations; no wrapper, no semicolons, no enforced order except `use` imports first.
- **[Comments](https://manifest-b1e8623f.mintlify.app/language/manifest-files#comments)** — `//` line comments and `/* */` block comments for humans.
- **[Top-level declarations](https://manifest-b1e8623f.mintlify.app/language/manifest-files#top-level-declarations)** — The menu of things you can put at the top level: entity, enum, value, command, policy, store, event, reaction, saga, role, webhook, schedule, tenant.
- **[Ordering rules](https://manifest-b1e8623f.mintlify.app/language/manifest-files#ordering-rules)** — `use` imports must come first; one tenant per program; no entity generics; no `import` statements.
- **[What is not allowed](https://manifest-b1e8623f.mintlify.app/language/manifest-files#what-is-not-allowed)** — The explicit list of forbidden constructs.

## Modules / multi-file projects — [`modules`](https://manifest-b1e8623f.mintlify.app/language/modules)

- **[`use` declarations](https://manifest-b1e8623f.mintlify.app/language/modules#use-declarations)** — Pull another `.manifest` file into this one with `use "./relative/path.manifest"`; the compiler discovers the whole graph, detects cycles, and merges into one IR.

## Entities — [`entities`](https://manifest-b1e8623f.mintlify.app/language/entities)

- **[Basic declaration](https://manifest-b1e8623f.mintlify.app/language/entities#basic-declaration)** — `entity Name { … }` defines a typed business object with properties, relationships, behavior, and rules.
- **[Properties](https://manifest-b1e8623f.mintlify.app/language/entities#properties)** — `property name: type` declares a stored field.
- **[Modifiers](https://manifest-b1e8623f.mintlify.app/language/entities#modifiers)** — `required`, `optional`, `readonly`, `unique`, `encrypted`, `masked`, `searchable`, `private`, `indexed` — flags that change how a property behaves.
- **[Default values](https://manifest-b1e8623f.mintlify.app/language/entities#default-values)** — `property name: type = value` sets a value used when the field is omitted on create.
- **[Relationships](https://manifest-b1e8623f.mintlify.app/language/entities#relationships)** — `hasMany`, `hasOne`, `belongsTo`, `ref` connect entities and define cardinality.
- **[Constraints](https://manifest-b1e8623f.mintlify.app/language/entities#constraints)** — Boolean expressions that must hold for an instance to be valid.
- **[Constraint severity](https://manifest-b1e8623f.mintlify.app/language/entities#constraint-severity)** — `ok` (info only), `warn` (records an outcome but doesn't stop), `block` (stops execution, the default); long-form syntax adds `messageTemplate` and `details`.
- **[Overrideable constraints](https://manifest-b1e8623f.mintlify.app/language/entities#overrideable-constraints)** — Mark a `block` constraint `overrideable` and pair it with an `overridePolicy` so an authorized caller can bypass it.
- **[Composite primary keys](https://manifest-b1e8623f.mintlify.app/language/entities#composite-primary-keys)** — `key [a, b]` makes several fields together form the identity.
- **[Alternate keys](https://manifest-b1e8623f.mintlify.app/language/entities#alternate-keys)** — `unique [a, b]` declares a non-PK uniqueness rule (many allowed).
- **[Composite foreign keys](https://manifest-b1e8623f.mintlify.app/language/entities#composite-foreign-keys)** — For `belongsTo`/`ref`, spell out the FK columns with `fields […] references […]`.
- **[Referential actions](https://manifest-b1e8623f.mintlify.app/language/entities#referential-actions)** — `onDelete` / `onUpdate` with `cascade`, `restrict`, `setNull`, `setDefault`, `noAction`.
- **[Concurrency controls](https://manifest-b1e8623f.mintlify.app/language/entities#concurrency-controls-vnext)** — `versionProperty` / `versionAtProperty` enable optimistic-lock checks on mutations.
- **[State transitions](https://manifest-b1e8623f.mintlify.app/language/entities#state-transitions-vnext)** — `transition status from "x" to ["y","z"]` whitelists allowed state changes.
- **[Default policies](https://manifest-b1e8623f.mintlify.app/language/entities#default-policies-vnext)** — `default policy` applies to every command on the entity that doesn't declare its own.
- **[Cross-entity constraints](https://manifest-b1e8623f.mintlify.app/language/entities#cross-entity-constraints)** — Constraints can reach through relationships to check related entities.
- **[External entities](https://manifest-b1e8623f.mintlify.app/language/entities#external-entities)** — `external entity` marks a table owned by another system so persistence projections skip it.

## Advanced entities — [`advanced-entities`](https://manifest-b1e8623f.mintlify.app/language/advanced-entities)

- **[Entity inheritance (`extends`)](https://manifest-b1e8623f.mintlify.app/language/advanced-entities#entity-inheritance-extends)** — `entity B extends A` reuses A's properties, computed fields, constraints, commands, and policies.
- **[Overriding inherited members](https://manifest-b1e8623f.mintlify.app/language/advanced-entities#overriding-inherited-members)** — Redeclare a property or command by name in the child to replace the inherited one.
- **[Mixin composition](https://manifest-b1e8623f.mintlify.app/language/advanced-entities#mixin-composition)** — `mixin Name { … }` defines a reusable bundle of properties/constraints; `mixin Name` inside an entity applies it.
- **[Combining extends and mixins](https://manifest-b1e8623f.mintlify.app/language/advanced-entities#combining-extends-and-mixins)** — Use both `extends` and `mixin` in the same entity.

## Commands — [`commands`](https://manifest-b1e8623f.mintlify.app/language/commands)

- **[Declaring a command](https://manifest-b1e8623f.mintlify.app/language/commands#declaring-a-command)** — `command name(params) { … }` defines an operation with typed parameters.
- **[Execution order](https://manifest-b1e8623f.mintlify.app/language/commands#execution-order)** — Fixed pipeline: build context → policies → constraints → guards → actions → emit → return.
- **[Actions: mutate / emit / compute / publish / persist / effect](https://manifest-b1e8623f.mintlify.app/language/commands#actions)** — The things a command body does: `mutate` sets a field, `emit` fires an event, `compute` returns a value, `publish`/`persist`/`effect` call adapters.
- **[The `emits` keyword](https://manifest-b1e8623f.mintlify.app/language/commands#the-emits-keyword)** — Declare `emits EventName` outside the action body to advertise what a command fires.
- **[Command constraints](https://manifest-b1e8623f.mintlify.app/language/commands#command-constraints-vnext)** — A command can carry its own constraint blocks, checked after policies but before guards.
- **[Retry policies](https://manifest-b1e8623f.mintlify.app/language/commands#retry-policies)** — `retry { maxAttempts, backoff, initialDelay, maxDelay, jitter }` retries transient failures.
- **[Retry configuration](https://manifest-b1e8623f.mintlify.app/language/commands#retry-configuration)** — Tunable fields: attempts, delays, jitter.
- **[Backoff strategies](https://manifest-b1e8623f.mintlify.app/language/commands#backoff-strategies)** — `fixed`, `exponential`, or `linear` delay growth between retries.
- **[Rate limiting](https://manifest-b1e8623f.mintlify.app/language/commands#rate-limiting)** — `rateLimit { … }` caps how often a command runs per user, tenant, or globally.
- **[Rate limit configuration](https://manifest-b1e8623f.mintlify.app/language/commands#rate-limit-configuration)** — `window`, `maxRequests`, `scope` (`user.id`/`tenant.id`/`global`), `strategy` (`fixed`/`sliding`).

## Async commands — [`async-commands`](https://manifest-b1e8623f.mintlify.app/language/async-commands)

- **[Declaring an async command](https://manifest-b1e8623f.mintlify.app/language/async-commands#declaring-an-async-command)** — `async command` pushes work to a background job queue instead of running inline.
- **[How async commands execute](https://manifest-b1e8623f.mintlify.app/language/async-commands#how-async-commands-execute)** — Queued, processed by a JobQueue adapter, with auto-synthesized lifecycle events.

## Guards & policies — [`guards-policies`](https://manifest-b1e8623f.mintlify.app/language/guards-policies)

- **[Guards](https://manifest-b1e8623f.mintlify.app/language/guards-policies#guards)** — Boolean expressions inside a command, checked in order; the first false one halts execution.
- **[Available bindings in guards](https://manifest-b1e8623f.mintlify.app/language/guards-policies#available-bindings-in-guards)** — `self`/`this` (the instance), `user`, `context`, command params, and built-ins like `now`/`uuid`.
- **[Operators in guard expressions](https://manifest-b1e8623f.mintlify.app/language/guards-policies#operators-in-guard-expressions)** — Arithmetic, comparison, logical, membership (`in`/`contains`), and ternary operators.
- **[Policies](https://manifest-b1e8623f.mintlify.app/language/guards-policies#policies)** — Named boolean rules with a scope that control authorization.
- **[Policy scopes](https://manifest-b1e8623f.mintlify.app/language/guards-policies#policy-scopes)** — `execute`, `read`, `write`, `all`, `override` — when the policy is enforced.
- **[Binding a policy to an entity](https://manifest-b1e8623f.mintlify.app/language/guards-policies#binding-a-policy-to-an-entity)** — Apply a policy to every command on an entity.
- **[Command-level policies](https://manifest-b1e8623f.mintlify.app/language/guards-policies#command-level-policies)** — Override the entity default by declaring a policy inside a command.
- **[Default policies (vNext)](https://manifest-b1e8623f.mintlify.app/language/guards-policies#default-policies-vnext)** — `default policy` on an entity covers commands that don't declare their own.
- **[Override policies (vNext)](https://manifest-b1e8623f.mintlify.app/language/guards-policies#override-policies-vnext)** — The `override` scope authorizes bypass of an `overrideable` constraint.

## Events — [`events`](https://manifest-b1e8623f.mintlify.app/language/events)

- **[Declaring an event](https://manifest-b1e8623f.mintlify.app/language/events#declaring-an-event)** — `event Name: "channel" { fields }` defines a typed publishable event.
- **[Emitting events from commands](https://manifest-b1e8623f.mintlify.app/language/events#emitting-events-from-commands)** — `emit EventName` (optionally `emit EventName { field: expr }`) fires it after actions; multiple emits run in order.
- **[Workflow metadata (vNext)](https://manifest-b1e8623f.mintlify.app/language/events#workflow-metadata-vnext)** — Pass `correlationId`/`causationId` to thread trace IDs across a chain.
- **[Webhook inbound triggers](https://manifest-b1e8623f.mintlify.app/language/events#webhook-inbound-triggers)** — `webhook name "/path" run Entity.command` exposes an inbound HTTP endpoint that runs a command.
- **[Webhook configuration](https://manifest-b1e8623f.mintlify.app/language/events#webhook-configuration)** — `method`, `idempotencyHeader`, `transform` block, and `signature` verification block.
- **[Event sourcing store](https://manifest-b1e8623f.mintlify.app/language/events#event-sourcing-store)** — `store Entity in event-sourced` persists state as an append-only event log.

## Reactions — [`reactions`](https://manifest-b1e8623f.mintlify.app/language/reactions)

- **[Declaring a reaction](https://manifest-b1e8623f.mintlify.app/language/reactions#declaring-a-reaction)** — `on Event run Command` auto-dispatches a command whenever an event fires.
- **[Resolve expressions](https://manifest-b1e8623f.mintlify.app/language/reactions#resolve-expressions)** — `resolve self.x == event.y` picks which instance receives the command.
- **[Parameter mappings](https://manifest-b1e8623f.mintlify.app/language/reactions#parameter-mappings)** — `params { field: event.x }` maps event payload into command arguments.
- **[Fan-out reactions (1:N cascades)](https://manifest-b1e8623f.mintlify.app/language/reactions#fan-out-reactions-1n-cascades)** — `on Event fanOut Target where field = self.id run cmd` runs a command on *every* matching row — the declarative replacement for "query children, loop, dispatch" middleware.
- **[Aggregate count expressions](https://manifest-b1e8623f.mintlify.app/language/reactions#aggregate-count-expressions)** — `count(Entity where fk == value, …)` recomputes a parent's stored count after a child event — replaces "count children then patch parent" middleware.
- **[Reaction scopes](https://manifest-b1e8623f.mintlify.app/language/reactions#reaction-scopes)** — Declare at program, module, or entity level.
- **[Cascading reactions and depth limit](https://manifest-b1e8623f.mintlify.app/language/reactions#cascading-reactions-and-depth-limit)** — Reactions whose commands emit events trigger further reactions; capped at depth 10.
- **[correlationId and causationId propagation](https://manifest-b1e8623f.mintlify.app/language/reactions#correlationid-and-causationid-propagation)** — Trace IDs carry through the chain for debugging.
- **[Deterministic ordering](https://manifest-b1e8623f.mintlify.app/language/reactions#deterministic-ordering)** — Matching reactions fire in source order; same IR + context always yields the same result.

## Approvals — [`approvals`](https://manifest-b1e8623f.mintlify.app/language/approvals)

- **[Declaring an approval](https://manifest-b1e8623f.mintlify.app/language/approvals#declaring-an-approval)** — `approval` block gates a command behind staged sign-off.
- **[Stage fields](https://manifest-b1e8623f.mintlify.app/language/approvals#stage-fields)** — Each stage has a `policy`, a `required` count, and an optional `when`.
- **[Execution gate order](https://manifest-b1e8623f.mintlify.app/language/approvals#execution-gate-order)** — The approval check sits between guards and actions.
- **[Conditional stages with `when`](https://manifest-b1e8623f.mintlify.app/language/approvals#conditional-stages-with-when)** — `when` makes a stage apply only if an expression holds.
- **[Timeout behavior](https://manifest-b1e8623f.mintlify.app/language/approvals#timeout-behavior)** — `timeout` + `on_timeout` decide what happens when the window expires.
- **[Lifecycle events](https://manifest-b1e8623f.mintlify.app/language/approvals#lifecycle-events)** — `emit` entries for `ApprovalRequested`, `ApprovalGranted`, etc.

## Workflows (sagas & schedules) — [`workflows`](https://manifest-b1e8623f.mintlify.app/language/workflows)

- **[Declaring a saga](https://manifest-b1e8623f.mintlify.app/language/workflows#declaring-a-saga)** — `saga` with `step`/`compensate`/`on_failure` defines a multi-step workflow with rollback.
- **[Saga lifecycle events](https://manifest-b1e8623f.mintlify.app/language/workflows#saga-lifecycle-events)** — `emit` entries for saga start/step/complete/fail.
- **[Declaring a scheduled command](https://manifest-b1e8623f.mintlify.app/language/workflows#declaring-a-scheduled-command)** — `schedule` inside an entity runs a command on a timer.
- **[Inline parameters](https://manifest-b1e8623f.mintlify.app/language/workflows#inline-parameters)** — `run cmd(param: value)` passes static args to a scheduled command.
- **[Combining sagas and schedules](https://manifest-b1e8623f.mintlify.app/language/workflows#combining-sagas-and-schedules)** — Use both in one program.

## Stores — [`stores`](https://manifest-b1e8623f.mintlify.app/language/stores)

- **[Syntax](https://manifest-b1e8623f.mintlify.app/language/stores#syntax)** — `store Entity in <target>` declares where an entity's rows live.
- **[`memory` target](https://manifest-b1e8623f.mintlify.app/language/stores#memory)** — In-process Map; lost on restart.
- **[`durable` target](https://manifest-b1e8623f.mintlify.app/language/stores#durable)** — Backend-neutral; the actual adapter is supplied at runtime.
- **[`postgres` target](https://manifest-b1e8623f.mintlify.app/language/stores#postgres)** — Persists via a Postgres adapter.
- **[`supabase` target](https://manifest-b1e8623f.mintlify.app/language/stores#supabase)** — Persists via a Supabase adapter.
- **[Store and `localStorage`](https://manifest-b1e8623f.mintlify.app/language/stores#store-and-localstorage)** — Browser-side persistence via an adapter.
- **[Multiple entities, multiple stores](https://manifest-b1e8623f.mintlify.app/language/stores#multiple-entities-multiple-stores)** — Each entity can target a different store.

## Computed properties — [`computed-properties`](https://manifest-b1e8623f.mintlify.app/language/computed-properties)

- **[Syntax](https://manifest-b1e8623f.mintlify.app/language/computed-properties#syntax)** — `computed name: type = expr` declares a derived, non-stored value.
- **[Evaluation context](https://manifest-b1e8623f.mintlify.app/language/computed-properties#evaluation-context)** — Can read `self`/`this`, other properties, other computed fields, relationships, and built-ins.
- **[Chaining computed properties](https://manifest-b1e8623f.mintlify.app/language/computed-properties#chaining-computed-properties)** — One computed can reference another; resolved in dependency order.
- **[Using computed properties in guards and actions](https://manifest-b1e8623f.mintlify.app/language/computed-properties#using-computed-properties-in-guards-and-actions)** — Computeds are first-class values in guards, policies, and actions.

## Computed caching — [`computed-caching`](https://manifest-b1e8623f.mintlify.app/language/computed-caching)

- **[Syntax](https://manifest-b1e8623f.mintlify.app/language/computed-caching#syntax)** — `cache request` (one command), `cache session` (engine lifetime), or `cache ttl <seconds>` memoizes a computed.
- **[Behavior](https://manifest-b1e8623f.mintlify.app/language/computed-caching#behavior)** — A cached computed is marked stale when a property it depends on is mutated.

## Types — [`types`](https://manifest-b1e8623f.mintlify.app/language/types)

- **[Enums](https://manifest-b1e8623f.mintlify.app/language/types#enums)** — `enum` defines a closed value set; members can carry display labels and ordinals.
- **[Decimal and money](https://manifest-b1e8623f.mintlify.app/language/types#decimal-and-money)** — `decimal(p,s)` / `money(p,s)` exact-precision numbers for currency; any type can be nullable with `?`.
- **[Value objects](https://manifest-b1e8623f.mintlify.app/language/types#value-objects)** — `value Name { … }` is a reusable composite type embedded inline (no own table).
- **[Datetime](https://manifest-b1e8623f.mintlify.app/language/types#datetime)** — `datetime` plus the `timestamps` modifier (auto `createdAt`/`updatedAt`) and UTC component built-ins (`year`, `month`, `day`, …).
- **[Arrays](https://manifest-b1e8623f.mintlify.app/language/types#arrays)** — `T[]` / `array<T>` with `.length` and `.contains()`.
- **[Maps / Records](https://manifest-b1e8623f.mintlify.app/language/types#maps--records)** — `map<K,V>` / `record<K,V>` dictionaries accessed by key.

## Constraints — [`constraints`](https://manifest-b1e8623f.mintlify.app/language/constraints)

- **[Regex matching with `matches()`](https://manifest-b1e8623f.mintlify.app/language/constraints#regex-matching-with-matches)** — `matches(value, "pattern")` validates string formats like email/phone.
- **[Range and boundary checks](https://manifest-b1e8623f.mintlify.app/language/constraints#range-and-boundary-checks)** — `between(v, lo, hi)`, `min(…)`, `max(…)`, `length(…)` for numeric/string bounds.

## Expressions & built-in functions — [`expressions`](https://manifest-b1e8623f.mintlify.app/language/expressions)

- **[Scalar and string built-ins](https://manifest-b1e8623f.mintlify.app/language/expressions#scalar-and-string-built-ins)** — `trim`, `split`, `startsWith`, `endsWith`, `replace`, `toUpperCase`, `toLowerCase`, `substring`, `indexOf`, `count`, `abs`, `round`, `floor`, `ceil`.
- **[Aggregate built-ins with lambdas](https://manifest-b1e8623f.mintlify.app/language/expressions#aggregate-built-ins-with-lambdas)** — `sum`, `avg`, `min_of`, `max_of`, `count_of`, each taking an optional mapper/predicate lambda.
- **[Full-text search](https://manifest-b1e8623f.mintlify.app/language/expressions#full-text-search)** — `searchable` marks a string field for a full-text index; `search()` queries it.
- **[Feature flags in expressions](https://manifest-b1e8623f.mintlify.app/language/expressions#feature-flags-in-expressions)** — `flag("name")` reads a feature flag at eval time.

## Roles & permissions — [`roles`](https://manifest-b1e8623f.mintlify.app/language/roles)

- **[Declaring a role](https://manifest-b1e8623f.mintlify.app/language/roles#declaring-a-role)** — `role Name extends Parent { allow … deny … }` defines a permission set.
- **[Permission inheritance](https://manifest-b1e8623f.mintlify.app/language/roles#permission-inheritance)** — Roles inherit transitively from their parent chain.
- **[Deny-is-absolute semantics](https://manifest-b1e8623f.mintlify.app/language/roles#deny-is-absolute-semantics)** — A `deny` always wins over any `allow`.
- **[Using roles in policies](https://manifest-b1e8623f.mintlify.app/language/roles#using-roles-in-policies)** — Reference roles in `policy`/`default policy` expressions.

## Feature flags — [`feature-flags`](https://manifest-b1e8623f.mintlify.app/language/feature-flags)

- **[Syntax](https://manifest-b1e8623f.mintlify.app/language/feature-flags#syntax)** — `flag("name")` in guards/computed properties gates behavior on a flag value (the flag provider itself is wired in code, not `.manifest`).

## Timestamps — [`timestamps`](https://manifest-b1e8623f.mintlify.app/language/timestamps)

- **[Syntax](https://manifest-b1e8623f.mintlify.app/language/timestamps#syntax)** — The `timestamps` flag on an entity auto-injects `createdAt`/`updatedAt` and keeps them updated.

## Tenancy — [`tenancy`](https://manifest-b1e8623f.mintlify.app/language/tenancy)

- **[Syntax](https://manifest-b1e8623f.mintlify.app/language/tenancy#syntax)** — `tenant property: type from context.path` declares single-tenant isolation; reads/writes are auto-scoped to the tenant (max one per program).
