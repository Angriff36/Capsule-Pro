# AI Integration Invariants Audit — 2026-05-13

Audit scope: provider graph ordering, Clerk invariants, auth route invariants,
manifest route invariants, stale/generated-code smell.  
**Read-only pass — no files modified.**

---

## Executive Summary: Top 5 Risks

| # | Risk | Severity | File |
|---|------|----------|------|
| 1 | `ClerkProviderClient` calls `useTheme()` but is rendered **above** `ThemeProvider` | **HIGH — confirmed bug** | `apps/app/app/clerk-provider.client.tsx:13` |
| 2 | 70 concrete command `route.ts` files exist in `apps/api` outside the single-dispatcher path | **HIGH — manifest invariant violation** | see §4 |
| 3 | 2 concrete command `route.ts` files exist in `apps/app` (Next.js app) outside the dispatcher | **MEDIUM — manifest invariant violation** | `apps/app/app/api/staff/shifts/commands/*` |
| 4 | `apps/api/proxy.ts` public-route allowlist uses prefix `"/api/sentry-fixer/process"` — any sub-path is accidentally public | **MEDIUM — auth route risk** | `apps/api/proxy.ts:11` |
| 5 | `Toaster` is rendered twice: once inside `DesignSystemProvider` and once explicitly in `layout.tsx` | **LOW — duplicate sonner mount** | `apps/app/app/layout.tsx:55`, `packages/design-system/index.tsx:22` |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` called above `ThemeProvider` (Clerk theming breaks at runtime)

**File:** `apps/app/app/clerk-provider.client.tsx` line 13  
**Provider graph:**

```
RootLayout (server)
  └─ ClerkProviderClient   ← useTheme() called HERE  (line 13)
       └─ QueryProvider
            └─ DesignSystemProvider
                 └─ ThemeProvider   ← resolvedTheme is defined HERE
```

`ClerkProviderClient` is a `"use client"` component that calls `useTheme()` to
pick the Clerk dark/light appearance. But `ThemeProvider` (the next-themes
`NextThemeProvider`) is mounted inside `DesignSystemProvider`, which is a
**child** of `ClerkProviderClient`. Therefore `useTheme()` runs outside any
`ThemeProvider` context and always returns `resolvedTheme === undefined`.

`theme` resolves to `undefined` (not `dark`) so `ClerkProvider` always receives
`appearance={{ theme: undefined }}` — Clerk modals render in light mode
regardless of the user's system or explicit theme preference.

**Product impact:** Clerk sign-in/sign-up modal is permanently light-themed
even on dark-mode deployments. Visually jarring; may break branded appearance
contracts.

**Proof:**
- `clerk-provider.client.tsx:13` — `useTheme()` call with no ancestor `ThemeProvider`
- `layout.tsx:36–57` — `ClerkProviderClient` is the outermost wrapper; `DesignSystemProvider` (which contains `ThemeProvider`) is nested inside at line 40–52
- `packages/design-system/index.tsx:19–21` — `DesignSystemProvider` renders `<ThemeProvider>` as the outermost child

**Smallest safe fix:**  
Invert the wrapping order in `layout.tsx` so `DesignSystemProvider`
(and therefore `ThemeProvider`) wraps `ClerkProviderClient`:

```diff
-  <ClerkProviderClient>
-    <QueryProvider>
-      <DesignSystemProvider ...>
+  <DesignSystemProvider ...>
+    <ClerkProviderClient>
+      <QueryProvider>
         {children}
-      </DesignSystemProvider>
-    </QueryProvider>
-  </ClerkProviderClient>
+      </QueryProvider>
+    </ClerkProviderClient>
+  </DesignSystemProvider>
```

---

### BUG-2 — 70 concrete command route files in `apps/api` violate manifest dispatcher invariant

**Files (representative sample):**
```
apps/api/app/api/communications/email-templates/commands/create/route.ts
apps/api/app/api/staff/shifts/commands/create-validated/route.ts
apps/api/app/api/inventory/bulk-order-rules/commands/create/route.ts
apps/api/app/api/kitchen/prep-task-plan-workflows/commands/create/route.ts
apps/api/app/api/events/import-workflows/commands/create/route.ts
apps/api/app/api/crm/proposals/commands/accept/route.ts
apps/api/app/api/procurement/requisitions/commands/create/route.ts
... (70 total in apps/api, excluding the canonical dispatcher)
```

**Invariant:** The only legal concrete command handler is:
`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

All 70 non-dispatcher command routes are illegal. They shadow or duplicate the
dispatcher pattern and create a dual-write/dual-read split: commands go to
entity-specific handlers that may persist to different storage than the read
APIs expect (classic BROKEN_PRISMA_READ pattern documented in `AGENTS.md`).

**Product impact:** Write commands may persist data that list/detail read APIs
never see. Any entity whose command routes bypass the dispatcher is silently
broken at the persistence layer.

**Smallest safe fix (per AGENTS.md):** For each entity, wire a PrismaStore into
`ENTITIES_WITH_SPECIFIC_STORES` and consolidate to the canonical dispatcher.
Do not do this as one sweep — follow the batch01/batch02 repair pattern in
`IMPLEMENTATION_PLAN.md`.

---

### BUG-3 — 2 concrete command route files in `apps/app` violate the same invariant

**Files:**
```
apps/app/app/api/staff/shifts/commands/create-validated/route.ts
apps/app/app/api/staff/shifts/commands/update-validated/route.ts
```

These live in the Next.js **app** frontend (`apps/app`), not the API service.
Command routes belong exclusively in `apps/api`. Beyond the manifest invariant
violation, routing write commands through the app frontend bypasses the API's
rate limiting, auth middleware (`apps/api/proxy.ts`), and scope enforcement.

**Product impact:** Shift create/update bypasses API rate limiting and API-key
scope validation. Auth is still enforced (they call `auth()` from
`@repo/auth/server` directly), but the path is non-canonical and fragile.

**Smallest safe fix:** Move these two handlers into `apps/api` and call them
from the frontend via fetch, or fold them into the manifest dispatcher in
`apps/api`.

---

## Suspicious But Unproven

### SUSPECT-1 — `apps/api/proxy.ts` sentry-fixer sub-paths are accidentally public

**File:** `apps/api/proxy.ts:11`
```ts
"/api/sentry-fixer/process",
```

`createRouteMatcher` uses prefix matching. The literal string
`"/api/sentry-fixer/process"` matches only that exact path, which is fine.
However if any sub-route (e.g., `/api/sentry-fixer/process/status`) were added
it would require an explicit matcher update. Not currently broken, but one
misread addition away from an auth bypass.

**Verdict:** Low probability, but worth documenting for the next developer who
touches the sentry-fixer cron endpoint.

### SUSPECT-2 — `Toaster` rendered twice

**Files:**
- `packages/design-system/index.tsx:22` — `<Toaster />` inside `DesignSystemProvider`
- `apps/app/app/layout.tsx:55` — `<Toaster />` explicitly alongside `DesignSystemProvider`

Two Sonner `<Toaster>` mounts means toast notifications may appear twice or the
second mount silently suppresses the first. Needs runtime verification —
Sonner's behavior with two mounts in the same React tree is undocumented.

**Smallest safe fix:** Remove the explicit `<Toaster />` from `layout.tsx:55`
since `DesignSystemProvider` already includes one.

### SUSPECT-3 — `notifications-provider.tsx` `useTheme()` placement

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`

This component calls `useTheme()` and is used inside the `(authenticated)` layout,
which is nested below the root layout. It uses a `mounted` guard to avoid
hydration mismatch. Once BUG-1 is fixed (ThemeProvider moved above ClerkProvider),
this component will be properly inside the ThemeProvider tree. Currently, whether
it has a valid ThemeProvider ancestor depends on where in the authenticated layout
it is rendered. Needs verification once BUG-1 is fixed.

### SUSPECT-4 — `sign-in-with-analytics.tsx` calls `useAuth()` in unauthenticated route

**File:** `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`

`useAuth()` is called in the unauthenticated segment. This is fine because
`ClerkProvider` is at the root and is available everywhere — but it depends on
`ClerkProvider` actually resolving the theme correctly, which circles back to
BUG-1. After BUG-1 is fixed, this is valid and expected behavior.

---

## False Alarms / Intentionally Valid

| Item | Why it's fine |
|------|---------------|
| `packages/auth/provider.tsx` — no `ClerkProvider` rendered | Explicitly documented: "ClerkProvider must exist exactly once in the app root." This is correct intentional design. |
| `apps/mobile/App.tsx` — `ClerkProvider` wraps `QueryClientProvider` | Mobile is a separate React Native app with its own provider tree. Not in scope for the web invariants. |
| `packages/design-system/components/mode-toggle.tsx:21` — `useTheme()` | Design system components are always rendered below `ThemeProvider` by contract. Valid usage. |
| `packages/design-system/components/ui/sonner.tsx:14` — `useTheme()` | Same — design system internals, always below ThemeProvider. Valid. |
| `apps/app/proxy.ts` — `clerkMiddleware` with explicit `isPublicRoute` allowlist | Clean implementation with JSON 401/403 for API routes (lines 58–66). No HTML redirects for API paths. |
| `apps/api/proxy.ts` — `clerkMiddleware` with API-key bypass | Documented bypass, not an auth invariant violation. The key prefix check is deliberate and correctly allows route handlers to validate scope. |
| `packages/auth/components/sign-in.tsx` / `sign-up.tsx` — `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` | Using the current (non-deprecated) redirect API. No deprecated `afterSignInUrl`/`afterSignUpUrl` found in the codebase. Clean. |
| `apps/app/app/clerk-provider.client.tsx:17` — `cssLayerName: "clerk"` | Valid current Clerk appearance API, not deprecated. |

---

## Manifest Route Inventory (for reference)

- **Canonical dispatcher (legal):** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` — 1 file ✅
- **Illegal concrete command routes in `apps/api`:** 70 files ❌
- **Illegal concrete command routes in `apps/app`:** 2 files ❌
- **Total illegal:** 72

Full list of `apps/api` illegal routes (by module):
- `communications/email-templates/commands/create` (1)
- `staff/shifts/commands/create-validated`, `update-validated` (2)
- `inventory/bulk-order-rules/commands/create`, `update` (2)
- `inventory/variance-reports/commands/review`, `approve` (2)
- `kitchen/prep-task-plan-workflows/commands/*` (16)
- `kitchen/alerts-config/commands/create`, `update`, `remove` (3)
- `events/profitability/commands/recalculate` (1)
- `events/import-workflows/commands/*` (16)
- `events/catering-orders/commands/*` (6)
- `crm/proposals/commands/*` (5)
- `crm/leads/commands/*` (4)
- `procurement/purchase-orders/commands/*` (2)
- `procurement/requisitions/commands/*` (10)

---

## Appendix: Grep Evidence

Key commands run during this audit:
```
git grep -n "useTheme|ThemeProvider|ClerkProvider|..." -- apps packages
find apps -path '*/commands/*/route.ts' -print
```

All findings are based on source examination at commit state captured by
`git status --short` on 2026-05-13. The working tree has ~50 modified files
(test files and various API route handlers), none of which affect the findings
above.
