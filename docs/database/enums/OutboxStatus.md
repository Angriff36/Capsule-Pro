# OutboxStatus

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T032)
> **Verification status**: ✅ Verified

## Overview

Defines the status of outbox events in the transactional outbox pattern, ensuring reliable event publishing to external systems (Ably) with exactly-once semantics.

**Business Context**: The outbox pattern guarantees that events are published reliably even if the external service (Ably) is temporarily unavailable. Events are written to the database within the same transaction as the business operation, then published asynchronously.

**Key Use Cases**:
- Track event publication status to Ably
- Retry failed event publications
- Monitor event delivery health and lag
- Prevent duplicate event publishing (idempotency)

**Lifecycle**: `pending` → `published` (or `failed`)

## Schema Reference

```prisma
enum OutboxStatus {
  pending
  published
  failed

  @@schema("core")
}
```

**PostgreSQL Type**: `core.outbox_status`
**Database Location**: `core` schema (shared across all tenants)
**Mutability**: Immutable (adding values requires migration)

## Values

| Value | Description | When to Use | Business Rules |
|-------|-------------|-------------|----------------|
| `pending` | Event created but not yet published to Ably | Initial state for all new outbox events | Visible to publisher worker, awaiting processing |
| `published` | Event successfully published to Ably | Event delivered to Ably, confirmation received | Immutable end state, stores publishedAt timestamp |
| `failed` | Event publication failed after retry attempts | Ably unavailable, authentication failed, or network error | Can be retried manually or automatically by worker |

## Status Flow

```
    ┌─────────────┐
    │  pending   │  ← Initial state (created with business transaction)
    └──────┬──────┘
           │
           │ (publisher worker processes)
           ▼
      ┌────┴────┐
      │         │
      ▼         ▼
  ┌──────────┐ ┌───────┐
  │published │ │ failed │  ← End states
  └──────────┘ └───┬───┘
                    │
                    │ (retry mechanism)
                    ▼
               [Retry processing]
                    │
                    ▼ (success or retry limit)
                 ┌────┴────┐
                 │         │
                 ▼         ▼
             ┌──────────┐ ┌───────┐
             │published │ │ failed │
             └──────────┘ └───────┘
```

## Business Rules

1. **State Transitions**:
   - `pending` → `published`: Successful Ably publication
   - `pending` → `failed`: Publication failed after retry attempts
   - `failed` → `published`: Retry succeeded
   - `failed` → `failed`: Retry also failed (increment failure count)

2. **Publishing guarantees**:
   - Events created in `pending` status within business transaction
   - Publisher worker processes `pending` events in FIFO order per tenant
   - Exactly-once delivery via idempotency keys (event ID + aggregation ID)

3. **Retry logic**:
   - Failed events retried with exponential backoff
   - Maximum retry attempts configured (default: 5)
   - Events exceeding max retry attempts remain `failed` for manual inspection

4. **Monitoring**:
   - Track `pending` event age (alerts if events stuck)
   - Monitor `failed` event count (indicates Ably health issues)
   - Measure publication lag (created → published duration)

## Usage in OutboxEvent Model

```typescript
import { OutboxEvent, OutboxStatus } from '@repo/database/generated'

// Create pending event (within business transaction)
await database.$transaction(async (tx) => {
  // Business operation
  await tx.kitchenTask.update({
    where: { id: taskId },
    data: { status: KitchenTaskStatus.done }
  })

  // Create outbox event in same transaction
  await tx.outboxEvent.create({
    data: {
      tenantId,
      eventType: 'task.completed',
      aggregationId: `task:${taskId}`,
      payload: { taskId, userId, completedAt: new Date() },
      status: OutboxStatus.pending,
      publishAfter: new Date(), // Publish immediately
    }
  })
})

// Publisher worker processes pending events
const pendingEvents = await database.outboxEvent.findMany({
  where: {
    status: OutboxStatus.pending,
    publishAfter: { lte: new Date() }
  },
  orderBy: { createdAt: 'asc' },
  take: 100 // Batch size
})

// Publish to Ably and update status
for (const event of pendingEvents) {
  try {
    await ably.channels.get(`tenant:${event.tenantId}`).publish(
      event.eventType,
      event.payload
    )

    await database.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: OutboxStatus.published,
        publishedAt: new Date()
      }
    })
  } catch (error) {
    await database.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: OutboxStatus.failed,
        lastFailureAt: new Date(),
        failureCount: { increment: 1 },
        failureReason: error.message
      }
    })
  }
}
```

## Common Queries

### Get stuck pending events (alert condition)
```typescript
const stuckEvents = await database.outboxEvent.findMany({
  where: {
    status: OutboxStatus.pending,
    createdAt: {
      lte: new Date(Date.now() - 5 * 60 * 1000) // Older than 5 min
    }
  }
})
```

### Monitor publication health
```typescript
const totalPending = await database.outboxEvent.count({
  where: { status: OutboxStatus.pending }
})

const totalFailed = await database.outboxEvent.count({
  where: { status: OutboxStatus.failed }
})

// Alert if too many pending or failed
if (totalPending > 1000 || totalFailed > 100) {
  alertTeam('Outbox publisher health degraded')
}
```

### Retry failed events
```typescript
const retryableFailed = await database.outboxEvent.findMany({
  where: {
    status: OutboxStatus.failed,
    failureCount: { lt: 5 }, // Retry only if not exceeded limit
    lastFailureAt: {
      gte: new Date(Date.now() - 15 * 60 * 1000) // Last failed > 15min ago
    }
  }
})
```

## Publication Lag Monitoring

Track time from creation to publication:

```typescript
const lagStats = await database.outboxEvent.groupBy({
  by: ['status'],
  where: {
    createdAt: { gte: startOfDay }
  },
  _avg: {
    createdAt: true,
    publishedAt: true
  }
})
```

## Related Tables

- **[OutboxEvent](../tables/tenant/OutboxEvent.md)** - Outbox event storage
- Schema: [`tenant`](../schemas/02-tenant.md) - OutboxEvent location
- Schema: [`core`](../schemas/01-core.md) - Enum definition

## See Also

- Pattern: Transactional Outbox for reliable event publishing
- Real-time: Ably integration for event delivery
