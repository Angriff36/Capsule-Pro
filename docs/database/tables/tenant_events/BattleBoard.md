---
title: "BattleBoard"
description: "Event battle board table for managing staff assignments, timelines, and venue layouts"
schema: "tenant_events"
table: "battle_boards"
version: "1.0.0"
last_updated: "2025-01-30"
tags: ["events", "battle-boards", "staffing", "timeline"]
---

# BattleBoard Table

**Table:** `tenant_events.battle_boards`
**Schema Version:** `mangia-battle-board@1`
**Primary Key:** Composite `(tenant_id, id)`

## Overview

Battle boards are event-specific operational plans that manage staff assignments, event timelines, and venue layouts. They serve as the central coordination document for catering event execution.

## Table Structure

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| `tenant_id` | UUID | - | NOT NULL | Tenant identifier (part of composite PK) |
| `id` | UUID | `gen_random_uuid()` | NOT NULL | Battle board unique identifier (part of composite PK) |
| `event_id` | UUID | - | YES | Associated event (foreign key to Event) |
| `board_name` | VARCHAR | - | NOT NULL | Human-readable board name |
| `board_type` | VARCHAR | `'event-specific'` | NOT NULL | Board type (event-specific, template, etc.) |
| `schema_version` | VARCHAR | `'mangia-battle-board@1'` | NOT NULL | JSON schema version identifier |
| `board_data` | JSON | `'{}'` | NOT NULL | Core board data (staff, timeline, layouts) |
| `document_url` | VARCHAR | - | YES | Source document URL (PDF/CSV) |
| `source_document_type` | VARCHAR | - | YES | Type of source document |
| `document_imported_at` | TIMESTAMPTZ | - | YES | When source document was imported |
| `status` | VARCHAR | `'draft'` | NOT NULL | Board status (draft, ready, published) |
| `is_template` | BOOLEAN | `false` | NOT NULL | Whether this board is a template |
| `description` | VARCHAR | - | YES | Board description |
| `notes` | VARCHAR | - | YES | Additional notes |
| `tags` | VARCHAR[] | - | NOT NULL | Searchable tags array |
| `created_at` | TIMESTAMPTZ | `now()` | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | `now()` | NOT NULL | Last update timestamp |
| `deleted_at` | TIMESTAMPTZ | - | YES | Soft delete timestamp |

## Indexes

### GIN Indexes for JSON Queries

```sql
-- Index for board_data JSON queries
CREATE INDEX idx_battle_boards_data_gin
ON tenant_events.battle_boards
USING GIN (board_data);

-- Index for tags array queries
CREATE INDEX idx_battle_boards_tags_gin
ON tenant_events.battle_boards
USING GIN (tags);
```

**Purpose:**
- `idx_battle_boards_data_gin`: Enables efficient JSON queries on `board_data` field
- `idx_battle_boards_tags_gin`: Enables efficient tag searches and overlaps

## JSON Field Structure (`board_data`)

The `board_data` column contains structured JSON with the following schema:

```typescript
interface BoardData {
  // Schema identification
  schema?: string;        // "mangia-battle-board@1"
  version?: string;       // "1.0.0"

  // Event metadata
  meta: {
    eventName: string;
    eventNumber: string;
    eventDate: string;    // ISO date string (YYYY-MM-DD)
    staffRestrooms: string;
    staffParking: string;
    lastUpdatedISO?: string;
  };

  // Staff assignments
  staff: StaffMember[];

  // Event timeline
  timeline: TimelineItem[];

  // Venue layouts
  layouts: Layout[];

  // Attachments (optional)
  attachments?: Attachment[];
}

interface StaffMember {
  name: string;
  role: string;
  shiftStart: string;     // Time string (e.g., "3:00 PM")
  shiftEnd: string;       // Time string (e.g., "11:00 PM")
  station: string;        // Assigned station/area
}

interface TimelineItem {
  time: string;           // Time string (e.g., "3:00 PM")
  item: string;           // Activity description
  team: string;           // Responsible team
  location: string;       // Location within venue
  style: string;          // Activity style (setup, service, breakdown, other)
  notes: string;          // Additional notes
  hl: boolean;            // Highlight flag for important items
}

interface Layout {
  type: string;                    // Layout type/name
  instructions: string;            // Setup instructions
  linkedMapImage?: string;         // Optional map image URL
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}
```

## Default Board Data Structure

When a new battle board is created without provided `board_data`, it defaults to:

```json
{
  "schema": "mangia-battle-board@1",
  "version": "1.0.0",
  "meta": {
    "eventName": "",
    "eventNumber": "",
    "eventDate": "",
    "staffRestrooms": "TBD",
    "staffParking": "TBD"
  },
  "staff": [],
  "layouts": [
    {
      "type": "Main Hall",
      "instructions": ""
    }
  ],
  "timeline": [],
  "attachments": []
}
```

## JSON Query Examples

### Querying Staff Assignments

```sql
-- Find boards with specific staff member
SELECT * FROM tenant_events.battle_boards
WHERE board_data @> '{"staff": [{"name": "John Doe"}]}';

-- Find boards with staff in specific role
SELECT * FROM tenant_events.battle_boards
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(board_data->'staff') AS staff
  WHERE staff->>'role' = 'Chef'
);
```

### Querying Timeline Items

```sql
-- Find boards with timeline items at specific time
SELECT * FROM tenant_events.battle_boards
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(board_data->'timeline') AS item
  WHERE item->>'time' = '3:00 PM'
);

-- Find boards with highlighted timeline items
SELECT * FROM tenant_events.battle_boards
WHERE board_data->'timeline' @> '[{"hl": true}]';
```

### Querying by Tags

```sql
-- Find boards with specific tags
SELECT * FROM tenant_events.battle_boards
WHERE tags @> ARRAY['wedding', 'outdoor'];

-- Find boards with any matching tags
SELECT * FROM tenant_events.battle_boards
WHERE tags && ARRAY['corporate', 'wedding'];
```

### Querying by Status

```sql
-- Find all published boards
SELECT * FROM tenant_events.battle_boards
WHERE status = 'published'
AND deleted_at IS NULL;
```

## Relationships

### Foreign Keys

- `tenant_id` → `public.Account(id)` (RESTRICT)
- `event_id` → `tenant_events.Event(id)` (logical reference, not enforced)

### Related Tables

- **Event**: Each battle board can be linked to one event
- **Account**: Tenant account that owns the board

## Business Logic

### Status Workflow

```
draft → ready → published
   ↓                   (draft/ready → published)
   └──→ archived
```

- **draft**: Initial state, editable
- **ready**: Ready for review, limited edits
- **published**: Finalized, distributed to staff
- **archived**: Event completed, read-only

### Board Types

- **event-specific**: Created for a specific event
- **template**: Reusable board templates
- **custom**: Custom boards not tied to events

### Auto-Creation

Battle boards are automatically created when:
1. An event is created (if enabled)
2. A TPP PDF is imported and parsed
3. A CSV is uploaded with board data

## Usage Patterns

### Creating a Battle Board

```typescript
const board = await database.battleBoard.create({
  data: {
    tenantId,
    eventId: event.id,
    board_name: `${event.title} Battle Board`,
    board_type: "event-specific",
    schema_version: "mangia-battle-board@1",
    boardData: {
      schema: "mangia-battle-board@1",
      version: "1.0.0",
      meta: {
        eventName: event.title,
        eventNumber: event.eventNumber,
        eventDate: event.eventDate.toISOString().split('T')[0],
        staffRestrooms: "TBD",
        staffParking: "TBD",
      },
      staff: [],
      timeline: [],
      layouts: [{ type: "Main Hall", instructions: "" }],
      attachments: [],
    },
    status: "draft",
    tags: ["wedding", "outdoor"],
  },
});
```

### Updating Board Data

```typescript
const updated = await database.battleBoard.update({
  where: {
    tenantId_id: { tenantId, id: boardId },
  },
  data: {
    boardData: {
      ...existingBoardData,
      staff: [
        ...existingBoardData.staff,
        {
          name: "John Doe",
          role: "Chef",
          shiftStart: "3:00 PM",
          shiftEnd: "11:00 PM",
          station: "Hot Line",
        },
      ],
    },
  },
});
```

### Querying Boards for Event

```typescript
const boards = await database.battleBoard.findMany({
  where: {
    tenantId,
    eventId: eventId,
    deletedAt: null,
  },
  orderBy: {
    createdAt: "desc",
  },
});
```

## Migration History

| Date | Version | Description |
|------|---------|-------------|
| 2025-01-24 | 1.0.0 | Initial table creation with JSONB support |
| 2025-01-29 | 1.0.1 | Added GIN indexes for JSON and tag queries |

## Best Practices

1. **Always use GIN-indexed JSON queries** when filtering by board_data contents
2. **Keep board_data schema versioned** to handle future migrations
3. **Use soft deletes** (deleted_at) instead of hard deletes
4. **Validate JSON structure** before saving (use Zod schema in application layer)
5. **Index tags appropriately** for common filter patterns
6. **Auto-fill from event data** when creating boards from events
7. **Archive old boards** instead of deleting to preserve historical data

## Type Safety

The application layer uses TypeScript types defined in:
- `apps/app/app/(authenticated)/events/battle-boards/[boardId]/battle-board-editor-client.tsx`

Always validate board_data against these types before database operations.

## Related Documentation

- [Event Table](./Event.md) - Parent event entity
- [Schema Contract](../../legacy-contracts/schema-contract-v2.txt) - Database patterns
- [JSON Query Patterns](../query-patterns.md) - Advanced JSON querying
