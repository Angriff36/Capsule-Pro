# {Schema Name} Schema

> **First documented**: YYYY-MM-DD
> **Last updated**: YYYY-MM-DD
> **Last verified by**: @username
> **Verification status**: ⚠️ Needs verification | ✅ Verified

---
> **NOTE**: This template serves as the standard for documenting database schemas. Copy this content to `{schema-name}.md` in the parent directory and fill in all placeholders.

---

## Purpose

{What domain area or business function this schema serves}

**Scope**: {What data lives here, what doesn't}

**Responsibility**: {Single responsibility principle - what THIS schema owns}

## Goals

{Business goals this schema enables}

- {Goal 1 - e.g., "Track staff scheduling across locations"}
- {Goal 2 - e.g., "Enable real-time kitchen task coordination"}
- {Goal 3}

## Rules

{Invariant rules - MUST always be true}

- {Rule 1 - e.g., "Every table MUST have tenantId"}
- {Rule 2 - e.g., "Soft deletes required for all tenant tables"}
- {Rule 3 - e.g., "Audit timestamps on all tables"}

**Enforcement**: {How rules are enforced - DB constraints vs app layer}

## Decisions

{Architectural decisions and why we made them}

### Decision: {Decision Title}

**Context**: {Problem we faced}
**Decision**: {What we chose}
**Why**: {Rationale}
**Alternatives considered**: {Other options and why we didn't choose them}
**Tradeoffs**: {What we're giving up}

### Example: Multi-tenant vs Isolated Databases

**Context**: Need to serve multiple customers
**Decision**: Shared database with tenant_id column
**Why**: Lower operational overhead, simpler backups, easier cross-tenant analytics
**Alternatives**: Per-tenant databases (rejected for operational complexity)
**Tradeoffs**: Must be careful about tenant data leakage in queries

## Anti-patterns

{Common mistakes to avoid}

- ❌ {Anti-pattern 1 - e.g., "Cross-tenant joins without tenant_id filter"}
  - **Why bad**: {Consequences}
  - **Correct pattern**: {What to do instead}

- ❌ {Anti-pattern 2 - e.g., "Hardcoding schema names in queries"}
  - **Why bad**: {Breaks tenant isolation}
  - **Correct pattern**: {Use parameterized schema selection}

## Relations

{How this schema connects to other schemas}

### Internal Relations

```
{Table1} (1) ──< (N) {Table2}
{Table2} (1) ──< (N) {Table3}
```

### Cross-Schema Relations

**References `tenant_other`**:
- [`{ThisTable}.{column}`](../tables/{this-table}.md) → [`{OtherTable}.{id}`](../tables/{other-table}.md)

**Referenced by `tenant_other`**:
- [`{OtherTable}.{column}`](../tables/{other-table}.md) → [`{ThisTable}.{id}`](../tables/{this-table}.md)

**References `tenant` (core)**:
- [`{ThisTable}.{column}`](../tables/{this-table}.md) → `Location.{id`

**References `platform`**:
- [`{ThisTable}.tenantId`](../tables/{this-table}.md) → `Account.{id`

### Click-to-Navigate

All table references above are clickable links. Ctrl+click (Cmd+click on Mac) to jump to table documentation.

## Lifecycle

{How data flows through this schema}

### Creation

- {How records are created}
- {Default values}
- {Initial state}

### Updates

- {What can be updated}
- {What cannot be changed}
- {State transitions}

### Deletion

- {Soft delete process}
- {Hard delete policy}
- {Cascade behavior}

### Archival

- {When data is archived}
- {Where it goes}
- {How to restore}

## Performance

{Performance characteristics and optimization}

### Index Strategy

- **Tenant scoping**: `(tenantId, deletedAt)` on all tables
- **Common filters**: {List indexes for frequent queries}
- **Tradeoffs**: {Index maintenance cost vs query speed}

### Query Patterns

- **Hot queries**: {Most frequently executed queries}
- **Cold queries**: {Rare but expensive queries}
- **Optimization opportunities**: {Where indexes could help}

### Data Volume

- **Expected growth**: {Records per month/year}
- **Retention policy**: {How long data is kept}
- **Purge strategy**: {How old data is removed}

### TODOs: Performance

```markdown
- [ ] Add composite index on `(tenantId, status, createdAt)` for {Table} - {reason}
- [ ] Review index usage after {event} - planned: YYYY-MM-DD
- [ ] Consider partitioning {Table} by {column} - expected volume: {count}
```

## TODOs

{Outstanding work, improvements, known issues}

### High Priority

```markdown
- [ ] [P0] Fix {issue} - {impact} - assigned: @username - due: YYYY-MM-DD
- [ ] [P1] Add {feature} - {why needed} - assigned: @username
```

### Medium Priority

```markdown
- [ ] [P2] Document {undocumented table/column} - links: [#{Table}]
- [ ] [P2] Refactor {anti-pattern} - current approach: {description}
```

### Low Priority

```markdown
- [ ] [P3] Normalize {denormalized field} - tradeoff: {performance vs consistency}
- [ ] [P3] Add {index} - optimization for {query}
```

### Migration Required

```markdown
- [ ] **MIGRATION REQUIRED**: Fix {type mismatch/nullability issue}
  - Current: `{column}` is {type}
  - Should be: {correct type}
  - Impact: {what breaks}
  - Migration: `{timestamp}_{name}`
  - Assigned: @username
```

## Tables

{List of all tables in this schema}

### Core Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`{Table1}`](../tables/{table1}.md) | {Purpose} | ✅ documented | ⚠️ needs verification |
| [`{Table2}`](../tables/{table2}.md) | {Purpose} | ✅ documented | ✅ verified |
| [`{Table3}`](../tables/{table3}.md) | {Purpose} | ⚠️ needs documentation | - |

### Supporting Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`{Table4}`](../tables/{table4}.md) | {Purpose} | ⚠️ needs documentation | - |
| [`{Table5}`](../tables/{table5}.md) | {Purpose} | ⚠️ needs documentation | - |

## See Also

- **Schema Overview**: [`../SCHEMAS.md`](../SCHEMAS.md)
- **Known Issues**: [`../KNOWN_ISSUES.md`](../KNOWN_ISSUES.md)
- **Type System**: [`../TYPES.md`](../TYPES.md)
- **Prisma Schema**: [`../../../packages/database/prisma/schema.prisma`](../../../packages/database/prisma/schema.prisma)
- **Migration History**: [`../MIGRATIONS.md`](../MIGRATIONS.md)
