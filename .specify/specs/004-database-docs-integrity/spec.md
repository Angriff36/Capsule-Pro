# Feature Specification: Database Documentation and Integrity Fixes

Feature ID: 004
Status: Draft
Constitution Version: 1.0.0

## 1. Overview

### 1.1 Goal
Create comprehensive, living documentation for the entire Convoy database schema in `docs/database/` with:
- Rich schema-level documentation explaining purpose, goals, rules, and design decisions
- Individual table documentation for all 118 tables
- Integrated type fixing to eliminate `any` types across the codebase
- Migration TODOs tracking for all schema inconsistencies
- Living metadata (first_documented, last_updated, last_verified_by) on every file

### 1.2 Problem Statement
The Convoy database has evolved organically with minimal documentation:
- **No comprehensive schema documentation** explaining purpose, relationships, and constraints
- **6000+ `any` types** scattered through the codebase (type safety erosion)
- **Critical integrity issues**: `OutboxEvent`, `settings`, `documents` have `tenant_id` but NO foreign keys
- **Inconsistent naming**: `OutboxEvent` uses `tenantId` (camelCase) instead of `tenant_id` (snake_case)
- **Lost context**: Original design decisions aren't documented, causing repeated debates

### 1.3 Success Metrics
- **100% schema coverage**: All 9 schemas have rich documentation with purpose/goals/rules
- **100% table coverage**: All 118 tables have individual documentation files
- **Type safety improvement**: Fix 100+ `any` types with proper Prisma types
- **Migration backlog**: All schema inconsistencies have tracked migration TODOs
- **Living documentation**: Each file has metadata showing when documented/updated/verified

## 2. Constitution Alignment

### 2.1 Relevant Principles

| Principle | Section | Alignment |
|-----------|---------|-----------|
| [MUST] Multi-tenant with tenant_id | C§2.1 | Documentation must explain tenant isolation patterns |
| [MUST] Use Prisma + Neon | C§2.1 | Docs reference Prisma-generated types for type fixing |
| [MUST] Soft deletes | C§2.1 | Docs explain deleted_at pattern usage |
| [SHOULD] Type safety | C§2.2 | Type fixing side task enforces this principle |
| [SHOULD] Document changes | AGENTS.MD | Living docs pattern ensures docs stay current |

### 2.2 Technology Constraints
- Prisma 7.1.0 ORM with multi-schema PostgreSQL database
- Neon database (not Supabase)
- TypeScript 5.9+ with strict type checking
- Next.js 16 with App Router

## 3. Directory Structure

```
docs/database/ (160+ files)
├── README.md (root index with overview)
├── SCHEMAS.md (all schemas overview with links)
├── KNOWN_ISSUES.md (FK problems, naming issues, TODOs)
├── CONTRIBUTING.md (how to update documentation)
├── schemas/ (9 schema index files with TOCs and links)
│   ├── 00-platform.md
│   ├── 01-core.md
│   ├── 02-tenant.md
│   ├── 03-tenant_admin.md
│   ├── 04-tenant_crm.md
│   ├── 05-tenant_events.md
│   ├── 06-tenant_inventory.md
│   ├── 07-tenant_kitchen.md
│   └── 08-tenant_staff.md
├── tables/ (118 individual table .md files organized by schema)
│   ├── platform/ (5 tables)
│   ├── core/ (15 types)
│   ├── tenant/ (4 tables)
│   ├── tenant_admin/ (11 tables)
│   ├── tenant_crm/ (7 tables)
│   ├── tenant_events/ (17 tables)
│   ├── tenant_inventory/ (15 tables)
│   ├── tenant_kitchen/ (18 tables)
│   └── tenant_staff/ (14 tables)
├── migrations/ (16 migration docs with explanations)
│   ├── README.md (index)
│   └── {migration_id}-{description}.md
├── enums/ (12 enum docs)
│   ├── README.md (all enums overview)
│   └── {enum_name}.md
└── hooks/ (validation scripts)
    ├── validate-table-docs.js
    ├── validate-migration-docs.js
    └── sync-docs-with-schema.js
```

## 4. Schema-Level Documentation Requirements

Each schema file (e.g., `docs/database/schemas/05-tenant_events.md`) MUST include:

### Required Sections
1. **Purpose & Domain** - What this schema is for, what business domain it serves
2. **Long-term Goals** - Vision for this schema, what it should enable
3. **Rules & Conventions** - Patterns that MUST be followed (MUST/SHOULD/NEVER)
4. **Key Design Decisions** - Why certain patterns were chosen with rationale
5. **Anti-Patterns to Avoid** - Common mistakes when working with this schema
6. **Relation Patterns** - How this schema connects to others
7. **Data Lifecycle** - How data flows through this schema (create → update → delete)
8. **Performance Considerations** - Query patterns, indexes, hot tables
9. **TODOs** - Migration-required changes with priority and tracking

### Table of Contents
Quick reference table listing all tables with:
- Table name (linked to individual table doc)
- Purpose (one-line description)
- Relations (key relationships)
- Status (✅ Stable / ⚠️ Needs Review / ❌ Broken)

## 5. Table-Level Documentation Requirements

Each table file (e.g., `docs/database/tables/tenant_events/Event.md`) MUST include:

### Frontmatter (Required)
```yaml
---
first_documented: 2025-01-29
last_updated: 2025-01-29
last_verified_by: agent-id
status: stable | needs-review | broken
---
```

### Required Sections
1. **Overview** - What this table stores, why it exists
2. **Schema Reference** - Schema name, table name, primary key, soft deletes
3. **Column Reference** - Complete table with: Column | Type | Nullable | Default | Purpose
4. **Prisma Type** - TypeScript type usage example
5. **Relations** - Outgoing (this → others) and incoming (others → this)
6. **Business Rules** - Validation rules, constraints, state machines
7. **Type Fixing Targets** - Related files with `any` types to fix
8. **Common Queries** - Example Prisma queries for this table
9. **Migration TODOs** - Any schema inconsistencies requiring migrations

## 6. Type Fixing Integration

### Side Task for Each Table Documentation Task

Every table documentation task MUST include a type fixing side task:

**Do:**
1. Find related code files using `grep -r "database.{tableLower}" apps/app/`
2. Identify `any` types in those files
3. Replace with proper Prisma-generated types
4. List files checked and types fixed
5. Update global type fix counter in `.progress.md`

**Target:** ~5-10 `any` types fixed per table task

**Tracking:**
```markdown
## Type Fixing (Side Task)

### Files to Update
- `apps/app/app/(authenticated)/events/actions.ts`
- `apps/app/app/api/events/[eventId]/route.ts`

### Types Fixed This Session
- [ ] actions.ts: event → Event
- [ ] actions.ts: data → Prisma.EventCreateInput
- [ ] route.ts: event → Event | null

**Running Total:** ___ any types fixed across all tasks
```

## 7. Migration TODO Pattern

All schema inconsistencies MUST be documented as migration TODOs:

```markdown
## TODOs (Require Migrations)

### [MIGRATION] Fix {Table}.{Column} Foreign Key

**Issue:** {description of the problem}

**Impact:** {what can go wrong because of this}

**Required Migration:**
```sql
-- Migration: {migration_name}
{SQL to fix the issue}
```

**Priority:** HIGH | MEDIUM | LOW
**Complexity:** HIGH | MEDIUM | LOW
**Tracking:** [FEATURE-004-TXXX]
```

## 8. Known Issues to Document

### Critical (HIGH Priority)

1. **OutboxEvent.tenantId** - NO FK to platform.accounts, uses camelCase
2. **settings.tenant_id** - NO FK to platform.accounts
3. **documents.tenant_id** - NO FK to platform.accounts

### Naming Inconsistencies (MEDIUM Priority)

1. **Event.venue_id vs Event.location_id** - Both reference Location table, unclear purpose
2. **OutboxEvent column naming** - Uses camelCase instead of snake_case

### Missing Relations (MEDIUM Priority)

1. **EventGuest.event_id** - No FK to Event
2. **EventContract.event_id** - No FK to Event
3. Various tenant_events tables missing FKs

## 9. Scope

### In Scope
- Document all 9 schemas with rich explanations
- Document all 118 tables individually
- Fix `any` types in database-related code (target: 100+ fixes)
- Create migration TODOs for all identified issues
- Create migration documentation for all 16 migrations
- Document all 12 enums
- Create validation hooks for documentation completeness

### Out of Scope
- Actually executing the migrations (document only, don't apply)
- Fixing schema inconsistencies in this feature (tracked as TODOs for future)
- Creating new database objects (documentation only)
- Performance optimization beyond documenting current state

## 10. Ralph Loop Structure

### Total Tasks: ~220 tasks across 45 iterations

**Phase Breakdown:**
- Phase 1: Foundation (3 iterations) - Directory structure, templates, root docs
- Phase 2: Schema docs (9 iterations) - One schema per iteration with rich documentation
- Phase 3: Table docs (18 iterations) - Tables grouped by schema with type fixing
- Phase 4: Migration docs (4 iterations) - All migrations documented
- Phase 5: Enum docs (2 iterations) - All enums documented
- Phase 6: Hooks (2 iterations) - Validation scripts implemented
- Phase 7: Validation (7 iterations) - Cross-checks and quality gates

### Parallelization Strategy

**Within Phases:**
- Schema docs: Can run 2-3 in parallel (different schemas)
- Table docs: Can run multiple within same schema (different tables)
- Migration docs: Group by dependency, run in parallel where safe

**Sequential Dependencies:**
- Foundation must complete before any docs
- Schema doc should complete before its tables
- Verification phases run at end

## 11. Dependencies

### Internal Dependencies
- `packages/database/prisma/schema.prisma` - Source of truth for database structure
- Existing code in `apps/app/app/(authenticated)/{module}/` - Type fixing targets
- Migration files in `packages/database/prisma/migrations/` - Documentation source

### External Dependencies
- None (all documentation generation)

## 12. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 6000+ `any` types overwhelming | Medium | High | Start with high-value tables, fix incrementally |
| Schema changes during documentation | Medium | Medium | Living metadata pattern handles updates |
| Migration TODOs create large backlog | Low | High | Prioritize by severity, track in separate system |
| Type fixes break existing code | Medium | Low | Run tests after each task, commit frequently |

## 13. Open Questions

- [ ] What to do with `Event.budget` column (deprecated in favor of EventBudget)?
- [ ] Should event_number generation be added (nice-to-have)?
- [ ] How to handle JSON fields in documentation (BattleBoard.board_data)?
- [ ] Should we create visualization tools for schema relationships?

## Appendix

### A. Related Files
- `packages/database/prisma/schema.prisma` - Database schema (2770 lines)
- `docs/legacy-contracts/schema-contract-v2.txt` - Multi-tenancy rules
- `docs/legacy-contracts/schema-registry-v2.txt` - Table registry
- `apps/app/app/(authenticated)/{module}/` - Type fixing targets

### B. References
- Constitution: `.specify/memory/constitution.md`
- Schema contract: `docs/legacy-contracts/schema-contract-v2.txt`
- AGENTS.MD: Type fixing guidelines

### C. Planning Files
- Task Plan: `claude-code-plans/task_plan.md`
- Notes: `claude-code-plans/notes.md`
- Investigation Report: `claude-code-plans/database-zod-alignment-report.md`
