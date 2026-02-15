# Technical Plan: Events Audit and Fix

Feature ID: 003
Spec Version: 1.0
Constitution Version: 1.0.0

## 1. Architecture Overview

### 1.1 High-Level Design
Audit and fix the events module implementation to ensure data consistency, auto-creation of related entities, and proper API coverage.

```text
[User]
    |
    v
EventForm / EventEditorModal
    |
    v
createEvent action (actions.ts:87-119)
    |
    +---> database.events.create()
    +---> database.battle_boards.create() [NEW]
    |
    v
[Redirect to /events/[eventId]]
```

### 1.2 Key Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Add battle_board creation in same transaction | Ensures atomicity - either both succeed or neither | Create via separate async call (less safe) |
| Use Zod for event validation | C§2.2 recommends Zod for runtime validation | Manual validation (already exists) |
| Fix props type, not form name | Props type should match form field semantics | Rename form field to capacity (conflicts with EventForm) |

## 2. Components

### 2.1 Component: EventEditorModal
- **Purpose**: Modal form for creating/editing events
- **Location**: `apps/app/app/(authenticated)/events/event-editor-modal.tsx`
- **Dependencies**: @repo/design-system, react

**Issue**: Props type uses `capacity` (line 42) but form field uses `name="guestCount"` (line 157)

**Fix**:
```typescript
// Line 42: Change from capacity to guestCount
event?: {
  id?: string;
  name?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  guestCount?: number;  // Changed from capacity
  eventType?: string;
};
```

### 2.2 Component: createEvent Action
- **Purpose**: Server action for event creation
- **Location**: `apps/app/app/(authenticated)/events/actions.ts:87-119`
- **Dependencies**: @repo/database, tenant utilities

**Current behavior**: Only creates event record
**Required**: Also create battle_board record

### 2.3 Component: Budgets API Routes
- **Purpose**: CRUD for event budgets
- **Location**: `apps/api/app/api/events/budgets/`
- **Status**: ALREADY EXISTS - routes for GET/POST/PUT/DELETE on budgets and line-items

## 3. Data Model

### 3.1 Entities

#### Entity: Event
```typescript
interface Event {
  id: string;
  tenant_id: string;
  title: string;
  event_type: string;
  event_date: Date;
  guest_count: number;
  status: string;
  budget: number | null;
  venue_name: string | null;
  venue_address: string | null;
  notes: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}
```

#### Entity: BattleBoard (tenant_events schema)
```typescript
interface BattleBoard {
  tenant_id: string;
  id: string;
  event_id: string | null;
  board_name: string;
  board_type: string;
  schema_version: string;
  board_data: Json;
  status: string;
  is_template: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### 3.2 Validation Schema (NEW)

```typescript
// apps/app/app/(authenticated)/events/validation.ts
import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  eventType: z.string().min(1, "Event type is required"),
  eventDate: z.string().min(1, "Event date is required"),
  guestCount: z.coerce.number().min(1, "Guest count must be at least 1"),
  status: z.enum(["confirmed", "tentative", "postponed", "completed", "cancelled"]).default("confirmed"),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  notes: z.string().optional(),
  budget: z.coerce.number().optional(),
  tags: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
```

## 4. API Design

### 4.1 Existing Endpoints (No Changes Needed)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/events/budgets` | GET | EXISTS |
| `/api/events/budgets` | POST | EXISTS |
| `/api/events/budgets/[id]` | GET | EXISTS |
| `/api/events/budgets/[id]` | PUT | EXISTS |
| `/api/events/budgets/[id]` | DELETE | EXISTS |
| `/api/events/budgets/[id]/line-items` | GET | EXISTS |
| `/api/events/budgets/[id]/line-items` | POST | EXISTS |
| `/api/events/budgets/[id]/line-items/[lineItemId]` | GET | EXISTS |

**Note**: Budgets API routes exist in `apps/api/`. If hooks in `apps/app/` call `/api/` routes, they work via Next.js rewrites.

## 5. Integration Points

### 5.1 Internal Integrations
| System | Integration Type | Purpose |
|--------|-----------------|---------|
| database.events | Prisma | Event CRUD |
| database.battle_boards | Prisma | Auto-create board on event |
| database.event_budgets | Prisma | Budget queries |

### 5.2 External Integrations
| Service | Integration Type | Auth Method |
|---------|-----------------|-------------|
| Clerk | Auth | @repo/auth/server |

## 6. Security Considerations

### 6.1 Authentication
- All event actions require `requireTenantId()` [C§5.3]
- API routes use `auth()` from @repo/auth/server

### 6.2 Authorization
- Tenant isolation via `tenantId` in all queries
- Soft deletes prevent data loss

## 7. Performance

### 7.1 Targets
- Event creation: <500ms
- Battle board creation: <200ms (transactional)

### 7.2 Optimization Strategy
- Use `$transaction` for atomic event + board creation
- Index on `tenant_id`, `event_id` already exists

## 8. Testing Strategy

### 8.1 Unit Tests
- `actions.test.ts` - Test createEvent with battle_board creation
- `validation.test.ts` - Test Zod schema validation

### 8.2 Integration Tests
- Event creation flow with battle_board auto-creation
- Budget API endpoints

## 9. Implementation Notes

### 9.1 Changes Required

| File | Change | Lines |
|------|--------|-------|
| `event-editor-modal.tsx` | Fix props type `capacity` -> `guestCount` | 42 |
| `actions.ts` | Add battle_board creation in createEvent | 101-115 |
| `actions.ts` | Add Zod validation | New file validation.ts + import |
| `validation.ts` | Create new file | N/A |

### 9.2 Technical Debt
- None identified - all fixes are proper implementations

### 9.3 Dependencies to Install
- None - zod is already available in the workspace

## 10. Open Questions

- [x] Should battle board auto-creation be optional? **No - always create for consistency**
- [x] Should event report be auto-created? **Out of scope for this fix**
- [x] What board_type for auto-created board? **"event-specific" (default)**

## 11. Verification Steps

After implementation:
1. Create event via EventForm - verify battle_board created
2. Create event via EventEditorModal - verify guestCount saved
3. Visit budgets page - verify API endpoints return data
4. Run `pnpm check` - verify no lint errors
