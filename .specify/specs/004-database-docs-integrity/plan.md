# Technical Plan: Database Documentation and Integrity Fixes

Feature ID: 004
Spec Version: 1.0

## 1. Architecture Overview

### 1.1 Ralph Loop Strategy
This feature is PERFECT for Ralph Loop methodology:
- **Many small, independent tasks** - Each table/schema can be documented separately
- **State persistence** - Each task updates specific files without conflicts
- **Verification** - Each doc can be verified against schema.prisma
- **Iterative refinement** - Future loops can update docs as schema evolves
- **Type fixing integration** - Each task fixes `any` types in related code
- **Migration tracking** - Schema inconsistencies logged as tracked TODOs

### 1.2 Directory Structure Design

```
docs/database/                     # Root documentation
├── README.md                      # Overview, methodology, index
├── SCHEMAS.md                     # All schemas with quick links
├── KNOWN_ISSUES.md                # FK issues, naming, TODOs
├── CONTRIBUTING.md                # How to update docs
├── schemas/                       # Schema-level docs (9 files)
│   └── {schema}.md                # Purpose, goals, rules, TOC, TODOs
├── tables/                        # Table-level docs (118 files)
│   └── {schema}/                  # Organized by schema
│       └── {Table}.md             # Individual table docs
├── migrations/                    # Migration docs (16 files)
│   └── {migration_id}-{desc}.md   # What changed, why, rollback
├── enums/                         # Enum docs (12 files)
│   └── {enum}.md                 # Enum values and purpose
└── hooks/                         # Validation scripts
    └── validate-*.js              # Automated checks
```

### 1.3 Task Breakdown Pattern

| Phase | Tasks | Purpose | Parallelization |
|-------|-------|---------|-----------------|
| Setup | 3 tasks | Dirs, templates, root docs | Sequential |
| Schema Docs | 9 tasks | One schema each (rich docs) | 2-3 parallel |
| Table Docs | 118 tasks | One table each + type fixes | 5-10 parallel |
| Migration Docs | 16 tasks | One migration each | 3-4 parallel |
| Enum Docs | 12 tasks | One enum each | All parallel |
| Hooks | 3 tasks | Validation scripts | Sequential |
| Verification | Variable | Quality gates | Sequential |

**Total:** ~220 tasks, ~45 iterations

## 2. Documentation Templates

### 2.1 Schema Documentation Template

Each `docs/database/schemas/{schema}.md` file:

```markdown
# {Schema Name} Schema

> {One-line description of what this schema handles}

**Last Updated:** 2025-01-29
**Total Tables:** {count}
**Migrations:** {count}

## Quick Navigation

| Table | Purpose | Relations | Status |
|-------|---------|-----------|--------|
| [{Table}](../tables/{schema}/{Table}.md) | {Purpose} | {Key relations} | {Status} |
... (all tables listed)

[View all tables →](../tables/{schema}/)

## Purpose & Domain

{What this schema is for, what business domain it serves}

## Long-term Goals

- {Goal 1}
- {Goal 2}
- {Goal 3}

## Rules & Conventions

**MUST:**
- {Rule 1}
- {Rule 2}

**SHOULD:**
- {Guideline 1}
- {Guideline 2}

**NEVER:**
- {Anti-pattern 1}
- {Anti-pattern 2}

## Key Design Decisions

### {Decision 1}
**Decision:** {What was decided}
**Rationale:** {Why}
**Alternatives considered:** {What else was considered}
**Trade-offs:** {What we gave up}

## Relation Patterns

{How this schema connects to others, with diagrams}

## Data Lifecycle

{How data flows: create → update → delete patterns}

## Performance Considerations

{Hot tables, query patterns, index strategy}

## TODOs (Require Migrations)

### [MIGRATION] {Issue Title}
**Issue:** {description}
**Impact:** {what can go wrong}
**Required Migration:** {SQL}
**Priority:** HIGH|MEDIUM|LOW
**Tracking:** [FEATURE-004-TXXX]
```

### 2.2 Table Documentation Template

Each `docs/database/tables/{schema}/{Table}.md` file:

```markdown
# {Table}

> {One-line description}

**Schema:** `{schema}`
**Table:** `{table_name}`
**First Documented:** 2025-01-29
**Last Updated:** 2025-01-29
**Last Verified By:** {agent-id}
**Status:** ✅ Stable | ⚠️ Needs Review | ❌ Broken

## Overview

{What this table stores, why it exists}

## Schema Reference

- **Schema Name:** `{actual_schema_name}`
- **Table Name:** `{actual_table_name}`
- **Primary Key:** `{primary_key_definition}`
- **Soft Deletes:** {yes/no} ({column_name})

## Column Reference

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `tenant_id` | UUID | ❌ | - | {description} |
| `id` | UUID | ❌ | `gen_random_uuid()` | {description} |
... (all columns)

## Prisma Type

```typescript
import { {Table} } from '@repo/database/generated'

// Example usage
async function get{Table}(id: string): Promise<{Table} | null> {
  return await database.{tableLower}.findUnique({
    where: { tenantId_id: { tenantId, id } }
  });
}
```

## Relations

### Outgoing (This → Others)
{Table}.{column} → {OtherTable}.{column} ({ON DELETE behavior})

### Incoming (Others → This)
{OtherTable}.{column} → {Table}.{column} ({purpose})

## Business Rules

1. {Validation rule}
2. {Constraint}
3. {State machine}

## Type Fixing Targets (Side Task)

### Files to Update
- {File path 1}
- {File path 2}

### Types Fixed This Session
- [ ] {file}: {old_type} → {new_type}
- [ ] {file}: {old_type} → {new_type}

**Running Total:** ___ any types fixed

## Common Queries

### {Query Pattern 1}
```typescript
{Example Prisma query with explanation}
```

## Migration TODOs

### [MIGRATION] {Issue Title}
**Issue:** {description}
**Impact:** {what can go wrong}
**Required Migration:**
```sql
{SQL}
```
**Priority:** HIGH|MEDIUM|LOW
**Tracking:** [FEATURE-004-TXXX]

## See Also
- Schema: [`docs/database/schemas/{schema}.md`](../../schemas/{schema}.md)
- Related: [{OtherTable}](../{other_schema}/{OtherTable}.md)
```

## 3. Linking Strategy

### Relative Path Conventions

**Schema to Table:**
```markdown
[{Table}](../tables/{schema}/{Table}.md)
```

**Table to Related Table (same schema):**
```markdown
[{Table}](./{Table}.md)
```

**Table to Related Table (different schema):**
```markdown
[{Table}](../{other_schema}/{Table}.md)
```

**Table to Schema:**
```markdown
[Back to {schema} schema](../../schemas/{schema}.md)
```

**Table to Code:**
```markdown
**Schema:** `packages/database/prisma/schema.prisma:{line_numbers}`
```

## 4. Type Fixing Strategy

### 4.1 Process per Table Task

1. **Find related files:**
   ```bash
   grep -r "database.{tableLower}" apps/app/
   grep -r "from '@repo/database'" apps/app/app/(authenticated)/{module}/
   ```

2. **Identify `any` types:**
   ```bash
   grep -n ": any" {related_files}
   grep -n "as any" {related_files}
   ```

3. **Replace with proper types:**
   ```typescript
   // Before
   const {table}: any = await database.{tableLower}.findUnique(...)

   // After
   import { {Table} } from '@repo/database/generated'
   const {table}: {Table} | null = await database.{tableLower}.findUnique(...)
   ```

4. **Track in .progress.md:**
   ```markdown
   | Task ID | Table | Types Fixed |
   |---------|-------|-------------|
   | T001 | Event | 7 |
   | T002 | Client | 5 |
   **Total:** ___ any types fixed
   ```

### 4.2 Type Patterns to Fix

**Common patterns:**
```typescript
// Pattern 1: Direct query result
const event: any → const event: Event | null

// Pattern 2: Create input
const data: any → const data: Prisma.EventCreateInput

// Pattern 3: Array results
const events: any[] → const events: Event[]

// Pattern 4: Nested includes
const event: any → const event: Event & { client: Client }

// Pattern 5: Form data
const values: any → const values: EventInput
```

## 5. Migration TODO Strategy

### 5.1 TODO Format

```markdown
## [MIGRATION] {Issue Title}

**Issue:** {Clear description of the problem}

**Impact:**
- {What can go wrong}
- {Who is affected}
- {Data integrity risk}

**Current State:**
```prisma
// Show current problematic schema
model {Table} {
  tenantId String  // No @relation!
}
```

**Required Migration:**
```sql
-- Migration: {migration_name}
-- {Explanation of each step}

-- Step 1: Add constraint
ALTER TABLE {schema}.{table}
ADD CONSTRAINT {table}_{column}_fkey
FOREIGN KEY ({column})
REFERENCES {target_schema}.{target_table}({target_column})
ON DELETE {behavior};

-- Step 2: Backfill data if needed
{SQL for data migration}

-- Step 3: Make column NOT NULL if safe
ALTER TABLE {schema}.{table}
ALTER COLUMN {column} SET NOT NULL;
```

**Rollback Plan:**
```sql
{How to undo if things go wrong}
```

**Priority:** HIGH (data integrity) | MEDIUM (consistency) | LOW (nice-to-have)
**Complexity:** HIGH | MEDIUM | LOW
**Estimated Breaking:** {yes/no}
**Assigned:** TBD
**Tracking:** [FEATURE-004-TXXX]
**Dependencies:** {Other TODOs this depends on}
```

### 5.2 TODO Categories

**Critical (HIGH Priority):**
- Missing foreign keys to `platform.accounts`
- Missing foreign keys between tenant tables
- Data integrity risks

**Important (MEDIUM Priority):**
- Naming inconsistencies (camelCase vs snake_case)
- Ambiguous column purposes
- Missing indexes for performance

**Nice to Have (LOW Priority):**
- Auto-numbering sequences
- Column renames for clarity
- Denormalization for performance

## 6. Validation Strategy

### 6.1 Coverage Checks

```javascript
// All tables documented?
const schemaTables = parsePrismaSchema();
const docTables = glob('docs/database/tables/**/*.md');
const missing = schemaTables.filter(t => !docTables.includes(t));
```

### 6.2 Frontmatter Validation

```javascript
// Required metadata exists?
const requiredFields = ['first_documented', 'last_updated', 'last_verified_by'];
docs.forEach(doc => {
  const frontmatter = parseFrontmatter(doc);
  const missing = requiredFields.filter(f => !frontmatter[f]);
  if (missing.length) {
    console.error(`❌ ${doc}: Missing ${missing.join(', ')}`);
  }
});
```

### 6.3 Link Validation

```javascript
// All relative links work?
const links = extractLinks('docs/database/**/*.md');
const broken = links.filter(link => !fs.existsSync(resolvePath(link.from, link.to)));
```

### 6.4 Type Fix Validation

```bash
# Count any types before/after
grep -r ": any" apps/app --include="*.ts" --include="*.tsx" | wc -l

# Should decrease as tasks complete
```

## 7. Success Criteria

### 7.1 Documentation Quality
- [ ] All 9 schemas have rich documentation with all required sections
- [ ] All 118 tables have individual documentation files
- [ ] All cross-references between tables are accurate
- [ ] All migration TODOs are tracked with unique IDs

### 7.2 Type Safety
- [ ] Fixed 100+ `any` types across database-related code
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Type fix counter in .progress.md shows total

### 7.3 Completeness
- [ ] All 16 migrations have documentation
- [ ] All 12 enums have documentation
- [ ] Validation hooks pass all checks
- [ ] README.md provides complete index

## 8. Rollback Plan

If documentation needs to be rolled back:
```bash
# Remove documentation directory
rm -rf docs/database/

# Revert feature branch
git checkout main

# Delete feature branch
git branch -D 004-database-docs-integrity
```

Note: Type fixes are committed incrementally, so those would need individual revert if problematic.

## 9. Next Steps

1. Review and approve this technical plan
2. Approve feature specification (spec.md)
3. Create detailed task list (tasks.md)
4. Create coordinator prompt (.coordinator-prompt.md)
5. Initialize state (.speckit-state.json)
6. Start Ralph Loop execution
