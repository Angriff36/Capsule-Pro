---
name: capsule-manifest-rebuild
description: >-
  Full Capsule-Pro manifest regeneration pipeline from manifest/source to IR,
  API routes, hooks, schema, and CI gates. Use when rebuilding after .manifest
  changes, bumping @angriff36/manifest, fixing drift, or before PRs that touch
  manifest/source, manifest/ir, or generated projections.
disable-model-invocation: true
---

# Capsule-Pro Manifest Full Rebuild

Canonical authority: `manifest/scripts/script-index.md` (Part 2–3). Run all commands from **capsule-pro repo root**.

## Source of truth

```
manifest/source/**/*.manifest  →  compile  →  manifest/ir/kitchen.ir.json  →  projections
```

Never hand-edit generated routes, hooks, or Prisma model blocks. Edit `.manifest`, then regenerate.

**Do not use** upstream `manifest compile --glob` for Capsule — it has a last-file-wins bug. Always use `pnpm manifest:compile` (`manifest/scripts/compile.mjs` + `compileProjectToIR`).

---

## When to use which workflow

| Situation                                                            | Workflow                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Domain/command/guard/reaction changes only (no new persisted tables) | [Semantics-only](#semantics-only-no-schema-change)                |
| New or changed durable entity / Prisma model                         | [Schema + DB](#schema-and-database-change)                        |
| Bump `@angriff36/manifest` compiler                                  | [Compiler bump](#compiler-version-bump) then appropriate workflow |
| Before PR that touched manifest                                      | [CI gate](#pre-pr-ci-gate)                                        |

---

## Semantics-only (no schema change)

Fast path when IR shape does not add tables/columns:

```bash
pnpm manifest:build
pnpm check
```

`manifest:build` runs **in order** (`manifest/scripts/build.mjs`):

1. `manifest:compile` — merge 104 `.manifest` files → `kitchen.ir.json`, commands registry, provenance
2. `manifest:generate` — Next.js route projection + `ENTITY_DOMAIN_MAP` remapping
3. `manifest:routes:ir` — `manifest/runtime/routes.manifest.json`
4. `audit-routes-strict.mjs` — ownership rules; legacy routes exempt via `manifest/governance/audit-routes-exemptions.json` (`commandRouteExempt` for commands/* hand routes)
5. `manifest:generate-hooks` — TanStack Query hooks
6. `cleanup-generated-orphans.mjs` — remove stale generated artifacts

Optional validation after compile:

```bash
pnpm manifest:validate
pnpm manifest:validate-ai   # IR + min score 100
```

---

## Schema and database change

When entities gain/lose persisted fields or new tables:

```bash
# 1. Compile IR
pnpm manifest:compile

# 2. Regenerate Prisma projection artifact + drift gate
pnpm manifest:schema:full
pnpm manifest:schema:check

# 3. Promote model blocks into live schema (manual until Phase 2b automates)
#    Edit: packages/database/prisma/schema.prisma
#    Use: manifest/prisma-options.config.json — never invent @@map

# 4. Migration (review SQL in TTY-capable shell)
pnpm db:dev -- --create-only --name <descriptive_name>
# review packages/database/prisma/migrations/<timestamp>_<name>/migration.sql
pnpm db:deploy
pnpm db:check

# 5. Bridge runtime ↔ DB ↔ API
pnpm manifest:build
pnpm manifest:generate-metadata   # prisma metadata, accessors, store options, store projection

# 6. Prisma sanity
pnpm prisma:check
```

---

## Full regeneration (everything derived from IR)

Use after large manifest refactors or when multiple projection drifts are suspected:

```bash
# Core IR + API surface (build includes compile)
pnpm manifest:build

# DB/runtime bridge
pnpm manifest:generate-metadata

# Additional projections (run all that your change touches)
pnpm manifest:client
pnpm manifest:generate-zod
pnpm manifest:openapi
pnpm manifest:kysely
pnpm manifest:drizzle
pnpm manifest:analytics
pnpm manifest:materialized-views
pnpm manifest:field-hints
pnpm manifest:llm-context
pnpm manifest:registries
pnpm manifest:ir:embed

# Drift gates (must pass before commit)
pnpm manifest:schema:check
pnpm manifest:openapi:check
pnpm manifest:react-query:check
pnpm manifest:ir:embed:check
pnpm manifest:field-hints:check
```

If schema changed, run the [Schema and database change](#schema-and-database-change) migration steps **before** `manifest:generate-metadata`.

---

## Pre-PR CI gate

Blocking chain when manifest artifacts were touched:

```bash
pnpm manifest:ci
```

Expands to:

```
manifest:verify-invariants
  → manifest:doctor
  → manifest:openapi:check
  → manifest:react-query:check
  → manifest:ir:embed:check
  → manifest:audit:strict
  → manifest:coverage:ci
  → manifest:registries (+ git diff on governance JSON)
```

Also run repo checks if you changed app code:

```bash
pnpm check
```

---

## Compiler version bump

When upgrading `@angriff36/manifest`:

```bash
pnpm manifest:update          # bumps workspace dependency
pnpm manifest:compile         # must succeed before anything else
pnpm manifest:verify-invariants   # checks committed IR freshness + compiler version
```

Then run [Full regeneration](#full-regeneration-everything-derived-from-ir) or [Semantics-only](#semantics-only-no-schema-change) depending on whether schema projection changed.

Upstream compiler: [`@angriff36/manifest` on npm](https://www.npmjs.com/package/@angriff36/manifest) (`pnpm manifest:update` bumps the workspace pin). MCP stdio: `manifest-mcp` bin from the same package (`pnpm exec manifest-mcp`).

---

## Failure triage

| Symptom                                        | Likely cause                               | Fix                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Compile errors on parent FK / orphan reactions | Domain-completeness rules (Manifest ≥2.18) | Fix `.manifest` wiring; co-locate `on` reactions with the emitting command's file; optional parent FK params where propagation applies     |
| `manifest:schema:check` drift                  | Stale `generated-schema.prisma`            | `pnpm manifest:schema:full` then commit                                                                                                    |
| `audit-routes-strict` fails                    | Unregistered legacy write/command route    | Add entry to `audit-routes-exemptions.json` with reason + `expiresOn`; use `commandRouteExempt: true` for hand-written `commands/*` routes |
| `db:check` fails after migration               | Skipped promote or wrong migration         | Re-run schema workflow; never `db:push`                                                                                                    |
| `verify-invariants` IR freshness               | Committed IR ≠ fresh compile               | `pnpm manifest:compile` and commit IR shards                                                                                               |

---

## Agent rules

1. **Edit `.manifest` first** — never patch generated route/hook/schema files to "fix" semantics.
2. **`manifest:build` already compiles** — do not run bare `manifest generate` without compile unless debugging generate alone.
3. **Committed artifacts must match regeneration** — CI drift gates byte-compare; if check fails, regenerate and commit, do not edit expected outputs by hand.
4. **Part 1 of script-index.md is owner contract** — do not rewrite unless user explicitly asks.
5. **Counts** (entities, commands) — read from `kitchen.ir.json` after compile; do not hardcode in docs.

## Key paths

| Path                                     | Role                                     |
| ---------------------------------------- | ---------------------------------------- |
| `manifest/source/**/*.manifest`          | Authoring source                         |
| `manifest/ir/kitchen.ir.json`            | Merged IR (authority)                    |
| `manifest/ir/generated-schema.prisma`    | IR Prisma projection (CI artifact)       |
| `packages/database/prisma/schema.prisma` | Live DB schema                           |
| `manifest/prisma-options.config.json`    | Hand-curated Prisma projection overrides |
| `manifest/accessor.config.json`          | Entity→Prisma accessor map               |
| `manifest/scripts/script-index.md`       | Full script registry                     |
