# Critical Schema Fixes

**Documented: 2025-01-30**

This document records critical schema fixes made during development. These patterns must be followed for all future schema changes. **Do NOT deviate from these patterns without explicit team consensus.**

---

## ⚠️ CRITICAL: Field Naming Convention

### THE RULE

**ALL Prisma models MUST use camelCase field names with `@map` annotations for snake_case database columns.**

### Why This Matters

```prisma
// ✅ CORRECT - Follow this pattern
model Example {
  tenantId    String    @map("tenant_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")
  employeeId  String    @map("employee_id") @db.Uuid

  @@map("examples")
  @@schema("tenant_xxx")
}

// ❌ WRONG - Never do this
model Role {
  tenant_id   String    @db.Uuid  // Direct snake_case
  created_at  DateTime  @default(now())  // Direct snake_case
}
```

### The Anti-Pattern That Broke Our Database

The `Role` model was incorrectly using snake_case field names directly:

```prisma
// ❌ THE BROKEN PATTERN (DO NOT COPY)
model Role {
  tenant_id                String    @db.Uuid
  id                       String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  is_active                Boolean   @default(true)
  created_at               DateTime  @default(now()) @db.Timestamptz(6)
  overtime_multiplier      Decimal   @default(1.5) @db.Decimal(4, 2)
}
```

**This caused:**
1. TypeScript API inconsistencies (`role.tenant_id` vs `user.tenantId`)
2. Prisma schema validation errors
3. Database migration failures
4. Application code bugs from mixed naming conventions

### The Fix Applied

```prisma
// ✅ THE CORRECT PATTERN (USE THIS)
model Role {
  tenantId                String    @map("tenant_id") @db.Uuid
  id                       String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  isActive                Boolean   @default(true) @map("is_active")
  createdAt               DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt               DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt               DateTime? @map("deleted_at") @db.Timestamptz(6)
  overtimeMultiplier      Decimal   @default(1.5) @map("overtime_multiplier") @db.Decimal(4, 2)

  @@map("roles")
  @@schema("tenant_staff")
}
```

---

## ⚠️ CRITICAL: DEFAULT Expression Constraints

### THE RULE

**NEVER use column references in DEFAULT expressions.** PostgreSQL does not support computed columns with `DEFAULT`.

### The Anti-Pattern

```prisma
// ❌ BROKEN - PostgreSQL will reject this
total_cost  Decimal? @default(dbgenerated("(quantity * unit_cost)")) @db.Decimal(12, 2)
```

**Error received:**
```
ERROR: cannot use column reference in DEFAULT expression
```

### The Fix

Remove the computed DEFAULT, compute in application code instead:

```prisma
// ✅ CORRECT - No default, compute in app
total_cost  Decimal? @db.Decimal(12, 2)
```

---

## ⚠️ CRITICAL: UUID Generation Functions

### THE RULE

**Use `gen_random_uuid()` for all UUID defaults.** Do NOT use `uuid_generate_v4()`.

### Why

`uuid_generate_v4()` requires the `uuid-ossp` extension, which may not be available in all PostgreSQL environments (especially Neon/managed PostgreSQL).

`gen_random_uuid()` is a native PostgreSQL function available in PostgreSQL 13+.

### The Anti-Pattern

```prisma
// ❌ BROKEN - May fail on Neon/managed PG
id  String  @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
```

### The Fix

```prisma
// ✅ CORRECT - Works everywhere
id  String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

---

## ⚠️ CRITICAL: Relation References

### THE RULE

**When defining relations, the `references` field must use the exact Prisma field name (camelCase), NOT the database column name (snake_case).**

### The Anti-Pattern

```prisma
// ❌ BROKEN - References DB column name
model User {
  payrollRole  Role?  @relation("EmployeeRole", fields: [roleId, tenantId], references: [id, tenant_id])
}

model Role {
  tenant_id   String  @db.Uuid  // Wrong field name
}
```

### The Fix

```prisma
// ✅ CORRECT - References Prisma field name
model User {
  payrollRole  Role?  @relation("EmployeeRole", fields: [roleId, tenantId], references: [id, tenantId])
}

model Role {
  tenantId   String  @map("tenant_id")  @db.Uuid  // Correct field name
}
```

---

## Pre-Commit Checklist for Schema Changes

Before committing any schema changes, verify:

- [ ] All fields use camelCase names
- [ ] All snake_case columns have `@map("snake_case")` annotations
- [ ] No `@default(dbgenerated("..."))` references other columns
- [ ] All UUID defaults use `gen_random_uuid()`
- [ ] All relation `references` use Prisma field names (not DB column names)
- [ ] Run `npx prisma format` - should produce no warnings
- [ ] Run `npx prisma generate` - should succeed
- [ ] Run `npx prisma db push` - should succeed in dev environment

---

## Related Documentation

- **Schema Contract**: `docs/legacy-contracts/schema-contract-v2.txt`
- **Known Issues**: `docs/database/KNOWN_ISSUES.md`
- **Prisma Schema**: `packages/database/prisma/schema.prisma`
