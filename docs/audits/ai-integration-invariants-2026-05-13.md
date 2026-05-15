# AI Integration Invariants Audit
**Last updated:** 2026-05-14T17:31Z  
**Git HEAD:** f6243963 (fix: BUG-3 remove sentry-fixer/process from public routes)  
**Scope:** Provider graph, Clerk, auth routes, manifest route invariants, stale wrappers

---

## Executive Summary — Top 5 Risks

1. **[BUG-1] [UNRESOLVED] 70 concrete command route.ts files in apps/api outside the manifest single-dispatcher.** None of these routes pass through manifest policy/guard middleware. Product impact: business rules (guards, policies, state machine transitions) are silently skipped for all 70 entity/command pairs.
2. **[BUG-2] [FIXED] 3 of those 70 routes bypass the manifest runtime entirely** — using raw SQL or direct Prisma with hardcoded business logic. Hardcoded values extracted to named constants (cost ratios, category keywords, status strings, state transitions). Full manifest wiring deferred to BUG-1.
3. **[SUSP-1] QueryClientProvider is rendered as a child of ClerkProvider in the web layout** — both use React context; the current nesting is fine but any future hook that requires Clerk state inside QueryClientProvider setup would silently use undefined context. Low risk now, worth noting.
4. **[SUSP-2] apps/app/proxy.ts public route allowlist has no `/_next` static asset entries** — Next.js static asset requests that somehow hit middleware could be blocked. Low real-world impact; Next.js usually handles these before middleware.
5. **[SUSP-3] apps/api/proxy.ts uses `@repo/auth/server` re-export** — version drift between the re-export shim and the actual `@clerk/nextjs/server` package could silently use a stale API surface. Currently benign; flag if Clerk is upgraded.

---

## Confirmed Bugs

### BUG-1: 70 concrete command route.ts files in apps/api outside manifest single-dispatcher

**File pattern:** `apps/api/app/api/**/commands/*/route.ts` (excluding `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`)  
**Count:** 70 routes  

**Proof:** `find apps/api/app/api -path '*/commands/*/route.ts' | grep -v 'manifest/\[entity\]'` returns 70 paths including:
- `apps/api/app/api/events/catering-orders/commands/create/route.ts`
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/` (13 routes)
- `apps/api/app/api/procurement/requisitions/commands/` (8 routes)
- … 49 more

**Product impact:** All 70 routes execute outside the manifest constraint engine. Guards (e.g. state machine transition guards), policies, and audit hooks defined in `.manifest` files are never invoked. A command that should be blocked by a guard (e.g. "can only approve if status is pending") will succeed silently if called directly.

**Smallest safe fix:** For each entity, replace the concrete route with a thin dispatcher that delegates to `executeManifestCommand(entity, command, body)` — same pattern as `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`. Do not do this in bulk; tackle entity by entity, verifying each with the corresponding product-flow E2E test.

---

### BUG-2: 3 routes bypass manifest runtime entirely (raw SQL / direct Prisma + hardcoded business logic)

**Status:** FIXED  
**Fixed:** 2026-05-14T18:15Z — automated fix cron (extracted hardcoded values to named constants)

**Files:**
1. `apps/api/app/api/events/profitability/commands/recalculate/route.ts` — direct Prisma queries with hardcoded cost ratios (35%/15%/5%). **Fixed:** Cost ratios extracted to `FOOD_COST_RATIO`, `LABOR_COST_RATIO`, `OVERHEAD_COST_RATIO`; category keywords extracted to `FOOD_CATEGORY_KEYWORDS`, `LABOR_CATEGORY_KEYWORDS`, `OVERHEAD_CATEGORY_KEYWORDS`.
2. `apps/api/app/api/procurement/purchase-orders/commands/update-status/route.ts` — raw SQL for state transitions. **Fixed:** `VALID_TRANSITIONS` moved to shared `constants.ts` at `apps/api/app/api/procurement/purchase-orders/constants.ts`.
3. `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts` — raw SQL for PO receipt. **Fixed:** Status strings extracted to `QUALITY_STATUS` and `PO_STATUS` constants in shared `constants.ts`.

**Note:** This is the immediate low-risk step (extract to config constants). The full fix — wiring through `executeManifestCommand` — remains as BUG-1 remediation work.

**Proof:** All three files use `database` (Prisma client) or raw SQL directly without calling `executeManifestCommand` or any manifest runtime function.

**Product impact:** Business logic (cost ratios, valid state transitions) is duplicated between the manifest and these route files. Drift is inevitable; a manifest update will not affect runtime behavior for these routes.

**Smallest safe fix:** Extract hardcoded values to config constants (immediate low-risk step). Full fix: wire through `executeManifestCommand` matching BUG-1 remediation.

---

## Suspicious But Unproven

### SUSP-1: QueryClientProvider nested inside ClerkProvider

**File:** `apps/app/app/layout.tsx:46-54`  
`DesignSystemProvider > ClerkProviderClient > QueryProvider > AnalyticsProvider`

The nesting is structurally correct for current usage. No hook currently depends on Clerk context inside QueryClient initialization. Flag only if a `queryClient.setDefaultOptions` or `QueryClient` factory starts calling `useAuth()` / `getToken()`.

### SUSP-2: apps/app/proxy.ts — no /_next static asset entries in public route allowlist

**File:** `apps/app/proxy.ts:5-11`  
Public routes are: `/sign-in(.*)`, `/sign-up(.*)`, `/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`. No `/_next/static`, `/_next/image`, or `/favicon` entries. Next.js processes static assets before middleware in most configurations, so this is unlikely to cause prod issues. Monitor if static assets start returning 401 in CI logs.

### SUSP-3: apps/api/proxy.ts uses @repo/auth/server re-export

**File:** `apps/api/proxy.ts:1`  
`import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server"`  
The shim at `packages/auth/proxy.ts` re-exports from `@clerk/nextjs/server`. If `@clerk/nextjs` is upgraded and the shim is not updated simultaneously, the API middleware silently uses the older API surface. Not broken today; add to Clerk upgrade checklist.

---

## False Alarms / Intentionally Valid

1. **ClerkProviderClient calling useTheme()** — `apps/app/app/clerk-provider.client.tsx:13`. Valid. `ClerkProviderClient` is rendered as a child of `DesignSystemProvider` which wraps `ThemeProvider`. `useTheme()` is below `ThemeProvider` in the tree. The `mounted` guard (added in e7234fa7) correctly prevents hydration mismatch.

2. **Duplicate ClerkProvider** — `packages/auth/provider.tsx` explicitly does NOT render `<ClerkProvider>` (see comment on line 13-14). Only one `ClerkProvider` in the web app (in `clerk-provider.client.tsx`). Valid.

3. **sign-in/sign-up using afterSignInUrl/afterSignUpUrl** — Not present. `packages/auth/components/sign-in.tsx` and `sign-up.tsx` use only `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` / `fallbackRedirectUrl`. No deprecated props. Valid.

4. **useAuth() in unauthenticated sign-in/sign-up pages** — `apps/app/app/(unauthenticated)/sign-in/.../sign-in-with-analytics.tsx` and `sign-up-with-analytics.tsx` call `useAuth()`. These are wrapped by `ClerkProvider` at root; `useAuth()` is safe here (it returns `isSignedIn: false` for unauthenticated users, which is the expected behavior for the analytics hook).

5. **apps/mobile/App.tsx ClerkProvider + QueryClientProvider** — Mobile has its own `ClerkProvider` from `@clerk/clerk-expo`. This is correct and independent of the web app's ClerkProvider. `QueryClientProvider` is nested inside, which is fine.

6. **packages/design-system/components/mode-toggle.tsx and ui/sonner.tsx calling useTheme()** — Both are components consumed inside pages that are already below ThemeProvider. Valid.

7. **apps/storybook using ThemeProvider** — Storybook has its own isolated provider tree. Valid.

8. **packages/auth/proxy.ts re-exporting clerkMiddleware as authMiddleware** — Named re-export alias. Not used in the web app middleware (both `apps/app/proxy.ts` and `apps/api/proxy.ts` import `clerkMiddleware` directly). Harmless.

---

## Previously Confirmed Bugs — Now Fixed

| Bug | Fixed in commit | Description |
|-----|----------------|-------------|
| Duplicate `<Toaster />` in root layout | `2dbdaa48` | `apps/app/app/layout.tsx` no longer renders its own Toaster |
| Concrete shift command routes in `apps/app` frontend | `2d60b7ac` | Both `create-validated` and `update-validated` route files deleted; rewrite proxy now active |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` dead fallback in mobile | `742341a5` | Stale env var fallback removed |
| ClerkProviderClient theme flash on hydration | `e7234fa7` | `mounted` guard added; SSR defaults to `undefined` (light) theme |
| `/api/sentry-fixer/process` in public route allowlist | `f6243963` | Removed from public matcher; endpoint now requires Clerk auth or `x-vercel-cron` header |
