# Phase-Out Registry — Code to Delete Once Manifest Automation Lands

> **Rule:** Nothing here is deleted until its IR-driven replacement is **proven** (generated,
> typechecked, tested, and drift-checked in CI). One retirement per PR. Prove the replacement,
> flip the consumer, delete the old, run the full suite. Track status in the table.

Legend: **Status** = `BLOCKED` (waiting on a phase) · `READY` (replacement proven, safe to delete) · `DONE` (removed).

---

## A. Hand-rolled Prisma stores → IR-driven store generation/provider (Phase 4)
Replaced by: a generic IR-driven store provider OR a generated store projection (see prompt).
(~95 `*PrismaStore` classes total across the dir + provider file.)

| Path | LOC | Replaced by | Status |
|---|---|---|---|
| `manifest/runtime/src/prisma-stores/` (entire dir, **43 files**) | 12,207 | generated/generic stores | BLOCKED (Phase 4) |
| `manifest/runtime/src/prisma-store.ts` (`createPrismaStoreProvider` switch) | 3,075 | IR-driven provider (lookup, not switch) | BLOCKED (Phase 4) |
| `prisma-stores/broken-read-batch*` naming convention | — | n/a (artifact of manual migration) | BLOCKED |

**Do NOT delete `prisma-stores/shared.ts` blindly** — its coercion helpers (`toDecimalInput`,
`asJsonInput`, `asNullableDate`) may still be needed by the generic provider. Migrate, then delete.

## B. Hand-authored Prisma schema → `PrismaProjection` + mapping config (Phases 2–3)
| Path | What changes | Status |
|---|---|---|
| `packages/database/prisma/schema.prisma` | **NOT deleted** — becomes a generated artifact (model blocks from IR). Keep generator + datasource header; models become regenerated + drift-checked. | BLOCKED (Phase 2) |
| Manual model-editing workflow | Replaced by: edit `.manifest` source → recompile IR → regenerate schema → `db:dev --create-only`. | BLOCKED (Phase 3) |

## C. Route accessor hack → schema-aware accessor resolution (Phase 1)
| Path | What changes | Status |
|---|---|---|
| Naive `camelCase` accessor in generated routes | Producer (`generate.mjs`) resolves accessor from the authoritative entity→model map or skips/deletes routes for table-less entities. | READY (Phase 1 — smallest fix) |
| `apps/api/app/api/events/import-workflows/{list,[id]}/route.ts` | DELETE — `EventImportWorkflow` has no table by design. | READY |
| `apps/api/app/api/audit/logs/route.ts` | DELETE or rewrite against the real `audit_log` model — hand-written, references non-existent `tenantAuditLog`. | READY |
| Broken generated routes for the other ~22 table-less/misnamed entities | Regenerate after producer fix; delete any that map to no model. | BLOCKED (Phase 1 regen) |

## D. Adjacent hand-written code potentially retired by unused projections (Phase 5, evaluate)
Only delete after confirming the projection output covers the real usage.
| Candidate area | Could be replaced by projection | Status |
|---|---|---|
| Hand-written Zod input schemas for manifest entities | `projections/zod` | BLOCKED (Phase 5 eval) |
| Hand-written React Query hooks for manifest entities | `projections/react-query` | BLOCKED (Phase 5 eval) |
| Hand-written/partial OpenAPI specs for manifest routes | `projections/openapi` | BLOCKED (Phase 5 eval) |
| `ENTITY_DOMAIN_MAP` duplicated across 3 files (`generate.mjs`, `generate-all-routes.mjs`, `generate-route-manifest.ts`) | single shared source | BLOCKED (consolidate during Phase 1/2) |

## E. Explicitly NOT for phase-out (keep)
- The singular command dispatcher `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` (canonical write path, constitution §6).
- `manifest/runtime/src/manifest-runtime-factory.ts` (rewire to new provider; do not delete).
- `manifest/scripts/audit-schema-drift.mjs` (upgrade to compare generated vs committed).
- The `@angriff36/manifest` package and `manifest/runtime/` workspace package.

---

## Exit criteria (all must be true before declaring the initiative done)
1. `pnpm manifest:generate` produces schema + routes (+ stores) with **zero** broken `database.*` accessors.
2. `pnpm --filter api typecheck` and `next build` are green with no generated-surface drift.
3. CI drift gate: re-running generation produces no diff against committed artifacts.
4. Sections A–C above are `DONE`; D evaluated and resolved.
5. No file outside `node_modules` hand-edits a `// Generated from Manifest IR - DO NOT EDIT` file.
