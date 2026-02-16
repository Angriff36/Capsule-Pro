# KitchenTaskPriority

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T032)
> **Verification status**: ✅ Verified

## Overview

Defines the priority levels for kitchen tasks, enabling staff to identify which tasks require immediate attention and which can be deferred.

**Business Context**: Kitchen operations require prioritization to manage competing demands efficiently during high-pressure service periods.

**Key Use Cases**:
- Sort task boards by priority to highlight urgent work
- Filter dashboard views to show only high/urgent tasks
- Calculate priority-based completion metrics
- Trigger alerts for overdue urgent tasks

**Lifecycle**: Static (enum values are immutable once deployed)

## Schema Reference

```prisma
enum KitchenTaskPriority {
  low
  medium
  high
  urgent

  @@schema("core")
}
```

**PostgreSQL Type**: `core.kitchen_task_priority`
**Database Location**: `core` schema (shared across all tenants)
**Mutability**: Immutable (adding values requires migration)

## Values

| Value | Description | When to Use | Business Impact |
|-------|-------------|-------------|-----------------|
| `low` | Low priority tasks that can be deferred | Prep work for future days, organizational tasks | Delayed with minimal impact |
| `medium` | Standard priority for regular tasks | Daily prep, routine cleaning, standard recipes | Expected completion within normal shift |
| `high` | Important tasks requiring attention | Time-sensitive prep, VIP events, complex recipes | Delays impact service quality |
| `urgent` | Critical tasks requiring immediate action | Emergency repairs, immediate service needs, safety issues | Delays cause service failures |

## Business Rules

1. **Default Priority**: New tasks default to `medium` unless explicitly set
2. **Priority Escalation**: Tasks can be escalated from low → medium → high → urgent
3. **Filtering**: Dashboard views prioritize showing high/urgent tasks first
4. **Completion Metrics**: Track urgent task completion rate as KPI

## Usage in KitchenTask Model

```typescript
import { KitchenTask, KitchenTaskPriority } from '@repo/database/generated'

// Create urgent task
const urgentTask = await database.kitchenTask.create({
  data: {
    tenantId,
    title: "Repair broken oven",
    priority: KitchenTaskPriority.urgent,
    status: KitchenTaskStatus.open,
    // ... other fields
  }
})

// Query high-priority open tasks
const highPriorityTasks = await database.kitchenTask.findMany({
  where: {
    tenantId,
    status: KitchenTaskStatus.open,
    priority: {
      in: [KitchenTaskPriority.high, KitchenTaskPriority.urgent]
    }
  },
  orderBy: [
    { priority: 'desc' }, // urgent first
    { createdAt: 'asc' }  // oldest first within priority
  ]
})
```

## Priority Ordering

For sorting and display purposes, the priority order is:

1. `urgent` - Highest
2. `high`
3. `medium`
4. `low` - Lowest

## Related Enums

- **[KitchenTaskStatus](./KitchenTaskStatus.md)** - Task completion status
- **[ActionType](./ActionType.md)** - Audit action types

## See Also

- Table: [`KitchenTask`](../tables/tenant_kitchen/KitchenTask.md)
- Schema: [`tenant_kitchen`](../schemas/07-tenant_kitchen.md)
- Schema: [`core`](../schemas/01-core.md)
