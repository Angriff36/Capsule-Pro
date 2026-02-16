---
title: Event
schema: tenant_events
table: events
description: Core event record for catering operations including weddings, corporate events, and other catering engagements.
---

# Event Table

## Overview

The `Event` table is the central entity for managing catering events within the tenant_events schema. Each event represents a catering engagement with associated clients, venues, budgets, staff assignments, and operational details.

## Schema

- **Schema:** `tenant_events`
- **Table:** `events`
- **Primary Key:** Composite `(tenant_id, id)`
- **Unique Constraint:** `(tenant_id, id)`

## Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `tenant_id` | `uuid` | `NOT NULL` | - | Foreign key to Account (tenant) |
| `id` | `uuid` | `NOT NULL` | `gen_random_uuid()` | Primary key |
| `event_number` | `varchar` | `YES` | - | Optional human-readable event identifier |
| `title` | `varchar` | `NOT NULL` | `'Untitled Event'` | Event display name |
| `client_id` | `uuid` | `YES` | - | Foreign key to Client |
| `location_id` | `uuid` | `YES` | - | **DEPRECATED:** Use `venue_id` instead |
| `event_type` | `varchar` | `NOT NULL` | - | Type of event (e.g., 'wedding', 'corporate', 'catering') |
| `event_date` | `date` | `NOT NULL` | - | Date of the event |
| `guest_count` | `int` | `NOT NULL` | `1` | Expected number of guests |
| `status` | `varchar` | `NOT NULL` | `'confirmed'` | Event status (see Business Rules) |
| `budget` | `decimal(12,2)` | `YES` | - | Total budget amount |
| `assigned_to` | `uuid` | `YES` | - | User ID of primary assignee |
| `venue_name` | `varchar` | `YES` | - | Free-text venue name (when not using Location) |
| `venue_address` | `varchar` | `YES` | - | Free-text venue address |
| `notes` | `text` | `YES` | - | Additional notes and requirements |
| `tags` | `text[]` | `NOT NULL` | - | Array of searchable tags |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | `NOT NULL` | `now()` | Last update timestamp |
| `deleted_at` | `timestamptz` | `YES` | - | Soft delete timestamp |
| `venue_id` | `uuid` | `YES` | - | Foreign key to Location (preferred venue reference) |

## Critical Notes

### venue_id vs location_id Confusion

⚠️ **IMPORTANT:** The table has THREE venue-related columns:

1. **`location_id`** (uuid, nullable) - DEPRECATED, legacy field
   - Points to `Location` table via `EventLocation` relation
   - **Should not be used for new code**

2. **`venue_id`** (uuid, nullable) - **PREFERRED**
   - Points to `Location` table via `LocationVenue` relation
   - Use this for referencing venue locations
   - Has index: `idx_events_venue_id`

3. **`venue_name` + `venue_address`** (varchar, nullable) - FREE TEXT
   - Use for ad-hoc venues not in the Location table
   - Allows quick event creation without venue setup

**Recommendation:** Use `venue_id` when referencing Location entities, or `venue_name`/`venue_address` for one-off venues.

## Relations

### Outbound Relations

| Relation | Target Table | On Delete | Description |
|----------|-------------|-----------|-------------|
| `tenant` | `Account` (public schema) | `RESTRICT` | Tenant/account ownership |
| `client` | `Client` (tenant schema) | `SET NULL` | Associated client |
| `location` | `Location` (tenant schema) | `SET NULL` | **DEPRECATED** - Use venue relation |
| `venue` | `Location` (tenant schema) | `SET NULL` | **PREFERRED** - Venue location |
| `assigned_to` | `User` (public schema) | - | Primary event assignee |

### Inbound Relations

| Source Table | Relation Name | Description |
|-------------|---------------|-------------|
| `EventBudget` | `event` | Budget versions for event |
| `EventReport` | `event` | Post-event reports |
| `WasteEntry` | `event` | Waste tracking entries |
| `Shipment` | `event` | Related shipments |
| `Proposal` | `event` | Event proposals |
| `EventContract` | `event` | Signed contracts |
| `BattleBoard` | - (via `event_id`) | Operational battle boards |
| `CommandBoard` | - (via `event_id`) | Command boards |
| `EventGuest` | - (via `event_id`) | Event guests |
| `EventStaffAssignment` | - (via `event_id`) | Staff assignments |
| `EventTimeline` | - (via `event_id`) | Timeline entries |
| `EventImport` | - (via `event_id`) | Import records |

## Business Rules

### Status Flow

Events progress through these statuses:

```
pending -> confirmed -> in_progress -> completed
                ↓
              canceled
```

**Valid Status Values:**
- `pending` - Initial state, under consideration
- `confirmed` - Contract signed, date confirmed
- `in_progress` - Event day, execution phase
- `completed` - Event finished, finalizing
- `canceled` - Event canceled (may still have costs)

### Client Requirement

- `client_id` is **nullable** but **strongly recommended** for confirmed events
- Use `client_id` for CRM integration, billing, and analytics
- Temporary events may be created without client assignment

### Date Validation

- `event_date` must be a valid date (no time component)
- Events should not be created in the past without explicit override
- Date comparison should use date-only (ignore time zones)

### Guest Count Validation

- `guest_count` must be >= 1
- Used for budgeting, staffing, and logistics planning
- May be updated as event details finalize

### Budget Handling

- `budget` is optional (nullable)
- When set, represents total expected revenue
- May differ from sum of EventBudget line items during planning

### Tag Usage

Tags are used for:
- Categorization: `wedding`, `corporate`, `vip`
- Operational flags: `offsite`, `equipment-heavy`, `labor-intensive`
- Search and filtering across events

### Soft Deletes

- `deleted_at` timestamp indicates soft deletion
- Always filter: `WHERE deleted_at IS NULL` in queries
- Hard deletes only via administrative functions

## Common Queries

### Get Event with Client and Venue

```typescript
const event = await database.events.findFirst({
  where: {
    AND: [
      { tenant_id: tenantId },
      { id: eventId },
      { deleted_at: null }
    ]
  },
  include: {
    client: true,
    venue: true,
    budgets: {
      where: { deleted_at: null },
      orderBy: { version: 'desc' },
      take: 1
    }
  }
});
```

### List Upcoming Events

```typescript
const upcoming = await database.events.findMany({
  where: {
    AND: [
      { tenant_id: tenantId },
      { event_date: { gte: new Date() } },
      { deleted_at: null }
    ]
  },
  orderBy: { event_date: 'asc' },
  include: {
    client: true
  }
});
```

### Search Events by Tags

```typescript
const tagged = await database.events.findMany({
  where: {
    AND: [
      { tenant_id: tenantId },
      { deleted_at: null },
      { tags: { has: 'wedding' } }
    ]
  },
  orderBy: { event_date: 'desc' }
});
```

### Events by Date Range

```typescript
const ranged = await database.events.findMany({
  where: {
    AND: [
      { tenant_id: tenantId },
      { event_date: { gte: startDate, lte: endDate } },
      { deleted_at: null }
    ]
  },
  orderBy: [{ event_date: 'asc' }, { title: 'asc' }]
});
```

### Get Events with Battle Boards

```typescript
const withBoards = await database.events.findMany({
  where: {
    AND: [
      { tenant_id: tenantId },
      { deleted_at: null }
    ]
  },
  include: {
    battle_boards: {
      where: { deleted_at: null }
    }
  }
});
```

## Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `events_pkey` | `tenant_id, id` | PRIMARY | Primary key |
| `events_tenant_id_key` | `tenant_id, id` | UNIQUE | Unique constraint |
| `idx_events_venue_id` | `tenant_id, venue_id` | BTREE | Venue lookup queries |

## Migration TODOs

### Foreign Key to event_guests

⚠️ **TODO:** The `EventGuest` table (tenant_events schema) has an `event_id` field but **no foreign key constraint** to `Event.id`.

**Current State:**
```prisma
model EventGuest {
  eventId String @map("event_id") @db.Uuid
  // No @relation to Event
}
```

**Required Migration:**
```prisma
model EventGuest {
  eventId String @map("event_id") @db.Uuid
  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
}
```

**Impact:**
- Orphaned guest records possible
- No cascade delete when event deleted
- Manual cleanup required

### Additional Migrations

1. **Consider:** Add index on `(tenant_id, event_date)` for date range queries
2. **Consider:** Add index on `(tenant_id, client_id)` for client event listing
3. **Consider:** Add index on `(tenant_id, status)` for status filtering
4. **Consider:** Add GIN index on `tags` for tag search performance

## Type Definitions

### Prisma Generated Type

```typescript
type Event = {
  tenantId: string;
  id: string;
  eventNumber: string | null;
  title: string;
  clientId: string | null;
  locationId: string | null;  // DEPRECATED
  eventType: string;
  eventDate: Date;
  guestCount: number;
  status: string;
  budget: Prisma.Decimal | null;
  assignedTo: string | null;
  venueName: string | null;
  venueAddress: string | null;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  venueId: string | null;  // PREFERRED
};
```

## Related Documentation

- [Client Table](../tenant/Client.md) - Client management
- [Location Table](../tenant/Location.md) - Venue/location management
- [EventBudget](./EventBudget.md) - Budget tracking
- [EventReport](./EventReport.md) - Post-event reporting
- [BattleBoard](./BattleBoard.md) - Operational boards
- [EventGuest](./EventGuest.md) - Guest management

## Changes

- **2025-01-30:** Initial documentation created
- **TODO:** Add FK constraint to EventGuest.eventId
- **TODO:** Deprecate and remove `location_id` column
