# Feature Specification: Realtime Transport (Outbox to Ably)

Feature ID: 001
Status: Ready for Implementation
Constitution Version: 1.0.0
Open Questions: 0 (all resolved)

## 1. Overview

### 1.1 Goal
Establish foundational infrastructure for publishing domain events from the database outbox table to Ably channels, enabling real-time notifications across the platform without coupling to UI concerns.

### 1.2 Problem Statement
Business-critical operations (kitchen task claims, event updates, scheduling changes) require real-time propagation to multiple consumers. Direct publishing from application code creates coupling and lacks delivery guarantees. The outbox pattern decouples event production from delivery, ensuring at-least-once semantics.

### 1.3 Success Metrics
- Outbox events published to Ably within 5 seconds of creation under normal load
- No duplicate publishes from a single publisher run for the same outbox row (consumers must dedupe by event id)
- Failed events marked with error detail for debugging
- Kitchen task claim events successfully reach Ably channel

### 1.4 Delivery Semantics
This transport provides **at-least-once delivery**. Duplicates can occur if the publisher crashes after sending to Ably but before marking the row as published. Therefore:
- Publisher guarantees: no intentional re-publish of same outbox row within a single run
- Consumer requirement: must be idempotent by event `id`

## 2. Constitution Alignment

### 2.1 Relevant Principles
| Principle | Section | Alignment |
|-----------|---------|-----------|
| [MUST] Business-critical realtime uses outbox + Ably | C2.1 | Direct implementation of this requirement |
| [MUST] Supabase Realtime prohibited | C2.1 | Ably is sole realtime transport |
| [MUST] Use Prisma + Neon | C2.1 | OutboxEvent model uses Prisma, Neon hosts DB |
| [MUST] Tenant isolation at application layer | C2.1 | Channel naming includes tenantId |
| [SHOULD] Use Zod for runtime validation | C2.2 | Event payloads validated with Zod schemas |
| [SHOULD] Prioritize Kitchen > Events > Staff | C2.2 | Kitchen events have highest channel priority |

### 2.2 Technology Constraints
- Database: Prisma ORM with Neon PostgreSQL
- Realtime: Ably SDK (ably npm package)
- Language: TypeScript with strict typing
- Package location: `packages/realtime` (new package)
- Worker location: `apps/api/app/outbox/publish/route.ts` (exists, needs refinement)

## 3. User Stories

### US1: Publish Pending Outbox Events
**As a** system operator
**I want to** trigger publication of pending outbox events to Ably
**So that** subscribers receive domain events without manual intervention

**Acceptance Criteria:**
- AC-1.1: POST to `/api/outbox/publish` reads events with status=pending ordered by createdAt ASC
- AC-1.2: Each event publishes to channel `tenant:{tenantId}` with eventType as message name
- AC-1.3: Successfully published events update to status=published with publishedAt timestamp
- AC-1.4: Failed events update to status=failed with error message preserved
- AC-1.5: Endpoint requires Bearer token matching OUTBOX_PUBLISH_TOKEN env var
- AC-1.6: Response returns `{ published: N, failed: M }` count

### US2: Create Outbox Events from Domain Operations
**As a** domain service
**I want to** insert events into the outbox table when domain state changes
**So that** event publication is decoupled from the originating transaction

**Acceptance Criteria:**
- AC-2.1: `createOutboxEvent()` function accepts typed event envelope
- AC-2.2: Event envelope includes tenantId, aggregateType, aggregateId, eventType, payload
- AC-2.3: Events insert with status=pending and createdAt=now()
- AC-2.4: Function is importable from `@repo/realtime`
- AC-2.5: Function uses Prisma transaction if provided, standalone otherwise

### US3: Type-Safe Event Definitions
**As a** developer
**I want to** use typed event envelopes with discriminated unions
**So that** event payloads are validated at compile time and runtime

**Acceptance Criteria:**
- AC-3.1: `RealtimeEvent` type defines discriminated union by eventType
- AC-3.2: Kitchen events include: `kitchen.task.claimed`, `kitchen.task.released`, `kitchen.task.progress`
- AC-3.3: Each event type has corresponding payload schema (Zod)
- AC-3.4: `parseRealtimeEvent()` validates unknown payloads against schema
- AC-3.5: Type exports available from `@repo/realtime`

### US4: Channel Naming Convention
**As a** system architect
**I want to** enforce consistent channel naming
**So that** subscribers can predict channel names and apply security rules

**Acceptance Criteria:**
- AC-4.1: Phase 1 channel pattern: `tenant:{tenantId}` for all events (tenant-wide)
- AC-4.2: Module derivable from `eventType` prefix (e.g., `kitchen.task.claimed` → kitchen module)
- AC-4.3: `getChannelName(tenantId)` function generates channel name
- AC-4.4: Channel names documented in package README
- AC-4.5: (Phase 2) Module channel pattern: `tenant:{tenantId}:{module}` - deferred per §8.2

### US5: Idempotent Publishing
**As a** system operator
**I want to** prevent duplicate event publications
**So that** subscribers don't process the same event twice

**Acceptance Criteria:**
- AC-5.1: Events with status != pending are skipped by publisher
- AC-5.2: Published events cannot return to pending status
- AC-5.3: Worker acquires row-level lock before publishing (SELECT FOR UPDATE SKIP LOCKED pattern)

**Implementation Note (AC-5.3):** Prisma does not expose `SKIP LOCKED` in standard CRUD operations. Phase 1 options:
1. Use `prisma.$queryRaw` for the claim query (recommended for correctness)
2. Accept single-publisher model for Phase 1 (simpler, defer concurrency to Phase 2)

Decision required before implementation.

## 4. Scope

### 4.1 In Scope
- `packages/realtime` package with typed event definitions
- Event envelope schema with Zod validation
- Channel naming convention functions
- `createOutboxEvent()` helper for inserting events
- Refinement of existing `/api/outbox/publish` worker endpoint
- Kitchen task event types (claim, release, progress)
- Unit tests for event schemas and channel naming

### 4.2 Out of Scope
- React hooks for subscribing (Phase 2)
- UI components for real-time updates (Phase 2)
- Collaboration cursors/presence (separate feature)
- Retry logic beyond single attempt (Phase 2)
- Dead letter queue (Phase 2)
- Event replay/reprocessing (Phase 2)
- Events for modules other than Kitchen (added incrementally)
- Cron/scheduler for automatic polling (Phase 2)

### 4.3 Future Considerations
- Exponential backoff retry for failed events
- Dead letter queue for permanently failed events
- Event archival strategy (move published events after N days)
- Metrics/observability for publish latency
- Batch publishing optimization

## 5. Dependencies

### 5.1 Internal Dependencies
- `@repo/database`: Prisma client with OutboxEvent model (exists)
- `apps/api`: Host for publish endpoint (exists)

### 5.2 External Dependencies
- `ably`: Ably SDK for publishing (installed in apps/api)
- `zod`: Schema validation (installed project-wide)

## 6. Technical Design

### 6.1 Package Structure
```
packages/realtime/        # Ably outbox transport (this feature)
  src/
    index.ts              # Public exports
    events/
      index.ts            # Event type exports
      envelope.ts         # RealtimeEvent base types
      kitchen.ts          # Kitchen domain events
      schemas.ts          # Zod schemas for validation
    channels/
      index.ts            # Channel naming exports
      naming.ts           # getChannelName(), parseChannelName()
    outbox/
      index.ts            # Outbox helper exports
      create.ts           # createOutboxEvent()
  package.json
  tsconfig.json

packages/collaboration/   # UI presence/cursors (separate concern, NOT this feature)
  # Liveblocks or similar for cursor sync, typing indicators, etc.
  # This package exists but is NOT part of the outbox transport layer
```

**Package Separation:**
| Package | Responsibility | Transport |
|---------|----------------|-----------|
| `packages/realtime` | Domain event delivery (outbox → Ably) | Ably |
| `packages/collaboration` | UI presence, cursors, typing indicators | TBD (Liveblocks, etc.) |

These are distinct concerns. This spec covers only `packages/realtime`.

### 6.2 Event Envelope Type
```typescript
type RealtimeEventBase = {
  id: string;           // Unique event ID (mirrors OutboxEvent.id, used for consumer deduplication)
  version: 1;           // Schema version for evolution
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;   // ISO 8601 timestamp - authoritative ordering timestamp (when domain event occurred)
};

type KitchenTaskClaimedEvent = RealtimeEventBase & {
  eventType: "kitchen.task.claimed";
  payload: {
    taskId: string;
    employeeId: string;
    claimedAt: string;
  };
};

type RealtimeEvent =
  | KitchenTaskClaimedEvent
  | KitchenTaskReleasedEvent
  | KitchenTaskProgressEvent;
```

**Timestamp Clarification:**
| Field | Source | Purpose |
|-------|--------|---------|
| `occurredAt` | Set by producer when creating event | Authoritative ordering timestamp (when the domain event happened) |
| `createdAt` | DB auto-set on insert | When the outbox row was written (may differ slightly from occurredAt) |
| `publishedAt` | Set by publisher on success | When the event was delivered to Ably |

Consumers should use `occurredAt` for ordering and `id` for deduplication.

### 6.3 Channel Naming
```typescript
// Phase 1: tenant-wide channel only
function getChannelName(tenantId: string): string {
  return `tenant:${tenantId}`;
}

// Helper: derive module from eventType (for client-side filtering)
function getModuleFromEventType(eventType: string): string {
  return eventType.split('.')[0]; // "kitchen.task.claimed" → "kitchen"
}

// Phase 2 (deferred): module-specific channels
// getChannelName(tenantId, "kitchen") => `tenant:${tenantId}:kitchen`
```

### 6.4 Database Model (Existing)
```prisma
model OutboxEvent {
  id            String       @id @default(cuid())
  tenantId      String
  eventType     String
  payload       Json
  status        OutboxStatus @default(pending)
  error         String?
  createdAt     DateTime     @default(now())
  publishedAt   DateTime?
  aggregateId   String
  aggregateType String

  @@index([status, createdAt])
  @@index([tenantId])
  @@index([aggregateType, aggregateId])
  @@schema("public")
}

enum OutboxStatus {
  pending
  published
  failed
  @@schema("public")
}
```

## 7. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Ably rate limits under high load | Med | Low | Batch publishing, monitor usage |
| Event schema drift between producer/consumer | High | Med | Zod schemas shared via package |
| Orphaned pending events on publisher failure | Med | Med | Monitoring alert on stale events |
| Channel security bypass | High | Low | Ably capability restrictions per token |

## 8. Open Questions

- [x] Should events include version number for schema evolution? (Decision: Yes, add `version: 1` to envelope)
- [x] Should events include unique ID for consumer deduplication? (Decision: Yes, add `id` mirroring OutboxEvent.id)
- [x] Which timestamp is authoritative for ordering? (Decision: `occurredAt` - set by producer when domain event occurs)
- [x] Prisma SKIP LOCKED support? (Decision: Use `$queryRaw` or accept single-publisher for Phase 1 - see AC-5.3 note)
- [x] What is the maximum payload size before requiring external storage? (Decision: See §8.1)
- [x] Should module-specific channels be implemented in Phase 1 or deferred? (Decision: Deferred - see §8.2)
- [x] What monitoring/alerting threshold for stale pending events? (Decision: See §8.3)

### 8.1 Payload Size Limits

**Constraints:**
- Ably enforces 64 KiB (some plans) to 256 KiB max message size
- Ably REST SDK default: 65,536 bytes unless configured higher
- Postgres JSONB: TOAST storage kicks in ~2 KB, performance degrades with large values

**Decision:**
| Threshold | Action |
|-----------|--------|
| ≤32 KiB | Normal path - publish payload inline |
| >32 KiB | Warning - consider restructuring |
| >64 KiB | Externalize - store in DB/object storage, publish `{ payloadRef: "<url>" }` instead |

Phase 1: Cap event payload at ≤32 KiB (recommended). Hard reject if estimated serialized message exceeds Ably plan limit.

### 8.2 Module-Specific Channels

**Decision: Defer to Phase 2**

Phase 1 ships tenant-wide channel only:
- Publish everything to `tenant:{tenantId}`
- Include module derivable from `eventType` (e.g., `kitchen.task.claimed` → kitchen)
- Consumers filter client-side by `eventType` prefix

Phase 2 adds module channels once traffic patterns and auth rules are validated:
- `tenant:{tenantId}:kitchen` for high-volume kitchen events
- Existing tenant-wide consumers continue working

**Rationale:** Introducing multiple channel topologies early multiplies auth/token capability rules, subscription surfaces, and debugging paths.

### 8.3 Monitoring Thresholds (SLO-Based)

**SLO Reference:** "Published within 5 seconds under normal load" (§1.3)

**Metric:** `max(now - createdAt)` for events where `status = pending`

| Severity | Threshold | Meaning |
|----------|-----------|---------|
| Warning | >60 seconds | Publisher stuck, token broken, Ably down, or query failed |
| Critical | >5 minutes | "Realtime" has become "eventually maybe" - page on-call |

**Implementation:**
```sql
SELECT MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) as oldest_pending_seconds
FROM outbox_events
WHERE status = 'pending';
```

## 9. Verification Criteria

### 9.1 Integration Test Scenario
```gherkin
Given a KitchenTask exists with id "task-123" for tenant "tenant-abc"
When an employee claims the task
Then an OutboxEvent is created with:
  | id            | <generated-cuid>        |
  | tenantId      | tenant-abc              |
  | eventType     | kitchen.task.claimed    |
  | aggregateType | KitchenTask             |
  | aggregateId   | task-123                |
  | status        | pending                 |
And when POST /api/outbox/publish is called with valid Bearer token
Then the event status becomes "published"
And publishedAt is set to current timestamp
And an Ably message is sent to channel "tenant:tenant-abc" containing:
  | id            | <same-as-outbox-id>     |
  | version       | 1                       |
  | tenantId      | tenant-abc              |
  | eventType     | kitchen.task.claimed    |
  | occurredAt    | <iso-timestamp>         |
```

## Appendix

### A. Related Features
- 002 - Kitchen Real-time Hooks (consumes events from this transport)
- 003 - Event Board Updates (future consumer)

### B. References
- Ably SDK: https://ably.com/docs/api/rest-sdk
- Outbox Pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Constitution: `.specify/memory/constitution.md`

### C. Existing Code Assets
- Publisher endpoint: `apps/api/app/outbox/publish/route.ts`
- Ably auth endpoint: `apps/api/app/ably/auth/route.ts`
- OutboxEvent model: `packages/database/prisma/schema.prisma`
- Env configuration: `apps/api/env.ts` (ABLY_API_KEY, OUTBOX_PUBLISH_TOKEN)
