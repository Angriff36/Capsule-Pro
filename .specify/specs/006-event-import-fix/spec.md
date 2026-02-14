# Feature Specification: Event Import Fix

Feature ID: 006
Status: Draft
Constitution Version: 1.0.0

## 1. Overview

### 1.1 Goal
Fix the event document import functionality (PDFs and CSVs) which is currently broken due to TypeScript errors, wrong imports, and schema violations.

### 1.2 Problem Statement
The `/api/events/documents/parse` endpoint exists but has multiple critical bugs that prevent it from working:
- Variable shadowing causes functions not to be called
- Wrong import path for tenant utility
- Schema violations with compound unique keys
- Type mismatches

### 1.3 Success Metrics
- PDF/CSV upload processes without errors
- Event data is extracted from TPP PDFs
- Staff data is extracted from CSVs
- Battle boards are generated when requested
- Checklists are generated when requested
- Created event/battle_board/checklist are linked to import records

## 2. Constitution Alignment

### 2.1 Relevant Principles

| Principle | Section | Alignment |
|-----------|---------|-----------|
| [MUST] Use Prisma + Neon | C§2.1 | Database operations use Prisma client |
| [MUST] All tenant tables include tenantId | C§2.1 | All queries enforce tenant isolation |
| [MUST] No `any` types | C§2.1 | Use proper typing from Prisma |
| [SHOULD] Use compound unique keys | Schema | tenant_id + id for unique constraints |

### 2.2 Technology Constraints
- Database: Prisma with compound unique keys (tenantId + id)
- Tenant Isolation: Filter by tenantId in all queries
- No any types: Use Prisma-inferred types
- Auth: Required via Clerk

## 3. User Stories

### US1: Upload Event PDF
**As a** kitchen coordinator
**I want to** upload a TPP event PDF
**So that** event data is automatically extracted

**Acceptance Criteria:**
- AC-1.1: PDF uploads without errors
- AC-1.2: Event data (client, number, date, headCount) is extracted
- AC-1.3: Venue data is captured
- AC-1.4: Parse errors are reported if PDF format is unrecognized

### US2: Upload Staff CSV
**As a** kitchen coordinator
**I want to** upload a staff roster CSV
**So that** staff shifts are imported

**Acceptance Criteria:**
- AC-2.1: CSV uploads without errors
- AC-2.2: Staff names, positions, and times are extracted
- AC-2.3: Multiple events in CSV are handled
- AC-2.4: Parse errors are reported for invalid rows

### US3: Generate Battle Board
**As a** kitchen coordinator
**I want to** auto-generate a battle board from imported data
**So that** I don't have to manually create it

**Acceptance Criteria:**
- AC-3.1: Battle board is created when "Generate Battle Board" is checked
- AC-3.2: Board is linked to import record
- AC-3.3: Board is linked to event (if created)
- AC-3.4: Board contains extracted event data

### US4: Generate Checklist
**As a** kitchen coordinator
**I want to** auto-generate a pre-event review checklist
**So that** I don't have to manually fill it out

**Acceptance Criteria:**
- AC-4.1: Checklist is created when "Generate Checklist" is checked
- AC-4.2: Event is created if none exists
- AC-4.3: Checklist is linked to import record
- AC-4.4: Auto-fill score is calculated

## 4. Scope

### 4.1 In Scope
- Fix TypeScript errors in parse route
- Fix variable shadowing bug
- Fix import path for tenant utility
- Fix schema violations (compound unique keys)
- Fix type mismatches
- Ensure battle board and checklist generation works

### 4.2 Out of Scope
- New parser formats (only TPP PDFs supported)
- UI changes (import form is fine)
- New import features

## 5. Bugs to Fix

### 5.1 Variable Shadowing (Critical)
**File:** `apps/api/app/api/events/documents/parse/route.ts`
**Lines:** 310, 321

The params `generateBattleBoard` and `generateChecklist` shadow the internal functions with the same names. The functions are actually named `_generateBattleBoard` and `_generateChecklist` but the code tries to call the boolean params instead.

**Fix:** Rename the internal function calls to use the underscore prefix:
```typescript
// Before (broken):
const battleBoardData = await generateBattleBoard(...)
const checklistData = await generateChecklist(...)

// After (fixed):
const battleBoardData = await _generateBattleBoard(...)
const checklistData = await _generateChecklist(...)
```

### 5.2 Wrong Import Path (Critical)
**File:** `apps/api/app/api/events/documents/parse/route.ts`
**Line:** 25

```typescript
// Before (wrong):
import { getTenantIdForOrg } from "@/app/lib/tenant";

// After (correct):
import { getTenantId } from "@repo/database/tenant";
// And use:
const tenantId = await getTenantId();
```

### 5.3 Schema Violation - Compound Unique Key (Critical)
**File:** `apps/api/app/api/events/documents/parse/route.ts`
**Line:** 226

Battle board uses compound unique key (tenantId + id). The `where` clause must include both.

```typescript
// Before (wrong):
await database.battleBoard.update({
  where: { id: battleBoardId },
  data: { eventId: targetEventId },
});

// After (fixed):
await database.battleBoard.update({
  where: { tenantId_id: { tenantId, id: battleBoardId } },
  data: { eventId: targetEventId },
});
```

### 5.4 Type Mismatch - mergedEvent Optional
**File:** `apps/api/app/api/events/documents/parse/route.ts`
**Line:** 375

The `buildResponse` function expects `mergedEvent` as required but `processMultipleDocuments` returns it as optional.

```typescript
// In buildResponse signature:
mergedEvent: any;  // Required

// But processMultipleDocuments returns:
mergedEvent?: ParsedEvent;  // Optional

// Fix: Handle undefined case or make optional
```

## 6. Technical Design

### 6.1 Data Flow

```
[User uploads PDF/CSV]
       |
       v
[/api/events/documents/parse]
       |
       +-- processMultipleDocuments() -> extracts data
       +-- createImportRecords() -> saves to event_import table
       +-- _generateBattleBoard() -> creates battle_board
       +-- _generateChecklist() -> creates event + event_report
       |
       v
[Response with IDs]
```

### 6.2 API Contract

**POST /api/events/documents/parse**

Request:
- multipart/form-data with `files` field
- Query params: `generateChecklist`, `generateBattleBoard`, `eventId`

Response:
```typescript
{
  data: {
    documents: ProcessedDocument[];
    mergedEvent?: { client, number, date, headCount, venue... };
    mergedStaff?: Array<{name, position, scheduledIn, scheduledOut}>;
    imports: Array<{importId, document}>;
    battleBoardId?: string;
    checklistId?: string;
    errors: string[];
  }
}
```

## 7. Implementation Notes

### 7.1 Files to Modify

| File | Changes |
|------|---------|
| `apps/api/app/api/events/documents/parse/route.ts` | Fix all 4 bugs above |

### 7.2 Testing Strategy

- Unit test: Fix doesn't break existing parser logic
- Integration test: Upload TPP PDF, verify event created
- Integration test: Upload CSV, verify staff extracted
- Integration test: Both with battle board + checklist options

### 7.3 Verification Steps

After implementation:
1. Upload a TPP PDF - verify event data extracted
2. Upload a staff CSV - verify staff shifts extracted
3. Upload both with battle board option - verify board created
4. Upload both with checklist option - verify checklist created
5. Run `pnpm lint` and `pnpm build` - verify no errors

## 8. Related Features

- Feature 003: Events Audit and Fix (events module)
- Feature 004: Database Docs Integrity
- Feature 005: Recipe Popover Links

## 9. References

- API Route: `apps/api/app/api/events/documents/parse/route.ts`
- Parser Package: `packages/event-parser/`
- Import UI: `apps/app/app/(authenticated)/events/import/import-form.tsx`
- Schema: `packages/database/prisma/schema.prisma`
