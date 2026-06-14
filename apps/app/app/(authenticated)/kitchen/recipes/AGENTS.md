---
source: Manifest published docs (mintlify) — embedded verbatim
divergences: D1, D2, D6
pages: language/commands, language/stores, language/events
note: >-
  These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.
---

# Manifest reference for `apps/app/app/(authenticated)/kitchen/recipes`

**Why this file:** Server actions here write governed entities directly via Prisma / raw SQL and hand-emit outbox rows. Route every governed mutation through runManifestCommand to the IR command (guards/constraints/policies/emits run), and let command `emits` own event emission instead of tx.outboxEvent.create.

**Relevant divergences:** D1, D2, D6 — see `manifest/MANIFEST-DIVERGENCES.md` for the full remediation detail.

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

## 📄 Manifest doc — `language/stores` · Stores: persistence targets for entities

A store declaration tells the runtime where to persist instances of a given entity. Every entity that participates in runtime command execution needs a corresponding store. The store target determines which adapter the runtime uses to read and write instances.

## Syntax

```manifest
store EntityName in <target>
```

`EntityName` must match an entity declared elsewhere in the same `.manifest` file (or module). The `<target>` is one of the built-in keywords or a custom identifier resolved at runtime configuration time.

## Built-in targets

### `memory`

Stores instances in a plain JavaScript `Map` keyed by instance ID. Data does not survive process restarts. This is the only target that is required to be supported by all conforming runtimes.

```manifest
entity Product {
  property required name: string
  property price: number = 0
}

store Product in memory
```

Use `memory` for:
- Local development and rapid iteration
- Unit and conformance tests
- Demos and prototyping

### `durable`

The **backend-neutral semantic target**. Declares that the entity is persisted in *some* durable store; the specific technology (Prisma, raw SQL, supabase-js, a custom adapter, …) is chosen by the consumer at runtime via a `storeProvider`, and at compile time via projection config.

```manifest
store Order in durable
```

Use `durable` when you want the entity to participate in storage projections without coupling the `.manifest` source to a specific backend. The [Prisma projection](/integration/prisma) treats `durable`, `postgres`, and `supabase` identically — all three are schema-emission targets. The runtime engine rejects `durable` at command-execution time unless a custom `storeProvider` is bound, with a clear "no store adapter supplied" diagnostic.

<Note>
`durable` is the recommended target for new code. The legacy `postgres` and `supabase` targets continue to work; nothing was removed. Storage projections emit for all three.
</Note>

### `postgres`

Delegates to a `PostgresStore` adapter. The adapter handles SQL reads and writes against a Postgres-compatible database. You must configure the adapter when constructing the `RuntimeEngine`.

```manifest
store Order in postgres
```

<Note>
`postgres` is a target identifier, not a built-in adapter included in the core runtime. You must supply a Postgres adapter via `RuntimeEngine` options. See [Custom Stores](/adapters/custom-stores) for the adapter contract.
</Note>

### `supabase`

Delegates to a `SupabaseStore` adapter. Similar to `postgres`, but typed for the Supabase client. Requires adapter configuration at runtime.

```manifest
store User in supabase
```

<Note>
`supabase` is also an adapter target, not a built-in. Provide a Supabase-backed store via `RuntimeEngine` options.
</Note>

## Multiple entities, multiple stores

Each entity gets its own `store` declaration. Entities in the same program can use different targets:

```manifest
entity Author {
  property required name: string
  hasMany books: Book
}

entity Book {
  property required title: string
  belongsTo author: Author
}

store Author in memory
store Book in memory
```

```manifest
entity User {
  property required email: string
  property required role: string = "member"
}

entity AuditLog {
  property required action: string
  property required actorId: string
  property createdAt: number = 0
}

store User in postgres
store AuditLog in postgres
```

## Using a custom store adapter

When you declare `store EntityName in postgres` (or any non-`memory` target), the `RuntimeEngine` must receive a `storeProvider` function that returns the appropriate adapter for that entity name:

```typescript
import { RuntimeEngine } from "@angriff36/manifest";

class PostgresOrderStore implements Store<Order> {
  async getAll() {
    return await db.order.findMany();
  }

  async getById(id: string) {
    return await db.order.findUnique({ where: { id } }) ?? undefined;
  }

  async create(data: Partial<Order>) {
    return await db.order.create({ data });
  }

  async update(id: string, data: Partial<Order>) {
    return await db.order.update({ where: { id }, data });
  }

  async delete(id: string) {
    await db.order.delete({ where: { id } });
    return true;
  }

  async clear() {
    await db.order.deleteMany({});
  }
}

const runtime = new RuntimeEngine(ir, {
  user: { id: "user-1", role: "admin" },
  storeProvider: (entityName) => {
    if (entityName === "Order") return new PostgresOrderStore();
    return undefined; // fall back to memory store
  },
});
```

When `storeProvider` returns `undefined` for an entity, the runtime falls back to an in-memory store for that entity.

<Tip>
See [Custom Stores](/adapters/custom-stores) for the full `Store` interface contract and a guide to implementing production-ready adapters.
</Tip>

## Store and `localStorage`

The `localStorage` target is available for browser environments. Like `postgres` and `supabase`, it requires an adapter. The runtime does not bundle a `localStorage` implementation — you supply one via `storeProvider`.

```manifest
store Preferences in localStorage
```

## What the runtime does when a store is missing

If an entity is referenced in a command but has no store declaration, the runtime uses an in-memory store by default. The compiler may emit a warning for undeclared stores depending on your toolchain configuration.

<Warning>
Entities without an explicit store declaration have no persistence guarantee. In production, always declare an explicit store target to make your persistence intent clear and to enable adapter injection.
</Warning>

---

## 📄 Manifest doc — `language/events` · Events: typed outbox and pub/sub primitives

Events in Manifest are first-class declarations. You define a schema, assign a channel, and commands reference the event by name using the `emit` action. Every emission is recorded in the runtime's event log with a payload, timestamp, and workflow metadata.

## Declaring an event

Use the `event` keyword followed by a name, a channel string, and an optional payload schema block:

```manifest
event TaskCompleted: "task.completed" {
  taskId: string
  completedBy: string
}

event CounterIncremented: "counter.incremented" {
  counterId: string
}
```

The channel (`"task.completed"`) is a free-form string. It appears on every `EmittedEvent` and can be used by subscribers to route messages.

Payload fields are typed with `string`, `number`, `boolean`, or `timestamp`. They serve as the schema contract — the runtime populates the payload from command input and the last action result.

## Emitting events from commands

Use the `emit` action inside a command body to emit an event:

```manifest
entity Counter {
  property value: number = 0

  command increment() {
    mutate value = value + 1
    emit CounterIncremented
  }

  command reset() {
    mutate value = 0
    emit CounterReset
  }
}

event CounterIncremented: "counter.incremented" {
  counterId: string
}

event CounterReset: "counter.reset" {
  counterId: string
}
```

A command can emit multiple events. They are emitted in declaration order after all actions complete successfully.

## EmittedEvent shape

Every emitted event is recorded as an `EmittedEvent` object in `CommandResult.emittedEvents`:

```typescript
interface EmittedEvent {
  name: string;        // Event name, e.g. "TaskCompleted"
  channel: string;     // Channel string, e.g. "task.completed"
  payload: object;     // Command input + last action result
  timestamp: number;   // Milliseconds since epoch (from runtime time source)
  emitIndex: number;   // Zero-based index within this runCommand invocation (vNext)

  // Workflow metadata (vNext — present when supplied in command options)
  correlationId?: string;
  causationId?: string;
}
```

The `payload` object contains the command's input parameters and the last action result. This gives event consumers enough context to reconstruct what triggered the emission.

## Workflow metadata (vNext)

Pass `correlationId` and `causationId` in the command options to propagate identifiers across a multi-step workflow. The runtime attaches them to every event emitted during that invocation.

```typescript
const result = await runtime.runCommand(
  "Order",
  "complete",
  { instanceId: "order-123" },
  {
    correlationId: "workflow-abc",
    causationId: "step-2",
  }
);

// result.emittedEvents[0].correlationId === "workflow-abc"
// result.emittedEvents[0].causationId   === "step-2"
```

`emitIndex` is a per-command zero-based counter. It resets to `0` at the start of each `runCommand` call. It is not a global sequence — cross-command ordering is the caller's responsibility.

<Note>
Given identical IR, identical runtime context, identical input, and identical options, emitted events will always have identical `emitIndex` values. This is a determinism guarantee.
</Note>

## Subscribing to events

Use `runtime.onEvent(listener)` to register a listener. The listener receives **every** emitted event — filter by `event.name` inside the callback. It returns an unsubscribe function.

```typescript
import { RuntimeEngine } from "@angriff36/manifest";

const runtime = new RuntimeEngine(ir, {
  user: { id: "worker-1", role: "system" },
});

const unsubscribe = runtime.onEvent((event) => {
  if (event.name === "TaskCompleted") {
    console.log("Task completed:", event.payload);
    sendNotification(event.payload.completedBy);
  }
  if (event.name === "OrderCreated") {
    console.log("New order on channel:", event.channel);
    console.log("Correlation:", event.correlationId);
  }
});

// Call unsubscribe() when the listener is no longer needed.
```

Listeners fire synchronously during `runCommand`, after all actions and before `CommandResult` is returned.

## Complete example

```manifest
entity Order {
  property required id: string
  property status: string = "pending"
  property total: number = 0

  command addItem(amount: number) {
    mutate total = self.total + amount
    emit OrderUpdated
  }

  command complete() {
    guard self.status == "in_progress"
    mutate status = "completed"
    emit OrderCompleted
  }
}

store Order in memory

event OrderUpdated: "order.updated" {
  orderId: string
  total: number
}

event OrderCompleted: "order.completed" {
  orderId: string
  finalTotal: number
}
```

```typescript
const runtime = new RuntimeEngine(ir);

runtime.onEvent((event) => {
  if (event.name === "OrderCompleted") {
    console.log(`Order ${event.payload.orderId} completed.`);
  }
});

const result = await runtime.runCommand("Order", "complete", {
  instanceId: "order-001",
});

console.log(result.emittedEvents);
// [
//   {
//     name: "OrderCompleted",
//     channel: "order.completed",
//     payload: { instanceId: "order-001", ... },
//     timestamp: 1748131200000,
//     emitIndex: 0
//   }
// ]
```

## OverrideApplied event (vNext)

When an authorized constraint override is applied, the runtime synthesizes and emits an `OverrideApplied` event. This event is not declared in your `.manifest` source — it is injected by the runtime automatically:

```typescript
{
  name: "OverrideApplied",
  channel: "system",
  payload: {
    constraintCode: "requiresApproval",
    reason: "Emergency processing authorized by finance lead",
    authorizedBy: "user-999",
    timestamp: 1748131200000,
    commandName: "process",
    entityName: "FinancialRecord",
    instanceId: "rec-42"
  }
}
```

This event appears in `CommandResult.emittedEvents` alongside any command-declared events.

## Webhook inbound triggers

Webhooks declare inbound HTTP endpoints that trigger entity commands when an external system sends a request. The runtime verifies the webhook signature, transforms the payload, and dispatches the command.

```manifest
entity Order {
  property required id: string
  property status: string = "pending"
  property providerRef: string = ""

  webhook paymentCallback
    method POST
    url "/webhooks/payment"
    signature "hmac-sha256" header "X-Signature"
    command handlePayment

  command handlePayment(providerRef: string, status: string) {
    guard status == "completed"
    mutate providerRef = providerRef
    mutate status = "paid"
    emit PaymentReceived
  }
}
```

### Webhook configuration

| Field | Description |
|-------|-------------|
| `method` | HTTP method (typically `POST`) |
| `url` | Endpoint path for the generated route |
| `signature` | Verification method and header name (e.g., `hmac-sha256` with `X-Signature` header) |
| `command` | Entity command to invoke when the webhook fires |
| `idempotency` | Optional idempotency key field from the payload for deduplication |

<Note>
Webhook signature verification happens before the command is dispatched. If the signature is invalid, the request is rejected with a `401` response and no command runs. This prevents untrusted callers from triggering commands.
</Note>

## Event sourcing store

The `event-sourced` store target persists entity state as an append-only event log rather than overwriting entity records. Each command produces events that are appended to the log, and entity state is reconstructed by replaying events from the beginning.

```manifest
store Order in event-sourced
```

The event-sourced store supports:

- **Append-only writes** — events are never modified or deleted
- **Snapshotting** — periodic snapshots avoid replaying the full log
- **Replay** — entity state is reconstructed by replaying events
- **Projections** — read models can be built by subscribing to the event stream

<Warning>
Event sourcing is a storage strategy, not a runtime behavior change. Commands execute identically regardless of whether the backing store is memory, postgres, or event-sourced. The difference is how state is persisted and recovered.
</Warning>

---
