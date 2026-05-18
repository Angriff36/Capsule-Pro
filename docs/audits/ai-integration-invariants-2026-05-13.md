# AI Integration Invariants Audit — capsule-pro

**Last updated:** 2026-05-15 (cron-24)
**Git HEAD:** c6c2b6f3da787ebf1c77c04aeecef059403699c7
**Auditor:** automated scheduled cron pass

---

## TL;DR Executive Summary — Top 5 Risks

| # | Risk | File(s) | Status |
|---|------|---------|--------|
| 1 | **70 concrete manifest command routes** outside the single-dispatcher | `apps/api/app/api/**/commands/*/route.ts` | OPEN (backlog) |
| 2 | **Prefix-based public matchers** silently expose future routes | `apps/app/proxy.ts:5-11` | SUSPICIOUS |
| 3 | **`/api/public(.*)` blanket bypass** in API middleware | `apps/api/proxy.ts:7-11` | SUSPICIOUS |
| 4 | **NotificationsProvider SSR theme** hardcoded to `"light"` | `apps/app/app/(authenticated)/components/notifications-provider.tsx:24` | SUSPICIOUS |
| 5 | (No new #5 this run — all other previously confirmed bugs have been fixed) | — | FIXED |

---

## Confirmed Bugs

### BUG-1 — Concrete Manifest Command Routes (70 files) — OPEN

**Invariant:** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` must be the _single_ dispatcher. All other `route.ts` files under any `commands/` directory are illegal per AGENTS.md.

**Count:** 70 concrete route files (unchanged since first detection).

**Affected modules (partial):**
- `apps/api/app/api/communications/email-templates/commands/create/route.ts`
- `apps/api/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/api/app/api/staff/shifts/commands/update-validated/route.ts`
- `apps/api/app/api/inventory/bulk-order-rules/commands/{create,update}/route.ts`
- `apps/api/app/api/inventory/variance-reports/commands/{review,approve}/route.ts`
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/` (16 routes)
- `apps/api/app/api/kitchen/alerts-config/commands/` (3 routes)
- `apps/api/app/api/events/import-workflows/commands/` (16 routes)
- `apps/api/app/api/events/catering-orders/commands/` (6 routes)
- `apps/api/app/api/events/profitability/commands/recalculate/route.ts`
- `apps/api/app/api/crm/proposals/commands/` (5 routes)
- `apps/api/app/api/crm/leads/commands/` (4 routes)
- `apps/api/app/api/procurement/purchase-orders/commands/` (2 routes)
- `apps/api/app/api/procurement/requisitions/commands/` (9 routes)

**Product impact:** These routes operate outside the manifest IR surface. They cannot be linted, coverage-checked, or verified against `routes.manifest.json`. Any drift between these routes and the manifest silently widens the gap tracked in IMPLEMENTATION_PLAN.md. Per AGENTS.md, "All mutations compile to Manifest domain commands" and "New/changed API write handlers must exist in canonical route surface."

**Proof:** `find apps/api/app/api -path '*/commands/*/route.ts' ! -path '*/manifest/*' -print | wc -l` → 70

**Smallest safe fix:** Progressively migrate concrete routes into the single manifest dispatcher (`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`), or formally allowlist them in IMPLEMENTATION_PLAN.md with an explicit rationale per entity. Do not add more concrete routes until the backlog is addressed.

---

## Previously Confirmed Bugs — Now Fixed

### BUG-2 (FIXED — commit 9ba9b4d1) — Clerk theme flash / `useTheme()` above ThemeProvider

`apps/app/app/clerk-provider.client.tsx` previously called `useTheme()` at the top level while rendering _above_ `DesignSystemProvider` (which contains `ThemeProvider`). This caused the Clerk dark theme to never apply on first render.

**Current state:** `ClerkProviderClient` is now rendered _inside_ `DesignSystemProvider` in `apps/app/app/layout.tsx:46`. The component additionally uses `useSyncExternalStore` to read the DOM's `html.dark` class synchronously before hydration completes. Provider ordering is: `DesignSystemProvider → ClerkProviderClient → QueryProvider`. This is correct — `useTheme()` is called below `ThemeProvider`. **CONFIRMED FIXED.**

### BUG-3 (FIXED — commit 2dbdaa48) — Duplicate `<Toaster />`

Duplicate `<Toaster />` rendered by both `apps/app/app/layout.tsx` and `packages/design-system/index.tsx`. No longer present. **CONFIRMED FIXED.**

### BUG-4 (FIXED — commit 2d60b7ac) — Shift command routes in `apps/app`

`apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — concrete command routes living in the frontend app, bypassing API-layer middleware. No longer present in `apps/app`. **CONFIRMED FIXED.**

### BUG-5 (FIXED — commit f6243963) — `sentry-fixer` in public routes allowlist

`apps/app/proxy.ts` previously included `/sentry-fixer(.*)` in the public route matcher. Removed. **CONFIRMED FIXED.**

### BUG-6 (FIXED — commit cbc329bd) — Hardcoded cost ratios

Hardcoded percentage constants in recipe/costing logic. Removed. **CONFIRMED FIXED.**

### BUG-7 (FIXED — commit b614e799) — Clerk fallback redirect cross-contamination

`packages/auth/components/sign-in.tsx` and `sign-up.tsx` previously passed `signInFallbackRedirectUrl` to the wrong component (sign-in file passing sign-up URL and vice versa). Fixed. **CONFIRMED FIXED.**

---

## Suspicious but Unproven

### SUSP-1 — Prefix-based public matchers

**File:** `apps/app/proxy.ts:5-11`

```ts
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/plasmic(.*)",
  "/view/proposal(.*)",
  "/sign/contract(.*)",
]);
```

Any future page added under `/plasmic/`, `/view/proposal/`, or `/sign/contract/` becomes public by default with no explicit decision. `/plasmic/` is particularly broad — if a Plasmic-generated page is added at `/plasmic/admin/...` it's unauthenticated automatically.

**Risk:** Medium. Not a current crash but a latent auth bypass vector.

**Not changing in this pass.** Track: ensure no authenticated pages are ever added under these prefixes without reviewing this matcher.

---

### SUSP-2 — `/api/public(.*)` blanket bypass in API middleware

**File:** `apps/api/proxy.ts:7-11`

```ts
const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health(.*)",
  "/api/public(.*)",
]);
```

`/api/public(.*)` is a broad blanket. The comment says "Token validation is performed by the route handler." This is a convention-based guarantee, not a structural one — any route added under `/api/public/` that forgets to validate the token is silently unauthenticated.

**Risk:** Medium. Worth auditing all current `/api/public/` handlers to confirm token validation is present.

**Not changing in this pass.**

---

### SUSP-3 — NotificationsProvider SSR theme hardcoded to `"light"`

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:24`

```ts
const theme = mounted ? (resolvedTheme as "light" | "dark") : "light";
```

Dark-mode users (system or explicit) will see the Knock notification SDK initialized with `"light"` theme on SSR and for the first client render frame before `mounted` flips. This is a visual flash, not a crash. The `mounted` guard is correct hydration hygiene but the default value (`"light"`) is wrong for dark-mode-first users.

**Risk:** Low (cosmetic). Smaller than the Clerk theme flash that was fixed.

**Not changing in this pass.**

---

## False Alarms / Intentionally Valid Patterns

| # | File | Why it's valid |
|---|------|----------------|
| FA-1 | `apps/app/app/clerk-provider.client.tsx` | `ClerkProvider` is the single root provider, rendered inside `DesignSystemProvider`. Correct. |
| FA-2 | `packages/auth/provider.tsx` | Explicitly does NOT render `ClerkProvider` — documented comment confirms intentional. |
| FA-3 | `apps/mobile/App.tsx` | Mobile is a separate Expo app with its own provider tree. Separate `ClerkProvider` + `QueryClientProvider` is correct and independent. |
| FA-4 | `packages/auth/components/sign-in.tsx` + `sign-up.tsx` | Uses `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` (current API). No deprecated `afterSignInUrl` / `afterSignUpUrl` in source. Matches only appear in compiled `.next-dev/` bundles (internal Clerk SDK code). |
| FA-5 | `packages/design-system/components/mode-toggle.tsx:21` | `useTheme()` called inside a component that will always be rendered below `ThemeProvider`. Not a provider ordering issue. |
| FA-6 | `packages/design-system/components/ui/sonner.tsx:14` | Same as FA-5 — `useTheme()` inside component, not at provider level. |
| FA-7 | All `useQuery`/`useMutation` hooks in `apps/app/app/lib/*` | All rendered below `QueryProvider` in the root layout. Valid. |
| FA-8 | `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx` | `useAuth()` called inside component rendered below `ClerkProviderClient`. Valid. |
| FA-9 | `apps/app/app/components/auth-header.tsx` | `SignedIn`/`SignedOut` rendered below `ClerkProviderClient`. Valid. |
| FA-10 | `apps/storybook/.storybook/preview.tsx` | Storybook's own isolated provider tree — intentionally wraps with `ThemeProvider`. Not app code. |

---

## Provider Graph Summary

```
RootLayout (apps/app/app/layout.tsx)
  └─ DesignSystemProvider          ← ThemeProvider lives here
       └─ ClerkProviderClient      ← useTheme() called here ✓ (below ThemeProvider)
            └─ QueryProvider       ← QueryClientProvider lives here
                 └─ AnalyticsProvider
                      └─ {children}
                           └─ (authenticated)/layout.tsx
                                └─ AblyProvider
                                     └─ AiAssistantProvider
                                          └─ GlobalSidebar
```

All provider dependencies satisfied. No ordering inversions detected.

---

## Clerk Invariants Summary

- **Single root ClerkProvider:** ✅ — exactly one, in `apps/app/app/clerk-provider.client.tsx`, rendered from root layout.
- **No nested extra ClerkProviders in sub-layouts:** ✅ — scanned all `apps/app/app/**/layout.tsx` files; none add `ClerkProvider`.
- **Deprecated redirect props:** ✅ — no `afterSignInUrl`/`afterSignUpUrl` in source files; only appears in compiled Clerk SDK internals (`.next-dev/`).
- **Clerk appearance API:** ✅ — `appearance={{ theme: isDark ? dark : undefined, cssLayerName: "clerk" }}` matches current `@clerk/nextjs` API.

---

## Auth Route Invariants Summary

- **`apps/app/proxy.ts`:** API routes return JSON 401 (not HTML redirect). Page routes redirect to `/sign-in`. ✅
- **`apps/api/proxy.ts`:** All non-public routes return JSON 401/401. ✅
- **Public routes:** Explicit allowlist in both apps. SUSP-1 / SUSP-2 noted above.
- **`/sentry-fixer/process`:** Previously in public route allowlist — removed (fixed).

---

## Manifest Route Invariants Summary

- **Single dispatcher path:** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` ✅ exists.
- **Concrete route files outside dispatcher:** 70 — **BUG-1 OPEN**.
- **`apps/app` command routes:** 0 (previously 2, now fixed). ✅
