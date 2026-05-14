# AI Integration Invariants Audit
**Last updated:** 2026-05-14T20:15Z  
**Git HEAD:** (pending commit)  
**Auditor:** Hermes scheduled cron

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | 70 concrete command `route.ts` files exist outside the single manifest dispatcher (was 72; 2 in apps/app removed) | High | UNRESOLVED |
| 2 | 2 concrete command routes lived in `apps/app` (frontend), bypassing API-layer auth/rate-limiting | High | FIXED |
| 3 | `apps/app` public-route matcher uses prefix substring matching — new routes with matching path segments could silently bypass auth | Medium | Suspicious |
| 4 | `notifications-provider.tsx` calls `useTheme()` inside `(authenticated)` subtree — valid because layout wraps ThemeProvider, but mount guard pattern adds complexity | Low | False alarm |
| 5 | `ClerkProvider` theming relying on `resolvedTheme` — previously flagged as broken ordering; confirmed correct after provider reordering commit `bbccf85a` | Resolved | — |

---

## Confirmed Bugs

### BUG-1 — Concrete command routes in `apps/app` frontend (FIXED)

**Fixed:** 2026-05-14T20:15Z — automated fix cron

**Files (deleted):**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Root cause:** The `next.config.ts` already has an `afterFiles` rewrite proxying `/api/staff/:path*` to the API app. The local filesystem routes took priority over the rewrite (filesystem > afterFiles), so they handled requests locally, bypassing the API's rate limiter, auth scope enforcement, and Sentry. Deleting the local files lets the rewrite take effect — requests now flow through `apps/api/app/api/staff/shifts/commands/create-validated/route.ts` (which uses the full manifest runtime with proper policy/guard enforcement).

**Verification:** `pnpm --filter app typecheck` passed. Build fails on pre-existing missing env vars (`RESEND_FROM`/`RESEND_TOKEN`), unrelated to this change.

---

### BUG-2 — 70 concrete command `route.ts` files in `apps/api` outside the manifest single-dispatcher (UNRESOLVED / backlog)

**Scope:** All paths matching `apps/api/app/api/*/commands/*/route.ts` except `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`. Current count: **70** (72 total minus 2 in apps/app).

**Examples:**
- `apps/api/app/api/events/catering-orders/commands/create/route.ts`
- `apps/api/app/api/procurement/requisitions/commands/submit/route.ts`
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/start-generating/route.ts`
- *(plus ~67 others)*

**Product impact:** Per `AGENTS.md` manifest route invariant, concrete generated command route files are illegal — only the single dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` should exist. These files bypass manifest IR governance, meaning command definitions, guards, and policies in the manifest are not enforced for these routes. They also create duplicate route surfaces that can diverge from the IR.

**Proof:** `find apps/api -path '*/commands/*/route.ts' -not -path '*/manifest/*'` returns 70 files.

**Smallest safe fix:** Per existing AGENTS.md guidance — migrate each entity's command routes to use the manifest dispatcher, or explicitly allowlist them as bypass routes in `IMPLEMENTATION_PLAN.md` with justification. Do not mass-delete without verifying each is covered by the dispatcher.

---

## Resolved Since Last Run

### FIXED — BUG-1 (prior numbering): Duplicate `<Toaster />` rendered

**Commit:** `2dbdaa48` — "fix: BUG-1 remove duplicate Toaster from root layout"

`apps/app/app/layout.tsx` no longer renders `<Toaster />`. The only remaining `<Toaster />` is inside `packages/design-system/index.tsx:23` via `DesignSystemProvider`. Double-toast bug is resolved.

---

### FIXED — Prior BUG-1 (earlier numbering): `useTheme()` called above `ThemeProvider` in `ClerkProviderClient`

**Commit:** `bbccf85a` — reordered providers so `DesignSystemProvider` (which wraps `ThemeProvider`) is the outermost wrapper. `ClerkProviderClient` is now a child of `DesignSystemProvider`, so `useTheme()` at `apps/app/app/clerk-provider.client.tsx:13` is correctly below `ThemeProvider`.

---

## Suspicious But Unproven

### S-1 — App middleware public-route negation regex may be too broad

**File:** `apps/app/middleware.ts:10` (re-exports from `proxy.ts`)  
**File:** `apps/app/proxy.ts` — `createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/plasmic(.*)", "/view/proposal(.*)", "/sign/contract(.*)"])`

The matcher config in `middleware.ts` uses a negation regex with hardcoded prefix strings (`sign-in`, `sign-up`, `plasmic`, `view/proposal`, `sign/contract`). New public routes (e.g., `/accept/invite`, `/verify/email`) would need to be added to both the `createRouteMatcher` allowlist in `proxy.ts` AND the negation regex in `middleware.ts`. If only one is updated, auth may be inconsistent. Not currently broken, but the dual-maintenance pattern is fragile.

### S-2 — `useAuth()` called in unauthenticated sign-in/sign-up pages

**Files:**
- `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`
- `apps/app/app/(unauthenticated)/sign-up/[[...sign-up]]/sign-up-with-analytics.tsx:14`

These call `useAuth()` in the `(unauthenticated)` route group. `ClerkProvider` is at root layout, so the hook is available. However, calling `useAuth()` here to check `isSignedIn` for analytics firing is technically sound but relies on Clerk being initialized for unauthenticated routes — which is true here because `ClerkProvider` is root-level. Not broken, but worth noting.

### S-3 — `notifications-provider.tsx` and `useTheme()` in authenticated layout

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`

`useTheme()` is used here with a `mounted` guard to avoid SSR hydration mismatch. This is a valid pattern. However, if this component were ever rendered outside the `(authenticated)` route tree (which nests under the root layout containing `DesignSystemProvider`/`ThemeProvider`), it would silently return `undefined` for `resolvedTheme` without error. Currently safe.

---

## False Alarms / Intentionally Valid

| Item | Reason |
|------|--------|
| `ClerkProviderClient` using `useTheme()` | Now correctly below `ThemeProvider` via `DesignSystemProvider` wrapping (fixed `bbccf85a`) |
| `query-provider.tsx` — single `QueryClientProvider` | Clean singleton, all hooks below it |
| `tracked-user-button.tsx` — `useAuth()` in authenticated zone | Correctly below `ClerkProvider` root |
| `auth-header.tsx` — `SignedIn`/`SignedOut` at root layout | Root layout has `ClerkProvider` above it; valid |
| API middleware JSON 401/403 | `apps/api/proxy.ts` correctly returns JSON for API routes, redirects only for page routes |
| No deprecated `afterSignInUrl`/`afterSignUpUrl` props found | Zero results from `git grep` — clean |
| Single `ClerkProvider` path in `apps/app` | Only `apps/app/app/clerk-provider.client.tsx` — no nested duplicates |
| `AnalyticsProvider` placement | Inside `QueryProvider`/`ClerkProvider` tree in root layout — correct |

---

## Manifest Route Invariant Detail

**Total `commands/*/route.ts` files:** 71  
**Dispatcher (legal):** 1 — `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`  
**Concrete routes in `apps/api` (illegal per AGENTS.md):** 70  
**Concrete routes in `apps/app` (was 2, now 0 — FIXED):** 0  

Categories of concrete routes by domain:
- `events/` — catering-orders (6), import-workflows (17), profitability (1)
- `kitchen/` — alerts-config (3), prep-task-plan-workflows (15)
- `procurement/` — purchase-orders (2), requisitions (7)
- `crm/` — proposals (5), leads (1)
- `communications/` — email-templates (1)
- `staff/` — shifts (2 in apps/api)
- `inventory/` — bulk-order-rules (2), variance-reports (2)

---

*Audit scope: provider graph invariants, Clerk invariants, auth route invariants, manifest route invariants, stale/generated-code smell. No files were modified during this audit.*
