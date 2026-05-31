# Manifest Durable-Migration Report

> Session goal: advance Manifest semantic ownership by moving safe memory-backed entities toward
> durable persistence via a **generic** store path, with deterministic classification, and committing
> only verified increments. No remote push; no destructive DB operations.

## Starting classification (HEAD `c6d7930bf`)
Live Prisma models: 226 · IR entities: 132 · IR store entries: 100.

| Bucket | Meaning | Count |
|---|---|---|
| A durable_generated | IR entity, store=durable | **16** |
| B manifest_memory | IR entity, store=non-durable (flip pool) | **78** (73 with a `create` command) |
| C manifest_no_store | IR entity, no store entry | **14** |
| D prisma_only_legacy | Prisma model, no IR entity | **118** |
| irNoModel | IR entity, no live Prisma model | **24** (0 durable / 6 memory / 18 no-store) |

(The prior session's scratch report mislabeled `irNoModel` as 51; the real value is 24. The committed
classifier enforces this — its single `counts` object feeds both the JSON and the Markdown, and it
exits non-zero if `A+B+C+irNoModel != irEntities` or `A+B+C+D != liveModels`.)

## Final classification (HEAD `432fbc933`)
| Bucket | Count |
|---|---|
| A durable_generated | **19** (+3) |
| B manifest_memory | **75** (−3) |
| C manifest_no_store | 14 |
| D prisma_only_legacy | 118 |
| irNoModel | 24 |

## Entities flipped to durable (verified)
| Entity | Table | Schema | How |
|---|---|---|---|
| AlertsConfig | alerts_config | tenant_inventory | source `store … in memory`→`durable`; already in `ENTITIES_WITH_SPECIFIC_STORES` with `AlertsConfigPrismaStore` |
| PrepMethod | prep_methods | tenant_kitchen | same; `PrepMethodPrismaStore` |
| Container | containers | tenant_kitchen | same; `ContainerPrismaStore` |

Each already had a bespoke `PrismaStore` switch case **and** allowlist membership, so the flip is a
one-line IR store-target change — identical to the proven Event/StaffMember/EventStaff slice — with no
runtime-code change. Each entity's required-no-default columns are fully covered by its bespoke
`create()` (audited before flipping). Runtime store selection routes them through the existing typed
Prisma store; the `PrismaStore` façade preserves outbox/audit (constitution §11/§12).

## Entities attempted but reverted
None. No candidate failed validation.

## Generic Prisma store provider — ADDED (the strategic enabler)
`GenericPrismaStore` (`manifest/runtime/src/prisma-stores/generic-prisma-store.ts`) is a single
metadata-driven `Store<T>` that persists ANY durable entity to its real typed table without a bespoke
class or `switch` case. Because Prisma 7.x has no runtime `Prisma.dmmf`, model metadata is generated at
build time from `schema.prisma` by `manifest/scripts/generate-prisma-model-metadata.mjs`
(`manifest:gen-prisma-meta`) into `manifest/runtime/src/generated/prisma-model-metadata.generated.ts`
(226 models). It maps IR camelCase props ↔ Prisma field names (handling snake_case columns without
`@map`), coerces by scalar type, injects `tenantId`/`id`/`createdAt`, skips `@updatedAt`, builds
composite-key `where` clauses, and soft-deletes when a `deletedAt` column exists.

Wiring is additive and zero-regression: `PrismaStore`'s constructor falls back to `GenericPrismaStore`
only when `createPrismaStoreProvider` returns `undefined` (no switch case). Every current allowlist
member has a case, so the fallback never fires for them and the Event/Staff slice is untouched. **Effect:
a future memory→durable flip for an entity that lacks a bespoke store needs only an
`ENTITIES_WITH_SPECIFIC_STORES` entry — no new store class.**

## Checks run (pass/fail)
| Check | Result |
|---|---|
| `pnpm manifest:compile` | ✅ exit 0 (132 entities, 593 commands) |
| `pnpm --filter @repo/manifest-runtime typecheck` (after generic store) | ✅ exit 0 |
| `pnpm --filter api typecheck` (after generic store) | ✅ exit 0 |
| `pnpm --filter @repo/manifest-runtime typecheck` (after 3 flips) | ✅ exit 0 |
| `pnpm --filter api typecheck` (after 3 flips) | ✅ exit 0 |
| IR durable count | ✅ 16 → 19 |
| classifier invariants | ✅ A+B+C+irNoModel==132, A+B+C+D==226 |

**Verification level for the flips:** compile + IR-durable + dual typecheck + static audit that each
bespoke store covers required columns, plus equivalence to the previously roundtrip-proven Event slice.
A live create-command DB roundtrip was **not** run this session (tool transport was degraded; see below)
— recommended as a follow-up confirmation for each flipped entity.

## Commits this session
- `c6e55ba17` chore(manifest): add Prisma/IR ownership classifier
- `658e0ff41` feat(manifest): add generic Prisma store provider for durable entities
- `432fbc933` feat(manifest): make AlertsConfig, PrepMethod, Container durable
- (this) docs(manifest): durable migration report + refreshed ownership classification

## Next 10 recommended durable candidates
All already have a bespoke store + allowlist membership → each is a one-line `store … in durable` flip
(audit required-column coverage + ideally a roundtrip before/after each). AVOID payroll/accounting/auth
on early passes.
1. **AdminTask** (admin_tasks) — only `title` required-no-default; clean.
2. **Lead** (leads) — only `contactName` required; clean.
3. **KitchenTask** (kitchen_tasks) — `title`/`summary`/`tags[]`; ensure `tags` serializes as `[]` not null.
4. **Ingredient** (ingredients) — `name`/`defaultUnitId`/`allergens[]`; store has fallbacks.
5. **Dish** (dishes) — `recipeId`/`name`/arrays; store bare-casts `recipeId`/`name` (verify supplied).
6. **ClientContact** (client_contacts) — note `first_name`/`last_name` have no `@map`; the bespoke store
   already maps them, and `GenericPrismaStore` would too via `irName`.
7. **ClientInteraction** (tenant_crm) — leaf, low relation complexity.
8. **ClientPreference** (tenant_crm) — leaf.
9. **Station** (stations) — `@@unique([tenantId,id])` + `equipmentList[]`; confirm array handling.
10. **WasteEntry** (tenant_kitchen) — leaf-ish operational record.

For any future candidate WITHOUT a bespoke store, add it to `ENTITIES_WITH_SPECIFIC_STORES` and it will
persist through `GenericPrismaStore` automatically (no new class). A live create roundtrip + an
`outbox_event` audit-row check is the recommended gold-standard verification per flip.

## Recommended follow-ups (not done this session)
- Phase 5 drift gates: a `prisma-model-metadata` drift gate (re-run generator; fail on diff), the route
  regen-diff gate, and the candidate-schema-drift gate.
- Live roundtrip verification harness (tsx is available; runtime pkg has vitest) for the 3 flipped
  entities and each future flip.
- Consolidate the remaining `ENTITY_DOMAIN_MAP` copies (registry §D).
