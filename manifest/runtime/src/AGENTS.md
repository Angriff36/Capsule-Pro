---
source: Manifest published docs (mintlify) — embedded verbatim
divergences: D6, D7, D14, D26, D27
pages: adapters/outbox, language/commands, language/stores
note: >-
  These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.
---

# Manifest reference for `manifest/runtime/src`

**Why this file:** The embedded runtime layer: delete the dead/parallel outbox writers and rely on the native outboxStore (D6/D7); delete the KNOWN_COMMAND_OWNERS repair — the compiler already populates command.entity (D14); drop the vestigial per-tenant table-map store provider for GenericPrismaStore (D26); store JSON-shaped props as native Json, not TEXT (D27).

**Relevant divergences:** D6, D7, D14, D26, D27 — see `manifest/MANIFEST-DIVERGENCES.md` for the full remediation detail.

**How to use:** These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.

---

## 📄 Manifest doc — `adapters/outbox` · Durable event delivery with the Manifest outbox

When a command emits one or more events, you often need to deliver those events to downstream consumers reliably — even if your process crashes immediately after the command succeeds. The `OutboxStore` adapter gives you a durable queue for emitted events that a background worker can drain with at-least-once delivery guarantees.

## How the outbox works

After a successful `runCommand` call that emits events, the runtime calls `outboxStore.enqueue(entries)` once, batching all events from that invocation into a single call. A separate delivery worker then polls the store using `claim`, delivers the events, and calls `markDelivered` or `markFailed`.

```
runCommand → success → enqueue(entries)
                            │
              ┌─────────────▼─────────────┐
              │      OutboxStore          │
              │  pending entries queue    │
              └─────────────┬─────────────┘
                            │
              delivery worker: claim → deliver → markDelivered
```

## The OutboxStore interface

The full interface, from `@angriff36/manifest/outbox`:

```typescript
interface OutboxStore {
  /**
   * Enqueue one or more outbox entries. Called by the runtime after a
   * successful command. Pass a tx handle to participate in the caller's
   * transaction; without one, enqueue runs independently (best-effort).
   */
  enqueue(entries: OutboxEntry[], tx?: unknown): Promise<void>;

  /**
   * Claim up to batchSize pending entries for delivery. Durable
   * implementations should use SELECT … FOR UPDATE SKIP LOCKED so
   * concurrent workers receive disjoint batches.
   */
  claim(batchSize: number): Promise<OutboxEntry[]>;

  /** Mark entries as successfully delivered. */
  markDelivered(entryIds: string[]): Promise<void>;

  /** Mark entries as failed with a reason. */
  markFailed(entryIds: string[], error: string): Promise<void>;
}
```

## The OutboxEntry shape

Each entry the runtime enqueues has the following shape:

```typescript
interface OutboxEntry {
  /** Stable id assigned at enqueue time. Use this as your dedup token. */
  entryId: string;
  /** Timestamp the entry was enqueued (ms since epoch). */
  enqueuedAt: number;
  /** The full EmittedEvent payload from the command. */
  event: EmittedEvent;
  /** Current status: 'pending' | 'delivered' | 'failed'. */
  status: OutboxEntryStatus;
  /** Number of times this entry has been claimed. */
  attempts: number;
  /** Last error message, present when status === 'failed'. */
  lastError?: string;
}
```

## Delivery semantics: at-least-once

<Warning>
The outbox provides **at-least-once** delivery, not exactly-once. Your consumers **must be idempotent**.

A worker that delivers an event and then crashes before calling `markDelivered` will redeliver the same entry after stale-claim recovery. Use `entryId` — or a domain-level idempotency key — as a dedup token in every consumer.
</Warning>

The three reasons duplication can occur:

1. A worker claims an entry, delivers it, crashes before `markDelivered` runs, and `releaseStaleClaims` recovers the entry for redelivery.
2. `releaseStaleClaims` is called while the original worker is still alive, producing a second concurrent delivery.
3. Network retries from the consumer side can produce repeat reads within a single worker.

## First-party stores

<CodeGroup>

```typescript MemoryOutboxStore (development / tests)
import { MemoryOutboxStore } from '@angriff36/manifest/outbox/memory';

const outboxStore = new MemoryOutboxStore();
```

```typescript PostgresOutboxStore (production)
import { PostgresOutboxStore } from '@angriff36/manifest/outbox/postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const outboxStore = new PostgresOutboxStore(pool);
```

</CodeGroup>

`MemoryOutboxStore` is an in-memory analogue of `SELECT FOR UPDATE SKIP LOCKED` — `claim` skips entries that are already claimed or resolved. Use it in tests.

`PostgresOutboxStore` uses `SELECT … FOR UPDATE SKIP LOCKED` combined with a `claimed_at IS NULL` filter so concurrent workers receive disjoint batches. Apply the schema before first use:

<Tip>
The schema file is included in the published package at `node_modules/@angriff36/manifest/src/manifest/outbox/stores/postgres.sql`. Run it against your database once during deployment.
</Tip>

## Wiring in an outbox store

Pass your store via `RuntimeOptions.outboxStore`:

```typescript
import { RuntimeEngine } from '@angriff36/manifest';
import { PostgresOutboxStore } from '@angriff36/manifest/outbox/postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const runtime = new RuntimeEngine(ir, {
  userId: session.userId,
  tenantId: session.tenantId,
  outboxStore: new PostgresOutboxStore(pool)
});

// After a successful command, entries are automatically enqueued.
const result = await runtime.runCommand('placeOrder', input, {
  entityName: 'Order',
  instanceId: orderId
});
```

Then run a delivery worker that polls the store:

```typescript
import { PostgresOutboxStore } from '@angriff36/manifest/outbox/postgres';

async function deliveryWorker(store: PostgresOutboxStore) {
  while (true) {
    const entries = await store.claim(25);
    if (entries.length === 0) {
      await sleep(1000);
      continue;
    }

    const delivered: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const entry of entries) {
      try {
        await publishToEventBus(entry.event);
        delivered.push(entry.entryId);
      } catch (err) {
        failed.push({ id: entry.entryId, error: String(err) });
      }
    }

    if (delivered.length > 0) await store.markDelivered(delivered);
    for (const f of failed) await store.markFailed([f.id], f.error);
  }
}
```

## Crash recovery

If a worker claims entries and then crashes before calling `markDelivered` or `markFailed`, those rows are left with `status='pending'` but a non-null `claimed_at`. The `claim` method will not return them again (the `claimed_at IS NULL` filter excludes them).

Call `releaseStaleClaims(entryIds)` on `PostgresOutboxStore` to reset those entries so a follow-up `claim` picks them up:

```typescript
// Only call this after you are certain the original worker is dead.
await outboxStore.releaseStaleClaims(staleEntryIds);
```

<Warning>
Only release claims when you are certain the original worker is no longer running. Releasing a claim held by a live worker produces a second delivery. The `attempts` counter increments on every successful claim, so you can use it to bound retries and dead-letter entries that exceed a threshold.
</Warning>

## Transactional limitation

<Note>
The current `RuntimeEngine` does **not** share a transaction boundary between entity state mutation and outbox enqueue. The `enqueue` call runs on a separate database connection from the entity `update` inside `_executeCommandInternal`.

This means: if the entity mutation succeeds but `outboxStore.enqueue` fails, the state change is persisted without a durable outbox row. The runtime logs the failure to `stderr` as:

```
[Manifest Runtime] OutboxStore.enqueue failed
```

The `CommandResult` is not affected — the command still returns success to your caller.

**Mitigation:** `PostgresOutboxStore.enqueue(entries, tx)` accepts a caller-supplied `PoolClient`. If you open your own transaction and pass the same client to both a `PostgresStore` write and `PostgresOutboxStore.enqueue(entries, sameClient)`, you get atomicity at the adapter level. Making `RuntimeEngine` open and thread that transaction automatically is deferred to a future release.
</Note>

## Import paths

| What | Import path |
|------|-------------|
| `OutboxStore` interface and `OutboxEntry` type | `@angriff36/manifest/outbox` |
| `MemoryOutboxStore` | `@angriff36/manifest/outbox/memory` |
| `PostgresOutboxStore` | `@angriff36/manifest/outbox/postgres` |

## Failure policy: fail-open

Like the audit sink, `OutboxStore.enqueue` errors are caught and logged to `stderr`. They do not alter `CommandResult` or block the caller. Monitor for:

```
[Manifest Runtime] OutboxStore.enqueue failed
```

Alert on this line in production if your application depends on durable event delivery.

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
