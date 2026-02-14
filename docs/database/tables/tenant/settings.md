# Settings Table

> **First documented**: 2026-01-30
> **Last updated**: 2026-01-30
> **Last verified by**: spec-executor (T020)
> **Verification status**: ⚠️ Schema documented, FK issue found

---

## Overview

The `settings` table is a flexible key-value store for tenant-specific configuration and preferences. It allows for dynamic settings that don't require schema changes for each new configuration option.

**Business Context**: Runtime configuration storage for tenant-specific preferences, feature flags, and settings that don't fit into dedicated columns.

**Key Use Cases**:
- Store feature flags and preferences per tenant
- Configuration that may vary per tenant (UI settings, defaults, etc.)
- Settings that need to be added without schema migrations
- JSON-based complex configuration values

**Lifecycle**: Created when tenant needs to store a setting → Updated when setting changes → Deleted when tenant is deleted (should cascade)

## Schema Reference

```sql
-- PostgreSQL schema reference
CREATE TABLE tenant.settings (
  tenant_id UUID NOT NULL,              -- ⚠️ MISSING FK to Account
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  setting_key VARCHAR NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, setting_key)
);

-- Indexes
CREATE INDEX settings_tenant_key_idx ON tenant.settings(tenant_id, setting_key);

-- Prisma model reference
// File: packages/database/prisma/schema.prisma
// Model: settings (lines 1979-1991)
```

**Click-to-navigate**: Ctrl+click (Cmd+click on Mac) the Prisma schema path above to jump to the model definition.

## Columns

| Column | Type | Nullable | Default | Purpose | Notes |
|--------|------|----------|---------|---------|-------|
| `tenant_id` | UUID | No | - | Tenant identifier | ⚠️ **MISSING FK** to Account.id |
| `id` | UUID | No | gen_random_uuid() | Primary key | Composite PK with tenant_id |
| `setting_key` | VARCHAR | No | - | Setting identifier | Unique per tenant |
| `setting_value` | JSONB | No | - | Setting value | Flexible JSON type |
| `created_at` | TIMESTAMPTZ | No | now() | Creation timestamp | Auto-managed |
| `updated_at` | TIMESTAMPTZ | No | now() | Last update | Auto-managed |

### Column Details

#### `tenant_id`
- **Type**: UUID
- **Nullable**: No
- **Purpose**: Identifies which tenant owns this setting
- **⚠️ CRITICAL ISSUE**: Missing foreign key to `Account` (platform schema)
- **Impact**: No referential integrity enforcement
- **Should be**: `REFERENCES platform.Account(id) ON DELETE CASCADE`

#### `id`
- **Type**: UUID
- **Nullable**: No
- **Default**: gen_random_uuid()
- **Purpose**: Unique identifier for the setting row
- **Note**: Part of composite primary key with `tenant_id`

#### `setting_key`
- **Type**: VARCHAR
- **Nullable**: No
- **Purpose**: Identifies the setting being stored
- **Unique**: Per tenant (enforced by unique constraint)
- **Examples**:
  - `"ui.default_theme"` → `"dark"`
  - `"kitchen.auto_assign"` → `true`
  - `"reports.max_export_days"` → `90`

#### `setting_value`
- **Type**: JSONB
- **Nullable**: No
- **Purpose**: Flexible storage for setting values
- **Format**: Any valid JSON value
- **Examples**:
  - Simple values: `"string"`, `123`, `true`, `null`
  - Complex objects: `{"threshold": 100, "enabled": true}`
  - Arrays: `["option1", "option2"]`

#### `created_at`
- **Type**: TIMESTAMPTZ
- **Nullable**: No
- **Default**: now()
- **Purpose**: Track when setting was first created
- **Usage**: Audit trail, debugging

#### `updated_at`
- **Type**: TIMESTAMPTZ
- **Nullable**: No
- **Default**: now()
- **Purpose**: Track when setting was last modified
- **Usage**: Cache invalidation, sync

## Relations

### ⚠️ MISSING RELATION

- **Should reference** [`Account`](../../platform/Account.md) via `tenant_id`
  - **Status**: **MISSING** - No FK defined in schema
  - **Should cascade**: ON DELETE CASCADE (delete settings when tenant deleted)
  - **Impact**: Orphaned settings possible if Account deleted

### Expected Relation (Not Implemented)

```prisma
// What SHOULD be in the schema:
model settings {
  tenant_id     String   @db.Uuid
  account       Account? @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  // ... rest of fields
}

model Account {
  // ... existing fields
  settings      settings[]
}
```

## Business Rules

### Setting Key Conventions

- **Rule**: Use dot notation for hierarchical keys
- **Examples**:
  - `"ui.theme"` → UI preferences
  - `"kitchen.auto_assign"` → Kitchen module settings
  - `"reports.default_format"` → Report settings
- **Enforcement**: Application layer

### Data Integrity

- **Uniqueness**: `(tenant_id, setting_key)` must be unique
- **Required fields**: `tenant_id`, `setting_key`, `setting_value` cannot be null
- **Referential integrity**: ⚠️ **BROKEN** - No FK to Account

### Setting Value Types

- **Rule**: Use consistent JSON types for specific keys
- **Examples**:
  - Boolean flags: `true`/`false`
  - Numeric thresholds: numbers
  - Lists: arrays
  - Complex configs: objects
- **Enforcement**: Application layer

## Type Fixing

### Type Mismatches Found

```markdown
- [ ] N/A - No type mismatches found between Prisma and DB schema
```

### Nullability Issues

```markdown
- [ ] N/A - All columns match schema expectations
```

### TODOs: Type Issues

```markdown
- [ ] [P0] **CRITICAL**: Add FK constraint on `tenant_id` → Account(id)
  - **Current**: No FK defined
  - **Should be**: REFERENCES platform.Account(id) ON DELETE CASCADE
  - **Impact**: Orphaned settings, referential integrity broken
  - **Migration needed**: YYYYMMDDHHMMSS_add_settings_account_fk
```

## Queries

### Fetch All Settings for Tenant

```typescript
// Prisma
await prisma.settings.findMany({
  where: {
    tenant_id: tenantId
  },
  orderBy: { setting_key: 'asc' }
});

// SQL
SELECT *
FROM tenant.settings
WHERE tenant_id = $1
ORDER BY setting_key ASC;
```

**Index used**: `settings_tenant_key_idx`

### Fetch Single Setting

```typescript
// Prisma
await prisma.settings.findUnique({
  where: {
    tenant_id_setting_key: {
      tenant_id: tenantId,
      setting_key: 'ui.theme'
    }
  }
});

// SQL
SELECT *
FROM tenant.settings
WHERE tenant_id = $1 AND setting_key = $2;
```

**Index used**: `settings_tenant_key_idx` (unique)

### Upsert Setting

```typescript
// Prisma
await prisma.settings.upsert({
  where: {
    tenant_id_setting_key: {
      tenant_id: tenantId,
      setting_key: 'ui.theme'
    }
  },
  create: {
    tenant_id: tenantId,
    setting_key: 'ui.theme',
    setting_value: '"dark"'
  },
  update: {
    setting_value: '"light"'
  }
});

// SQL
INSERT INTO tenant.settings (tenant_id, setting_key, setting_value)
VALUES ($1, $2, $3)
ON CONFLICT (tenant_id, setting_key)
DO UPDATE SET setting_value = $3, updated_at = now();
```

### Delete All Settings for Tenant

```typescript
// Prisma
await prisma.settings.deleteMany({
  where: {
    tenant_id: tenantId
  }
});

// SQL
DELETE FROM tenant.settings
WHERE tenant_id = $1;
```

⚠️ **Note**: This should be handled by CASCADE when Account is deleted, but FK is missing.

## Gotchas

- **Missing FK**: Setting values can become orphaned if Account is deleted (no CASCADE)
- **JSON typing**: No schema validation on `setting_value` - application must validate
- **Key collisions**: Application must enforce consistent key naming conventions
- **Type safety**: Setting values are JSON - lose type safety vs dedicated columns
- **Index importance**: Queries should always include `tenant_id` to use the composite index

## TODOs

### High Priority

```markdown
- [ ] [P0] **MIGRATION REQUIRED**: Add FK to Account
  - **Current**: `tenant_id` has no FK
  - **Should be**: REFERENCES platform.Account(id) ON DELETE CASCADE
  - **Impact**: Orphaned data, broken referential integrity
  - **Migration**: `YYYYMMDDHHMMSS_add_settings_account_fk`
  - **Assigned**: TBD
  - **Due**: ASAP
```

### Medium Priority

```markdown
- [ ] [P2] Document standard setting keys - current: ad-hoc
- [ ] [P2] Add setting_key validation - prevent typos, enforce conventions
```

### Low Priority

```markdown
- [ ] [P3] Consider settings caching strategy - frequent reads
- [ ] [P3] Add settings change audit trail - track who changed what
```

## Related Tables

- [`Account`](../../platform/Account.md) - ⚠️ **MISSING FK** - Should reference via `tenant_id`
- All tenant tables use `tenant_id` to reference Account (this table should too)

## Related Code

- **Prisma Model**: [`packages/database/prisma/schema.prisma`](../../../packages/database/prisma/schema.prisma#L1979-L1991)
- **Business Logic**: TBD (settings not currently used in codebase)
- **API Routes**: TBD (no settings endpoints yet)
- **Tests**: TBD (no settings tests yet)

## See Also

- **Schema Documentation**: [`../../schemas/02-tenant.md`](../../schemas/02-tenant.md)
- **Schema Overview**: [`../../SCHEMAS.md`](../../SCHEMAS.md)
- **Known Issues**: [`../../KNOWN_ISSUES.md`](../../KNOWN_ISSUES.md)
- **Migration History**: [`../../migrations/README.md`](../../migrations/README.md)

## Migration Required

```markdown
### Add Account Foreign Key

**Current State**:
```prisma
model settings {
  tenant_id     String   @db.Uuid
  // ... other fields
  @@schema("tenant")
}
```

**Required State**:
```prisma
model settings {
  tenant_id     String   @db.Uuid
  account       Account? @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  // ... other fields
  @@schema("tenant")
}

model Account {
  // ... existing fields
  settings      settings[]
}
```

**Migration SQL**:
```sql
ALTER TABLE tenant.settings
ADD CONSTRAINT fk_settings_account
FOREIGN KEY (tenant_id)
REFERENCES platform.Account(id)
ON DELETE CASCADE;
```

**Priority**: P0 - Critical data integrity issue
**Risk**: Low (no existing settings to orphan in production)
**Assigned**: TBD
**Due**: ASAP
```
