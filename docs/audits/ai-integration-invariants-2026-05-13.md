# AI-Integration Invariant Audit
**Last updated:** 2026-05-18 (cron-36)  
**Git HEAD:** a1ebb4d0e59300304ac176e20e69ff4b7df04ea6  
**Auditor:** Hermes (scheduled cron)

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | `ClerkProviderClient` calls `useTheme()` before `ThemeProvider` exists in the tree — Clerk dark theme silently broken | HIGH | **UNRESOLVED** |
| 2 | Two concrete command `route.ts` files live inside `apps/app` (frontend app), bypassing API-layer auth and rate limiting | HIGH | **UNRESOLVED** |
| 3 | 77 concrete command route files in `apps/api` outside the single manifest dispatcher | MEDIUM | **STALE** — dispatcher consolidation in progress; known legacy routes are tracked in `specs/manifest/PATTERNS.md` |
| 4 | Middleware public-route allowlist uses prefix regex — new paths with unexpected prefixes could silently pass auth | LOW | Acceptable; explicit allowlist in place |
| 5 | `apps/app/app/layout.tsx` renders a duplicate `<Toaster>` from `DesignSystemProvider` — previously fixed, monitoring for regression | LOW | **FIXED** (stable) |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` called above `ThemeProvider` in root layout

**File:** `apps/app/app/clerk-provider.client.tsx:13`  
**Root cause:** `ClerkProviderClient` is rendered at the root of the app tree (line 36 of `layout.tsx`) and calls `useTheme()` to derive the Clerk appearance theme. However, `ThemeProvider` (via `DesignSystemProvider`) is rendered *inside* `ClerkProviderClient` as a descendant (line 40). `useTheme()` returns `undefined` when no ancestor `ThemeProvider` is present, so `resolvedTheme` is always `undefined`, `theme` is always `undefined`, and the Clerk dark theme is never applied.

**Proof:**
```
layout.tsx:36  <ClerkProviderClient>         ← calls useTheme() here (no ThemeProvider above)
layout.tsx:40    <DesignSystemProvider>       ← wraps ThemeProvider
                   <ThemeProvider>            ← TOO LATE; already below ClerkProviderClient
```

**Product impact:** Users with dark mode active see Clerk modals (sign-in, org switcher, user button) rendered in light mode. Visual regression; no auth breakage.

**Smallest safe fix:** Hoist `ThemeProvider` above `ClerkProviderClient` in `layout.tsx`, or pass the resolved theme as a prop to `ClerkProviderClient` from a parent that already has theme context.

---

### BUG-2 — Concrete command routes in `apps/app` (frontend app)

**Files:**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Root cause:** The manifest architecture rule mandates that only `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` should be the single dispatcher. All other concrete command routes belong in `apps/api`. These two files live in the frontend app (`apps/app`) and implement their own auth and validation inline. They bypass the API layer's rate limiting, centralized auth middleware, and any future manifest-level command interceptors.

**Product impact:** Shift mutation requests handled by the frontend app server instead of the API server. Security controls that apply in `apps/api` don't apply here. Inconsistent behavior if the API layer adds middleware.

**Smallest safe fix:** Move both route handlers to `apps/api` under their correct entity path and delete them from `apps/app`.

---

## Suspicious But Unproven

### SUSP-1 — 77 concrete command routes in `apps/api` outside manifest dispatcher

The manifest dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` exists and is the canonical entry point. However, 77 concrete named route files also exist (e.g. `apps/api/app/api/events/catering-orders/commands/create/route.ts`). It's unclear whether these are legacy, generated stubs, or intentional fallbacks.

**Not confirmed as broken** — the dispatcher may delegate to them. Needs architecture clarification.

---

### SUSP-2 — `apps/api/proxy.ts` uses custom `clerkMiddleware` re-export

`apps/api/proxy.ts:1` imports from `@repo/auth/server`, not directly from `@clerk/nextjs/server`. The re-export in `packages/auth/proxy.ts` maps `clerkMiddleware` → `authMiddleware` but the API proxy imports `clerkMiddleware` by the original name. This chain works only if `@repo/auth/server` correctly re-exports `clerkMiddleware`. Verify no naming drift.

---

### SUSP-3 — `notifications-provider.tsx` uses `mounted` guard but still calls `useTheme()` inside `(authenticated)` layout

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`  
This component correctly guards against SSR hydration mismatch via the `mounted` state flag. However, if `ThemeProvider` from BUG-1 context is ever reorganized, this component's theme read could also be affected. Currently benign because `NotificationsProvider` is rendered deep in the authenticated subtree. Monitor if BUG-1 is addressed.

---

## False Alarms / Intentionally Valid

| Item | Verdict |
|------|---------|
| `packages/auth/provider.tsx` — `AuthProvider` does not wrap `ClerkProvider` | **Correct by design** — comment explicitly documents this; `ClerkProvider` lives at root |
| `packages/design-system/components/mode-toggle.tsx` — `useTheme()` call | Valid — this component is always rendered below `ThemeProvider` inside `DesignSystemProvider` |
| `packages/design-system/components/ui/sonner.tsx` — `useTheme()` call | Valid — rendered inside `DesignSystemProvider > ThemeProvider` |
| `apps/mobile/App.tsx` — `ClerkProvider` wraps `QueryClientProvider` | Correct — mobile has its own root, no duplication |
| `apps/storybook/.storybook/preview.tsx` — `ThemeProvider` at story root | Correct — isolated storybook environment |
| `packages/auth/components/sign-in.tsx` / `sign-up.tsx` — `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` cross-set | Valid pattern — Clerk docs show cross-setting these on both components for round-trip redirect consistency |
| `apps/app/proxy.ts` API routes returning JSON 401/403 | **Correct** — explicit `jsonResponse()` helper used for all `/api(.*)` routes |
| `apps/app/test/mocks/@clerk/nextjs.tsx` — mock `ClerkProvider` | Test mock; expected |

---

## Provider Graph Summary

```
layout.tsx (Server Component)
└── <ClerkProviderClient>          ← [BUG-1] useTheme() here, no ThemeProvider above
    └── <QueryProvider>            ← QueryClientProvider OK
        └── <AnalyticsProvider>
            └── <DesignSystemProvider>
                └── <ThemeProvider>   ← ThemeProvider is TOO DEEP
                    └── children
```

**Required ordering:**
```
<ThemeProvider>                    ← must be outermost
  <ClerkProviderClient>            ← can then read theme
    <QueryProvider>
      ...
```

---

*No files were modified during this audit.*
