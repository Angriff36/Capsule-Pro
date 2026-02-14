# Technical Plan: Realtime Transport (Outbox to Ably)

Feature ID: 001
Spec Version: 1.0
Constitution Version: 1.0.0

## 1. Architecture Overview

### 1.1 High-Level Design

The realtime transport establishes a publish pipeline from domain operations to Ably channels using the transactional outbox pattern.

```
+-------------------+    +------------------+    +-------------------+
|  Domain Service   |    |   OutboxEvent    |    |    Publisher      |
|  (e.g., Kitchen)  |--->|   (Postgres)     |--->|  /api/outbox/     |
|                   |    |   status=pending |    |    publish        |
+-------------------+    +------------------+    +-------------------+
        |                        |                        |
        | createOutboxEvent()    | SELECT FOR UPDATE      | channel.publish()
        | (in transaction)       | SKIP LOCKED            |
        v                        v                        v
+-------------------+    +------------------+    +-------------------+
|   @repo/realtime  |    |  status=published|    |    Ably Channel   |
|   - Event types   |    |  publishedAt=now |    |  tenant:{tenantId}|
|   - Zod schemas   |    +------------------+    +-------------------+
|   - Helpers       |
+-------------------+
```

### 1.2 Key Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Single `packages/realtime` | Separation from `@repo/collaboration` (Liveblocks UI presence) [C2.1] | Add to collaboration package |
| `$queryRaw` for SKIP LOCKED | Prisma lacks native support; required for safe concurrency | Single-publisher model |
| Tenant-wide channels only | Simpler auth, deferred module channels to Phase 2 | Module channels from start |
| Zod validation on payloads | Runtime safety at boundaries [C2.2] | TypeScript only |
| Event `id` mirrors OutboxEvent.id | Consumer deduplication without extra fields | Generate separate event ID |

## 2. Components

### 2.1 Component: packages/realtime

- **Purpose**: Typed event definitions, Zod schemas, outbox helpers
- **Location**: `packages/realtime/`
- **Dependencies**: `zod`, `@repo/database` (optional for createOutboxEvent)
- **Constitution**: [C2.1] Business-critical realtime uses outbox + Ably

**Package Structure:**
```
packages/realtime/
  src/
    index.ts              # Public exports
    events/
      index.ts            # Event type exports
      envelope.ts         # RealtimeEventBase, version
      kitchen.ts          # Kitchen domain events
      schemas.ts          # Zod schemas for all events
    channels/
      index.ts            # Channel exports
      naming.ts           # getChannelName(), getModuleFromEventType()
    outbox/
      index.ts            # Outbox helper exports
      create.ts           # createOutboxEvent()
  __tests__/
    events.test.ts        # Event schema tests
    channels.test.ts      # Channel naming tests
  package.json
  tsconfig.json
  vitest.config.ts
```

### 2.2 Component: Publisher Endpoint (Refinement)

- **Purpose**: Poll outbox, publish to Ably, update status
- **Location**: `apps/api/app/outbox/publish/route.ts` (exists)
- **Dependencies**: `@repo/realtime`, `@repo/database`, `ably`
- **Constitution**: [C2.1] Ably is sole realtime transport

**Changes Required:**
- Add `$queryRaw` SELECT FOR UPDATE SKIP LOCKED
- Include envelope fields (`id`, `version`, `occurredAt`) in Ably message
- Add payload size validation (32 KiB warning, 64 KiB reject)
- Log stale event metrics for monitoring

## 3. Data Model

### 3.1 Entities

#### Entity: OutboxEvent (Existing)
```typescript
// From Prisma schema - no changes required
interface OutboxEvent {
  id: string;           // cuid, used for deduplication
  tenantId: string;
  eventType: string;    // e.g., "kitchen.task.claimed"
  payload: Json;        // Domain-specific payload
  status: OutboxStatus; // pending | published | failed
  error: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  aggregateId: string;
  aggregateType: string;
}

enum OutboxStatus {
  pending
  published
  failed
}
```

#### Entity: RealtimeEvent (New - TypeScript only)
```typescript
interface RealtimeEventBase {
  id: string;           // Mirrors OutboxEvent.id
  version: 1;           // Schema version
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;   // ISO 8601
  eventType: string;    // Discriminator
}

// Discriminated union
type RealtimeEvent =
  | KitchenTaskClaimedEvent
  | KitchenTaskReleasedEvent
  | KitchenTaskProgressEvent;
```

**Relationships:**
- OutboxEvent.id === RealtimeEvent.id (1:1 mapping)
- OutboxEvent.payload contains domain-specific data

**Constraints:**
- `occurredAt` set by producer (not DB default)
- `payload` must validate against Zod schema for eventType
- `payload` size <= 32 KiB (warn), <= 64 KiB (reject)

### 3.2 State Management

Outbox status follows one-way transitions:
```
pending --> published (on success)
        --> failed (on error)
```
No recovery path from failed to pending in Phase 1.

## 4. API Design

### 4.1 Endpoints

#### `POST /api/outbox/publish` (Existing - Refined)

- **Purpose**: Publish pending outbox events to Ably
- **Auth**: Bearer token (OUTBOX_PUBLISH_TOKEN env var)
- **Request**:
  ```json
  {
    "limit": 100
  }
  ```
- **Response** (200):
  ```json
  {
    "published": 5,
    "failed": 1,
    "skipped": 0,
    "oldestPendingSeconds": 2.5
  }
  ```
- **Errors**: 401 (Unauthorized), 500 (Internal error)
- **Maps to**: US1, AC-1.1 through AC-1.6

**Ably Message Format:**
```json
{
  "id": "clxyz123...",
  "version": 1,
  "tenantId": "tenant-abc",
  "aggregateType": "KitchenTask",
  "aggregateId": "task-123",
  "occurredAt": "2026-01-23T10:30:00.000Z",
  "eventType": "kitchen.task.claimed",
  "payload": {
    "taskId": "task-123",
    "employeeId": "emp-456",
    "claimedAt": "2026-01-23T10:30:00.000Z"
  }
}
```

### 4.2 Error Responses

Standard error captured in `OutboxEvent.error`:
```typescript
type PublishError = {
  code: "ABLY_ERROR" | "VALIDATION_ERROR" | "PAYLOAD_TOO_LARGE";
  message: string;
  ablyErrorCode?: number;
}
```

## 5. Integration Points

### 5.1 Internal Integrations

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| `@repo/database` | Direct import | Prisma client for outbox queries |
| `@repo/realtime` | Direct import | Event types, schemas, helpers |
| Kitchen API routes | Function call | `createOutboxEvent()` in transactions |

### 5.2 External Integrations

| Service | Integration Type | Auth Method |
|---------|-----------------|-------------|
| Ably | REST SDK | API Key (env: ABLY_API_KEY) |
| Neon Postgres | Prisma adapter | Connection string (env: DATABASE_URL) |

## 6. Security Considerations

### 6.1 Authentication

- Publisher endpoint: Bearer token (machine-to-machine)
- Ably client auth: Clerk session + token request endpoint

### 6.2 Authorization

- Publisher: Single token, no tenant scoping (publishes for all tenants)
- Ably channels: Capabilities restrict subscribe to `tenant:{tenantId}` per user

### 6.3 Data Protection

- No PII in event payloads (IDs only)
- Ably messages not encrypted (use TLS in transit)
- OUTBOX_PUBLISH_TOKEN: >= 32 chars recommended

## 7. Performance

### 7.1 Targets

| Metric | Target | Source |
|--------|--------|--------|
| Publish latency | < 5 seconds | Spec 1.3 |
| Batch size | 100 events/request | Default |
| Payload size | <= 32 KiB | Spec 8.1 |

### 7.2 Optimization Strategy

- **Batching**: Process up to 100 events per invocation
- **SKIP LOCKED**: Prevents concurrent publisher contention
- **Index**: `(status, createdAt)` for efficient pending query
- **Connection reuse**: Single Ably.Rest instance per request

## 8. Testing Strategy

### 8.1 Unit Tests

| Component | Test Approach |
|-----------|---------------|
| Event schemas | Zod parse valid/invalid payloads |
| Channel naming | `getChannelName()` format verification |
| Event envelope | Type discriminator narrowing |
| `createOutboxEvent()` | Mock Prisma, verify input shape |

### 8.2 Integration Tests

| Integration Point | Test Approach |
|-------------------|---------------|
| Outbox insert | Real DB, verify status=pending |
| Publisher endpoint | Mock Ably, real DB, verify status transitions |

### 8.3 E2E Tests

| User Flow | Test Approach |
|-----------|---------------|
| Task claim -> Ably message | Full stack with Ably sandbox |

## 9. Implementation Notes

### 9.1 POC Shortcuts

- Single-publisher model acceptable (SKIP LOCKED optional for Phase 1)
- Manual cron trigger acceptable (no automated scheduler)
- No retry logic beyond single attempt
- No dead letter queue

### 9.2 Technical Debt

| Debt | Future Fix | Tracking |
|------|------------|----------|
| No exponential backoff | Phase 2 retry logic | Spec 4.3 |
| No dead letter queue | Phase 2 | Spec 4.3 |
| Client-side filtering | Phase 2 module channels | Spec 8.2 |
| No event archival | Separate cleanup job | Spec 4.3 |

### 9.3 Dependencies to Install

```bash
# packages/realtime
pnpm add zod --filter @repo/realtime
pnpm add vitest --filter @repo/realtime -D
pnpm add @repo/typescript-config --filter @repo/realtime -D

# No new deps for apps/api (ably, zod already installed)
```

## 10. Implementation Tasks

### Task Dependency Graph

```
T1: Package scaffold
     |
     v
T2: Event types ----+
     |              |
     v              v
T3: Zod schemas    T4: Channel naming
     |              |
     +------+-------+
            |
            v
T5: createOutboxEvent()
     |
     v
T6: Publisher refinement
     |
     v
T7: Unit tests
     |
     v
T8: Integration tests
```

### Task Details

#### T1: Create packages/realtime scaffold
**Effort**: 15 min
**Dependencies**: None
**Files**:
- `packages/realtime/package.json`
- `packages/realtime/tsconfig.json`
- `packages/realtime/vitest.config.ts`
- `packages/realtime/src/index.ts`

```json
{
  "name": "@repo/realtime",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "clean": "git clean -xdf .cache .turbo dist node_modules",
    "typecheck": "tsc --noEmit --emitDeclarationOnly false",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "vitest": "^4.0.15"
  },
  "peerDependencies": {
    "@repo/database": "workspace:*"
  },
  "peerDependenciesMeta": {
    "@repo/database": { "optional": true }
  }
}
```

#### T2: Define event envelope and kitchen event types
**Effort**: 30 min
**Dependencies**: T1
**Files**:
- `packages/realtime/src/events/envelope.ts`
- `packages/realtime/src/events/kitchen.ts`
- `packages/realtime/src/events/index.ts`

```typescript
// envelope.ts
export const REALTIME_EVENT_VERSION = 1 as const;

export interface RealtimeEventBase {
  id: string;
  version: typeof REALTIME_EVENT_VERSION;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string; // ISO 8601
}

// kitchen.ts
export interface KitchenTaskClaimedEvent extends RealtimeEventBase {
  eventType: "kitchen.task.claimed";
  payload: {
    taskId: string;
    employeeId: string;
    claimedAt: string;
  };
}

export interface KitchenTaskReleasedEvent extends RealtimeEventBase {
  eventType: "kitchen.task.released";
  payload: {
    taskId: string;
    employeeId: string;
    releasedAt: string;
  };
}

export interface KitchenTaskProgressEvent extends RealtimeEventBase {
  eventType: "kitchen.task.progress";
  payload: {
    taskId: string;
    employeeId: string;
    progressPercent: number;
    updatedAt: string;
  };
}

export type KitchenEvent =
  | KitchenTaskClaimedEvent
  | KitchenTaskReleasedEvent
  | KitchenTaskProgressEvent;
```

#### T3: Create Zod schemas for validation
**Effort**: 30 min
**Dependencies**: T2
**Files**:
- `packages/realtime/src/events/schemas.ts`

```typescript
import { z } from "zod";

export const RealtimeEventBaseSchema = z.object({
  id: z.string().min(1),
  version: z.literal(1),
  tenantId: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  occurredAt: z.string().datetime(),
});

export const KitchenTaskClaimedPayloadSchema = z.object({
  taskId: z.string().min(1),
  employeeId: z.string().min(1),
  claimedAt: z.string().datetime(),
});

export const KitchenTaskClaimedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("kitchen.task.claimed"),
  payload: KitchenTaskClaimedPayloadSchema,
});

// ... similar for released and progress

export const RealtimeEventSchema = z.discriminatedUnion("eventType", [
  KitchenTaskClaimedEventSchema,
  KitchenTaskReleasedEventSchema,
  KitchenTaskProgressEventSchema,
]);

export function parseRealtimeEvent(data: unknown) {
  return RealtimeEventSchema.safeParse(data);
}
```

#### T4: Implement channel naming utilities
**Effort**: 15 min
**Dependencies**: T1
**Files**:
- `packages/realtime/src/channels/naming.ts`
- `packages/realtime/src/channels/index.ts`

```typescript
// naming.ts
export function getChannelName(tenantId: string): string {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return `tenant:${tenantId}`;
}

export function getModuleFromEventType(eventType: string): string {
  const parts = eventType.split(".");
  if (parts.length < 2) {
    throw new Error(`Invalid eventType format: ${eventType}`);
  }
  return parts[0];
}

export function parseChannelName(channel: string): { tenantId: string } | null {
  const match = channel.match(/^tenant:(.+)$/);
  return match ? { tenantId: match[1] } : null;
}
```

#### T5: Implement createOutboxEvent helper
**Effort**: 30 min
**Dependencies**: T2, T3
**Files**:
- `packages/realtime/src/outbox/create.ts`
- `packages/realtime/src/outbox/index.ts`

```typescript
// create.ts
import type { PrismaClient, Prisma } from "@prisma/client";
import type { RealtimeEvent } from "../events";

export type CreateOutboxEventInput = {
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt?: Date;
};

export async function createOutboxEvent(
  db: PrismaClient | Prisma.TransactionClient,
  input: CreateOutboxEventInput
) {
  const occurredAt = input.occurredAt ?? new Date();

  return db.outboxEvent.create({
    data: {
      tenantId: input.tenantId,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: {
        ...input.payload,
        occurredAt: occurredAt.toISOString(),
      },
      status: "pending",
    },
  });
}
```

#### T6: Refine publisher endpoint
**Effort**: 1 hour
**Dependencies**: T2, T3, T4, T5
**Files**:
- `apps/api/app/outbox/publish/route.ts` (modify)

**Changes**:
1. Add SKIP LOCKED query with `$queryRaw`
2. Include envelope fields in Ably message
3. Add payload size validation
4. Add `oldestPendingSeconds` to response
5. Import types from `@repo/realtime`

```typescript
// Key addition: SKIP LOCKED query
const pendingEvents = await database.$queryRaw<OutboxEvent[]>`
  SELECT * FROM "OutboxEvent"
  WHERE status = 'pending'
  ORDER BY "createdAt" ASC
  LIMIT ${limit}
  FOR UPDATE SKIP LOCKED
`;

// Key addition: Full envelope in publish
const message: RealtimeEvent = {
  id: event.id,
  version: 1,
  tenantId: event.tenantId,
  aggregateType: event.aggregateType,
  aggregateId: event.aggregateId,
  occurredAt: (event.payload as any).occurredAt ?? event.createdAt.toISOString(),
  eventType: event.eventType,
  payload: event.payload,
};

await channel.publish(event.eventType, message);
```

#### T7: Write unit tests
**Effort**: 45 min
**Dependencies**: T2, T3, T4
**Files**:
- `packages/realtime/__tests__/events.test.ts`
- `packages/realtime/__tests__/channels.test.ts`

```typescript
// events.test.ts
import { describe, it, expect } from "vitest";
import { parseRealtimeEvent, KitchenTaskClaimedEventSchema } from "../src/events";

describe("KitchenTaskClaimedEventSchema", () => {
  it("validates correct payload", () => {
    const event = {
      id: "clxyz123",
      version: 1,
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-123",
      occurredAt: "2026-01-23T10:30:00.000Z",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        claimedAt: "2026-01-23T10:30:00.000Z",
      },
    };

    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects invalid version", () => {
    const event = { ...validEvent, version: 2 };
    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

// channels.test.ts
import { describe, it, expect } from "vitest";
import { getChannelName, getModuleFromEventType } from "../src/channels";

describe("getChannelName", () => {
  it("formats tenant channel correctly", () => {
    expect(getChannelName("abc-123")).toBe("tenant:abc-123");
  });

  it("throws on empty tenantId", () => {
    expect(() => getChannelName("")).toThrow();
  });
});

describe("getModuleFromEventType", () => {
  it("extracts module from eventType", () => {
    expect(getModuleFromEventType("kitchen.task.claimed")).toBe("kitchen");
  });
});
```

#### T8: Write integration tests
**Effort**: 1 hour
**Dependencies**: T6, T7
**Files**:
- `apps/api/__tests__/outbox-publish.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { database } from "@repo/database";

describe("POST /api/outbox/publish", () => {
  beforeEach(async () => {
    await database.outboxEvent.deleteMany({});
  });

  it("publishes pending events and updates status", async () => {
    // Create pending event
    await database.outboxEvent.create({
      data: {
        tenantId: "tenant-abc",
        eventType: "kitchen.task.claimed",
        aggregateType: "KitchenTask",
        aggregateId: "task-123",
        payload: {
          taskId: "task-123",
          employeeId: "emp-456",
          claimedAt: new Date().toISOString(),
          occurredAt: new Date().toISOString(),
        },
        status: "pending",
      },
    });

    // Call endpoint (with mocked Ably)
    const response = await fetch("/api/outbox/publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OUTBOX_PUBLISH_TOKEN}`,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.published).toBe(1);
    expect(body.failed).toBe(0);

    // Verify status updated
    const event = await database.outboxEvent.findFirst();
    expect(event?.status).toBe("published");
    expect(event?.publishedAt).not.toBeNull();
  });
});
```

## 11. Build Sequence

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 1. Foundation | T1 (scaffold) | 15 min |
| 2. Types | T2 (events), T4 (channels) | 45 min |
| 3. Schemas | T3 (Zod) | 30 min |
| 4. Helpers | T5 (createOutboxEvent) | 30 min |
| 5. Publisher | T6 (refine endpoint) | 1 hour |
| 6. Testing | T7 (unit), T8 (integration) | 1.75 hours |

**Total Estimated**: ~5 hours

## 12. Open Questions

- [ ] Should `createOutboxEvent` be a server-only export? (Recommend: yes)
- [ ] Add OpenTelemetry tracing spans in Phase 1? (Recommend: defer)

## Appendix A: File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/realtime/package.json` | Create | Package manifest |
| `packages/realtime/tsconfig.json` | Create | TypeScript config |
| `packages/realtime/vitest.config.ts` | Create | Test config |
| `packages/realtime/src/index.ts` | Create | Public exports |
| `packages/realtime/src/events/envelope.ts` | Create | Base event types |
| `packages/realtime/src/events/kitchen.ts` | Create | Kitchen event types |
| `packages/realtime/src/events/schemas.ts` | Create | Zod validation |
| `packages/realtime/src/events/index.ts` | Create | Event exports |
| `packages/realtime/src/channels/naming.ts` | Create | Channel utilities |
| `packages/realtime/src/channels/index.ts` | Create | Channel exports |
| `packages/realtime/src/outbox/create.ts` | Create | createOutboxEvent() |
| `packages/realtime/src/outbox/index.ts` | Create | Outbox exports |
| `packages/realtime/__tests__/events.test.ts` | Create | Event tests |
| `packages/realtime/__tests__/channels.test.ts` | Create | Channel tests |
| `apps/api/app/outbox/publish/route.ts` | Modify | Refine publisher |
| `apps/api/__tests__/outbox-publish.test.ts` | Create | Integration tests |

## Appendix B: Verification Checklist

Before marking complete:
- [ ] `pnpm check` passes
- [ ] `pnpm test --filter @repo/realtime` passes
- [ ] `pnpm typecheck` passes in `packages/realtime`
- [ ] Publisher endpoint returns `{ published: N, failed: M }`
- [ ] Published events have full envelope in Ably message
- [ ] README.md documents channel naming convention
