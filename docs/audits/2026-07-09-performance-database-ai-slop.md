# Performance, Database, and AI-Slop Audit

> **2026-07-09 — repository audit.** Verified performance risks, partial TanStack Query adoption, database inefficiencies, and copy-paste/half-implemented surfaces. This is a point-in-time audit, not a remediation plan.

## Scope

- `apps/app`
- `apps/api`
- `packages/database`
- `packages/notifications`
- `packages/supplier-connectors`

## Executive summary

The repo has a **real hybrid-data-layer problem** in `apps/app`, several **clear N+1 / per-item query loops** in `apps/api` and `packages/database`, and a noticeable amount of **copy-paste or half-finished implementation residue** that an experienced engineer would flag quickly.

The highest-signal issues are:

1. **TanStack Query is only partially adopted in `apps/app`** despite a live `QueryProvider`.
2. **Search and forecasting/import flows multiply database work per request** instead of batching.
3. **Governed-write migration is incomplete in bulk board/tree actions**, with explicit Prisma bypasses kept in place.
4. **Several surfaces are obviously half-implemented or duplicated**: supplier connectors, vendor-cost propagation, SMS utilities, and a large amount of API route boilerplate.

## Findings

### 1. TanStack Query is installed but underused in `apps/app`

**Severity:** high

**Evidence**

- `apps/app/app/layout.tsx` wraps the app in `QueryProvider`.
- `apps/app/app/query-provider.tsx` creates a `QueryClient` and mounts devtools.
- Search counts in `apps/app`:
  - `apiFetch`: **900** matches
  - `useQuery`: **26** matches
  - `useMutation`: **21** matches
- `HydrationBoundary` matches in `apps/app`: **0**
- `dehydrate` matches in `apps/app`: **0**

**What this means**

The app has React Query plumbing, but most client data access still goes through ad hoc fetch wrappers or generated client calls without query hydration/caching.

**Concrete examples**

- `apps/app/app/lib/use-event-budgets.ts`
  - wraps generated client calls
  - still keeps raw `apiFetch` for delete
  - uses repeated `as unknown as ...` casts
- `apps/app/app/lib/chart-of-accounts.ts`
  - wraps generated client calls
  - keeps raw `apiFetch` delete fallback
  - carries snake_case local DTOs against camelCase generated commands
- `apps/app/app/lib/use-forecasts.ts`
  - pure `apiFetch` wrapper despite being a named client-side data module

**Why it matters**

This is the classic “installed but not adopted” state: cache invalidation, request dedupe, and SSR hydration benefits exist only on a narrow slice of the app.

### 2. Global search fans out into many independent Prisma queries per request

**Severity:** high

**Evidence**

- `apps/app/app/api/search/route.ts`
- The route defines 7 search domains: `events`, `clients`, `contacts`, `venues`, `inventory`, `knowledge`, `tasks`.
- It runs grouped `findMany` + `count` work in a single `Promise.all`.

**What this means**

In `type=all` mode, one search request can fan out into many separate table scans/counts before the user finishes typing. The code is clean, but the shape is expensive.

**Why it matters**

This is the sort of implementation that feels fine in development and then becomes a latency multiplier under real usage.

### 3. Recipe ingredient import has a direct per-row N+1 pattern

**Severity:** critical

**Evidence**

- `apps/api/app/api/kitchen/import/importers/recipe-ingredients.ts`

Inside the row loop, every row does:

1. `findRecipeVersionId()` → fetch recipe, then fetch latest version
2. `findIngredientId()`
3. `resolveUnitId()`
4. `runKitchenImportCommand(...)`

**What this means**

The importer re-resolves the same recipe/version/ingredient data over and over instead of preloading unique names once.

**Why it matters**

For large imports, query volume scales with row count rather than unique lookup count. This is exactly the sort of throughput problem AI often produces because the code is locally correct but globally inefficient.

### 4. Inventory forecasting has repeated per-SKU and per-point query loops

**Severity:** critical

**Evidence**

- `apps/api/app/lib/inventory-forecasting.ts`

Verified patterns:

- `generateReorderSuggestions(...)`
  - loads low-stock SKUs
  - then loops `for (const itemSku of skusToCheck)` and calls `calculateReorderSuggestion(...)`
- `getProjectedUsage(...)`
  - inside each item flow, calls `getHistoricalUsage(...)`
  - then calls `getUpcomingEventsUsingInventory(...)`
- forecast persistence loop
  - for each forecast point: `findFirst(...)` then `update(...)` or `create(...)`

**What this means**

The service compounds database work in loops instead of batching by SKU or using a bulk upsert strategy.

**Why it matters**

This is a straightforward scale risk in a path that sounds analytics-heavy and likely to be run on larger datasets.

### 5. Event-tree bulk actions still bypass governance with direct Prisma writes

**Severity:** high

**Evidence**

- `apps/app/app/(authenticated)/(events)/events/tree/actions.ts`
- `apps/app/app/(authenticated)/(events)/events/[eventId]/board/actions.ts`

Verified TODOs in `tree/actions.ts`:

- `bulkUpdateCardsAction`
  - direct `database.commandBoardCard.updateMany(...)`
  - comment says no bulk governed command exists
- `bulkRestoreCardsAction`
  - direct `database.$transaction([...database.commandBoardCard.update(...)])`
  - comment says migrating would lose transactional guarantees

`board/actions.ts` also documents race/convergence behavior around board creation.

**What this means**

The governed-write migration is incomplete exactly where batch behavior is hardest, so the system now has both governed commands and explicit “keep Prisma for now” escape hatches.

**Why it matters**

This is not just tech debt; it creates inconsistent validation/audit semantics between single-record and bulk operations.

### 6. Vendor cost propagation is explicitly incomplete

**Severity:** medium

**Evidence**

- `packages/database/src/vendor-cost-service.ts`

The file header says it handles:

- inventory item cost updates
- recipe costing propagation

But `processVendorCostUpdate(...)` currently returns:

- `inventoryItemsUpdated`
- `recipesRecalculated: 0`

and only calls `updateInventoryItemCosts(...)`.

**What this means**

The module advertises more behavior than it actually performs.

**Why it matters**

This is classic half-implemented service code: the interface and comments imply a finished downstream propagation story, but the implementation stops at the first leg.

### 7. Supplier integrations are stubs, and sync status is inferred from the wrong model

**Severity:** high

**Evidence**

- `packages/supplier-connectors/src/connectors/us-foods.ts`
  - `readonly isStub = true`
  - all main methods log and return empty/false stub values
- `packages/supplier-connectors/src/connectors/charlies-produce.ts`
  - `readonly isStub = true`
  - all main methods log and return empty/false stub values
- `apps/api/app/api/inventory/supplier-sync/status/route.ts`
  - uses latest `VendorCatalog.updatedAt` as a proxy for sync status
  - contains TODO for missing `SupplierSyncHistory` model

**What this means**

The repo exposes supplier-sync surfaces, but core integration and observability pieces are still placeholders.

**Why it matters**

This is the kind of thing a non-programmer can easily mistake for “supported integration” because the routes and connector classes exist.

### 8. SMS infrastructure has overlapping public APIs and duplicated implementations

**Severity:** high

**Evidence**

- `packages/notifications/sms.ts`
- `packages/notifications/sms-new.ts`
- `packages/notifications/sms-temp.ts`
- `packages/notifications/index.ts`

Verified state:

- `sms.ts` and `sms-new.ts` both export the same `sendSms(to, message)` shape
- `sms-temp.ts` exports a different provider-based API: `sendSMS({ to, message })`
- `index.ts` re-exports **both** styles

**What this means**

The notifications package currently exposes two different SMS entrypoints and carries duplicate Twilio-style senders.

**Why it matters**

This is pure maintenance drag and a strong AI-slop smell: multiple “improved” versions coexist instead of one owning implementation.

### 9. API route duplication is high enough to be measurable, not anecdotal

**Severity:** medium

**Evidence**

- `fallow dupes` summary:
  - duplication percentage: **16.55%**
  - clone groups reported: **40** top groups
  - clone instances: **1,276**
- Largest clone groups are concentrated under `apps/api/app/api/...`
- Example route pair:
  - `apps/api/app/api/accounting/accounts/route.ts`
  - `apps/api/app/api/crm/clients/route.ts`

**Supporting evidence**

- `fallow dead-code` also flagged unused exports in `apps/api/app/api/accounting/accounts/route.ts`:
  - `checkDuplicateAccountNumber`
  - `validateParentAccount`

**What this means**

The repo has a lot of repeated CRUD/list boilerplate plus leftover helpers that are no longer used.

**Why it matters**

This is exactly the kind of “looks productive, scales badly” footprint AI-assisted code generation tends to leave behind.

### 10. Dependency and code-health cleanup opportunities are real

**Severity:** low

**Evidence**

- `fallow dead-code` reported **65** issues in the scoped run
- unused dependencies flagged in `apps/app/package.json` include:
  - `@heroicons/react`
  - `@plasmicapp/loader-nextjs`
  - `@plasmicapp/react-web`
- workspace-placement issues were also flagged for some deps used from other workspaces

**What this means**

There is still visible package drift and dead-public-surface noise that should be cleaned before more feature work lands on top.

## Practical takeaways

If you want the highest-value cleanup targets first, start here:

1. batch the importer / forecasting loops
2. choose one client data pattern for `apps/app` instead of today’s hybrid
3. collapse the SMS package to one public API and one implementation
4. stop adding more copy-paste API routes without extracting the shared read/list patterns

## Evidence sources

- `apps/app/app/layout.tsx`
- `apps/app/app/query-provider.tsx`
- `apps/app/app/lib/use-event-budgets.ts`
- `apps/app/app/lib/chart-of-accounts.ts`
- `apps/app/app/lib/use-forecasts.ts`
- `apps/app/app/api/search/route.ts`
- `apps/api/app/api/kitchen/import/importers/recipe-ingredients.ts`
- `apps/api/app/lib/inventory-forecasting.ts`
- `apps/app/app/(authenticated)/(events)/events/tree/actions.ts`
- `apps/app/app/(authenticated)/(events)/events/[eventId]/board/actions.ts`
- `packages/database/src/vendor-cost-service.ts`
- `packages/notifications/index.ts`
- `packages/notifications/sms.ts`
- `packages/notifications/sms-new.ts`
- `packages/notifications/sms-temp.ts`
- `packages/supplier-connectors/src/connectors/us-foods.ts`
- `packages/supplier-connectors/src/connectors/charlies-produce.ts`
- `apps/api/app/api/inventory/supplier-sync/status/route.ts`
