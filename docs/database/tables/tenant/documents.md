---
title: "documents Table"
description: "Document storage for PDF/CSV parsing pipeline with event data extraction"
schema: "tenant"
tags: ["events", "documents", "parsing", "pdf", "csv"]
last_reviewed: "2025-01-30"
issues: ["missing_fk_to_account"]
---

## Table: `documents`

**Schema:** `tenant`
**Purpose:** Store uploaded PDF and CSV documents for parsing event data from catering files (TPP format, staff schedules, etc.)

## Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | `NO` | `uuid_generate_v4()` | Primary key |
| `tenant_id` | `uuid` | `NO` | - | **CRITICAL: Missing FK to Account(id)** - Tenant identifier |
| `file_name` | `varchar` | `NO` | - | Original filename of uploaded document |
| `file_type` | `varchar` | `NO` | - | MIME type or file extension (e.g., "application/pdf", "text/csv") |
| `file_size` | `int` | `YES` | `NULL` | File size in bytes |
| `storage_path` | `varchar` | `YES` | `NULL` | Path to file in storage (if using external storage) |
| `parsed_data` | `jsonb` | `YES` | `NULL` | Extracted event/menu/staff data from parsed document |
| `parse_status` | `varchar` | `NO` | `'pending'` | Parsing status: "pending", "in_progress", "completed", "failed" |
| `parse_error` | `varchar` | `YES` | `NULL` | Error message if parsing failed |
| `parsed_at` | `timestamptz` | `YES` | `NULL` | Timestamp when document was successfully parsed |
| `event_id` | `uuid` | `YES** | `NULL` | **CRITICAL: Missing FK to Event(id)** - Linked event |
| `battle_board_id` | `uuid` | `YES** | `NULL` | **CRITICAL: Missing FK to BattleBoard(id)** - Linked battle board |
| `metadata` | `jsonb` | `NO` | `'{}'` | Additional metadata (upload source, user, tags, etc.) |
| `created_at` | `timestamptz` | `NO` | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | `NO` | `now()` | Last update timestamp |
| `deleted_at` | `timestamptz` | `YES` | `NULL` | Soft delete timestamp (NULL = active) |

## Constraints

```sql
-- Unique constraint on composite key
UNIQUE(tenant_id, id)

-- NOTE: Missing foreign key constraints:
-- tenant_id → Account(id)                    [HIGH PRIORITY]
-- event_id → Event(id)                       [HIGH PRIORITY]
-- battle_board_id → BattleBoard(id)          [MEDIUM PRIORITY]
```

## Relationships

### Missing Foreign Keys (TODO)

The table currently **lacks foreign key constraints** despite having columns that reference other tables:

1. **`tenant_id` → `Account(id)`**
   - **Severity:** HIGH
   - **Impact:** Data integrity risk - orphaned documents possible
   - **Required for:** Multi-tenant isolation, cascade deletes
   - **Migration needed:** Add FK constraint with `ON DELETE RESTRICT`

2. **`event_id` → `Event(id)`**
   - **Severity:** HIGH
   - **Impact:** Cannot guarantee linked events exist
   - **Required for:** Event-document relationship integrity
   - **Migration needed:** Add FK constraint with `ON DELETE SET NULL`

3. **`battle_board_id` → `BattleBoard(id)`**
   - **Severity:** MEDIUM
   - **Impact:** Weak link to battle boards
   - **Required for:** Battle board document tracking
   - **Migration needed:** Add FK constraint with `ON DELETE SET NULL`

### Logical Relationships (Not Enforced)

- **One Event → Many Documents** (via `event_id`)
- **One BattleBoard → Many Documents** (via `battle_board_id`)
- **One Account (Tenant) → Many Documents** (via `tenant_id`)

## Usage

### Document Upload Flow

```typescript
// POST /api/events/documents/parse
// 1. Upload PDF/CSV
// 2. Parse with @repo/event-parser
// 3. Store in documents table
// 4. Extract event data to parsed_data
// 5. Optionally create Event, BattleBoard, EventReport
```

### Parse Status Flow

```
pending → in_progress → completed
                ↓
              failed
```

## Code Issues Found

### Type Safety Problems

**File:** `apps/api/app/api/events/documents/parse/route.ts`

**Issue 1:** Line 106 - Using `as any` to bypass Bytes type
```typescript
content: Buffer.from(await file.arrayBuffer()).toString('base64') as any,
```
- **Problem:** Prisma Bytes type expects Buffer, but base64 string used
- **Fix:** Store raw Buffer or change column type to `text`
- **Type safety:** Low

**Issue 2:** Line 154 - JSON cast without validation
```typescript
board_data: battleBoardResult.battleBoard as object,
```
- **Problem:** No runtime validation before database insert
- **Fix:** Use Zod schema validation
- **Type safety:** Medium

**Issue 3:** Line 226 - Metadata JSON cast
```typescript
report_config: {
  checklist: checklistResult.checklist,
  parsedEvent: result.mergedEvent,
  warnings: checklistResult.warnings,
} as object,
```
- **Problem:** No schema validation for nested objects
- **Fix:** Define and validate schema
- **Type safety:** Medium

### Additional Type Issues

**File:** `packages/event-parser/src/parsers/pdf-extractor.ts`
- **Line 59:** `Uint8Array.from(pdfBuffer as any)` - unnecessary cast
- **Line 100:** `item as unknown as TextItem` - double cast indicates type mismatch

**File:** `packages/event-parser/src/data/index.ts`
- **Line 308:** `JSON.parse(JSON.stringify(PRE_EVENT_REVIEW_TEMPLATE))` - unsafe deep clone

## Migration TODO

### Required Migrations

```sql
-- Migration: Add foreign key constraints to documents table
-- Priority: HIGH (tenant_id), MEDIUM (event_id, battle_board_id)

-- 1. Add tenant_id FK
ALTER TABLE tenant.documents
ADD CONSTRAINT documents_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES public.Account(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- 2. Add event_id FK
ALTER TABLE tenant.documents
ADD CONSTRAINT documents_event_id_fkey
FOREIGN KEY (event_id)
REFERENCES tenant.events(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 3. Add battle_board_id FK
ALTER TABLE tenant.documents
ADD CONSTRAINT documents_battle_board_id_fkey
FOREIGN KEY (battle_board_id)
REFERENCES tenant.battle_boards(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
```

## Index Recommendations

```sql
-- Improve query performance for common lookups
CREATE INDEX idx_documents_tenant_parse_status ON tenant.documents(tenant_id, parse_status);
CREATE INDEX idx_documents_tenant_event_id ON tenant.documents(tenant_id, event_id);
CREATE INDEX idx_documents_tenant_created_at ON tenant.documents(tenant_id, created_at DESC);
```

## Related Tables

- **`Event`** - Events linked to documents (via `event_id`)
- **`BattleBoard`** - Battle boards from parsed documents (via `battle_board_id`)
- **`EventReport`** - Pre-Event Review checklists (indirectly linked)
- **`EventImport`** - Raw file imports (separate from parsed documents)

## See Also

- **Event Parser Package:** `packages/event-parser/`
- **Parse Route:** `apps/api/app/api/events/documents/parse/route.ts`
- **Schema Contract:** `docs/legacy-contracts/schema-contract-v2.txt`
