# {Schema Name} Schema

**Purpose**: {Domain area for business function}

**Tables**: {count} tables
**Last updated**: YYYY-MM-DD

## Overview

{Description of schema purpose, domain scope, key concepts}

**Business Domain**: {Area of business this schema covers}

**Key Concepts**:
- {Concept 1}
- {Concept 2}
- {Concept 3}

## Tables

### Core Tables

- **{Table1}** - {Purpose}
- **{Table2}** - {Purpose}
- **{Table3}** - {Purpose}

### Supporting Tables

- **{Table4}** - {Purpose}
- **{Table5}** - {Purpose}

## Relationships

### Internal Relationships

```
{Table1} (1) ──< (N) {Table2}
{Table2} (1) ──< (N) {Table3}
```

### Cross-Schema Relationships

**References `tenant_other`**:
- {ThisTable}.{column} → {OtherTable}.{id}

**Referenced by `tenant_other`**:
- {OtherTable}.{column} → {ThisTable}.{id}

**References `tenant` (core)**:
- {ThisTable}.{column} → Location.{id}

**References `platform`**:
- {ThisTable}.tenantId → Account.{id}

## Key Patterns

### Multi-Tenancy

All tables include:
- `tenantId` - UUID foreign key to `platform.accounts.id`
- Index on `(tenantId, deletedAt)` for filtered queries

### Soft Deletes

All tables include:
- `deletedAt` - Nullable timestamptz
- Queries filter: `WHERE deleted_at IS NULL`

### Audit Trail

All tables include:
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

### Naming Conventions

- Tables: `PascalCase`, plural → `snake_case`, plural
- Columns: `camelCase` → `snake_case`
- FKs: `fk_{table}_{referenced}_{column}`

## Foreign Key Strategy

### Internal FKs

- Cascade: Child records deleted with parent
- Set Null: Child records lose reference
- Restrict: Parent cannot be deleted if children exist

### Cross-Schema FKs

- Composite FKs: `(tenant_id, referenced_id)`
- Enforced at DB level
- Added in migration `20260129120000_add_foreign_keys`

## Index Strategy

### Tenant Scoping

All tables have:
- `idx_{table}_tenant_deleted` on `(tenantId, deletedAt)`

### Common Patterns

- `(tenantId, status)` - Status filtering
- `(tenantId, createdAt)` - Time-based queries
- `(tenantId, {parentId})` - Parent-child queries

## Business Rules

### {Rule Category}

- {Rule 1}
- {Rule 2}

### Data Integrity

- {Constraint 1}
- {Constraint 2}

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| YYYY-MM-DD | {timestamp}_{name} | {Description} |
| YYYY-MM-DD | {timestamp}_{name} | {Description} |

## Known Issues

- {Issue from KNOWN_ISSUES.md}
- {Workaround or solution}

## Future Improvements

- [ ] {Planned enhancement 1}
- [ ] {Planned enhancement 2}

## Table Documentation

- [{Table1}](./tables/{table1}.md)
- [{Table2}](./tables/{table2}.md)

## See Also

- **Schema Overview**: `../SCHEMAS.md`
- **Known Issues**: `../KNOWN_ISSUES.md`
- **Prisma Schema**: `packages/database/prisma/schema.prisma`
