# Known Issues and TODOs

**Active database issues and actionable TODOs**

Last updated: 2025-02-07

> **Note**: For general database architecture questions, patterns, and decisions, see [README.md](./README.md).
> This file tracks ONLY active issues and TODOs that need resolution.

---

## Summary

- **Active Critical Issues**: 4
- **Active Minor Issues**: 2
- **Future Improvements**: 3
- **Total Actionable TODOs**: 16

---

## Critical Issues

### 1. Composite Foreign Key Constraints - Prisma Limitation

**Status**: ⚠️ Known Limitation - No Fix Available

**Issue**: Prisma doesn't fully support composite foreign keys in schema syntax. FKs are enforced at database level but not reflected in Prisma client types.

**Affected Models**:
- `EventGuest` → `Event` (composite: `tenant_id, event_id`)
- `AllergenWarning` → `Event` (composite: `tenant_id, event_id`)
- `AllergenWarning` → `Dish` (composite: `tenant_id, dish_id`)

**Current Workaround**:
- FK constraints added manually in migration `20260129120000_add_foreign_keys`
- Prisma schema has comments documenting DB-level FKs
- Application code handles these relationships manually

**TODOs**:
- [ ] Monitor [Prisma GitHub](https://github.com/prisma/prisma/issues/12350) for composite FK support
- [ ] Document workaround in all affected model files with comments

---

### 2. Cross-Schema Foreign Key Complexity

**Status**: ⚠️ Architectural Constraint

**Issue**: Cross-schema foreign keys create migration ordering dependencies.

**Problem Areas**:
- `tenant_events` ↔ `tenant_crm` (bidirectional references)
- `tenant_events` ↔ `tenant_kitchen` (event-scoped operations)
- `tenant_kitchen` ↔ `tenant_inventory` (prep tasks reference storage)

**Mitigation**:
- All cross-schema FKs added in single migration `20260129120000_add_foreign_keys` after all schemas exist
- Use `DO $$ BEGIN IF NOT EXISTS...` blocks for idempotency

**TODOs**:
- [ ] Create migration ordering guide in `docs/workflows/`
- [ ] Add schema dependency diagram to README
- [ ] Audit for unnecessary cross-schema FKs that can be removed

---

### 3. Missing Foreign Key Indexes

**Status**: ⚠️ Performance Risk

**Issue**: Some FK columns lack indexes, causing slow JOIN queries.

**Affected Columns**:
- `tenant_kitchen.prep_list_items.recipe_version_id` - nullable FK
- `tenant_kitchen.waste_entries.event_id` - nullable FK
- `tenant_crm.client_preferences.client_id` - composite FK
- `tenant_events.event_dishes.dish_id` - composite FK

**Fix Needed**:
```sql
-- Add indexes for FK performance
CREATE INDEX IF NOT EXISTS idx_prep_list_items_recipe_version
ON tenant_kitchen.prep_list_items(tenant_id, recipe_version_id)
WHERE recipe_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_waste_entries_event
ON tenant_kitchen.waste_entries(tenant_id, event_id)
WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_preferences_client
ON tenant_crm.client_preferences(tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_event_dishes_dish
ON tenant_events.event_dishes(tenant_id, dish_id);
```

**TODOs**:
- [ ] Audit all FK columns for missing indexes using query plan analysis
- [ ] Create migration to add missing FK indexes
- [ ] Document index strategy for future FKs

---

### 4. Soft Delete Cascade Strategy

**Status**: ⚠️ Design Decision Needed

**Issue**: Database `ON DELETE CASCADE` conflicts with soft delete pattern (`deletedAt`).

**Problem**:
- Database FKs cascade on **hard** deletes
- Soft deletes (setting `deletedAt`) don't trigger FK cascades
- Child records become orphans when parent is soft deleted

**Current State**:
- Application must manually cascade soft deletes
- No automatic cleanup of orphaned soft-deleted children

**Design Options**:

**Option A**: Manual Cascade in Application Code (Current)
```typescript
async function softDeleteEvent(eventId: string, tenantId: string) {
  await prisma.$transaction([
    // Soft delete children first
    prisma.eventGuest.updateMany({
      where: { eventId, tenantId },
      data: { deletedAt: new Date() }
    }),
    // Then soft delete parent
    prisma.event.update({
      where: { id: eventId, tenantId },
      data: { deletedAt: new Date() }
    })
  ]);
}
```

**Option B**: Database Triggers
```sql
CREATE TRIGGER soft_delete_event_cascade
BEFORE UPDATE OF deleted_at ON tenant_events.events
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
EXECUTE FUNCTION fn_soft_delete_cascade_event_children();
```

**Option C**: Accept Orphans + Scheduled Cleanup
- Allow orphaned children
- Filter with `WHERE parent.deletedAt IS NULL` in queries
- Run periodic cleanup job for very old soft-deleted orphans

**TODOs**:
- [ ] **DECISION REQUIRED**: Choose soft delete cascade strategy
- [ ] Implement chosen solution across all cascading relationships
- [ ] Document decision in README.md and AGENTS.md
- [ ] Add tests for soft delete cascade behavior

---

## Minor Issues

### 5. Schema Comment Inconsistency

**Status**: ℹ️ Documentation Debt

**Issue**: Not all Prisma models have header comments explaining purpose and relationships.

**Impact**: Harder for new developers to understand schema intent.

**TODOs**:
- [ ] Add header comments to all models following this template:
  ```prisma
  // EventGuest: Tracks guests invited to events with dietary restrictions
  // - Links to Event via composite FK (tenant_id, event_id)
  // - Stores RSVP status, dietary requirements, meal choices
  // - Soft delete enabled
  model EventGuest {
    // ...
  }
  ```

---

### 6. Migration Doc Completeness

**Status**: ℹ️ Documentation Gap

**Issue**: 7 recent migrations lack documentation files.

**Missing Docs** (sequential numbering 0014-0020):
1. `20260201000000_event_detail_fields`
2. `20260201010000_add_recipe_version_instructions`
3. `20260202000000_add_recipe_version_instructions`
4. `20260203000000_recipe_version_base_fields`
5. `20260203214030_repair_drift`
6. `20260203220243_repair_drift`
7. `20260205000000_admin_tasks`
8. `20260206023831_repair_drift`

**TODOs**:
- [ ] Create docs for missing migrations using template in `docs/database/_templates/migration-doc-template.md`
- [ ] Ensure all future migrations are documented before merging

---

## Future Improvements

### 7. Automated Schema Documentation

**Goal**: Auto-generate table documentation from Prisma schema.

**TODOs**:
- [ ] Create script to parse Prisma schema
- [ ] Generate per-table markdown files in `docs/database/tables/`
- [ ] Add to CI/CD pipeline
- [ ] Implement `pnpm docs:generate-db` command

---

### 8. Schema Visualization (ERD Diagrams)

**Goal**: Visual entity-relationship diagrams for all schemas.

**TODOs**:
- [ ] Choose tool: mermaid vs dbdiagram.io vs prisma-erd-generator
- [ ] Generate per-schema ERD diagrams
- [ ] Create cross-schema relationship diagram
- [ ] Add to docs and keep updated

---

### 9. Migration Rollback Documentation

**Goal**: Documented rollback procedures for all migrations.

**TODOs**:
- [ ] Document rollback procedure for each migration type
- [ ] Create emergency rollback runbook
- [ ] Test rollback paths in development environment
- [ ] Add rollback testing to migration workflow

---

## How to Log New Issues

When encountering a database issue:

1. **Check if it's answered in README.md first** - architecture questions go there
2. **Use this template** for new issues:

```markdown
### N. [Issue Title]

**Status**: ⚠️ Critical | ℹ️ Minor | 📋 Planned

**Issue**: [One-line description]

**Affected Tables/Models**:
- `TableName` in `schema_name`

**Impact**: [Performance | Security | Data Integrity | DX]

**Current State**: [What's happening now]

**Fix Needed**:
\`\`\`sql
-- Code snippet
\`\`\`

**TODOs**:
- [ ] Action item 1
- [ ] Action item 2
```

3. **Add to appropriate section** (Critical, Minor, or Future)
4. **Update summary** at top of file

---

## Related Files

- **Architecture & Decisions**: [README.md](./README.md)
- **Workflow**: [docs/workflows/database.md](../../docs/workflows/database.md)
- **Schema Registry**: [schema-registry-v2.txt](./schema-registry-v2.txt)
- **Migration Checklist**: [DATABASE_PRE_MIGRATION_CHECKLIST.md](./DATABASE_PRE_MIGRATION_CHECKLIST.md)
- **Prisma Schema**: [prisma/schema.prisma](./prisma/schema.prisma)

---

Last updated: 2025-02-07
