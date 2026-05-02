# Known Issues and TODOs

**Database schema problems, TODOs, and future improvements**

Last updated: 2026-05-02

## Summary

- **Total issues tracked**: 7 (4 critical, 3 minor, 3 future improvements)
- **Total TODOs**: 23 actionable items
- **Issues resolved**: 4 (Migration rollback, Role model, Computed DEFAULT, UUID function)
- **Type fixes completed**: 1 (ProposalUpdateData type)

**Note**: `prisma db push` is disabled in this repo. Any references to db push failures below are historical; use `pnpm db:check` + `pnpm db:repair` instead.

## Critical Issues
## Critical Issues

### 1. Composite Foreign Key Constraints Missing in Prisma Schema

**Status**: ⚠️ Partially Fixed (2025-01-29)

**Issue**: Several models have composite foreign key references that are enforced at the database level but not declared in Prisma schema. This causes Prisma to not understand the relationship.

**Affected Models**:
- `EventGuest` → `Event` (composite: `tenant_id, event_id`)
- `AllergenWarning` → `Event` (composite: `tenant_id, event_id`)
- `AllergenWarning` → `Dish` (composite: `tenant_id, dish_id`)

**Current Workaround**:
- FK constraints added in migration `20260129120000_add_foreign_keys`
- Prisma schema has comments explaining the DB-level enforcement
- Application code must handle these relationships manually

**Migration Code**:
```sql
-- From migration 20260129120000_add_foreign_keys/migration.sql
ALTER TABLE tenant_events.event_guests
ADD CONSTRAINT fk_event_guests_event
FOREIGN KEY (tenant_id, event_id)
REFERENCES tenant_events.events(tenant_id, id)
ON DELETE CASCADE;
```

**Prisma Schema Workaround**:
```prisma
model EventGuest {
  // Note: eventId references tenant_events.events(tenant_id, id) - composite FK enforced at DB level
  tenantId  String
  eventId   String
  // Prisma doesn't support composite FKs across multiple columns properly
}
```

**Fix Needed**:
- [ ] Monitor Prisma for composite FK support improvements
- [ ] Consider alternative schema designs if Prisma support doesn't improve
- [ ] Document workaround in all affected model files

---

### 2. Cross-Schema Foreign Key Complexity

**Status**: ⚠️ Known Issue

**Issue**: Complex cross-schema foreign keys create circular dependencies and migration ordering issues.

**Problem Areas**:
- `tenant_events` → `tenant_crm` (Event.clientId, EventContract.clientId)
- `tenant_events` → `tenant_kitchen` (AllergenWarning.dishId)
- `tenant_kitchen` → `tenant_events` (many event-scoped tables)
- `tenant_kitchen` → `tenant_inventory` (containers.locationId → storage_locations)

**Example**:
```prisma
// In tenant_events
model EventContract {
  clientId String @map("client_id")
  // References tenant_crm.clients(tenant_id, id) - cross-schema composite FK
}

// In tenant_kitchen
model AllergenWarning {
  dishId String @map("dish_id")
  // References tenant_kitchen.dishes(tenant_id, id) - cross-schema composite FK
}
```

**Impact**:
- Migrations must be ordered carefully
- Schema changes may require multiple migrations
- FK constraints can't be created until both schemas exist

**Mitigation**:
- All FKs added in `20260129120000_add_foreign_keys` migration after all schemas exist
- Use `DO $$ BEGIN IF NOT EXISTS...` blocks to avoid re-running
- Document cross-schema dependencies in schema comments

**TODO**:
- [ ] Create migration ordering guide
- [ ] Add schema dependency diagram
- [ ] Consider reducing cross-schema FKs where possible

---

### 3. Missing Foreign Key Indexes

**Status**: ⚠️ Performance Risk

**Issue**: Some foreign key columns lack dedicated indexes, causing potential performance issues.

**Affected Columns** (from migration analysis):
- `tenant_events.event_dishes.event_id` - has FK, verify index exists
- `tenant_events.event_dishes.dish_id` - has FK, verify index exists
- `tenant_kitchen.prep_list_items.recipe_version_id` - nullable FK, needs index
- `tenant_kitchen.waste_entries.event_id` - nullable FK, needs index
- `tenant_crm.client_preferences.client_id` - composite FK, needs index

**Impact**:
- Slow JOIN queries on unindexed FKs
- Poor performance on cascading deletes
- N+1 query problems in ORMs

**Fix Needed**:
```sql
-- Add indexes for FK performance
CREATE INDEX IF NOT EXISTS idx_prep_list_items_recipe_version
ON tenant_kitchen.prep_list_items(tenant_id, recipe_version_id)
WHERE recipe_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waste_entries_event
ON tenant_kitchen.waste_entries(tenant_id, event_id)
WHERE event_id IS NOT NULL;
```

**TODO**:
- [ ] Audit all FK columns for missing indexes
- [ ] Add indexes for frequently joined FKs
- [ ] Document index strategy in schema docs

---

### 4. Soft Delete Cascade Issues

**Status**: ⚠️ Design Decision Needed

**Issue**: `ON DELETE CASCADE` at FK level conflicts with soft delete pattern using `deletedAt`.

**Problem**:
- Database FKs with `ON DELETE CASCADE` will hard delete child records
- Soft deletes set `deletedAt` but don't trigger FK cascades
- Child records may become orphans if parent is soft deleted

**Example**:
```prisma
model Event {
  id String @id
  deletedAt DateTime?
}

model EventGuest {
  eventId String
  event Event @relation(..., onDelete: Cascade) // Hard deletes on DB DELETE
}
```

**Scenario**:
1. Soft delete Event (set `deletedAt`)
2. EventGuest records still exist (orphaned)
3. Hard delete Event → EventGuest records cascade deleted
4. But soft deleted Events are never hard deleted

**Current State**:
- Most FKs use `ON DELETE CASCADE` for hard delete safety
- Application must handle soft delete cascades manually
- No automatic cleanup of soft deleted orphans

**Design Options**:

**Option A**: Manual Cascade (Current)
```typescript
async function softDeleteEvent(eventId: string) {
  await prisma.$transaction([
    prisma.eventGuest.deleteMany({ where: { eventId } }),
    prisma.eventContract.deleteMany({ where: { eventId } }),
    prisma.event.update({ where: { id: eventId }, data: { deletedAt: new Date() } })
  ]);
}
```

**Option B**: Database Trigger
```sql
CREATE TRIGGER soft_delete_event_cascade
BEFORE UPDATE OF deleted_at ON tenant_events.events
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
EXECUTE FUNCTION soft_delete_children();
```

**Option C**: Application-Level Cleanup
- Scheduled job to clean up soft deleted orphans
- Query with `WHERE parent.deletedAt IS NULL` to filter orphans
- Accept some orphan data as acceptable

**TODO**:
- [ ] Decide on soft delete cascade strategy
- [ ] Implement chosen solution
- [ ] Document decision in architectural guidelines

---

## Minor Issues

### 5. Migration File Naming Inconsistency

**Status**: ℹ️ Cosmetic Issue

**Issue**: Migration file names have inconsistent patterns.

**Examples**:
- `20260124120000_event_budget_tracking` - descriptive
- `20260129120000_add_foreign_keys` - action-based
- `20260129120001_fix_menus_id_type` - fix-based

**Recommendation**:
- Use descriptive names: `{YYYYMMDDHHMMSS}_{feature}_{description}`
- Avoid "fix" in names (use "adjust" or "update" instead)
- Document migration purpose in file header

---

### 6. Schema Comment Inconsistency

**Status**: ℹ️ Documentation Issue

**Issue**: Not all models have `@@map` comments explaining table purpose.

**Impact**:
- Harder to understand table purpose from schema file
- Auto-generated docs lack context
- New developers must cross-reference with other docs

**Fix Needed**:
- Add header comments to all models
- Document business purpose, not just technical
- Include usage patterns in comments

**Example**:
```prisma
// EventGuest: Guests invited to events with dietary restrictions and attendance
// - Tracks RSVP status, dietary requirements, meal choices
// - Links to Event (tenant_events.events)
// - Composite FK to Event enforced at DB level (tenant_id, event_id)
model EventGuest {
  // ...
}
```

---

### 7. Tenant Column Type Mismatch

**Status**: ℹ️ Design Debt

**Issue**: `tenantId` uses `String` in Prisma but `Uuid` in database.

**Current Schema**:
```prisma
tenantId  String   @map("tenant_id") @db.Uuid
```

**Problem**:
- Type confusion between Prisma type and DB type
- Prisma generates `string` but DB expects UUID format
- Validation happens at DB level, not application level

**Recommendation**:
- Consider using Prisma's `@db.Uuid` consistently
- Add application-level UUID validation
- Document type handling in guidelines

---

## Future Improvements

### 8. Automated Schema Documentation Generation

**Status**: 📋 Planned

**Goal**: Auto-generate table documentation from Prisma schema.

**Approach**:
- Parse Prisma schema file
- Extract models, fields, relations, indexes
- Generate markdown docs in `docs/database/tables/`
- Include FK constraints, indexes, comments

**Implementation**:
- Script to run after migrations: `pnpm docs:generate-db`
- Include in pre-commit hook for schema changes
- Auto-update SCHEMAS.md with new models

**TODO**:
- [ ] Create schema parser script
- [ ] Generate per-table markdown files
- [ ] Add to CI/CD pipeline

---

### 9. Schema Visualization

**Status**: 📋 Planned

**Goal**: Visual entity-relationship diagrams for all schemas.

**Tools**:
- [mermaid](https://mermaid.js.org/) for inline diagrams
- [dbdiagram.io](https://dbdiagram.io/) for interactive ERDs
- [prisma-erd-generator](https://github.com/notiz-dev/prisma-erd-generator)

**Deliverables**:
- Per-schema ERD diagrams
- Cross-schema relationship diagram
- Real-time updated docs on schema change

**TODO**:
- [ ] Choose diagramming tool
- [ ] Generate initial diagrams
- [ ] Add to documentation generation pipeline

---

### 10. Migration Rollback Strategy

**Status**: 📋 Needed

**Issue**: No documented rollback strategy for failed migrations.

**Current State**:
- Prisma Migrate can roll back but requires manual intervention
- No automatic rollback on failure
- Down migrations not consistently maintained

**Needed**:
- Document rollback procedure for each migration
- Test rollback paths in development
- Consider migration transaction strategy

**TODO**:
- [ ] Document rollback procedures
- [ ] Add rollback testing to migration workflow
- [ ] Create emergency rollback runbook

---

## Worked Example: Migration Divergence + Naming Mismatch (2026-05-02)

**Status**: ✅ RESOLVED — recovery completed without data loss. Read this before
authoring any migration that touches `tenant_staff` or any PascalCase table.

**What broke**:

`pnpm db:deploy` failed with `P3018: relation "tenant_staff.users" does not exist`
on migration `20260429140000_add_rls_missing_tables`. Two compounding issues:

1. **Naming mismatch (root cause)**. The migration's hand-written SQL used
   `"tenant_staff"."users"`, but the Prisma schema declares
   `model User { … @@map("employees") @@schema("tenant_staff") }`. The
   actual table is `tenant_staff.employees`. Prisma had no chance to catch
   this — `pnpm db:deploy` doesn't validate raw SQL against the schema,
   only `pnpm db:dev` does (via the shadow database).
2. **Bookkeeping divergence**. `_prisma_migrations` had 3 rows for migration
   folders that no longer existed on disk
   (`20260306010000_expense_workflow`, two `repair_drift` rows). One folder
   (`20260314124800_repair_drift`) was recoverable from `git stash@{5}`.
   The other two were unrecoverable.

**A second mismatch surfaced** after the first patch deployed: the same
migration referenced `"tenant_staff"."employee_deductions"` but
`model EmployeeDeduction` has **no** `@@map` directive — so the actual
table is `tenant_staff.EmployeeDeduction` (PascalCase, because Prisma
defaults to model name verbatim).

**Recovery path (no data loss)**:

1. Patched the migration SQL to use the real table names
   (`tenant_staff.employees`, `tenant_staff.EmployeeDeduction`) plus all
   policy/trigger names that referenced them.
2. Recovered the missing `20260314124800_repair_drift` folder from the
   untracked stash tree:
   `git show stash@{5}^3:packages/database/prisma/migrations/20260314124800_repair_drift/migration.sql > <path>`
   (untracked stash files live at `stash@{N}^3`, not in the main stash tree).
3. Marked the failed migration rolled-back via
   `pnpm migrate:resolve --rolled-back 20260429140000_add_rls_missing_tables`.
4. Deleted the 2 unrecoverable bookkeeping rows from `_prisma_migrations`
   (verified `applied_steps_count = 0` first; required explicit user
   approval per Prisma's history-edit guidance).
5. Re-ran `pnpm db:deploy` → all 3 pending migrations applied; `pnpm db:check`
   exit 0; `migrate status` shows "Database schema is up to date!" (85
   migrations).

**Lessons applied**:

- 4 PascalCase outliers locked in with `@@map`: `Tenant`, `ActivityFeed`,
  `EmployeeDeduction`, `OutboxEvent`. This makes future hand-written SQL
  fail at the schema layer (you'll see the explicit `@@map("EmployeeDeduction")`
  in the schema before grepping for the table) and pre-empts the same
  inconsistency from spreading.
- `CLAUDE.md` now has a "Database & Migrations" section pointing at
  `docs/database/CONTRIBUTING.md` with hard rules: never hand-author
  migration folders, always check `@@map` before writing raw SQL, never
  edit applied migrations, restoration before deletion when
  `_prisma_migrations` is corrupt.

**Pre-flight checklist for raw-SQL migrations**:

- [ ] Every `"<schema>"."<table>"` in your SQL matches a real table — confirm
      via `\d <schema>.<table>` or
      `SELECT … FROM information_schema.tables WHERE …`.
- [ ] For each Prisma model you touch, grep its block for `@@map(`. If
      present, the table name is the value. If absent, the table name is the
      model name verbatim (PascalCase if the model is PascalCase).
- [ ] Author the migration via `pnpm db:dev --create-only --name <name>`.
      Hand-written folders bypass Prisma's shadow-DB validation that would
      have caught both mismatches above at authoring time.
- [ ] Run `pnpm db:check` after `pnpm db:deploy`, not just before.

---

## Legacy Issues (Resolved)

### ✅ Migration `20260126150456_add_menu_models` Rollback

**Status**: RESOLVED (2025-01-29)

**Issue**: Menu models migration added but caused FK issues, was rolled back.

**Resolution**:
- Migration deleted from `prisma/migrations/`
- New migration `20260129120001_fix_menus_id_type` created
- Proper FK constraints added in `20260129120000_add_foreign_keys`

**Lessons Learned**:
- Test FK constraints before committing migrations
- Ensure target tables exist before adding FKs
- Use composite FKs for tenant tables

---

## Issue Template

**When adding new issues, use this template**:

```markdown
### N. [Issue Title]

**Status**: ⚠️ Known Issue | ℹ️ Documentation Issue | 📋 Planned | ✅ Resolved

**Issue**: [One-line description]

**Affected Models/Tables**:
- `Model1`
- `Model2`

**Impact**:
- Performance / Security / Data integrity / DX

**Current State**:
[What's happening now]

**Fix Needed**:
```sql/prisma
[Code snippet of fix]
```

**TODO**:
- [ ] Action item 1
- [ ] Action item 2
```

---

## Related Documentation

- **Schema Overview**: `docs/database/SCHEMAS.md`
- **Migration History**: `docs/database/migrations/`
- **Prisma Schema**: `packages/database/prisma/schema.prisma`
- **Schema Contract**: `docs/legacy-contracts/schema-contract-v2.txt`

---

## Legacy Issues (Resolved)

### ✅ Role Model Field Naming Convention (2025-01-30)

**Status**: RESOLVED

**Issue**: Role model used snake_case field names directly instead of camelCase with `@map` annotations.

**Problem**:
- Used `tenant_id`, `is_active`, `created_at` as field names
- Broke the established pattern of camelCase TypeScript with `@map` to snake_case
- Caused TypeScript API inconsistencies
- Led to Prisma validation errors

**Resolution**:
- Converted all fields to camelCase with proper `@map` annotations
- Added missing `updatedAt`, `deletedAt`, `roleId` fields
- Fixed relation references to use Prisma field names
- See `docs/database/SCHEMA_FIXES.md` for details

**Lessons Learned**:
- ALL models must use camelCase field names
- Use `@map("snake_case")` for database column mapping
- Never use snake_case directly in Prisma schema

---

### ✅ Computed DEFAULT Column Constraint (2025-01-30)

**Status**: RESOLVED

**Issue**: `InventoryTransaction.total_cost` used `@default(dbgenerated("(quantity * unit_cost)"))`

**Problem**:
- PostgreSQL does not allow column references in DEFAULT expressions
- Caused schema application failures (db push is disabled; use `pnpm db:check` + `pnpm db:repair`)

**Resolution**:
- Removed computed DEFAULT expression
- Field is now nullable without default
- Application must compute total_cost on write
- See `docs/database/SCHEMA_FIXES.md` for details

**Lessons Learned**:
- PostgreSQL does not support computed DEFAULT columns
- Use application-level computation or triggers for derived values
- Consider generated columns (PostgreSQL 12+) for read-only computed fields

---

### ✅ UUID Generation Function (2025-01-30)

**Status**: RESOLVED

**Issue**: `documents` model used `uuid_generate_v4()` which requires `uuid-ossp` extension

**Problem**:
- `uuid-ossp` extension may not be available on all PostgreSQL platforms
- Neon/managed PostgreSQL may not have this extension enabled
- Caused migration failures

**Resolution**:
- Replaced all `uuid_generate_v4()` with `gen_random_uuid()`
- `gen_random_uuid()` is native to PostgreSQL 13+
- Works reliably on Neon and other managed platforms
- See `docs/database/SCHEMA_FIXES.md` for details

**Lessons Learned**:
- Always use `gen_random_uuid()` for new code
- Avoid extension-dependent functions when possible
- Test schema changes on target platform early
