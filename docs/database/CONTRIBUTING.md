# Contributing to Database Documentation

**How to update and maintain database documentation**

## Quick Start

1. **Schema changes?** Update Prisma schema first
2. **Run migration**: `pnpm migrate`
3. **Update docs**: Edit relevant files in `docs/database/`
4. **Generate docs**: `pnpm docs:generate-db` (TODO: implement)
5. **Commit all**: Include schema, migration, and docs

## Schema Change Workflow (Enforced)

1. Ensure `DATABASE_URL` points at the correct Neon branch for this work.
2. Run `pnpm db:check` to detect drift before you touch migrations.
3. Update `packages/database/prisma/schema.prisma`.
4. Run `pnpm migrate` (now includes `db:check` and `prisma generate`).
5. If `db:check` fails with drift, run `pnpm db:repair` to create a repair migration.
6. Append an entry to `DATABASE_PRE_MIGRATION_CHECKLIST.md`.
7. Apply migrations with `pnpm db:deploy`.
8. Do not edit existing migrations. Always add a new migration directory.

Notes:
1. `pnpm db:check` blocks **additive drift** (missing columns/tables/indexes). It ignores drop-only differences like existing DB FKs because Prisma uses `relationMode = "prisma"`.
2. `pnpm db:repair` generates a **safe, additive-only** migration, but it will **drop and recreate indexes** when needed to fix index drift (no data loss).
3. Review the migration SQL before applying.
4. Avoid `prisma db push` (disabled in this repo).
5. If you intentionally want a destructive reset, use `pnpm --filter @repo/database exec prisma migrate reset --force`.

### `SHADOW_DATABASE_URL` and migrate dev (scoping)

- **Purpose:** Prisma Migrate uses a **shadow database** during `migrate dev`.
  In this repo, `packages/database/prisma.config.ts` sets `shadowDatabaseUrl`
  only when `SHADOW_DATABASE_URL` is present; otherwise that field is omitted.
- **Where it is required:** **`pnpm db:dev`** (root `package.json`) runs
  `scripts/require-shadow-database-url-for-migrate-dev.mjs` first, which
  requires a **valid URL** in `SHADOW_DATABASE_URL` (typically a dedicated empty
  Neon database/branch). **`pnpm migrate`** chains into `pnpm db:dev`, so the
  same requirement applies when that command reaches the migrate-dev step.
- **Where it is not required:** App and API **env validation** (`@repo/database/keys`)
  only includes **`DATABASE_URL`**. Vercel/Next **build**, **`prisma generate`**,
  **`pnpm db:deploy`** / **`migrate deploy`**, **`migrate:status`**, and **runtime
  startup** do not use or validate `SHADOW_DATABASE_URL`.
- **Unsupported workflow:** Running **`prisma migrate dev`** directly (for example
  `pnpm --filter @repo/database exec prisma migrate dev …` or `npx prisma migrate dev`)
  **without** going through **`pnpm db:dev`** is **unsupported** — it skips the
  repo guard and may run migrate dev without the intended checks. Use
  **`pnpm db:dev`** (with extra args after `--`, e.g. `pnpm db:dev -- --create-only --name foo`)
  as the only migrate-dev entrypoint.

### Neon: create `capsule_shadow` and write `SHADOW_DATABASE_URL` (local only)

If you use **Neon**, provision an empty shadow database on your **dev** branch
(same migration role as `DATABASE_URL`, e.g. `neondb_owner`), then store a **direct
(non-pooled) Prisma** URL locally only — **never** in Vercel production env.

1. Install the [Neon CLI](https://neon.tech/docs/reference/cli-install) and run
   `neon auth`, or set a Neon API key for non-interactive use (see Neon docs:
   global `--api-key` / `NEON_API_KEY`).
2. From the repo root, with your Neon **project ID** and **branch** name (default
   branch name in examples is `dev`; set `NEON_DEV_BRANCH` if yours differs):

   ```bash
   export NEON_PROJECT_ID="<neon-project-id>"
   # Optional: same role as in DATABASE_URL (required if the branch has multiple roles)
   export NEON_DATABASE_OWNER="neondb_owner"
   # Optional: defaults to branch name "dev"
   export NEON_DEV_BRANCH="dev"

   pnpm db:neon-shadow -- --write
   ```

   This runs `neon databases create … --name capsule_shadow` (idempotent if the DB
   already exists) and `neon connection-string <branch> --database-name capsule_shadow --prisma`
   (non-pooled by default), then appends **`SHADOW_DATABASE_URL`** to
   **`packages/database/.env.local`** (gitignored). Prisma loads that file via
   `packages/database/prisma.config.ts`; **`scripts/require-shadow-database-url-for-migrate-dev.mjs`**
   reads the same paths so **`pnpm db:dev`** picks it up without exporting it in your shell.

3. **Do not** add `SHADOW_DATABASE_URL` to Vercel **Production** (or any runtime-only
   env). Next build, **`prisma generate`**, **`pnpm db:deploy`**, **`migrate:status`**,
   and app startup **do not** require it.

### Neon: schema backup + read-only audit (safe)

Before inspecting or changing Neon resources, take a **schema-only** SQL backup
(no data) and run a **read-only** CLI audit (no deletes, resets, or
`connection-string` dumps that expose passwords):

```bash
# 1) Requires pg_dump on PATH + DATABASE_URL (see packages/database/.env.local)
pnpm db:neon-backup-schema

# 2) Requires `neon auth` (or NEON_API_KEY). Optional: NEON_PROJECT_ID=...
pnpm db:neon-audit

# Or both in order:
pnpm db:neon-backup-and-audit
```

Outputs: `backups/neon-schema/schema-only-<timestamp>.sql` (gitignored) and JSON
snapshots on stdout from `neon-audit-readonly.mjs`. This repo’s app tenancy is
**shared Postgres + `tenant_*` schemas**, not Neon “project-per-customer”; the
audit only describes your Neon project (branches, databases, roles, operations).

## Documentation Structure

```
docs/database/
├── README.md           # Overview (update when architecture changes)
├── SCHEMAS.md          # Schema overview (update when adding schemas)
├── KNOWN_ISSUES.md     # Issues and TODOs (update when finding problems)
├── CONTRIBUTING.md     # This file (update when workflow changes)
├── schemas/            # Per-schema documentation
├── tables/             # Per-table detailed docs
├── migrations/         # Migration documentation
├── enums/              # Enum documentation
├── hooks/              # Hook documentation
└── _templates/         # Templates for new docs
```

## When to Update Documentation

### Schema Changes

**Add new model**:
1. Update `docs/database/SCHEMAS.md` - add to schema overview
2. Create `docs/database/tables/{model}.md` using template
3. Update schema-specific docs in `docs/database/schemas/{schema}.md`
4. Document FKs in `KNOWN_ISSUES.md` if complex

**Modify existing model**:
1. Update `docs/database/tables/{model}.md`
2. Update `docs/database/schemas/{schema}.md` if relationships change
3. Note breaking changes in `KNOWN_ISSUES.md`

**Add foreign key**:
1. Document in table doc
2. Update `SCHEMAS.md` relationship diagram
3. Add to `KNOWN_ISSUES.md` if cross-schema or composite

**Add index**:
1. Document in table doc with rationale
2. Update `SCHEMAS.md` if notable

### Migration Changes

**Create migration**:
1. Document purpose in `docs/database/migrations/{timestamp}_{name}.md`
2. Note any breaking changes
3. Update related table docs
4. Add to migration history in `SCHEMAS.md`

**Rollback migration**:
1. Document in `KNOWN_ISSUES.md`
2. Update affected table docs
3. Note lessons learned

### Documentation Maintenance

**Fix typo/error**: Edit file directly, commit with `docs(db): fix typo in X`

**Add example**: Add to relevant table or schema doc

**Improve clarity**: Rewrite confusing sections, add diagrams

## Writing Style

### General Principles

- **Be concise**: Prefer bullet lists over paragraphs
- **Be specific**: Use actual table/column names, not "this table"
- **Be current**: Update docs with code, not after
- **Be practical**: Focus on usage, not theory

### Table Documentation

```markdown
# {TableName}

**Purpose**: One-line business purpose

**Schema**: `tenant_xxx`

## Business Context

{What this table represents, why it exists}

## Columns

| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| id | UUID | Primary key | Auto-generated |
| tenantId | UUID | Tenant FK | Required for multi-tenancy |
| ... | ... | ... | ... |

## Indexes

| Index | Columns | Rationale |
|-------|---------|-----------|
| idx_tenant_deleted | tenantId, deletedAt | Filter by tenant + soft deletes |

## Foreign Keys

| FK | References | On Delete | Notes |
|----|------------|-----------|-------|
| fk_table_column | other_table(id) | CASCADE | ... |

## Relationships

- **Many-to-One** with `OtherTable` via `otherId`
- **One-to-Many** with `ChildTable` via `parentId`

## Usage Patterns

{Common query patterns, gotchas, examples}

## See Also

- {Related tables}
- {Business logic files}
```

### Schema Documentation

```markdown
# {Schema Name} Schema

**Purpose**: Domain area for {business function}

## Tables

{List of tables in this schema}

## Relationships

{Cross-schema relationships}

## Key Patterns

{Important patterns, conventions}

## Migration History

{Notable migrations}
```

### Migration Documentation

```markdown
# Migration: {Name}

**Date**: YYYY-MM-DD
**Migration**: {timestamp}_{name}
**Purpose**: {Why this migration exists}

## Changes

{What changed, why it was needed}

## Breaking Changes

{Any backwards-incompatible changes}

## Rollback

{How to rollback if needed}

## Related

- {Affected models}
- {Related issues}
```

## Common Tasks

### Add New Table Documentation

1. Copy template from `_templates/table.md`
2. Fill in details from Prisma schema
3. Run `prisma format` to verify column names
4. Add to `SCHEMAS.md` table list
5. Commit with schema changes

### Document Foreign Key

```markdown
## Foreign Keys

### fk_table_column

**From**: `table(column_id)`
**To**: `other_table(id)`
**On Delete**: CASCADE | SET NULL | RESTRICT
**Purpose**: {Why this FK exists}

**Notes**:
- Composite FK: includes `tenantId`
- Cross-schema: tenant_events → tenant_crm
```

### Document Index

```markdown
## Indexes

### idx_table_columns

**Columns**: `(tenantId, status, createdAt)`
**Type**: B-tree
**Unique**: No
**Rationale**: Optimize queries filtering by status with pagination

**Query pattern**:
```sql
WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 20
```
```

### Update Schema Overview

When adding schema:

```markdown
### N. `tenant_xxx` Schema

**Purpose**: {Domain}

**Tables**:
- `Table1` - {Purpose}
- `Table2` - {Purpose}

**Characteristics**:
- Has `tenantId` column
- {Key features}

**Key Relationships**:
```
Location (1) ──< (N) Table1
Table1 (1) ──< (N) Table2
```
```

## Templates

Templates are in `docs/database/_templates/`:

- `table.md` - Table documentation
- `schema.md` - Schema documentation
- `migration.md` - Migration documentation
- `enum.md` - Enum documentation

Copy and customize when creating new docs.

## Review Checklist

Before committing documentation changes:

- [ ] All new models documented
- [ ] All FKs documented with rationale
- [ ] All indexes explained
- [ ] Cross-schema relationships noted
- [ ] Breaking changes highlighted
- [ ] Examples are accurate
- [ ] Links are valid
- [ ] Spelling/grammar checked
- [ ] Code examples tested

## Git Commit Messages

Use conventional commits for documentation:

```bash
# Schema change with docs
git commit -m "feat(db): add EventReport model

- Add EventReport model for event analytics
- Document in docs/database/tables/event_report.md
- Update SCHEMAS.md with new relationships
- Add FK constraints in migration"

# Documentation-only change
git commit -m "docs(db): clarify EventGuest FK constraints

- Explain composite FK to Event
- Add cross-schema reference notes
- Update examples"

# Fix documentation
git commit -m "docs(db): fix typo in BudgetLineItem doc"
```

## Troubleshooting

### Documentation Drift

**Problem**: Docs don't match schema

**Solution**:
1. Compare Prisma schema with table docs
2. Update docs to match actual schema
3. Add migration history note if schema changed recently

### Missing Documentation

**Problem**: Table has no doc file

**Solution**:
1. Create from `_templates/table.md`
2. Extract info from Prisma schema
3. Add business context from codebase

### Outdated Relationships

**Problem**: FKs changed, docs not updated

**Solution**:
1. Check `schema.prisma` for actual FKs
2. Check migration SQL for DB-level FKs
3. Update docs with correct relationships

## Automation (TODO)

Future automation to improve documentation workflow:

- [ ] `pnpm docs:generate-db` - Auto-generate table docs from schema
- [ ] `pnpm docs:validate` - Check docs match schema
- [ ] Pre-commit hook to validate docs on schema change
- [ ] CI check for missing documentation
- [ ] Auto-generate ERD diagrams
- [ ] Link Prisma models to docs in IDE

## Resources

- **Project Guidelines**: `CLAUDE.md`
- **Schema Contract**: `docs/legacy-contracts/schema-contract-v2.txt`
- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/current/

## Questions?

- Check `KNOWN_ISSUES.md` for known problems
- Review `SCHEMAS.md` for architecture overview
- Ask in team chat for clarification on business logic

**Remember**: Documentation is a living artifact. Keep it updated, keep it accurate, keep it useful.
