# OutboxEvent Table

**Schema:** `tenant` (tenant-scoped)
**Table:** `OutboxEvent`
**Primary Key:** `id` (CUID)

## Overview

The `OutboxEvent` table implements the **Outbox Pattern** for reliable event publishing to external real-time systems (Ably). This pattern ensures that database transactions and event publishing are atomic - events are written to the outbox table within the same transaction as the domain state change, then a background worker publishes them to Ably.

**Critical Architecture Note:** This table enables transactional event publishing without requiring two-phase commit across the database and message broker.

## Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `String` (CUID) | No | `cuid()` | Unique identifier for the outbox event |
| `tenantId` | `String` | No | - | **ISSUE:** Foreign key to Account (missing constraint) |
| `eventType` | `String` | No | - | Type of event (e.g., "kitchen.task.claimed") |
| `aggregateType` | `String` | No | - | Domain aggregate type (e.g., "KitchenTask", "Event") |
| `aggregateId` | `String` | No | - | ID of the aggregate instance |
| `payload` | `Json` | No | - | Event payload (flexible JSON structure) |
| `status` | `OutboxStatus` | No | `"pending"` | Processing status (pending, published, failed) |
| `error` | `String` | Yes | `NULL` | Error message if publication failed |
| `createdAt` | `DateTime` | No | `now()` | When the event was created |
| `publishedAt` | `DateTime` | Yes | `NULL` | When the event was published to Ably |

## Column Details

### `id`
- **Type:** String (CUID)
- **Description:** Primary key for the outbox event
- **Format:** CUID (collision-resistant, sortable, URL-safe)
- **Usage:** Event identification, deduplication

### `tenantId`
- **Type:** String
- **Description:** Tenant identifier (references Account.id)
- **ISSUE:** **Missing Foreign Key Constraint** - This column should have a foreign key to `platform.Account.id` but doesn't
- **Impact:** Cannot guarantee referential integrity at database level
- **Workaround:** Application-layer validation ensures valid tenantId
- **TODO:** Add FK constraint in migration:
  ```sql
  ALTER TABLE tenant.OutboxEvent
  ADD CONSTRAINT fk_outbox_event_tenant
  FOREIGN KEY (tenantId) REFERENCES platform.Account(id) ON DELETE CASCADE;
  ```

### `eventType`
- **Type:** String
- **Description:** Specific event type identifier
- **Format:** Dot-notation (e.g., "kitchen.task.claimed", "event.board.updated")
- **Examples:**
  - `kitchen.task.claimed` - Task claimed by staff
  - `kitchen.task.progress` - Task progress updated
  - `event.board.created` - Battle board created
  - `event.board.card.moved` - Card moved on battle board

### `aggregateType`
- **Type:** String
- **Description:** Domain aggregate type that generated the event
- **Values:** `KitchenTask`, `Event`, `BattleBoard`, `CommandBoard`, etc.
- **Usage:** Event routing, filtering by domain

### `aggregateId`
- **Type:** String
- **Description:** ID of the specific aggregate instance
- **Example:** KitchenTask ID, Event ID, Board ID
- **Usage:** Correlate events with domain entities

### `payload`
- **Type:** Json
- **Description:** Event-specific data
- **Structure:** Flexible JSON with event type determining schema
- **Example:**
  ```json
  {
    "taskId": "task-123",
    "employeeId": "emp-456",
    "claimedAt": "2026-01-30T12:00:00Z"
  }
  ```

### `status`
- **Type:** OutboxStatus (enum)
- **Default:** `"pending"`
- **Values:**
  - `pending` - Event created, awaiting publication
  - `published` - Successfully published to Ably
  - `failed` - Publication failed (retry scheduled)
- **Usage:** Background worker polling, retry logic

### `error`
- **Type:** String (nullable)
- **Default:** `NULL`
- **Description:** Error message if publication failed
- **Usage:** Debugging, alerting, retry backoff
- **Format:** Error stack trace or message

### `createdAt`
- **Type:** DateTime
- **Default:** `now()`
- **Description:** When event was created
- **Usage:** Ordering, age-based processing

### `publishedAt`
- **Type:** DateTime (nullable)
- **Default:** `NULL`
- **Description:** When event was successfully published
- **Usage:** Latency measurement, duplicate detection

## Relationships

### Missing Foreign Key (ISSUE)

**Current State:**
```prisma
model OutboxEvent {
  tenantId String  // No @relation annotation
  // ...
}
```

**Expected State:**
```prisma
model OutboxEvent {
  tenantId String  @map("tenant_id")
  account   Account @relation(fields: [tenantId], references: [id])
  // ...
}

model Account {
  outboxEvents OutboxEvent[]
  // ...
}
```

**Impact:**
- No database-level referential integrity
- Orphaned records possible if Account deleted
- Cannot use Prisma's relation queries
- Application must manually validate tenantId

**Migration Required:**
```sql
-- Add FK constraint
ALTER TABLE tenant.OutboxEvent
ADD CONSTRAINT fk_outboxevent_tenantid
FOREIGN KEY (tenantId)
REFERENCES platform.Account(id)
ON DELETE CASCADE;

-- Create index on FK (already exists)
CREATE INDEX IF NOT EXISTS idx_tenantid ON tenant.OutboxEvent(tenantId);
```

## Schema and Naming Issues

### ISSUE 1: Naming Inconsistency (camelCase vs snake_case)

**Current:**
```prisma
model OutboxEvent {
  tenantId String  // camelCase
}
```

**Pattern in other tenant tables:**
```prisma
model KitchenTask {
  tenantId String @map("tenant_id")  // camelCase + @map
}

model EventGuest {
  tenantId String @map("tenant_id") @db.Uuid
}
```

**Issue:** OutboxEvent uses `tenantId` (camelCase) without `@map("tenant_id")` annotation, which means the actual database column is also `tenantId` instead of `tenant_id`.

**Expected Pattern:** All tenant tables should use `@map("tenant_id")` for consistency.

**Migration Required:**
```sql
-- Rename column to snake_case
ALTER TABLE tenant.OutboxEvent
RENAME COLUMN tenantId TO tenant_id;

-- Update Prisma schema
-- tenantId String @map("tenant_id")
```

### ISSUE 2: Schema Location

**Current:** `@@schema("tenant")`
**Expected:** `@@schema("public")` or `@@schema("core")`

**Rationale:** OutboxEvent is infrastructure-level plumbing, not domain data. Should be in core infrastructure schema alongside other enums/types.

## Enums

### OutboxStatus
```prisma
enum OutboxStatus {
  pending
  published
  failed

  @@schema("core")
}
```

## Indexes

```prisma
@@index([status, createdAt])     // For worker polling (pending events)
@@index([tenantId])              // For tenant filtering
@@index([aggregateType, aggregateId])  // For event replay/query
```

**Query Patterns:**
1. Background worker: `WHERE status = 'pending' ORDER BY createdAt ASC`
2. Tenant audit: `WHERE tenantId = ? ORDER BY createdAt DESC`
3. Event replay: `WHERE aggregateType = ? AND aggregateId = ?`

## Outbox Pattern Flow

### 1. Transactional Write
```typescript
await database.$transaction(async (tx) => {
  // Update domain model
  await tx.kitchenTask.update({
    where: { id: taskId },
    data: { status: "in_progress" }
  });

  // Create outbox event in same transaction
  await createOutboxEvent(tx, {
    tenantId: account.id,
    aggregateType: "KitchenTask",
    aggregateId: taskId,
    eventType: "kitchen.task.claimed",
    payload: { taskId, employeeId, claimedAt: new Date() }
  });
});
// Transaction commits → both DB state and outbox event are atomic
```

### 2. Background Worker Polling
```typescript
// apps/api/app/outbox/publish/route.ts
const pendingEvents = await database.outboxEvent.findMany({
  where: { status: "pending" },
  orderBy: { createdAt: "asc" },
  take: 100
});

for (const event of pendingEvents) {
  try {
    await ably.channels.get(`tenant:${event.tenantId}`).publish(
      event.eventType,
      event.payload
    );

    await database.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: "published",
        publishedAt: new Date()
      }
    });
  } catch (error) {
    await database.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: "failed",
        error: error.message
      }
    });
  }
}
```

### 3. Real-time Client Subscription
```typescript
// packages/collaboration/hooks.ts
const channel = ably.channels.get(`tenant:${tenantId}`);
await channel.subscribe("kitchen.task.*", (message) => {
  // Handle real-time update
});
```

## Usage Examples

### Kitchen Task Claim
```typescript
await database.$transaction(async (tx) => {
  await tx.kitchenTask.update({
    where: { id: taskId },
    data: { claimedBy: employeeId }
  });

  await createOutboxEvent(tx, {
    tenantId: account.id,
    aggregateType: "KitchenTask",
    aggregateId: taskId,
    eventType: "kitchen.task.claimed",
    payload: {
      taskId,
      employeeId,
      claimedAt: new Date().toISOString()
    }
  });
});
```

### Battle Board Update
```typescript
await database.$transaction(async (tx) => {
  await tx.battleBoard.update({
    where: { id: boardId },
    data: { status: "active" }
  });

  await createOutboxEvent(tx, {
    tenantId: account.id,
    aggregateType: "BattleBoard",
    aggregateId: boardId,
    eventType: "event.board.updated",
    payload: {
      boardId,
      status: "active",
      updatedAt: new Date().toISOString()
    }
  });
});
```

## Key Constraints

### Unique Constraints
- None (CUID ensures uniqueness)

### Foreign Keys (MISSING)
- `tenantId` → `platform.Account.id` (TODO: Add constraint)

### Indexes
- Composite index on `(status, createdAt)` for worker polling
- Index on `tenantId` for tenant filtering
- Composite index on `(aggregateType, aggregateId)` for event replay

## Important Notes

### Design Patterns
1. **Transactional Outbox:** Ensures atomicity of domain write + event publication
2. **Event Ordering:** Worker polls by `createdAt ASC` to maintain order
3. **Idempotency:** CUID-based `id` enables deduplication
4. **Retry Logic:** Failed events marked with status + error message

### Priority Order
Real-time events are prioritized:
1. **Kitchen tasks** (highest) - Task claims, progress updates
2. **Events/Boards** - Battle board updates, event changes
3. **Scheduling** - Staff assignment changes

### Monitoring
- Monitor `publishedAt - createdAt` latency
- Alert on `status = 'failed'` events
- Track outbox table size (should not grow unbounded)

### Cleanup
**TODO:** Implement archival/deletion of old published events:
```sql
DELETE FROM tenant.OutboxEvent
WHERE status = 'published'
AND publishedAt < NOW() - INTERVAL '30 days';
```

## Known Issues

### Issue #1: Missing Foreign Key to Account
**Severity:** High
**Impact:** No referential integrity, orphaned records possible
**Fix:** Add FK constraint in migration (see Relationships section)

### Issue #2: Naming Inconsistency (camelCase)
**Severity:** Medium
**Impact:** Inconsistent with other tenant tables (use `@map("tenant_id")`)
**Fix:** Rename column with migration (see Schema and Naming Issues)

### Issue #3: Schema Location
**Severity:** Low
**Impact:** Infrastructure table in tenant schema (should be in `core` or `public`)
**Fix:** Move to `core` schema (requires careful migration planning)

## Verification Status

**Frontmatter:**
```yaml
first_documented: "2026-01-30"
last_updated: "2026-01-30"
last_verified_by: "spec-executor (T019)"
verification_status: "documented_with_issues"
issues_found: 3
types_fixed: 0
```

**Issues Found:**
1. Missing foreign key to `platform.Account`
2. Naming inconsistency (no `@map("tenant_id")`)
3. Schema location (should be in `core` not `tenant`)

**Code Audit Results:**
- No `any` types found in outbox-related code
- Type-safe `CreateOutboxEventInput` defined
- Proper Prisma usage in createOutboxEvent helper
- Tenant scoping working via `createTenantClient` extension

**Files Reviewed:**
- `packages/database/prisma/schema.prisma` (OutboxEvent model)
- `packages/realtime/src/outbox/create.ts` (type-safe helper)
- `packages/realtime/src/outbox/index.ts` (exports)
- `packages/database/tenant.ts` (tenant scoping)
- `apps/api/app/outbox/publish/route.ts` (background worker)
- `apps/app/app/(authenticated)/kitchen/tasks/actions.ts` (usage example)

**Next Steps:**
1. Create migration to add FK constraint
2. Create migration to rename `tenantId` → `tenant_id`
3. Consider moving `OutboxEvent` to `core` schema
4. Implement archival/deletion for old published events
