# Database — Agent Guide

**The ONLY canonical instruction source for database operations is [`README.md`](./README.md)
(this directory).** Workflow, hard rules, drift, recovery, naming conventions, connections —
all of it lives there. Read it before editing the schema, writing a migration, or adding a
Manifest entity. Do not follow DB instructions from any other file.

Manifest ↔ Prisma integration background: https://manifest-b1e8623f.mintlify.app/integration/prisma

Placing a NEW entity in a schema: [`SCHEMA_PLACEMENT_POLICY.md`](./SCHEMA_PLACEMENT_POLICY.md) —
never place a tenant entity in `public`.

## Which database am I touching? (read this — it has bitten us)

- **`ep-divine-math-…` = PRODUCTION** (Vercel). **`ep-square-dust-…` = dev.**
- Migration commands read **`packages/database/.env`** (via `prisma.config.ts`), *not* infisical.
  Keep the **dev direct (non-pooler)** URL there so local migrations hit dev, never prod.
- Push to prod deliberately: `infisical run --env=prod -- pnpm db:deploy`.
- The running app gets its URL from infisical (dev locally, prod on Vercel via secret sync).
