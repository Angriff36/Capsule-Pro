# @repo/realtime

Realtime event transport using the outbox pattern + Ably.

## Overview

This package provides type-safe event definitions, Zod validation schemas, and helper functions for publishing domain events to Ably channels via the transactional outbox pattern.

## Installation

```bash
pnpm add @repo/realtime
```

## Usage

### Creating Outbox Events

```ts
import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";

await database.$transaction(async (tx) => {
  // Update domain model
  await tx.kitchenTask.update({
    where: { id: "task-123" },
    data: { claimedBy: "emp-456" },
  });

  // Create outbox event in same transaction
  await createOutboxEvent(tx, {
    tenantId: "tenant-abc",
    aggregateType: "KitchenTask",
    aggregateId: "task-123",
    eventType: "kitchen.task.claimed",
    payload: {
      taskId: "task-123",
      employeeId: "emp-456",
      claimedAt: new Date().toISOString(),
    },
  });
});
```

### Channel Naming

```ts
import { getChannelName, getModuleFromEventType } from "@repo/realtime";

const channel = getChannelName("tenant-abc"); // "tenant:tenant-abc"
const module = getModuleFromEventType("kitchen.task.claimed"); // "kitchen"
```

### Event Validation

```ts
import { parseRealtimeEvent } from "@repo/realtime";

const result = parseRealtimeEvent(unknownData);
if (result.success) {
  console.log("Valid event:", result.data);
} else {
  console.error("Invalid event:", result.error);
}
```

## POC Validation

### 1. Manual Test with curl

```bash
# Set your credentials
export OUTBOX_PUBLISH_TOKEN="your-test-token"

# Create a test outbox event via SQL/Prisma first, then:
curl -X POST http://localhost:2223/api/outbox/publish \
  -H "Authorization: Bearer $OUTBOX_PUBLISH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

### 2. Expected Response

```json
{
  "published": 1,
  "failed": 0,
  "skipped": 0,
  "oldestPendingSeconds": 0.5
}
```

### 3. Ably Message Format

Messages published to Ably include the full envelope:

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

## Event Types

### Kitchen Events

| Event Type | Description |
|-----------|-------------|
| `kitchen.task.claimed` | Task claimed by an employee |
| `kitchen.task.released` | Task released (unclaimed) |
| `kitchen.task.progress` | Task progress updated |

## Payload Size Limits

| Threshold | Action |
|-----------|--------|
| ≤ 32 KiB | Normal publish |
| > 32 KiB | Warning logged |
| > 64 KiB | Rejected with `PAYLOAD_TOO_LARGE` error |

## Channel Naming Convention

Phase 1 pattern: `tenant:{tenantId}`

All events for a tenant are published to a single channel. Consumers filter by `eventType` prefix for module-specific updates.

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│  Domain Service │ ──>│ OutboxEvent  │ ──>│   Publisher  │
│  (Kitchen)      │    │   (pending)  │    │   /api/outbox│
└─────────────────┘    └──────────────┘    └─────────────┘
                                                      │
                                                      v
                                               ┌─────────────┐
                                               │   Ably      │
                                               │   Channel   │
                                               └─────────────┘
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ABLY_API_KEY` | Ably REST API key |
| `OUTBOX_PUBLISH_TOKEN` | Bearer token for publisher endpoint |

## Implementation Status

- [x] Package scaffold
- [x] Event types and envelope
- [x] Channel naming utilities
- [x] Zod validation schemas
- [x] `createOutboxEvent` helper
- [x] Publisher endpoint with envelope
- [x] Payload size validation
- [x] `oldestPendingSeconds` monitoring metric
- [x] SKIP LOCKED for concurrent safety
- [ ] Unit tests (T015-T016)
- [ ] Integration tests (T017)
