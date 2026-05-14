# AI Integration Invariants Audit
**Last updated:** 2026-05-14T12:55Z  
**Git HEAD:** 1d75cea5c68ba47cc4b778866aa62bf80791e02b  
**Auditor:** Hermes scheduled cron

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity |
|---|------|----------|
| 1 | `useTheme()` called *above* `ThemeProvider` in `ClerkProviderClient` — Clerk dark theme silently never applied | HIGH | **FIXED** |
| 2 | Concrete command route files in `apps/app` (`/api/staff/shifts/commands/*`) bypass the API app's auth/middleware surface | HIGH | UNRESOLVED |
| 3 | 70 concrete command `route.ts` files in `apps/api` outside the single manifest dispatcher — violates AGENTS.md manifest route invariant | MEDIUM | UNRESOLVED |
| 4 | Duplicate `<Toaster />` — both `apps/app/app/layout.tsx` and `DesignSystemProvider` render one; doubled toast notifications in production | MEDIUM | UNRESOLVED |
| 5 | `NotificationsProvider` calls `useTheme()` inside `(authenticated)` layout — only safe because `DesignSystemProvider` (which wraps `ThemeProvider`) is above it in the root layout; fragile if layout nesting changes | LOW | UNRESOLVED |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` Above `ThemeProvider` in ClerkProviderClient

**File:** `apps/app/app/clerk-provider.client.tsx:13`  
**Also:** `apps/app/app/layout.tsx:36–57`

**Proof:**  
`clerk-provider.client.tsx` calls `useTheme()` at line 13 to pick the Clerk dark theme. In `layout.tsx`, `ClerkProviderClient` is the **outermost** wrapper (line 36), while `DesignSystemProvider` — which contains `ThemeProvider` — is rendered *inside* it at line 40. `useTheme()` requires a `ThemeProvider` ancestor; it has none here. It returns `resolvedTheme === undefined`, so the `dark` branch is never taken. Clerk UI is always light regardless of system/user preference.

**Product impact:** Every user on dark mode sees Clerk auth modals, user buttons, and sign-in pages in light theme. Broken visual consistency, reported as "Clerk theming bug".

**Smallest safe fix:**  
Move `ThemeProvider` (or `DesignSystemProvider`) above `ClerkProviderClient` in `layout.tsx`, OR make `ClerkProviderClient` a non-client wrapper that passes a `theme` prop resolved server-side or via a sibling context. The cleanest one-line change: in `layout.tsx` reorder so `DesignSystemProvider` wraps `ClerkProviderClient`.

**Fixed:** 2026-05-14T13:02Z — automated fix cron. Reordered providers in `layout.tsx`: `DesignSystemProvider` now wraps `ClerkProviderClient`. Typecheck passed.

---

### BUG-2 — Duplicate `<Toaster />`

**Files:**  
- `apps/app/app/layout.tsx:55` — explicit `<Toaster />`  
- `packages/design-system/index.tsx:23` — `DesignSystemProvider` always renders its own `<Toaster />`

**Proof:**  
Both render paths are active for every page. `DesignSystemProvider` is included at `layout.tsx:40`, and then a second standalone `<Toaster />` is rendered at line 55. Two Sonner toasters in the DOM = toast messages potentially shown twice or with z-index conflicts.

**Product impact:** Users may see duplicate toast notifications. Z-index/positioning fights between the two Sonner instances can cause toasts to stack incorrectly.

**Smallest safe fix:** Remove the explicit `<Toaster />` from `apps/app/app/layout.tsx:55` since `DesignSystemProvider` already includes one.

---

### BUG-3 — Concrete Command Routes in Frontend App (`apps/app`)

**Files:**  
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`  
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Proof:**  
Per AGENTS.md, concrete generated command route files must live in `apps/api` under the manifest dispatcher path. These two routes live in `apps/app` — the Next.js frontend app — bypassing `apps/api`'s middleware stack, rate limiting, and canonical API-layer key auth. They do call `auth()` internally but miss any API-layer request validation or tracing added to the `apps/api` middleware chain.

**Product impact:** Shift create/update commands are handled by the frontend app server, not the API server. Any security controls, logging, or rate limiting applied to `apps/api` don't cover these routes.

**Smallest safe fix:** Move both routes to `apps/api/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` and update client-side fetch URLs accordingly.

---

### BUG-4 — 70 Concrete Command `route.ts` Files Outside Manifest Dispatcher in `apps/api`

**Count:** 70 files (verified this run)  
**Canonical dispatcher:** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

**Proof:**  
AGENTS.md states: *"Concrete generated command route files are illegal unless they are the single dispatcher."* Running `find apps/api/app/api -path '*/commands/*/route.ts' -not -path '*/manifest/\[entity\]*'` returns 70 files across domains including `kitchen/`, `events/`, `crm/`, `inventory/`, `communications/`, and `staff/`. These are not the dispatcher — they are domain-specific concrete handlers.

**Product impact:** The manifest IR is not the authority for these routes. Changes to manifest definitions don't propagate to these concrete files. Drift between IR and actual route behavior silently accumulates.

**Smallest safe fix:** No quick fix — this is a structural batch cleanup. Track as tech debt. For new routes, use only the dispatcher. Existing concrete routes should be migrated domain-by-domain in a dedicated cleanup pass.

---

## Suspicious But Unproven

### SUSP-1 — `NotificationsProvider` Calls `useTheme()` in `(authenticated)` Layout

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`

Currently safe because `DesignSystemProvider` (containing `ThemeProvider`) is above it in the root layout. However, `notifications-provider.tsx` uses a `mounted` guard as a hydration workaround rather than detecting the missing provider. If someone restructures the `(authenticated)` layout to add a local `DesignSystemProvider` wrapper without the theme, this silently breaks. Not a current crash — fragile by design.

### SUSP-2 — `sign-in-with-analytics.tsx` / `sign-up-with-analytics.tsx` Call `useAuth()` Inside Unauthenticated Layout

**Files:**  
- `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`  
- `apps/app/app/(unauthenticated)/sign-up/[[...sign-up]]/sign-up-with-analytics.tsx:14`

`useAuth()` is safe here as long as these components are rendered below `ClerkProvider` (they are — root layout). The call is intentional (fire analytics when `isSignedIn` transitions). Not a bug, but flagged because calling `useAuth()` in an unauthenticated route looks wrong at first glance.

### SUSP-3 — `apps/mobile/App.tsx:84` — Fallback to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

**File:** `apps/mobile/App.tsx:84`

```ts
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
```

The `NEXT_PUBLIC_` prefix is a Next.js convention. Expo will not include it in the mobile bundle unless explicitly configured. In CI/CD environments where only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set, the mobile app will fail to initialize Clerk and display the `MissingConfig` fallback silently. Low blast radius (mobile-only) but confusing to debug.

---

## False Alarms / Intentionally Valid

| Item | Why it's fine |
|------|--------------|
| `apps/app/app/components/auth-header.tsx` uses `SignedIn`/`SignedOut` | Rendered inside `ClerkProviderClient` in root layout — dependency order correct |
| `apps/app/app/(authenticated)/components/tracked-user-button.tsx` uses `useAuth()` | Inside authenticated route group, below `ClerkProvider` in root layout |
| All `useQuery`/`useMutation` hooks in `apps/app/app/lib/use-*.ts` | `QueryProvider` wraps all children in root layout at line 37 — correct order |
| `apps/mobile/App.tsx` — `useAuth()` inside `AuthTokenBridge` | `AuthTokenBridge` is rendered inside `ClerkLoaded` which is inside `ClerkProvider` — correct |
| `apps/api/proxy.ts` uses `clerkMiddleware` | API middleware file, not a component — correct usage |
| `apps/app/proxy.ts` uses `clerkMiddleware` | App middleware file — correct usage, proper JSON 401 for API routes |
| `packages/design-system/providers/theme.tsx` exports `ThemeProvider` | This IS the ThemeProvider — not a consumer, not a problem |
| `apps/app/test/mocks/@clerk/nextjs.tsx` exports `ClerkProvider` | Test mock file — intentionally a stub |

---

## Manifest Route Invariant Detail

**Dispatcher (legal):** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` ✅

**Concrete routes in `apps/api` (all illegal per AGENTS.md):** 70 files  
Sample paths:
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/*/route.ts` (14 routes)
- `apps/api/app/api/events/import-workflows/commands/*/route.ts` (17 routes)
- `apps/api/app/api/events/catering-orders/commands/*/route.ts` (6 routes)
- `apps/api/app/api/crm/proposals/commands/*/route.ts` (5 routes)
- `apps/api/app/api/inventory/*/commands/*/route.ts` (4 routes)
- `apps/api/app/api/communications/email-templates/commands/*/route.ts` (1 route)
- `apps/api/app/api/staff/shifts/commands/*/route.ts` (2 routes)
- `apps/api/app/api/kitchen/alerts-config/commands/*/route.ts` (3 routes)
- `apps/api/app/api/events/profitability/commands/*/route.ts` (1 route)
- + more in crm/leads, crm/contacts etc.

**Concrete routes in `apps/app` (also illegal):** 2 files  
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

---

*Audit methodology: git grep for provider/hook patterns + find for command route files. No code was modified during this audit.*
