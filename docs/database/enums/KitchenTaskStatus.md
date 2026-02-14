# KitchenTaskStatus

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T032)
> **Verification status**: ✅ Verified

## Overview

Defines the workflow status for kitchen tasks, tracking progression from creation through assignment, active work, and completion or cancellation.

**Business Context**: Kitchen operations require real-time visibility into task status to coordinate staff work and manage production timelines.

**Key Use Cases**:
- Track task progress on digital task boards
- Filter tasks by status (show only open tasks, in-progress tasks, etc.)
- Calculate completion metrics and productivity KPIs
- Trigger real-time updates to Ably for live dashboard views
- Prevent duplicate task claims (only one active claim per task)

**Lifecycle**: `open` → `in_progress` → `done` (or `canceled`)

## Schema Reference

```prisma
enum KitchenTaskStatus {
  open
  in_progress
  done
  canceled

  @@schema("core")
}
```

**PostgreSQL Type**: `core.kitchen_task_status`
**Database Location**: `core` schema (shared across all tenants)
**Mutability**: Immutable (adding values requires migration)

## Values

| Value | Description | When to Use | Business Rules |
|-------|-------------|-------------|----------------|
| `open` | Task is created and awaiting assignment | Initial state for all new tasks | Visible to all staff, claimable |
| `in_progress` | Task is actively being worked on | Staff member has claimed the task | Only one active claim allowed at a time |
| `done` | Task is completed | Work finished, verified if required | Immutable end state, stores completion timestamp |
| `canceled` | Task is canceled and will not be completed | No longer needed, duplicate, or impossible | Immutable end state, records cancellation reason |

## Status Flow

```
    ┌─────────────┐
    │    open     │  ← Initial state
    └──────┬──────┘
           │
           │ (staff claims task)
           ▼
    ┌─────────────┐
    │ in_progress │  ← Active work, one claim only
    └──────┬──────┘
           │
           │ (work completed)
           ▼
      ┌────┴────┐
      │         │
      ▼         ▼
  ┌───────┐ ┌──────────┐
  │ done  │ │ canceled │  ← End states (immutable)
  └───────┘ └──────────┘
```

## Business Rules

1. **State Transitions**:
   - `open` → `in_progress`: Requires task claim (creates `KitchenTaskClaim`)
   - `in_progress` → `done`: Requires claim completion or direct completion
   - `open` → `canceled`: Task no longer needed
   - `in_progress` → `canceled`: Work stopped, task abandoned

2. **Claims Management**:
   - Only `in_progress` tasks can have active claims
   - Canceling task releases any active claim
   - One active claim per task at a time

3. **Progress Tracking**:
   - `in_progress` tasks create `KitchenTaskProgress` records for status updates
   - Progress updates published to Ably for real-time dashboards

4. **Immutability**:
   - `done` and `canceled` are end states (no further transitions)
   - Reactivating canceled tasks requires creating new task

## Usage in KitchenTask Model

```typescript
import { KitchenTask, KitchenTaskStatus, KitchenTaskPriority } from '@repo/database/generated'

// Create new open task
const newTask = await database.kitchenTask.create({
  data: {
    tenantId,
    title: "Prepare tomato basil soup",
    priority: KitchenTaskPriority.medium,
    status: KitchenTaskStatus.open,
    dueAt: new Date('2025-01-30T10:00:00Z'),
    // ... other fields
  }
})

// Claim task (transitions to in_progress)
const claimedTask = await database.kitchenTask.update({
  where: { id: taskId },
  data: {
    status: KitchenTaskStatus.in_progress,
    claims: {
      create: {
        claimedBy: userId,
        claimedAt: new Date()
      }
    }
  }
})

// Complete task (transitions to done)
const completedTask = await database.kitchenTask.update({
  where: { id: taskId },
  data: {
    status: KitchenTaskStatus.done,
    completedAt: new Date()
  }
})

// Cancel task
const canceledTask = await database.kitchenTask.update({
  where: { id: taskId },
  data: {
    status: KitchenTaskStatus.canceled,
    canceledAt: new Date(),
    cancelReason: "Event cancelled"
  }
})
```

## Common Queries

### Get all open tasks by priority
```typescript
const openTasks = await database.kitchenTask.findMany({
  where: {
    tenantId,
    status: KitchenTaskStatus.open
  },
  orderBy: [
    { priority: 'desc' },
    { dueAt: 'asc' }
  ]
})
```

### Get user's in-progress tasks
```typescript
const myActiveTasks = await database.kitchenTask.findMany({
  where: {
    tenantId,
    status: KitchenTaskStatus.in_progress,
    claims: {
      some: {
        claimedBy: userId,
        releasedAt: null
      }
    }
  }
})
```

### Task completion rate (KPI)
```typescript
const totalTasks = await database.kitchenTask.count({
  where: {
    tenantId,
    createdAt: { gte: startOfDay }
  }
})

const completedTasks = await database.kitchenTask.count({
  where: {
    tenantId,
    status: KitchenTaskStatus.done,
    completedAt: { gte: startOfDay }
  }
})

const completionRate = (completedTasks / totalTasks) * 100
```

## Real-time Updates via Ably

Status changes trigger real-time updates:

```typescript
// When task status changes to in_progress
ably.channels.get(`tenant:${tenantId}:tasks`).publish({
  type: 'task.claimed',
  data: { taskId, userId, status: 'in_progress' }
})

// When task completed
ably.channels.get(`tenant:${tenantId}:tasks`).publish({
  type: 'task.completed',
  data: { taskId, userId, completedAt }
})
```

## Related Enums

- **[KitchenTaskPriority](./KitchenTaskPriority.md)** - Task priority levels
- **[ActionType](./ActionType.md)** - Audit action types

## Related Tables

- **[KitchenTask](../tables/tenant_kitchen/KitchenTask.md)** - Main task model
- **[KitchenTaskClaim](../tables/tenant_kitchen/KitchenTaskClaim.md)** - Task claims by staff
- **[KitchenTaskProgress](../tables/tenant_kitchen/KitchenTaskProgress.md)** - Progress updates

## See Also

- Schema: [`tenant_kitchen`](../schemas/07-tenant_kitchen.md)
- Schema: [`core`](../schemas/01-core.md)
