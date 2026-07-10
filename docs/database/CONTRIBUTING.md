# Database Operations — THE Canonical Doc

> ⚠️ **This file is the ONLY authoritative instruction source for database operations in
> capsule-pro** — schema changes, migrations, drift, recovery, connections, and docs upkeep.
> Every other file that mentions database workflow (`CLAUDE.md`, `packages/database/README.md`,
> `docs/database/README.md`, skills, plans, audits) is a POINTER to this file or a historical
> record. If another doc contradicts this one, this one wins — and fix the other doc.

## Quick Start

1. **Schema changes?** Edit the SOURCE (Manifest `.manifest` or `infra.prisma`), never generated files
2. **Create + apply migration**: `pnpm db:dev --create-only --name <intent>` → review → `pnpm db:deploy`
3. **Regenerate the client**: `pnpm prisma:check`
4. **Update docs**: Edit relevant files in `docs/database/`
5. **Commit all**: Include source, schema, migration, and docs

## Schema Change Workflow (Enforced)

> **2026-07-10:** The "accepted drift" era is over. `20260710142245_reconcile_schema_truth`
> reconciled migration history with the schema; `pnpm db:check` is now STRICT (full
> `prisma migrate diff`, zero tolerance) and `db:repair` + diff-sanitizing were removed.
> Development follows the official Prisma workflow:
> [development-and-production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production).

1. Ensure `packages/database/.env` `DATABASE_URL` points at the dev Neon **direct** endpoint
   (no `-pooler` host — [Neon's Prisma migration guidance](https://neon.com/docs/guides/prisma-migrations)).
   This file is loaded only by `prisma.config.ts` (CLI); runtime apps keep their pooled URL.
2. Run `pnpm db:check` — it must be clean before you start.
3. Edit the source of truth:
   - **Manifest-owned model** → edit `manifest/source/**.manifest`, then regenerate
     (`pnpm manifest:compile`, `pnpm exec manifest generate -p prisma --surface all -o packages/database/prisma manifest/ir/kitchen.ir.json`,
     `pnpm manifest:generate-metadata`, `pnpm manifest:client`, `pnpm manifest:ir:embed`).
   - **Hand-owned model** → edit `packages/database/prisma/schema/infra.prisma`.
4. `pnpm db:dev --create-only --name <intent>` — Prisma generates and shadow-validates the SQL.
5. Review the migration. Add any custom SQL Prisma cannot express (partial indexes,
   CHECK constraints) to this migration **before** applying — the official
   "customize before apply" flow. Prisma's differ ignores those objects, so they never
   register as drift.
6. `pnpm db:deploy`, then `pnpm db:check` (must be clean), then `pnpm prisma:check`
   (regenerates the Prisma Client — part of the normal workflow, not an afterthought).
7. Do not edit existing migrations. Always add a new migration directory.

Notes:
1. `pnpm db:check` fails on **any** live-DB↔schema diff, in both directions. No sanitizing, no allowlist.
2. Never run `prisma format` on the schema folder — it re-indents the generated
   `manifest.prisma` and breaks `manifest:schema:check` (the projection emits its own formatting).
3. Avoid `prisma db push` (disabled in this repo).
4. Prisma applies migrations **without** a wrapping transaction: a failed migration can be
   partially applied. On the disposable dev DB the clean recovery is
   `pnpm --filter @repo/database exec prisma migrate reset --force` (destroys data — needs
   explicit user confirmation), which replays the full history from empty.
5. `@angriff36/manifest` ≥ 3.4.22 is required: earlier projections emitted `@default("")`
   on uuid sentinel columns — undeployable DDL that caused the pre-2026-07-10 permanent drift.

## Hard rules (non-negotiable)

1. **Never hand-author a `migrations/<ts>_name/migration.sql` folder.** Use
   `pnpm db:dev --create-only --name <name>` so the shadow DB validates every table reference
   at authoring time. Custom SQL (partial indexes, CHECK constraints, backfills) is APPENDED to
   a generated migration before applying — never a hand-made folder.
2. **Verify table names against `packages/database/prisma/schema/*.prisma` before raw SQL.**
   Naming is NOT uniformly snake_case (`model User` → `tenant_staff.employees`;
   `model EmployeeDeduction` → `tenant_staff.EmployeeDeduction`). `rg -n "@@map|model <Name>"`.
3. **Existing migrations are immutable** — add a new one. Only a failed-state migration on the
   dev DB may be patched (mark rolled-back first).
4. **Never `prisma db push`** (disabled). **Never `prisma migrate reset` without explicit user
   confirmation** — it destroys all data.
5. **No drift allowlists, no sanitized diffs, no trimmed generated SQL, no `db:repair`** —
   that workaround era ended 2026-07-10. Any `db:check` diff is a defect to fix at the source.
6. **Never edit `manifest.prisma` or any generated artifact** — edit the `.manifest` source
   and regenerate.
7. **A schema change is not done until a real Postgres write succeeds.** Typecheck/lint/unit
   tests are NOT proof: Prisma 7 client input types don't flag excess properties, and in-memory
   stores accept values Postgres rejects.

## Recovery cheatsheet (when things are already broken)

- **`P3009` "failed migrations in target database":** `pnpm migrate:resolve -- --rolled-back <name>`,
  fix the SQL, redeploy. ⚠ Prisma applies migrations WITHOUT a wrapping transaction — a failed
  migration may be **partially applied**; on the disposable dev DB the clean recovery after fixing
  the SQL is `prisma migrate reset --force` (with user confirmation), replaying history from empty.
- **`_prisma_migrations` row exists but folder is missing:** restore the folder first — check
  `git stash list` (untracked trees live in `stash@{N}^3`; recover via
  `git show 'stash@{N}^3:<path>' > <path>`), `git fsck --unreachable`, and other clones.
  Prisma's guidance is to repair histories by restoring migration files, never by editing
  `_prisma_migrations`. If the folder is truly unrecoverable, deleting the row is last-resort:
  (1) verify the row has `rolled_back_at` set OR `applied_steps_count = 0` OR its effects are
  provably baked into a later migration — capture the query output; (2) get explicit user
  approval — never delete `_prisma_migrations` rows autonomously; (3) run the DELETE inside a
  transaction.
- **Baselining an existing database** (no `_prisma_migrations` yet): `pnpm migrate:baseline <name>`
  wraps the official `migrate resolve --applied` flow.
- **Table-name mismatch in raw migration SQL:** fix the SQL, mark rolled-back, redeploy.

## Schema Naming Conventions

> **Why this section exists:** the 245-model `schema.prisma` grew two conventions plus accumulated
> drift. Without a single source of truth + a gate, every new model picks an arbitrary shape and the
> producer/store/route layers drift apart (the exact failure class Manifest automation is meant to
> remove). These rules are **machine-enforced** by `pnpm manifest:lint-schema:strict` (CI gate);
> the frozen exceptions live in `manifest/governance/schema-naming-allowlist.json`.

### Canonical convention for NEW models

| Surface | Convention | Example |
|---|---|---|
| Prisma **model** name | `PascalCase` | `model KitchenTask` |
| Physical **table** name | `snake_case` via `@@map(...)` | `@@map("kitchen_tasks")` |
| Prisma **field** name | `camelCase` | `tenantId`, `createdAt` |
| Physical **column** name | `snake_case` via `@map(...)` | `@map("tenant_id")` |
| **Enum** name | `PascalCase` | `enum ShipmentStatus` |

```prisma
model KitchenTask {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("kitchen_tasks")   // physical table is snake_case — REQUIRED on every PascalCase model
  @@schema("tenant_kitchen")
}
```

Key point: **the model name and the table name are decoupled.** Prisma Client uses the model name
(`prisma.kitchenTask`); the database uses the `@@map` value. A `PascalCase` model with **no** `@@map`
silently creates a `PascalCase` table — that is the anomaly this gate prevents.

### The two enforced rules

- **R1 — model name must be `PascalCase`.** New `snake_case`-named models are rejected.
- **R2 — the resolved physical table name must be `snake_case`.** The resolved name is the `@@map`
  value if present, else the model name verbatim. So a new `PascalCase` model **must** add
  `@@map("snake_case")`, and `@@map("PascalCase")` is rejected.
- **R3 (hygiene)** — every allowlist entry must still correspond to a model in the schema, so the
  exception lists cannot quietly rot.

### Frozen exceptions (do not extend)

These capture today's reality so the linter passes on the current schema while blocking new drift.
**Do not add an entry to make a new model pass — fix the model instead.**

- **31 legacy `snake_case`-named models** (`legacySnakeCaseModels`): pre-Manifest tables whose Prisma
  model name is itself `snake_case` (model name == table, raw `snake_case` fields). e.g. `audit_log`,
  `documents`, `open_shifts`, `skills`. Renaming them is a data-migration cost we are not paying.
- **20 models with a `PascalCase` physical table** (`pascalCaseTableExceptions`): (a) 4 with an
  explicit `@@map("PascalCase")` locked in by historical migrations — `Tenant`, `ActivityFeed`,
  `EmployeeDeduction`, `OutboxEvent`; (b) 16 `PascalCase` models with **no** `@@map`, added in Task
  0.3 from IR entities (e.g. `Budget`, `Deal`, `Vendor`, `SampleData`, `FacilityWorkOrder`), whose
  table defaults to the verbatim model name.

To clear an exception properly: rename the table via a migration (`pnpm db:dev --create-only`),
then remove the entry from the allowlist (R3 will otherwise flag it as stale).

### Commands

```bash
pnpm manifest:lint-schema           # report only
pnpm manifest:lint-schema:strict    # exit 1 on any violation (CI gate)
pnpm manifest:lint-schema:self-test # assert the rules can fail (positive + negative fixtures)
```

Report artifacts (gitignored): `manifest/reports/schema-naming/schema-naming.{json,md}`.

### `SHADOW_DATABASE_URL` and migrate dev (scoping)

- **Purpose:** Prisma Migrate uses a **shadow database** during `migrate dev`, and
  `prisma migrate diff --from-migrations` requires one explicitly.
  `packages/database/prisma.config.ts` sets `shadowDatabaseUrl` only when
  `SHADOW_DATABASE_URL` is present; otherwise the field is omitted and Neon
  auto-provisions a shadow DB for `migrate dev`.
- **Local setup (already done on the primary dev machine):**
  `packages/database/.env.local` (gitignored) holds `SHADOW_DATABASE_URL` pointing
  at the `prisma_shadow` database on the same dev Neon instance, **direct** endpoint.
  To recreate it: connect to the direct endpoint and run `CREATE DATABASE prisma_shadow;`
  (the `neondb_owner` role has createdb), then set the URL with `/prisma_shadow` as the
  database path.
- **Where it is not required:** App and API **env validation** (`@repo/database/keys`)
  only includes **`DATABASE_URL`**. Vercel/Next **build**, **`prisma generate`**,
  **`pnpm db:deploy`** / **`migrate deploy`**, **`migrate:status`**, and **runtime
  startup** do not use or validate `SHADOW_DATABASE_URL`. Never add it to Vercel.
- **Entrypoint:** use **`pnpm db:dev`** (flags directly, e.g.
  `pnpm db:dev --create-only --name foo`) rather than raw `prisma migrate dev`,
  so the workspace filter and `prisma.config.ts` env loading apply.

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
