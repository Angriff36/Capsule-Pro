---
source: Manifest published docs (mintlify) — embedded verbatim
divergences: D8, D3, U9
pages: adapters/outbox, language/workflows
note: >-
  These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.
---

# Manifest reference for `apps/api/lib/manifest`

**Why this file:** Manifest API glue: delete the orphan writeManifestOutboxEvents wrapper (D8); use native sagas (runSaga) for atomic multi-entity flows instead of hand-rolled $transactions (D3/U9).

**Relevant divergences:** D8, D3, U9 — see `manifest/MANIFEST-DIVERGENCES.md` for the full remediation detail.

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

## 📄 Manifest doc — `language/workflows` · Workflows: saga orchestration and scheduled commands

Manifest provides two workflow primitives for coordinating execution across time and services: **saga orchestration** for distributed transactions with compensation, and **scheduled commands** for time-based triggers.

## Saga orchestration

A saga declares a sequence of steps that execute across entities or services. Each step has a forward command and an optional compensate command for rollback. If any step fails, the saga runs compensate for all previously completed steps in reverse order.

### Declaring a saga

Use the `saga` keyword at the program or module level:

```manifest
saga ProcessOrder {
  step reserveInventory
    forward Inventory.reserve with { orderId: self.id }
    compensate Inventory.release with { orderId: self.id }

  step chargePayment
    forward Payment.charge with { orderId: self.id, amount: self.total }
    compensate Payment.refund with { orderId: self.id }

  step shipOrder
    forward Shipping.dispatch with { orderId: self.id }

  on_failure emit OrderProcessingFailed
}
```

### Saga lifecycle

<Steps>
  <Step title="Start">
    The saga begins when the first step's forward command is invoked. The runtime creates a saga execution record tracking the current step index.
  </Step>
  <Step title="Execute forward">
    Each step's forward command runs in sequence. If the command succeeds, the saga advances to the next step.
  </Step>
  <Step title="On failure — compensate">
    If any forward command fails, the saga enters compensation mode. It runs each completed step's compensate command in reverse order (last completed first).
  </Step>
  <Step title="Complete or failed">
    After all steps complete (or all compensations run), the saga emits a completion or failure event.
  </Step>
</Steps>

### Best-effort compensation

Compensation is best-effort. If a compensate command itself fails, the saga logs the failure and continues compensating remaining steps. This ensures partial rollback rather than aborting the compensation process entirely.

### Saga lifecycle events

| Event | When emitted |
|-------|-------------|
| `{SagaName}Started` | Saga execution begins |
| `{SagaName}StepCompleted` | Each forward step succeeds |
| `{SagaName}Completed` | All forward steps complete |
| `{SagaName}StepCompensated` | Each compensate step completes |
| `{SagaName}Failed` | Saga enters compensation mode or compensation fails |

<Note>
Saga events carry `correlationId` and `causationId` from the originating command, enabling cross-service tracing through the entire workflow.
</Note>

## Scheduled commands

Scheduled commands trigger entity commands on a time-based schedule using cron expressions, fixed intervals, or periodic timers.

### Declaring a scheduled command

Use the `schedule` keyword inside an entity block:

```manifest
entity Report {
  property required id: string
  property lastRunAt: number = 0
  property status: string = "idle"

  schedule generateDaily
    cron "0 6 * * *"           // Every day at 6:00 AM
    run generate

  schedule healthCheck
    interval 300000            // Every 5 minutes (in ms)
    run checkHealth

  schedule cleanup
    every 24 hours             // Every 24 hours
    run purgeExpired

  command generate() {
    mutate status = "running"
    emit ReportGenerationStarted
  }

  command checkHealth() {
    mutate lastRunAt = now()
  }

  command purgeExpired() {
    mutate status = "cleaned"
  }
}
```

### Trigger types

| Type | Syntax | Description |
|------|--------|-------------|
| `cron` | `cron "0 6 * * *"` | Standard 5-field cron expression (minute hour day month weekday) |
| `interval` | `interval <ms>` | Fixed interval in milliseconds |
| `every` | `every <n> hours/minutes/seconds` | Human-readable period |

### Schedule resolution

Schedules are resolved at compile time and emitted to the IR as `IRSchedule` objects. The runtime does not include a built-in scheduler — schedules are declarative metadata that projection targets consume:

- **Next.js projection**: Generates Next.js [cron routes](https://nextjs.org/docs/app/api-reference/cron) (`/api/cron/[name]/route.ts`).
- **Express/Hono projections**: Emit route handlers intended for external scheduler invocation.
- **Infrastructure projections** (Terraform): Generate CloudWatch Event rules or similar scheduled resources.

### Inline parameters

Scheduled commands can pass static parameters to the target command:

```manifest
entity Cache {
  schedule warmCache
    cron "0 */6 * * *"
    run refresh with { keys: "all" }

  command refresh(keys: string) {
    // ...
  }
}
```

<Warning>
The Manifest runtime does not execute schedules autonomously. Schedules are declarations consumed by projections. You must deploy the generated cron routes and ensure your hosting platform invokes them on schedule.
</Warning>

## Combining sagas and schedules

Sagas and schedules can work together. A scheduled command can initiate a saga, enabling periodic batch workflows:

```manifest
entity DailyReconciliation {
  schedule runReconciliation
    cron "0 2 * * *"
    run startReconciliation

  command startReconciliation() {
    emit ReconciliationRequested
  }
}

saga ReconcileAccounts {
  step fetchTransactions
    forward Transaction.fetchPending

  step matchRecords
    forward Ledger.match with { date: self.date }

  on_failure emit ReconciliationFailed
}
```

---
