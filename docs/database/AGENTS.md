# Database — Agent Guide

Entry point for any agent doing database work in Capsule-Pro. **Read the must-read files below before editing the schema, writing a migration, or adding a Manifest entity.** This file is an index + the non-negotiable rules; the linked docs are authoritative.

## ⛔ Must-read before any DB work

THE MOST IMPORTANT THING YOU CAN READ IS THIS https://manifest-b1e8623f.mintlify.app/integration/prisma

| Doc | Read it for |
|---|---|
| [`docs/database/CONTRIBUTING.md`](./CONTRIBUTING.md) | **Canonical** schema-change + migration workflow, table/migration doc templates, rollback rules. |
| [`docs/database/README.md`](./README.md) | Architecture overview, core decisions/patterns, command reference. |
| [`docs/database/SCHEMAS.md`](./SCHEMAS.md) | What each PostgreSQL schema (domain) owns. |
| [`docs/database/SCHEMA_PLACEMENT_POLICY.md`](./SCHEMA_PLACEMENT_POLICY.md) | **Which schema a new Manifest entity belongs to** — decision order, examples, fail-loud behavior. |
| [`manifest/schema-placement.rules.json`](../../manifest/schema-placement.rules.json) | Machine-readable placement rules consumed by the Prisma projection (companion to the policy). |
| [`packages/database/schema-registry-v2.txt`](../../packages/database/schema-registry-v2.txt) | Canonical table catalog. **Update it BEFORE generating a migration.** |
| [`docs/database/KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) · [`packages/database/KNOWN_ISSUES.md`](../../packages/database/KNOWN_ISSUES.md) | Active gotchas and current DB issues. |
| [`packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md`](../../packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md) | Checklist to append to before committing a migration. |
| [`packages/database/prisma/schema.prisma`](../../packages/database/prisma/schema.prisma) | The schema itself (multi-schema, `relationMode = "prisma"`). |

Also relevant: root [`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md) "Database & Migrations", `manifest/AGENTS.md` (Manifest ↔ Prisma projection).

## Non-negotiable rules

1. **The DB is multi-schema. Never place a tenant entity in `public`.** New Manifest entities get a `@@schema` via the [placement policy](./SCHEMA_PLACEMENT_POLICY.md). If placement is unclear the generator **fails with `UNMAPPED_SCHEMA_PLACEMENT`** — add a rule or an `entitySchema` override; do not default to `public`.
2. **Migrations only via the wrapper:** `pnpm db:dev --create-only --name <name>` → review the SQL → `pnpm db:deploy`. Never hand-author migration SQL. **Never** run `prisma db push` or `prisma migrate reset` without explicit human confirmation.
3. **Update `schema-registry-v2.txt` before generating a migration** (it's the canonical catalog).
4. **Verify table names against `schema.prisma`** before writing raw SQL — `@@map` naming is inconsistent (see CONTRIBUTING.md).
5. **Existing migrations are immutable** — add a new one, never edit a deployed migration.

## Which database am I touching? (read this — it has bitten us)

- **`ep-divine-math-…` = PRODUCTION** (Vercel). **`ep-square-dust-…` = dev.**
- Migration commands read **`packages/database/.env`** (via `prisma.config.ts`), *not* infisical. Keep the **dev** URL there so local migrations hit dev, never prod.
- Push to prod deliberately: `infisical run --env=prod -- pnpm db:deploy`.
- The running app gets its URL from infisical (dev locally, prod on Vercel via secret sync).
