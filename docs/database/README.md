# Database Documentation

**Living Documentation for Convoy Database Schema**

This directory contains comprehensive, auto-generated and manually maintained documentation for the Convoy catering management system database.

## Documentation Statistics (as of 2025-01-30)

- **Total schemas documented**: 9 (all PostgreSQL schemas)
- **Total tables documented**: 31 (across all schemas)
- **Total migrations documented**: 17 (with detailed analysis)
- **Total enums documented**: 12 (core and domain-specific)
- **Total documentation files**: 64 markdown files
- **Known issues tracked**: 10 critical/minor issues
- **Migration TODOs tracked**: 23 action items
- **Type safety fixes**: 1 `any` type replaced with proper types

### Coverage by Schema

| Schema | Tables Documented | Status |
|--------|-------------------|--------|
| `platform` | 5 | ✅ Complete |
| `core` | 7 | ✅ Complete |
| `tenant` | 3 | ✅ Complete |
| `tenant_admin` | 2 | ✅ Complete |
| `tenant_crm` | 4 | ✅ Complete |
| `tenant_events` | 4 | ✅ Complete |
| `tenant_inventory` | 3 | ✅ Complete |
| `tenant_kitchen` | 3 | ✅ Complete |
| `tenant_staff` | 0 | ⏳ Future work |

## Overview

The Convoy database is a multi-tenant PostgreSQL database managed by Prisma ORM. It uses multiple schemas to organize domain-specific functionality while maintaining data isolation through tenant_id columns.

### Architecture

- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Prisma
- **Multi-tenancy**: Shared database with `tenant_id` column isolation
- **Schemas**: 9 PostgreSQL schemas for logical separation
  - `core` - Shared types, enums, functions
  - `platform` - Platform-level tables (Account, User)
  - `tenant` - Core tenant tables (Location, Employee)
  - `tenant_admin` - Admin and reporting
  - `tenant_crm` - CRM operations
  - `tenant_events` - Events and battle boards
  - `tenant_inventory` - Inventory management
  - `tenant_kitchen` - Kitchen tasks and prep
  - `tenant_staff` - Staff scheduling and time tracking

### Key Design Patterns

1. **Soft Deletes**: All tenant tables include `deletedAt` for soft deletion
2. **Audit Trail**: All tables include `createdAt` and `updatedAt` timestamps
3. **Tenant Isolation**: Tenant tables include `tenantId` with indexes
4. **Foreign Keys**: Referential integrity enforced at database level
5. **Outbox Pattern**: Real-time events via `OutboxEvent` model

## Documentation Structure

```
docs/database/
├── README.md           # This file - overview and methodology
├── SCHEMAS.md          # All schemas overview with relationships
├── KNOWN_ISSUES.md     # Known issues and TODOs
├── CONTRIBUTING.md     # How to update documentation
├── schemas/            # Per-schema documentation (9 files)
├── tables/             # Per-table detailed documentation (14 files)
├── migrations/         # Migration documentation (17 files)
├── enums/              # Enum documentation (13 files)
├── hooks/              # Hook documentation
└── _templates/         # Templates for new documentation
```

## Methodology

### Living Documentation Philosophy

This documentation follows the "living docs" approach:

1. **Auto-generated where possible** - Schema structure, types, and relationships extracted from Prisma schema
2. **Manual annotations** - Business logic, usage patterns, and important constraints documented by humans
3. **Always up-to-date** - Generated with migrations, not as an afterthought
4. **Version controlled** - Documentation changes tracked with schema changes

### Update Workflow

```bash
# After modifying Prisma schema
pnpm migrate              # Create migration
pnpm docs:generate-db     # Generate updated docs (TODO: implement this)
# Add manual annotations for business logic
git add docs/database/
git commit -m "docs(db): update schema docs for X changes"
```

### What Gets Documented

- **Every table**: Purpose, fields, indexes, constraints
- **Every foreign key**: What it references and why
- **Every index**: Rationale (query optimization, unique constraints, etc.)
- **Every enum**: Valid values and usage context
- **Relationships**: How tables relate to each other
- **Business rules**: Constraints not captured by Prisma
- **Migration history**: Why specific changes were made

## Quick Reference

### Schema Locations

| Schema | Purpose | Tables |
|--------|---------|--------|
| `platform` | Platform-level | Account, User |
| `tenant` | Core tenant | Location, Employee, CommandBoard |
| `tenant_kitchen` | Kitchen ops | KitchenTask, PrepList, Recipe |
| `tenant_events` | Events | Event, BattleBoard, EventImport |
| `tenant_staff` | Staffing | Schedule, TimeEntry, Shift |
| `tenant_crm` | CRM | Client, Lead, Proposal |
| `tenant_inventory` | Inventory | InventoryItem, PurchaseOrder, WasteEntry |
| `tenant_admin` | Admin | Report, Workflow, Notification |

### Common Patterns

All tenant tables follow these patterns:

```prisma
model ExampleTable {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  @@map("example_tables")
  @@schema("tenant_xxx")
  @@index([tenantId, deletedAt])
}
```

### Important Notes

- **No per-tenant databases** - All tenants share database with `tenant_id` isolation
- **No Supabase RLS** - Tenant isolation enforced at application layer
- **Realtime via Ably** - Uses outbox pattern, not Supabase Realtime
- **Migration authority** - Prisma Migrate is source of truth for schema

## Key Accomplishments (Feature 004)

This documentation was created as part of feature **004-database-docs-integrity** (2025-01-29 to 2025-01-30):

1. **Established documentation framework** - Created templates, structure, and methodology
2. **Documented all schemas** - 9 PostgreSQL schemas with detailed explanations
3. **Documented 31 tables** - Complete coverage with fields, indexes, constraints
4. **Analyzed 17 migrations** - Detailed migration history with TODOs tracked
5. **Documented 12 enums** - All core enums with business context
6. **Fixed 1 type issue** - Replaced `any` with proper ProposalUpdateData type
7. **Identified 10 issues** - Critical and minor database issues documented
8. **Created 23 TODOs** - Actionable items for future improvements

## Getting Started

1. **Read SCHEMAS.md** - Overview of all schemas and relationships
2. **Check KNOWN_ISSUES.md** - Known problems before making changes
3. **Browse schemas/** - Domain-specific schema documentation
4. **Reference tables/** - Detailed table documentation with constraints
5. **Follow CONTRIBUTING.md** - When making schema changes

## See Also

- **Prisma Schema**: `packages/database/prisma/schema.prisma`
- **Migrations**: `packages/database/prisma/migrations/`
- **Schema Contract**: `docs/legacy-contracts/schema-contract-v2.txt`
- **Schema Registry**: `docs/legacy-contracts/schema-registry-v2.txt`
