# {TableName}

**Purpose**: {One-line business purpose}

**Schema**: `tenant_xxx` | `platform` | `core`

**Last updated**: YYYY-MM-DD

## Business Context

{What this table represents, why it exists, business rules}

**Key Use Cases**:
- {Use case 1}
- {Use case 2}
- {Use case 3}

## Columns

| Column | Type | Nullable | Default | Purpose | Notes |
|--------|------|----------|---------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | Primary key | Auto-generated |
| `tenantId` | UUID | No | - | Tenant FK | Required for multi-tenancy |
| `{field}` | {type} | {yes/no} | {default} | {purpose} | {notes} |
| `createdAt` | Timestamptz | No | now() | Creation timestamp | Auto-managed |
| `updatedAt` | Timestamptz | No | now() | Last update | Auto-managed |
| `deletedAt` | Timestamptz | Yes | NULL | Soft delete | Filter queries with `IS NULL` |

## Indexes

| Index | Columns | Unique | Rationale |
|-------|---------|--------|-----------|
| `idx_{name}` | `(col1, col2)` | No | {Why this index exists} |
| `idx_{name}` | `(col1, col2)` | Yes | {Why unique constraint} |

**Performance Notes**:
- {Query patterns optimized}
- {Index size considerations}
- {Composite index rationale}

## Foreign Keys

### fk_{constraint_name}

**From**: `{table}(column_id)`
**To**: `{other_table}(id)` - composite `(tenant_id, id)`
**On Delete**: CASCADE | SET NULL | RESTRICT
**Purpose**: {Why this FK exists}

**Notes**:
- Composite FK includes `tenantId`
- Cross-schema reference to `tenant_xxx`
- Enforced at DB level, see migration {timestamp}

## Relationships

### One-to-Many

- **Has many** `{ChildTable}` via `{fk_column}`
- **Belongs to** `{ParentTable}` via `{parent_id}`

### Many-to-Many

- **Many-to-many** with `{OtherTable}` through `{junction_table}`

### Cross-Schema

- **References** `tenant_xxx.{table}` via `{column}`

## Constraints

### Unique Constraints

- `(col1, col2)` - {reason}

### Check Constraints

- `{column} > 0` - {reason}

### Business Rules

- {Rule not enforced by DB}
- {Application-level validation}

## Usage Patterns

### Common Queries

**Fetch active records**:
```sql
SELECT *
FROM {table_name}
WHERE tenant_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**Filter by status**:
```sql
SELECT *
FROM {table_name}
WHERE tenant_id = ? AND status = ?
LIMIT 100;
```

### Gotchas

- {Common mistake}
- {Performance issue}
- {Data integrity concern}

### Best Practices

- {Recommendation 1}
- {Recommendation 2}

## Soft Delete Behavior

**Soft delete column**: `deletedAt`

**Queries**:
- Always filter: `WHERE deleted_at IS NULL`
- Use `prisma.{model}.findMany({ where: { deletedAt: null } })`

**Cascades**:
- {Child records handling on soft delete}
- {Manual cascade needed}

## Migration History

| Date | Migration | Change |
|------|-----------|--------|
| YYYY-MM-DD | {timestamp}_{name} | {What changed} |
| YYYY-MM-DD | {timestamp}_{name} | {What changed} |

## Related Tables

- `{RelatedTable}` - {Relationship}
- `{RelatedTable}` - {Relationship}

## Related Code

- **Prisma Model**: `packages/database/prisma/schema.prisma`
- **Business Logic**: `apps/app/app/(authenticated)/{module}/`
- **API Routes**: `apps/app/app/api/{resource}/route.ts`

## See Also

- {Schema documentation}
- {Parent table docs}
- {Child table docs}
