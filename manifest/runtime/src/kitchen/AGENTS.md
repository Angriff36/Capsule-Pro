---
source: Manifest published docs (mintlify) — embedded verbatim
divergences: D10, D14, D15, D26
pages: language/commands, language/modules, language/computed-properties
note: >-
  These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.
---

# Manifest reference for `manifest/runtime/src/kitchen`

**Why this file:** Kitchen runtime factories/loaders: replace hand-array IR merge with compileProjectToIR (D10), drop the command-ownership repair wrapper (D14), route instance creation through the create command so defaults/computed/guards run (D15), and use the generic store path (D26).

**Relevant divergences:** D10, D14, D15, D26 — see `manifest/MANIFEST-DIVERGENCES.md` for the full remediation detail.

**How to use:** These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.

---

## 📄 Manifest doc — `language/commands` · Commands: business operations and mutations

A command is a named operation bound to an entity. When you call `runCommand`, the runtime executes the command in a strict, deterministic order: policies → constraints → guards → actions → emits → return. Nothing in that order can be rearranged or skipped.

## Declaring a command

Commands live inside an entity block. A command takes an optional parameter list and a body of guards and actions.

```manifest
entity Counter {
  property value: number = 0

  command increment() {
    mutate value = value + 1
    emit CounterIncremented
  }

  command setValue(newValue: number) {
    guard newValue >= 0
    mutate value = newValue
    emit CounterSet
  }
}
```

Parameters are typed with the same types as properties: `string`, `number`, `boolean`, `timestamp`. Parameters are available by name in all guard and action expressions.

## Execution order

The runtime executes every command in exactly this order:

<Steps>
  <Step title="Build evaluation context">
    Bind `self` and `this` to the current entity instance, inject command parameters, and attach the runtime context (`user`, `context.*`).
  </Step>
  <Step title="Evaluate policies">
    Check every applicable policy (entity-level defaults first, then command-level). If any policy denies, execution stops immediately with a `policyDenial` result.
  </Step>
  <Step title="Evaluate command constraints">
    Evaluate any `block` constraints declared inside the command. If any fail without an authorized override, execution stops with `constraintOutcomes` in the result.
  </Step>
  <Step title="Evaluate guards">
    Evaluate each guard expression in declaration order. Execution halts on the first falsey result and returns a `guardFailure` with the failing guard's index and expression.
  </Step>
  <Step title="Execute actions">
    Run each action (`mutate`, `emit`, `compute`, `publish`, `persist`, `effect`) in declaration order.
  </Step>
  <Step title="Emit declared events">
    Emit the events listed in the `emits` declaration (if any) in order, attaching payload and metadata.
  </Step>
  <Step title="Return CommandResult">
    Return the `CommandResult` with `success: true`, the last action result, and all emitted events.
  </Step>
</Steps>

## Actions

Actions are the statements inside a command body that produce effects.

### `mutate`

Assigns a value to an entity property. The expression is evaluated against the current context and stored on the instance.

```manifest
command complete() {
  guard not self.completed
  mutate completed = true
  mutate completedAt = now()
}
```

### `emit`

Emits an event and optionally attaches an inline payload. Also produces an action result with the evaluated value.

```manifest
command increment() {
  mutate value = value + 1
  emit CounterIncremented
}
```

### `compute`

Evaluates an expression and returns the value in the action result.

**Store-write behavior:** `compute` writes to the store when **all three** are true: the action has a `target` property name, the command was called with an `instanceId`, and it has an `entityName`. When any of those is absent, `compute` is pure — it returns the value without persisting. Use `effect` if you need a derivation that must never write to the store.

```manifest
command setTimestamp() {
  compute createdAt = now()
  emit TaskCreated
}
```

### `publish`

Sends the expression result to an external message broker or outbox adapter. In the default (no-adapter) runtime, behaves like `compute`. In deterministic mode, throws `ManifestEffectBoundaryError`.

### `persist`

Invokes a persistence adapter with the expression result. In the default runtime, behaves like `compute`. In deterministic mode, throws `ManifestEffectBoundaryError`.

### `effect`

Invokes a side-effect adapter. In the default runtime, behaves like `compute`. In deterministic mode, throws `ManifestEffectBoundaryError`.

<Warning>
`publish`, `persist`, and `effect` are no-ops unless you configure an adapter. When `deterministicMode` is `true`, calling any of them throws `ManifestEffectBoundaryError` — this is by design to enforce the effect boundary contract.
</Warning>

## The `emits` keyword

You can declare events at the command level using the `emits` keyword outside the action body. This serves as a declaration that the command emits a specific event after all actions succeed.

```manifest
entity Order {
  property status: string = "pending"

  command complete() {
    guard self.status == "in_progress"
    mutate status = "completed"
    emit OrderCompleted
  }
}

event OrderCompleted: "order.completed" {
  orderId: string
  completedAt: number
}
```

See [Events](/language/events) for how to declare event schemas.

## Command constraints (vNext)

Commands can declare their own `constraint` blocks that are evaluated after policies but before guards. The same severity levels (`ok`, `warn`, `block`) apply:

```manifest
entity Order {
  property status: string = "pending"
  property amount: number = 0

  command updateStatus(newStatus: string) {
    constraint notCancelled: self.status != "cancelled" "Cannot update a cancelled order"
    constraint amountVerified:warn self.amount >= 100 "Orders under $100 require manual approval"

    mutate status = newStatus
    emit OrderStatusChanged
  }
}
```

A failing `block` constraint stops execution and surfaces `constraintOutcomes` in the `CommandResult`. A `warn` constraint produces an outcome entry but does not stop execution.

## CommandResult shape

Every call to `runCommand` returns a `CommandResult`:

```typescript
interface CommandResult {
  success: boolean;
  error?: string;

  // Present when a policy denied execution
  policyDenial?: {
    policyName: string;
    expression: string;
  };

  // Present when a guard halted execution
  guardFailure?: {
    index: number;            // 1-based
    expression: string;
    resolved: { expression: string; value: unknown }[];
  };

  // Present when constraints were evaluated
  constraintOutcomes?: ConstraintOutcome[];

  // Present when optimistic concurrency detected a conflict
  concurrencyConflict?: ConcurrencyConflict;

  // All events emitted during this run
  emittedEvents: EmittedEvent[];

  // The return value of the last action
  lastActionResult?: unknown;
}
```

## Calling `runCommand` from TypeScript

```typescript
import { RuntimeEngine } from "@angriff36/manifest";
import { ir } from "./compiled.ir.json";

const runtime = new RuntimeEngine(ir, {
  user: { id: "user-123", role: "admin" },
});

const result = await runtime.runCommand("Order", "updateStatus", {
  instanceId: "order-abc",
  newStatus: "processing",
});

if (!result.success) {
  if (result.policyDenial) {
    console.error("Denied by policy:", result.policyDenial.policyName);
  } else if (result.guardFailure) {
    console.error(
      `Guard ${result.guardFailure.index} failed:`,
      result.guardFailure.expression
    );
  } else if (result.constraintOutcomes) {
    const blocked = result.constraintOutcomes.filter(
      (o) => o.severity === "block" && !o.passed
    );
    console.error("Blocked by constraints:", blocked.map((o) => o.code));
  }
  process.exit(1);
}

console.log("Events:", result.emittedEvents);
```

## Retry policies

Commands can declare retry policies for transient failures with configurable backoff strategies. When a command fails (guard failure excluded — guards fail fast), the runtime retries according to the declared policy.

```manifest
entity Notification {
  command sendEmail(to: string, body: string) {
    retry {
      maxAttempts: 3
      backoff: exponential
      initialDelay: 1000
      maxDelay: 10000
      jitter: true
    }
    // command body
  }
}
```

### Retry configuration

| Field | Description |
|-------|-------------|
| `maxAttempts` | Maximum number of retry attempts |
| `backoff` | Strategy: `fixed`, `exponential`, or `linear` |
| `initialDelay` | First retry delay in milliseconds |
| `maxDelay` | Cap on retry delay |
| `jitter` | Add random jitter to prevent thundering herd (default: `false`) |

### Backoff strategies

| Strategy | Behavior |
|----------|----------|
| `fixed` | Constant delay between retries (e.g., 1000ms, 1000ms, 1000ms) |
| `exponential` | Doubles each time (e.g., 1000ms, 2000ms, 4000ms) |
| `linear` | Increases by initialDelay each time (e.g., 1000ms, 2000ms, 3000ms) |

### Retry events

The runtime emits events for each retry attempt and when retries are exhausted:

| Event | When emitted |
|-------|-------------|
| `{Command}RetryAttempted` | Each retry attempt, with attempt number |
| `{Command}RetryExhausted` | All retries failed, with total attempts |

<Note>
Retry policies only apply to action execution failures. Guard failures, policy denials, and constraint blocks are never retried — they represent intentional business rule enforcement, not transient errors.
</Note>

## Rate limiting

Rate limiting policies constrain how frequently a command can be invoked per user, tenant, or globally. When the limit is exceeded, the command returns a `rateLimitExceeded` result.

```manifest
entity ApiKey {
  property required id: string

  command makeRequest() {
    rateLimit {
      window: 60000
      maxRequests: 100
      scope: user.id
    }
    // command body
  }
}
```

### Rate limit configuration

| Field | Description |
|-------|-------------|
| `window` | Time window in milliseconds |
| `maxRequests` | Maximum allowed requests within the window |
| `scope` | `user.id`, `tenant.id`, or `global` |
| `strategy` | `fixed` or `sliding` window (default: `fixed`) |

When the rate limit is exceeded, the `CommandResult` includes:

```typescript
{
  success: false,
  rateLimitExceeded: {
    scope: "user.id",
    limit: 100,
    remaining: 0,
    retryAfterMs: 45000
  }
}
```

<Warning>
Rate limiting is enforced by the runtime engine before command execution begins. It is not a network-level rate limiter — it operates within the Manifest runtime context. For HTTP-level rate limiting, configure your API gateway or middleware.
</Warning>

<Note>
The `instanceId` is passed inside the options object to `runCommand`, not as a command parameter. Command parameters are the named values declared in the command signature.
</Note>

---

## 📄 Manifest doc — `language/modules` · Modules: multi-file projects and imports

Manifest supports multi-file projects through `use` declarations and `import` statements. The module resolver discovers all referenced files, detects cycles, sorts them topologically, and merges the compiled IR into a single deterministic output. This lets you split large programs into focused files without sacrificing whole-program validation.

## Use declarations

The `use` keyword includes another `.manifest` file. Use declarations must appear at the top of the file, before any entity, event, or store declarations:

```manifest
// app.manifest
use "./shared/types.manifest"
use "./domains/order.manifest"
use "./domains/product.manifest"
```

The resolver walks `use` declarations recursively to discover the full file graph. A `use` path must be relative and end in `.manifest` — absolute paths and extensions other than `.manifest` produce a parse error.

## Import statements

For selective imports, use the `import` syntax to bring specific symbols into scope:

```manifest
import { Status, Priority } from "./shared/types.manifest"

entity Article {
  property required title: string
  property status: Status = draft
  property priority: Priority = medium
}
```

Import statements support aliasing:

```manifest
import { User as Customer } from "./shared/user.manifest"

entity Order {
  property required buyer: Customer
}
```

The resolver validates import specifiers against the source file's exported symbols (entities, enums, and value objects). Importing a symbol that does not exist, or importing a symbol of the wrong kind, produces a compile error diagnostic.

## Compilation pipeline

<Steps>
  <Step title="Resolution">
    Walk all `use` and `import` declarations starting from the entry file. Build a complete dependency graph using BFS discovery.
  </Step>
  <Step title="Cycle detection">
    Detect circular imports (A imports B imports A) using DFS with grey/black coloring. Circular dependencies produce a compile error diagnostic listing the cycle path.
  </Step>
  <Step title="Topological sort">
    Kahn's algorithm determines the compilation order — dependencies compile before dependents. Ties are broken alphabetically for deterministic output.
  </Step>
  <Step title="Per-file compilation">
    Each file is parsed and compiled to IR independently, producing one IR per file.
  </Step>
  <Step title="Cross-file validation">
    The merged IR is validated for cross-file reference integrity: entity types referenced in properties must exist, enum members used as defaults must be declared, and event names referenced in `emit` must be defined somewhere in the project.
  </Step>
  <Step title="IR merging">
    All per-file IRs are merged into a single output with sorted arrays for determinism. A `sources` array in the IR provenance tracks which files contributed to the merged output.
  </Step>
</Steps>

## CLI flags

Use the `--merge` and `--entry` flags to compile multi-file projects:

```bash
# Compile a multi-file project with merging
manifest compile --merge --entry src/app.manifest

# Compile with explicit output path
manifest compile --merge --entry src/app.manifest --output ir/

# Let the compiler auto-detect entry files (files not referenced by any other)
manifest compile --merge src/
```

| Flag | Description |
|------|-------------|
| `--merge` | Enable multi-file compilation and merge all discovered files into a single IR output |
| `--entry <path>` | Specify the entry point for module resolution. When omitted, the compiler auto-detects root files. |

## Namespace isolation

Each module's entities, events, and enums are namespaced by the module's file path. Two files can define entities with the same name without collision:

```
shared/types.manifest  ->  Status enum  ->  shared/types.Status
domains/order.manifest ->  Order entity ->  domains/order.Order
domains/product.manifest -> Order entity -> domains/product.Order
```

When using `import { X }` syntax, the imported symbol is available without the module prefix in the importing file. The `use` syntax makes all declarations available but with the module prefix for disambiguation.

<Note>
Cross-file validation catches ambiguous references when two modules export the same symbol name. Use the module prefix or an import alias to disambiguate.
</Note>

## Cross-file validation

After merging, the compiler validates cross-file references and produces error diagnostics with file paths and line numbers:

- Entity types referenced in properties must exist in the merged IR
- Enum members used as default values must be declared in an imported or used file
- Event names referenced in `emit` actions must be declared somewhere in the project
- Store declarations must reference entities that exist in the merged IR

Invalid cross-file references produce compile error diagnostics rather than runtime failures.

## ResolverHost abstraction

The module resolver uses a `ResolverHost` abstraction for file system access. In production, this reads from disk. In tests, you can provide an in-memory host to test resolution without touching the file system:

```typescript
import { ModuleResolver } from "@angriff36/manifest/module-resolver";

const resolver = new ModuleResolver({
  readFile(path) {
    // Return file contents from an in-memory map
    return mockFiles.get(path);
  }
});
```

This makes the resolver testable in isolation and allows the multi-compiler to work in environments without direct file system access.

## Complete example

A multi-file project with shared types, domain entities, and an entry point:

```manifest
// shared/types.manifest
enum Status { draft, submitted, approved, rejected }
enum Priority { low, medium, high }
```

```manifest
// domains/order.manifest
use "../shared/types.manifest"

entity Order {
  property required id: string
  property status: Status = draft
  property priority: Priority = medium
  property amount: number = 0

  command submit() {
    guard self.status == draft
    mutate status = submitted
    emit OrderSubmitted
  }
}

event OrderSubmitted: "order.submitted" {
  orderId: string
}

store Order in memory
```

```manifest
// app.manifest
use "./domains/order.manifest"

// Additional top-level declarations can go here
```

Compile the project:

```bash
manifest compile --merge --entry src/app.manifest --output project.ir.json
```

The resulting `project.ir.json` contains all entities, events, enums, and stores from every discovered file, merged into a single deterministic IR with provenance tracking.

See [Entities](/language/entities) for entity declarations, [Events](/language/events) for event schemas, and [CLI overview](/cli/overview) for the full set of compile options.

---

## 📄 Manifest doc — `language/computed-properties` · Computed properties: derived values

A computed property is a read-only value derived from an expression rather than stored directly. You declare it with the `computed` keyword inside an entity block. The runtime evaluates it on demand, using the current instance fields and any declared dependencies.

## Syntax

```manifest
computed <name>: <type> = <expression>
```

The expression can reference `self`, `this`, any property on the instance, other computed properties, and the standard built-ins (`now()`, `uuid()`).

```manifest
entity Item {
  property required price: number
  property quantity: number = 1
  property discountPercent: number = 0

  computed total: number = price * quantity
  computed discountedTotal: number = total * (1 - discountPercent / 100)
  computed hasDiscount: boolean = discountPercent > 0
  computed isExpensive: boolean = total > 100
}
```

## Evaluation context

When the runtime evaluates a computed property, the context contains:

| Binding | Value |
|---------|-------|
| `self` / `this` | The current entity instance |
| All property values | Direct field access by name |
| Any dependencies listed in IR | Other computed properties that have already resolved |
| `user` | The current user object (if the runtime provides one) |
| `context` | The runtime context object |

```manifest
entity Author {
  property required name: string
  hasMany books: Book

  computed bookCount: number = self.books.length
}
```

Relationship traversal (`self.books`) is fully supported in computed expressions. The runtime resolves the relationship synchronously before evaluating the expression.

## Chaining computed properties

A computed property can reference another computed property on the same entity. The runtime resolves them in dependency order:

```manifest
entity WorkflowStep {
  property status: string = "pending"
  property executedAt: number = 0

  computed isPending: boolean = self.status == "pending"
  computed isInProgress: boolean = self.status == "in_progress"
  computed isCompleted: boolean = self.status == "completed"
  computed canStart: boolean = self.isPending
  computed canComplete: boolean = self.isInProgress
}
```

`canStart` depends on `isPending`, which depends on `status`. The runtime evaluates in bottom-up order.

## When computed properties re-evaluate

Computed properties are evaluated fresh each time they are accessed — there is no caching layer in the default runtime. They reflect the state of the instance at the moment of access. This means:

- After a `mutate` action inside a command, any subsequent access to a computed property reflects the updated field values.
- Computed properties based on `now()` return a different value on each evaluation if the time source advances.

## Infinite recursion prevention

The runtime detects dependency cycles. If evaluating a computed property would cause infinite recursion, the runtime returns `undefined` for that property instead of throwing. This is defined behavior, not an error condition.

```manifest
entity Circular {
  // If A depends on B and B depends on A, both evaluate to undefined
  computed a: number = self.b + 1
  computed b: number = self.a + 1
}
```

<Warning>
A computed property that returns `undefined` due to a cycle will silently produce `undefined` in guard and action expressions. If you rely on a computed value being non-null, ensure there are no cycles in the dependency graph.
</Warning>

## Using computed properties in guards and actions

Computed properties are first-class values in the evaluation context. You can reference them in guards, policies, and action expressions:

```manifest
entity Task {
  property required title: string
  property required status: string = "todo"
  property required assigneeId: string = ""
  property required createdAt: number = 0

  computed isOverdue: boolean = (now() - self.createdAt) > 86400000 and self.status != "done"
  computed assignedUser: string = self.assigneeId != "" ? self.assigneeId : "Unassigned"
  computed isHighPriority: boolean = self.priority != null and self.priority >= 3

  command updateStatus(newStatus: string) {
    guard newStatus != null and newStatus != ""
    guard newStatus == "todo" or newStatus == "in-progress" or newStatus == "done"
    mutate status = newStatus
    emit TaskStatusUpdated
  }

  command assignTask(userId: string) {
    guard userId != null and userId != ""
    guard self.assigneeId == "" or user.role == "admin"
    mutate assigneeId = userId
    emit TaskAssigned
  }
}
```

Guards like `self.assigneeId == ""` reference the raw property. A guard referencing `self.isHighPriority` would evaluate the computed property first and use the result.

## Computed properties in the TypeScript output

When you use the Next.js projection or TypeScript types surface, computed properties appear as read-only fields on the generated interface. They are not persisted in the store — they are derived each time the instance is loaded.

```typescript
interface Task {
  title: string;
  status: string;
  assigneeId: string;
  createdAt: number;
  // Computed — derived at read time
  readonly isOverdue: boolean;
  readonly assignedUser: string;
  readonly isHighPriority: boolean;
}
```

---
