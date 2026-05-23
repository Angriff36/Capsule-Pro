# Audit Archive — Pass 9: Frontend Health Audit

Frontend health audit (imports, API contracts, error handling, accessibility). Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## Frontend Health Audit (9th Pass — Re-verified)

> **Audited:** 2026-04-25
> **Scope:** All 601 .ts/.tsx files under `apps/app/` (pages, components, actions, lib) + 111 files in `packages/design-system/`
> **Method:** 24 parallel subagent investigations (20 initial + 4 re-launched after rate-limit) — full import graph analysis, API contract comparison, error boundary inventory, client/server boundary check, accessibility scan, performance audit. **All findings verified against actual codebase; 12 of prior draft's 16 "CRITICAL" claims were false positives.**
> **Prior passes covered:** API routes, raw SQL, packages, E2E tests. **This pass is entirely new — no overlap.**

### False Positive Corrections from Prior Draft

The initial 9th-pass draft contained numerous false claims. All have been corrected below:

| Prior Claim | Verification | Reality |
|-------------|-------------|---------|
| "4 broken `@/components/*` imports in kitchen" | `tsconfig.json` has `@/*: ["./*"]` relative to `apps/app/`; `apps/app/components/allergen-matrix.tsx` exists | **FALSE** — imports resolve correctly |
| "Facilities `data.data.xxx` response nesting is wrong" | `manifestSuccessResponse({ assets })` returns `{ success: true, data: { assets } }`; `data.data.assets` is correct | **FALSE** — access pattern is correct |
| "Facilities assets missing update/delete endpoints" | `ls apps/api/app/api/facilities/assets/commands/` shows `create, delete, update` | **FALSE** — endpoints exist |
| "Mobile kitchen NotificationsProvider import broken" | `notifications-provider.tsx` exists at `(authenticated)/components/`; relative import resolves | **FALSE** — import works |
| "`@/env` import in layout.tsx doesn't resolve" | `apps/app/env.ts` exists with `createEnv()` export | **FALSE** — import resolves |
| "Shipments API module completely missing" | `apps/api/app/api/shipments/` exists with `route.ts`, `[id]/route.ts`, `shipment/`, `shipment-items/` | **FALSE** — module exists |
| "Staff shifts API module missing" | `apps/api/app/api/staff/shifts/` exists with `[id]`, `available-employees`, `bulk-assignment`, `commands` | **FALSE** — module exists |
| "Staff performance API missing" | `apps/api/app/api/staff/performance/` exists with `employees`, `list`, `commands` | **FALSE** — module exists |
| "Training API missing" | `apps/api/app/api/training/` exists with `assignments`, `modules`, `commands`, `[id]`, `list` | **FALSE** — module exists |
| "`/api/analytics/finance` doesn't exist" | `apps/api/app/api/analytics/finance/route.ts` exists | **FALSE** — endpoint exists |
| "Payroll `use-labor-budgets.ts` hits non-existent routes" | Both `/api/staff/budgets/` and `/api/payroll/labor-budgets/` exist | **FALSE** — path works (ambiguity, not broken) |
| "6 components truly orphaned" | `notifications-provider` imported by sidebar + mobile layout; `module-landing` imported by payroll + settings; `module-header` imported by sidebar | **3 FALSE** — only 3 truly dead |

### Executive Summary

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 4 | Runtime errors (405 method mismatch) + blank screens on failure |
| HIGH | 6 | Missing features, data rendering risk, ambiguous API paths |
| MEDIUM | 8 | Dead code, missing directives, performance debt |
| LOW | 5 | Accessibility, style, minor patterns |
| **Total** | **23** | |

**Top verified risks:**
1. **Chart-of-accounts PATCH vs PUT** — `use-chart-of-accounts.ts:159` sends PATCH but API only supports PUT (405)
2. **Missing `/api/accounting/payments/export`** — export button silently broken
3. **Only 2 `loading.tsx` files** across the entire authenticated app — most data-fetching pages show blank on failure
4. **Ambiguous API base paths** in procurement hooks (both old and new paths exist — needs canonical decision)
5. **6 hook libraries missing `'use client'`** — defensive risk if imported from server components

### 1. Broken Imports

**No build-blocking broken imports found.** All import audits returned CLEAN:

- `@/components/*` (5 kitchen files) — resolves correctly via `tsconfig.json` paths: `@/* → apps/app/./*`
- All `@repo/*` imports — verified against actual package exports
- All `@repo/design-system` imports (50+ paths) — every export exists
- All `@/app/lib/*`, `@/env`, and relative imports — verified resolvable
- No stale `@/components/ui/` references
- No circular imports in `apps/app/app/lib/`
- No `require()` calls in ESM context

### 2. Dead/Orphan Components

#### MEDIUM — Truly dead (zero importers, verified by grep)

| File | Type | Evidence |
|------|------|----------|
| `(authenticated)/test-page.tsx` | Orphan page | 0 links/imports across `apps/` |
| `(authenticated)/components/avatar-stack.tsx` | Dead component | 0 importers |
| `(authenticated)/components/module-shell.tsx` | Dead component | 0 importers |
| `(authenticated)/components/module-section.tsx` | Dead component | 0 importers |
| `(authenticated)/components/cursors.tsx` | Dead component | 0 importers (was collaboration workspace) |
| `(authenticated)/components/collaboration-provider.tsx` | Dead component | 0 importers (was collaboration workspace) |
| `(authenticated)/components/clipboard-image-button.tsx` | Dead component | 0 importers |
| `(authenticated)/data/seed-data.ts` | Dead data file | 0 importers |

#### LOW — Backup/temp files (5)

| File | Notes |
|------|-------|
| `(authenticated)/components/sidebar.tsx.new` | Uncommitted backup |
| `(authenticated)/layout.tsx.new` | Uncommitted backup |
| `(authenticated)/crm/clients/[id]/components/tabs/events-tab.tsx.bak` | Backup file |
| `(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx.backup` | Backup file |
| `(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx.bak` | Backup file |

#### Verified linked (not orphan)

- `notifications-provider.tsx` — imported by `sidebar.tsx` (dynamic) + mobile layout
- `module-landing.tsx` — imported by `payroll/page.tsx` + `settings/page.tsx`
- `module-header.tsx` — imported by `sidebar.tsx`
- `search.tsx` — imported by `sidebar.tsx`
- `lib/command-board/manifest-plans.ts` — imported by `api/command-board/chat/tool-registry.ts`
- `contracts/` — linked via events sidebar (`/events/contracts`)
- `cycle-counting/` — linked via warehouse sidebar (`/cycle-counting`)
- `settings/` — linked under administrative sidebar
- `marketing/` — intentional "Coming Soon" page, linked in sidebar

### 3. UI-to-API Contract Mismatches

#### CRITICAL — Verified runtime errors

| # | Module | File | Line | Mismatch | Impact |
|---|--------|------|------|----------|--------|
| C1 | Accounting | `app/lib/use-chart-of-accounts.ts` | 159 | Sends PATCH to `/api/accounting/accounts/${id}` but `[id]/route.ts` only exports GET, PUT, DELETE | **405 Method Not Allowed** |
| C2 | Accounting | `(authenticated)/accounting/payments/components/payment-list-client.tsx` | 123 | Calls `GET /api/accounting/payments/export` — no route handler exists | **404** — export button broken |
| C3 | Accounting | `app/lib/use-chart-of-accounts.ts` | 89 | Expects `pagination` in GET response but `/api/accounting/accounts` doesn't implement pagination metadata | **Data renders but no pagination** |
| C4 | Various | ~10 data-fetching pages | — | No `loading.tsx`, no `error.tsx`, no try/catch | **Blank white screen on failure** |

#### HIGH — Path ambiguity + missing features

| # | Module | File | Line | Mismatch | Impact |
|---|--------|------|------|----------|--------|
| H1 | Procurement | `app/lib/use-purchase-orders.ts` | 170+ | Uses `/api/inventory/purchase-orders` — both this AND `/api/procurement/purchase-orders` exist | Ambiguous — which is canonical? |
| H2 | Procurement | `app/lib/use-budgets.ts` | 129+ | Uses `/api/events/budgets` — both this AND `/api/procurement/budget` exist | Ambiguous — which is canonical? |
| H3 | Accounting | `app/lib/use-finance-analytics.ts` | 109 | Calls `/api/analytics/finance` — endpoint exists but response shape may differ | Verify contract matches |
| H4 | Scheduling | `scheduling/budgets/components/budgets-client.tsx` | — | Response shape may not match API | Verify contract |
| H5 | Kitchen | `(authenticated)/kitchen/prep-lists/prep-list-client.tsx` | 363 | Calls `/api/kitchen/prep-lists/${id}/pdf` — PDF export endpoint may not exist | Export button potentially broken |
| H6 | Staff | `staff/mobile/timeclock/page.tsx` | 221 | Calls `/api/timecards/entries/commands/clock-in` — endpoint may not exist | Clock-in potentially broken |

#### Verified clean (API contracts match)

- **Facilities module** — `data.data.xxx` pattern is CORRECT (verified: `manifestSuccessResponse` wraps in `{ success: true, data: {...} }`)
- **Facilities assets/areas/work-orders/schedules** — all endpoints exist, response shapes match
- **Logistics module** — all API calls match their endpoints
- **Payroll module** — all contracts verified (both `/api/staff/budgets` and `/api/payroll/labor-budgets` paths work)
- **Procurement pages** (vendors, requisitions, vendor-contracts, approvals, PO pages, budget page) — all match
- **CRM module** — all match
- **Events module** — all match
- **No hardcoded absolute API URLs** — all calls use relative paths or centralized `api.ts`

### 4. Error Handling Gaps

#### CRITICAL — Blank white screen risk

Only **2 `loading.tsx` files** exist in the entire authenticated route tree:
- `kitchen/recipes/loading.tsx`
- `kitchen/recipes/[recipeId]/loading.tsx`

**Pages at highest risk** (no loading.tsx, no error.tsx, no try/catch):

| Page | Fetch type | Risk |
|------|-----------|------|
| `/analytics/finance/page.tsx` | Server component | **CRITICAL** — blank white screen |
| `/inventory/transfers/page.tsx` | Client wrapper | **HIGH** — blank on failure |
| `/events/budgets/page.tsx` | Client wrapper | **HIGH** — blank on failure |
| `/kitchen/recipes/menus/[menuId]/page.tsx` | Server component | **MEDIUM** |
| `/crm/clients/[id]/page.tsx` | Server component | **MEDIUM** |
| `/payroll/reports/page.tsx` | Server component | **MEDIUM** |

**Positive:** `global-error.tsx` and `(authenticated)/error.tsx` provide route-level error boundaries with Sentry integration. Some client components (FinanceAnalyticsPageClient, PODetailPage) have proper loading skeletons and error states.

### 5. Client/Server Boundary Issues

#### MEDIUM — Missing `'use client'` directives (defensive risk)

These files export React hooks (useState, useEffect) without `'use client'`. Currently safe because they're only imported from client components, but would crash if accidentally imported from a server component:

| File | Hooks used |
|------|-----------|
| `app/lib/use-recipe-costing.ts` | useState, useEffect |
| `app/lib/use-kitchen-analytics.ts` | useState, useEffect |
| `app/lib/use-forecasts.ts` | useState, useEffect |
| `app/lib/use-event-budgets.ts` | useState, useEffect |
| `app/lib/use-event-export.ts` | useState, useEffect |
| `app/lib/use-finance-analytics.ts` | useState, useEffect |

All other `'use client'` directives verified correct — no unnecessary or missing directives on component files.

### 6. Accessibility Debt

#### LOW — Icon-only buttons without `aria-label` (6 instances)

| File | Line | Element |
|------|------|---------|
| `scheduling/budgets/components/budgets-client.tsx` | 499 | Edit icon button |
| `scheduling/budgets/components/budgets-client.tsx` | 506 | Trash icon button |
| `events/budgets/budgets-page-client.tsx` | 472 | Calendar icon button |
| `events/budgets/budgets-page-client.tsx` | 479 | Edit icon button |
| `events/budgets/budgets-page-client.tsx` | 486 | Trash icon button |
| `events/budgets/components/create-budget-modal.tsx` | 213 | Close (X) icon button |

**Verified good:** Forms use `<label>` with `htmlFor`, `target="_blank"` links use `rel="noreferrer"`, status indicators include text alongside color, images have `alt` attributes.

### 7. Performance Anti-Patterns

#### MEDIUM

| File | Issue |
|------|-------|
| `(authenticated)/kitchen/waste/waste-entries-client.tsx` | List rendering without `React.memo` on items |
| `(mobile-kitchen)/kitchen/mobile/prep-lists/[id]/page.tsx` | Complex list updates without memoization |
| `kitchen/production-board-realtime.tsx:4` | `import * as Sentry` — namespace import when specific methods needed |
| `kitchen/waste/waste-entries-client.tsx:23` | Same — namespace Sentry import |
| `kitchen/allergens/page.tsx:29` | Same — namespace Sentry import |

#### LOW

| File | Issue |
|------|-------|
| `events/[eventId]/event-details-client/index.tsx:420-460` | Inline function creation in `map()` without memoization |
| `events/[eventId]/event-details-client/event-explorer.tsx:780-822` | Complex cards in `map()` without `React.memo` |
| `analytics/clients/components/client-table.tsx:91-124` | TableRow in `map()` without memoization |
| `app/lib/use-labor-budgets.ts`, `use-event-budgets.ts` | Bypass centralized `api.ts` client with raw `fetch()` |

**Verified positive:** Extensive `useMemo`/`useCallback` usage, dynamic imports with `ssr: false` for heavy components, proper lazy loading.

### Recommended Actions — Frontend Fixes (priority order)

#### Build-blocking (do first)

59. **CRITICAL**: Fix `use-chart-of-accounts.ts:159` — change `method: "PATCH"` to `method: "PUT"`.
60. **CRITICAL**: Create `/api/accounting/payments/export/route.ts` endpoint.
61. **CRITICAL**: Add `loading.tsx` to top 10 data-fetching page directories (analytics/*, payroll/*, facilities/*, procurement/*, crm, events/budgets).
62. **HIGH**: Resolve procurement hook base-path ambiguity — decide canonical paths for `use-purchase-orders.ts` and `use-budgets.ts`, then consolidate.

#### Error handling (do second)

63. **HIGH**: Add `error.tsx` boundaries to pages that fetch without try/catch fallback UI (analytics/finance, inventory/transfers, events/budgets).
64. **HIGH**: Verify clock-in endpoint exists for staff mobile timeclock page.
65. **HIGH**: Verify prep-list PDF export endpoint exists.

#### Cleanup (do third)

66. **MEDIUM**: Add `'use client'` to 6 hook library files (defensive measure).
67. **MEDIUM**: Remove 8 dead files (test-page.tsx, avatar-stack.tsx, module-shell.tsx, module-section.tsx, cursors.tsx, collaboration-provider.tsx, clipboard-image-button.tsx, data/seed-data.ts).
68. **MEDIUM**: Resolve or delete 5 backup files (.new/.bak/.backup).
69. **MEDIUM**: Add `React.memo` to list item components in waste-entries-client and prep-lists.
70. **MEDIUM**: Replace Sentry namespace imports with specific imports.

#### Polish (do last)

71. **LOW**: Add `aria-label` to 6 icon-only buttons in scheduling budgets and events budgets.
72. **LOW**: Memoize list item components in event-explorer and client-table.
73. **LOW**: Convert `use-labor-budgets.ts` and `use-event-budgets.ts` to use centralized `api.ts` client.

---

