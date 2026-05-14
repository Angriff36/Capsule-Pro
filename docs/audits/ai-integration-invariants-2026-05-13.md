# AI Integration Invariants Audit

**Last updated:** 2026-05-14T03:36Z (scheduled cron — third pass)  
**Git HEAD:** 024396fe87fa3b90fe0b18377d6c1b5f76617c48  
**Auditor:** automated cron

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | File |
|---|------|----------|------|
| 1 | `useTheme()` called above `ThemeProvider` in `ClerkProviderClient` — Clerk dark mode silently broken | **HIGH** | `apps/app/app/clerk-provider.client.tsx:13` |
| 2 | Duplicate `<Toaster />` in root layout + `DesignSystemProvider` — every toast fires twice | **MEDIUM** | `apps/app/app/layout.tsx:55`, `packages/design-system/index.tsx:23` |
| 3 | Concrete command `route.ts` files in the frontend app (`apps/app`) bypass API-layer auth checks | **HIGH** | `apps/app/app/api/staff/shifts/commands/*/route.ts` |
| 4 | 71 concrete command `route.ts` files in `apps/api` outside the manifest single-dispatcher pattern | **MEDIUM** | `apps/api/app/api/…/commands/*/route.ts` |
| 5 | Middleware public-route allowlist is prefix-only; new page groups added outside listed prefixes silently require auth with no visible allowlist entry | **LOW** | `apps/app/proxy.ts:5-11` |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` above `ThemeProvider` in `ClerkProviderClient`

**File:** `apps/app/app/clerk-provider.client.tsx:13`

**Proof:**
```
layout.tsx render order:
  <ClerkProviderClient>         ← calls useTheme() here (line 13)
    <QueryProvider>
      ...
      <DesignSystemProvider>    ← ThemeProvider lives inside here (packages/design-system/index.tsx:20)
```

`ClerkProviderClient` is a `"use client"` component that calls `useTheme()` from `next-themes` before any `ThemeProvider` is in scope. `resolvedTheme` will always be `undefined`; the `dark` Clerk theme is never applied; Clerk modals always render in light mode regardless of user preference.

**Product impact:** All Clerk-rendered UI (sign-in modal, user button, org switcher) ignores the app's dark mode setting. Visual regression for dark-mode users.

**Smallest safe fix:** Move `ClerkProviderClient` below `DesignSystemProvider` in `layout.tsx`, or extract theme-reading into a child component rendered inside `DesignSystemProvider` and pass the resolved theme down to `ClerkProvider` via props.

---

### BUG-2 — Duplicate `<Toaster />`

**Files:**
- `apps/app/app/layout.tsx:55` — explicit `<Toaster />` import from `@repo/design-system/components/ui/sonner`
- `packages/design-system/index.tsx:23` — `DesignSystemProvider` also renders `<Toaster />` internally

`DesignSystemProvider` is rendered in `layout.tsx:40`. Both toasters mount, so every `toast()` call shows two notifications.

**Product impact:** Every toast notification appears twice in production. UX regression, visible to all users.

**Smallest safe fix:** Remove the explicit `<Toaster />` from `apps/app/app/layout.tsx` (line 55). `DesignSystemProvider` already handles it.

---

### BUG-3 — Concrete command routes in `apps/app` (frontend app)

**Files:**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

These are full Next.js route handlers inside `apps/app` (the frontend), not inside `apps/api`. They directly call `database.*` and `auth()`. The API-layer middleware in `apps/api` (rate limiting, API key validation, centralized error handling) is entirely bypassed for these routes.

**Product impact:** Shift create/update writes skip API-layer rate limiting. Potential for unbounded writes if frontend is abused directly. Also creates a maintenance split — two separate auth/database paths for the same domain.

**Smallest safe fix:** Move both routes to `apps/api/app/api/staff/shifts/commands/` and update the frontend fetch URLs accordingly.

---

### BUG-4 — 71 concrete command `route.ts` files in `apps/api` outside manifest dispatcher

**Count:** 71 files under `apps/api/app/api/…/commands/*/route.ts`  
**Example paths:**
```
apps/api/app/api/kitchen/prep-task-plan-workflows/commands/start-generating/route.ts
apps/api/app/api/events/import-workflows/commands/start-proposing/route.ts
apps/api/app/api/procurement/requisitions/commands/create/route.ts
```

Per `AGENTS.md`: the only legal concrete command route file is the single manifest dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`. All 71 of these are illegal by that invariant — they are ad-hoc command implementations bypassing the manifest IR.

**Product impact:** Manifest telemetry, replay, and audit tooling miss these commands. Command definitions exist in two systems (manifest IR + ad-hoc routes) with no synchronization guarantee. Any manifest-level constraint (authorization, schema validation) does not apply to these paths.

**Smallest safe fix (per batch):** Per AGENTS.md, these should be migrated to the manifest/Prisma store pattern one entity at a time. Do not bulk-delete — migration needs entity-by-entity persistence tests.

---

## Suspicious but Unproven

### SUSP-1 — `NotificationsProvider` `useTheme()` in authenticated layout

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`

The component calls `useTheme()` and guards against SSR with a `mounted` flag (correct pattern). It is rendered inside `GlobalSidebar` per the layout comment. If `GlobalSidebar` is inside `DesignSystemProvider` (which contains `ThemeProvider`), this is fine. Could not confirm `GlobalSidebar`'s exact position in the authenticated layout tree without full layout traversal. Low risk given the mounted guard, but worth verifying placement.

### SUSP-2 — `apps/app/proxy.ts` public-route prefix matching

**File:** `apps/app/proxy.ts:5-11`

Public routes are: `/sign-in(.*)`, `/sign-up(.*)`, `/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`. Any new route group added outside these prefixes silently requires auth with no explicit entry. The allowlist is small and pattern-based. Risk is low currently but increases as new unauthenticated pages are added.

### SUSP-3 — `useAuth()` in unauthenticated pages

**Files:**
- `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`
- `apps/app/app/(unauthenticated)/sign-up/[[...sign-up]]/sign-up-with-analytics.tsx:14`

These call `useAuth()` on unauthenticated routes. `ClerkProvider` is at the root so hooks are available, but these components depend on `isSignedIn` transitioning `true` as a proxy for "login succeeded." If Clerk ever delays the auth state update, the analytics event could fire late or not at all. Not a crash, but a data quality risk.

---

## False Alarms / Intentionally Valid

| Item | Reason valid |
|------|-------------|
| `packages/auth/provider.tsx` — `AuthProvider` does not render `ClerkProvider` | Intentional by design (comment confirms it); `ClerkProvider` is at root in `layout.tsx`. |
| `packages/design-system/providers/theme.tsx` — thin `ThemeProvider` wrapper | Legitimate alias; no deprecated API, no provider inversion. |
| `packages/auth/components/sign-in.tsx` / `sign-up.tsx` — `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` | These are the **current** Clerk API (not deprecated). No `afterSignInUrl`/`afterSignUpUrl` found alongside them. Correct usage. |
| `apps/mobile/App.tsx` — `ClerkProvider` + `QueryClientProvider` | Mobile app has its own root; separate from web app. Both providers are at the correct root level for the mobile tree. |
| `apps/storybook/.storybook/preview.tsx` — `ThemeProvider` | Storybook-only decorator; no Clerk or Query hooks called above it. |
| `packages/design-system/components/mode-toggle.tsx` / `ui/sonner.tsx` — `useTheme()` | These are leaf components rendered deep in the tree, well below `ThemeProvider`. |

---

## Methodology Notes

- Provider graph traced via static read of `apps/app/app/layout.tsx` render order and `packages/design-system/index.tsx`.
- Manifest route invariant checked via `find apps -path '*/commands/*/route.ts'`.
- No code was modified.
- Deprecated Clerk props (`afterSignInUrl`, `afterSignUpUrl`) were searched; none found in active code.
- `apps/api/proxy.ts` uses `@repo/auth/server` re-export of `clerkMiddleware`; verified the re-export is a pass-through with no deprecated props added.
