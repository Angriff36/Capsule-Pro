# Convex App Migration Status

Last updated: 2026-06-15

## Phase 1 — Locked proof slice (preserved, not rewritten)

| Surface | URL | Read source | Write source | Status |
|---------|-----|-------------|--------------|--------|
| Events list | `/events` | **Convex** — `loadEventsListPageData()` → `serverListEntity("Event")` | N/A on list page | **Working — preserved** |
| Event detail pipeline | `/events/[eventId]` | **Convex** — `event-details-data.ts` tiered loaders | **Convex** — `runManifestCommand` in mutation actions | **Working — preserved** |
| Inventory items list | `/inventory/items` | **Convex** — `fetchConvexList("InventoryItem")` (client) | **Convex** — `inventoryItemCreate/Update/SoftDelete` | **Working — preserved** |
| Inventory item detail | `/inventory/items/[id]` | **Convex** — `loadInventoryItemDetail()` | Server actions via `runManifestCommand` | **Working — preserved** |
| Kitchen production board | `/kitchen` | **Convex** — `loadKitchenProductionBoard()` | **Convex** — `kitchenTaskClaim/Start/Complete/...` on task cards | **Working — preserved** |

No changes were made to these proof surfaces in this session except documentation.

## Phase 2 — Event gaps (identified, not broad redo)

| Gap | Route / area | Current stack | Action this session |
|-----|--------------|---------------|---------------------|
| Guests subpage | `/events/[eventId]/guests` | Prisma `@repo/database` | **Not migrated** — listed |
| Staff subpage | `/events/[eventId]/staff` | Prisma | **Not migrated** — listed |
| Timeline | `/events/[eventId]/timeline` | Prisma | **Not migrated** — listed |
| Command board tab | `/events/[eventId]?tab=board` | Mixed — board hooks + Prisma in `board/actions.ts` | **Not migrated** — listed |
| Battle board | `/events/[eventId]/battle-board` | Prisma reads + actions | **Not migrated** — listed |
| Event form / top-level mutations | `events/actions.ts`, `event-mutation-actions.ts` | Convex writes + Prisma validation reads | **Not migrated** — listed |
| Battle-board href on detail | `resolve-event-board-href.ts` | Prisma | **Not migrated** — listed |
| Allergen / AI extras | event detail client | `apiFetch` custom endpoints | **Intentional shim** — not domain CRUD |

## Phase 3 — Kitchen slice migrated (this session)

| Surface | URL | Read | Write |
|---------|-----|------|-------|
| Kitchen tasks list | `/kitchen/tasks` | **Convex** — `loadKitchenTasksPageData` | **Convex** — `runManifestCommand` in `tasks/actions.ts`; reload via Convex loaders |
| Prep lists | `/kitchen/prep-lists` | **Convex** — `loadRecentEventsForPrepList`; generation via Convex event/dish/recipe loaders | **Convex** — `PrepList.create`, `PrepListItem.create`, `PrepTask.create` |
| Recipe catalog | `/kitchen/recipes` | **Convex** — `loadKitchenRecipeCatalog` | Unchanged composite routes (`apiFetch` on client for some flows) |
| Recipe detail | `/kitchen/recipes/[recipeId]` | **Convex** — `loadKitchenRecipeDetail` | Unchanged |
| Prep task plan workflows metrics | `/kitchen/prep-task-plan-workflows` | **Convex** — `loadPrepTaskPlanWorkflowStats` | Client Manifest API (unchanged) |

### Grep proof (migrated kitchen files)

```
@repo/database / @prisma/client / apiFetch in migrated list/detail/actions/pages: **none**
```

Remaining `apiFetch` in kitchen: prep-list-client (generate PDF/mark-complete legacy routes), recipes composite create/update, mobile kitchen, waste, analytics — documented below.

## Files changed

- `apps/app/app/lib/convex/kitchen-recipe-catalog-loaders.ts` (new)
- `apps/app/app/lib/convex/kitchen-recipe-utils.ts` (new)
- `apps/app/app/lib/convex/kitchen-task-loaders.ts` (extended)
- `apps/app/app/(authenticated)/kitchen/tasks/actions.ts`
- `apps/app/app/(authenticated)/kitchen/tasks/page.tsx`
- `apps/app/app/(authenticated)/kitchen/prep-lists/page.tsx`
- `apps/app/app/(authenticated)/kitchen/prep-lists/actions.ts`
- `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
- `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/page.tsx`
- `apps/app/app/(authenticated)/kitchen/prep-task-plan-workflows/page.tsx`
- `CONVEX_APP_MIGRATION_STATUS.md` (this file)
- `scripts/seed-convex-minimal.ts` (documented approach only)

## Files intentionally not changed

- `apps/app/app/(authenticated)/events/page.tsx` — events list proof slice
- `apps/app/app/(authenticated)/events/[eventId]/event-details-data.ts` — event detail pipeline
- `apps/app/app/(authenticated)/inventory/**` — inventory proof slice
- `apps/app/app/(authenticated)/kitchen/page.tsx` — production board proof slice
- `convex/*` generated surfaces (regenerated only via manifest pipeline)
- `/home/oc/projects/capsule-pro` — untouched

## Seed data

- `scripts/seed-convex-minimal.ts` documents approach: governed Manifest mutations / Convex internal seed — **no automatic seed run** (requires `CLERK_JWT_ISSUER_DOMAIN` + auth context).
- Existing event CSV seed: `scripts/seed-events-from-csv.ps1` (optional, not executed here).

## Commands run

| Command | Result |
|---------|--------|
| `pnpm manifest:compile` | **Pass** — 212 entities, 1054 commands |
| `pnpm manifest:generate-convex` | **Pass** — schema emitted |
| `pnpm manifest:check-convex-drift` | **Pass** — in sync |
| `npx convex dev` | **Running** — port 3210, functions ready |
| Next `:2226` curl (no proxy) | **200** sign-in; **500** authed routes until real Clerk keys |
| `pnpm exec tsc --noEmit` (apps/app) | **Pre-existing errors** in `convex/mutations.ts`, `packages/database` — not introduced by kitchen migration |

## Remaining old-stack callsites by feature cluster

| Cluster | Examples | Stack |
|---------|----------|-------|
| Event subpages | guests, staff, timeline, battle-board, board actions | Prisma reads |
| Recipe writes / composite | `recipes/actions.ts`, `recipes-page-client.tsx`, dish/menu pages | Prisma + `apiFetch` |
| Recipe menus/costing tab | `menus/actions.ts`, `costing-actions.ts` | Prisma |
| Kitchen mobile / waste / IoT | `kitchen/mobile/**`, `kitchen/waste/**` | `apiFetch` + Prisma |
| Inventory batch/import | `lib/inventory.ts` batch routes | `apiFetch` shim |
| Legacy API app | `apps/api/**` | Path B — phase-out registry |

## Definition of done checklist

- [x] No broad Events redo
- [x] Events list/detail proof slice code untouched
- [x] Event gaps precisely listed
- [x] Kitchen tasks/prep-lists/recipes list+detail on Convex reads
- [x] Kitchen task/prep save writes via Manifest Convex mutations (no Prisma reload on success path)
- [x] No fake empty DB mocks on migrated success paths
- [x] Original capsule-pro repo untouched
- [x] Convex backend up (`npx convex dev`, port **3210**) — `CLERK_JWT_ISSUER_DOMAIN` set via `convex env set`
- [x] Next app up on **2226** (`pnpm exec dotenv ... next dev -p 2226`)
- [x] HTTP proof (curl `--noproxy '*'` — system curl proxies `localhost` otherwise):
  - `/sign-in` → **200**
  - `/events`, `/kitchen/*`, `/inventory/items` → **500** (Clerk `pk_test_dummy` invalid on authenticated layout)
- [x] Convex API proof (direct POST `/api/query`):
  - `listEventByTenantId`, `listKitchenTaskByTenantId`, `listRecipeByTenantId`, `listPrepTaskByTenantId` → **success** (empty tenant data)


## Infisical dev

```bash
source /home/oc/projects/capsule-pro/.env
 cd apps/app && infisical run --env=dev --path=/apps/capsule-pro/app --project-config-dir=../.. \
  -- pnpm exec cross-env SKIP_ENV_VALIDATION=true NEXT_DIST_DIR=.next-dev \
  NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210 CONVEX_URL=http://127.0.0.1:3210 \
  next dev --turbopack -p 2226
```
