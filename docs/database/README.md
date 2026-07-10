# Capsule-Pro Database — THE Canonical Doc

> ⚠️ **This page is the ONLY authoritative instruction source for database operations in
> capsule-pro** — schema changes, migrations, drift, recovery, and connections — plus the
> architecture reference. Every other file that mentions database workflow (`CLAUDE.md`,
> `AGENTS.md`, `packages/database/README.md`, skills, plans, audits) is a pointer to this file
> or a historical record. If another doc contradicts this one, this one wins — and fix the
> other doc.

Last updated: 2026-07-10

---

## Quick Start

1. **Schema changes?** Edit the SOURCE (Manifest `.manifest` or `infra.prisma`), never generated files
2. **Create + apply migration**: `pnpm db:dev --create-only --name <intent>` → review → `pnpm db:deploy`
3. **Regenerate the client**: `pnpm prisma:check`
4. **Verify**: `pnpm db:check` clean + a real Postgres write succeeds

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

## `SHADOW_DATABASE_URL` and migrate dev (scoping)

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

## Schema Naming Conventions

> These rules are **machine-enforced** by `pnpm manifest:lint-schema:strict` (CI gate);
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

### The enforced rules

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

```bash
pnpm manifest:lint-schema           # report only
pnpm manifest:lint-schema:strict    # exit 1 on any violation (CI gate)
pnpm manifest:lint-schema:self-test # assert the rules can fail (positive + negative fixtures)
```

---

## Architecture Overview

### Technology Stack

- **Database**: PostgreSQL (hosted on Neon)
- **Neon branches**: `ep-square-dust` = **dev** (local + CI migration preview); `ep-divine-math` = **prod**. Never point local `DATABASE_URL` at prod.
- **ORM**: Prisma with `relationMode = "prisma"`
- **Migration Tool**: Prisma Migrate (NOT `db push`)
- **Multi-tenancy**: Shared database with `tenant_id` column isolation
- **Authentication**: Clerk (handles user auth and session management)
- **Realtime**: Ably (via outbox pattern for authoritative events)

### Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────┐
│                PostgreSQL Database (Neon)                │
├─────────────────────────────────────────────────────────┤
│  • Shared database for ALL tenants                       │
│  • Tenant isolation via tenant_id column                 │
│  • Composite primary keys: (tenant_id, id)               │
│  • NO per-tenant databases                               │
│  • NO Row Level Security (RLS) - Clerk handles auth      │
└─────────────────────────────────────────────────────────┘
```

## Core Decisions & Patterns

### 1. Multi-Tenancy Strategy

**Decision**: Shared database with `tenant_id` column isolation

- ✅ All tenant tables include `tenant_id` column
- ✅ Composite primary keys: `(tenant_id, id)`
- ✅ Application-level tenant isolation (Clerk middleware)
- ❌ NO per-tenant databases
- ❌ NO Row Level Security (RLS) policies

**Why**: Simpler infrastructure, easier schema migrations, lower cost, shared reporting/analytics.

### 2. Foreign Keys

**Decision**: Prisma uses `relationMode = "prisma"` — it does NOT auto-generate FK constraints.
Physical FK constraints that exist were added manually in migrations (composite:
`(tenant_id, parent_id)` → `(tenant_id, id)`).

```sql
ALTER TABLE tenant_crm.client_contacts
ADD CONSTRAINT fk_client_contacts_client
FOREIGN KEY (tenant_id, client_id)
REFERENCES tenant_crm.clients(tenant_id, id)
ON DELETE CASCADE;
```

### 3. Authentication & Authorization

**Decision**: Clerk handles all auth, NO database-level RLS

- ✅ Clerk middleware enforces tenant isolation
- ❌ NO Supabase RLS policies (leftover docs are outdated)
- ❌ NO database-level row security

### 4. Realtime Events

**Decision**: Ably for authoritative events via outbox pattern; Liveblocks for collaborative
UI state (cursors, presence).

### 5. UUID Generation

**Decision**: PostgreSQL `gen_random_uuid()` for all IDs

```prisma
model Example {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
}
```

### 6. Soft Deletes

**Decision**: Tenant tables use `deletedAt` for soft deletion

```prisma
model Example {
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  @@index([tenantId, deletedAt])
}
```

### 7. Timestamps

All tables include `createdAt` and `updatedAt` (`@db.Timestamptz(6)`).

## Common Patterns

### Composite Primary Keys

```prisma
model Example {
  tenantId String @map("tenant_id") @db.Uuid
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  @@id([tenantId, id])  // Composite PK
  @@map("examples")
  @@schema("tenant_kitchen")
}
```

### ON DELETE Behaviors

- **CASCADE** — child records deleted with parent (line items, comments, assignments)
- **SET NULL** — child loses reference but survives (assignee refs, event/location links)
- **RESTRICT** — parent cannot be deleted while children exist (employees in time entries)

### Cross-Schema References

Many foreign keys span schemas (e.g. `tenant_events.events` → `tenant_crm.clients`,
`tenant_kitchen.containers` → `tenant_inventory.storage_locations`).

### Migration Safety Pattern

Hand-appended custom SQL in migrations uses idempotent guards:

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_name' AND table_schema = 'schema_name'
    ) THEN
        ALTER TABLE schema_name.table ADD CONSTRAINT fk_name
        FOREIGN KEY (columns) REFERENCES parent_table(columns) ON DELETE behavior;
    END IF;
END $$;
```

## Schema Structure

The database uses PostgreSQL schemas for logical separation (authoritative list =
`schemas = [...]` in `packages/database/prisma/schema/manifest.prisma`):

| Schema | Purpose |
|--------|---------|
| `core` | Types, enums, functions |
| `platform` | Account, audit logs (Account IS the tenant) |
| `public` | Manifest runtime infra (audit/outbox/approvals/async-reaction queue) |
| `tenant` | Core tenant data |
| `tenant_admin` | Admin & reporting |
| `tenant_accounting` | Invoices, payments, collections |
| `tenant_crm` | Clients, leads, proposals |
| `tenant_events` | Events, battle boards, imports |
| `tenant_facilities` | Facilities, maintenance work orders |
| `tenant_inventory` | Inventory, purchasing, shipments |
| `tenant_kitchen` | Recipes, prep tasks, kitchen ops |
| `tenant_logistics` | Delivery routes, dispatch |
| `tenant_staff` | Scheduling, time entries, payroll |

Schema placement rules for NEW entities: `docs/database/SCHEMA_PLACEMENT_POLICY.md`.

## Additional Resources

- **Schema**: `packages/database/prisma/schema/` (multi-file: `manifest.prisma` is
  projection-generated — never hand-edit; `infra.prisma` is hand-owned). The schema files ARE
  the table/column/enum reference — there are no per-table docs to keep in sync.
- **Migrations**: `packages/database/prisma/migrations/` (the SQL is the record; no per-migration docs)
- **Active issues**: [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md)
- **New-entity schema placement**: [`SCHEMA_PLACEMENT_POLICY.md`](./SCHEMA_PLACEMENT_POLICY.md)
