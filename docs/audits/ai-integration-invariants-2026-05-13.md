# AI Integration Invariants Audit
**Date:** 2026-05-13 (updated 2026-05-14, ongoing cron)
**HEAD:** bb0b6b3822e8d9d66a9e70987d4a6e1f4aa8a1d3
**Scope:** Provider graph · Clerk · Auth routes · Manifest routes · Stale wrappers

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | File |
|---|------|----------|------|
| 1 | `useTheme()` called above `ThemeProvider` in `ClerkProviderClient` | **HIGH** — dark mode never applies to Clerk UI | `apps/app/app/clerk-provider.client.tsx:13` |
| 2 | Dual `<Toaster />` instances — layout + DesignSystemProvider | **MEDIUM** — doubled toast notifications in production | `apps/app/app/layout.tsx:55`, `packages/design-system/index.tsx:23` |
| 3 | Concrete command `route.ts` files in frontend app (`apps/app`) | **HIGH** — bypasses API-layer rate limiting, key auth, and middleware | `apps/app/app/api/staff/shifts/commands/*/route.ts` |
| 4 | 70 concrete command `route.ts` files in `apps/api` outside the manifest single-dispatcher | **MEDIUM** — violates AGENTS.md manifest route invariant; mutation paths not tracked in IR | `apps/api/app/api/**/commands/*/route.ts` (70 files) |
| 5 | `NotificationsProvider` in mobile-kitchen layout calls `useTheme()` — ThemeProvider ancestry unconfirmed in that subtree | **LOW/SUSPICIOUS** — could silently return `undefined` theme | `apps/app/app/(mobile-kitchen)/layout.tsx:30` |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` above `ThemeProvider` in `ClerkProviderClient`

**File:** `apps/app/app/clerk-provider.client.tsx:13`
**Proof:**
```
layout.tsx:36  <ClerkProviderClient>          ← renders here
layout.tsx:40    <DesignSystemProvider>        ← ThemeProvider is inside this
layout.tsx:51      {children}
layout.tsx:52    </DesignSystemProvider>
layout.tsx:57  </ClerkProviderClient>
```
`ClerkProviderClient` calls `useTheme()` at line 13. At that point in the render tree, `ThemeProvider` (which lives inside `DesignSystemProvider` at `packages/design-system/index.tsx:20`) has **not yet been rendered**. `next-themes` will return `resolvedTheme = undefined`, so the `dark` Clerk theme is never selected — Clerk always renders in light mode regardless of user preference.

**Product impact:** Clerk modals (sign-in, sign-up, user profile) always render in light mode even when the app is in dark mode. This is visible to every user who has dark mode enabled.

**Smallest safe fix:** Move `ThemeProvider` above `ClerkProviderClient` in `layout.tsx`, OR remove the `useTheme()` dependency and accept the Clerk appearance token from a parent via props/context.

---

### BUG-2 — Duplicate `<Toaster />`

**Files:**
- `apps/app/app/layout.tsx:55` — explicit `<Toaster />`
- `packages/design-system/index.tsx:23` — `DesignSystemProvider` renders `<Toaster />` internally

Since `DesignSystemProvider` is rendered inside `layout.tsx` (line 40–52) and `<Toaster />` is also rendered explicitly at line 55, every page mounts two Sonner toaster instances. This causes duplicate toast notifications whenever anything calls `toast()`.

**Product impact:** Every toast fires twice. Visible to all users.

**Smallest safe fix:** Remove the explicit `<Toaster />` at `apps/app/app/layout.tsx:55` since `DesignSystemProvider` already includes one.

---

### BUG-3 — Concrete command routes in `apps/app` (frontend app)

**Files:**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

These are concrete Next.js API route handlers living in the **frontend** app (`apps/app`), not in the API app (`apps/api`). The API app has its own middleware (`apps/api/proxy.ts`) that enforces Clerk session auth, API-key auth, rate limiting, and method headers for scope enforcement. Routes in `apps/app` only go through `apps/app/proxy.ts`, which lacks API-key bearer auth, rate limiting (`applyGlobalRateLimit`), and the `x-api-path`/`x-api-method` headers injected for scope checks.

Additionally, these bypass the manifest dispatcher invariant (AGENTS.md: "Concrete generated command route files are illegal unless they are the single dispatcher").

**Product impact:** Shift create/update mutations skip API-layer rate limiting and API-key auth scope enforcement. Could be exploited by authenticated session users to exceed rate limits or bypass scope checks.

**Smallest safe fix:** Move these two route files to `apps/api/app/api/staff/shifts/commands/` and delete the copies from `apps/app`.

---

### BUG-4 — 70 concrete command `route.ts` files in `apps/api` outside manifest dispatcher

**Count:** 70 concrete command routes in `apps/api/app/api/**/commands/*/route.ts` (excluding the single dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`).

Per AGENTS.md: _"Concrete generated command route files are illegal unless they are the single dispatcher."_

These routes are effectively parallel write paths that don't run through the manifest runtime, meaning:
- Command execution is not tracked in the IR
- PrismaStore wiring in the manifest may not match what these routes actually write
- Critical Write Validation (query after write) is not enforced

Representative examples: `kitchen/prep-task-plan-workflows` (15 routes), `events/import-workflows` (16 routes), `events/catering-orders` (6 routes), `crm/proposals` (5 routes), etc.

**Product impact:** Write paths that look like they go through the manifest may actually bypass it, causing read/write model divergence (the core BROKEN_PRISMA_READ class of bug).

**Smallest safe fix (per AGENTS.md pattern):** For entities that should use the manifest dispatcher, delete the concrete routes and ensure the manifest dispatcher + PrismaStore covers them. For entities intentionally bypassing the manifest (e.g., complex workflow state machines), document the justification in IMPLEMENTATION_PLAN.md.

---

## Suspicious — Unproven

### SUSP-1 — `NotificationsProvider` in `(mobile-kitchen)/layout.tsx` calls `useTheme()`

**File:** `apps/app/app/(mobile-kitchen)/layout.tsx:30`

`NotificationsProvider` (from `(authenticated)/components/notifications-provider.tsx`) calls `useTheme()` at line 16. The mobile-kitchen layout is a Server Component that renders `NotificationsProvider` as a child without rendering through `DesignSystemProvider` (which contains `ThemeProvider`). If `ThemeProvider` is not in the ancestor tree for this route segment, `useTheme()` will return `resolvedTheme = undefined`, and the `mounted` guard falls back to `"light"` permanently.

**Status:** Cannot fully confirm without tracing the full Next.js layout nesting. The root `layout.tsx` includes `DesignSystemProvider`, which should be an ancestor — but the mobile-kitchen segment rendering path needs verification. The `mounted` guard (lines 17–21) does provide a runtime fallback, so this is not a crash, just potentially a stale theme.

### SUSP-2 — `useAuth()` in unauthenticated sign-in/sign-up pages

**Files:**
- `apps/app/app/(unauthenticated)/sign-in/.../sign-in-with-analytics.tsx:14`
- `apps/app/app/(unauthenticated)/sign-up/.../sign-up-with-analytics.tsx:14`

`useAuth()` is called in components rendered on unauthenticated pages. Clerk supports this — `isSignedIn` will simply be `false` on those pages. These components are correctly placed below `ClerkProviderClient`. No invariant violation confirmed; pattern matches the documented analytics instrumentation in `packages/analytics/INSTRUMENTATION.md`. Flagged only because the `(unauthenticated)` route group is an unusual context for Clerk hooks.

### SUSP-3 — Mobile `useOfflineSync` calls `useQueryClient()` outside visible `QueryClientProvider` nesting in `AppContent`

**File:** `apps/mobile/App.tsx:35` — `AppContent` uses `useOfflineSync` (which calls `useQueryClient()` at `useOfflineSync.ts:103`), but `AppContent` is rendered at line 101 **inside** `<SignedIn>` which is inside `<QueryClientProvider>` (line 94). Tree ordering looks correct. Flagged as suspicious because the module-level `queryClient` singleton (line 22) bypasses the hook path; if `useOfflineSync` ever calls `useQueryClient()` before mount, it would fail. Currently appears safe.

---

## False Alarms / Intentionally Valid

1. **`packages/design-system/providers/theme.tsx`** — A thin wrapper re-exporting `next-themes` `ThemeProvider`. Intentionally valid — no logic, no ordering issue.

2. **`packages/auth/provider.tsx`** — Explicitly comments "does NOT render ClerkProvider; ClerkProvider must exist exactly once in app root." Valid by design.

3. **`packages/design-system/components/mode-toggle.tsx:21`** and **`packages/design-system/components/ui/sonner.tsx:14`** — Both call `useTheme()`. Valid: these components are always rendered inside `DesignSystemProvider` which wraps `ThemeProvider`.

4. **`apps/api/proxy.ts`** — Uses `clerkMiddleware` + `createRouteMatcher` from `@repo/auth/server`. Single, well-formed middleware. No duplication or inversion.

5. **`apps/app/proxy.ts`** — Same pattern. API routes return JSON 401/403 (lines 59, 66). Page routes redirect to sign-in. Compliant.

6. **`apps/mobile/App.tsx`** — One `ClerkProvider` (line 92), `QueryClientProvider` nested inside (line 94). Correct ordering. Mobile is a separate app — no cross-app provider conflict.

7. **`packages/auth/components/sign-in.tsx` / `sign-up.tsx`** — Uses `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` only (not deprecated `afterSignInUrl`/`afterSignUpUrl`). No deprecated prop mixing.

---

## Methodology Notes

- Provider graph traced via static source reading of `apps/app/app/layout.tsx` (root) and child layouts.
- `ThemeProvider` path: `DesignSystemProvider` → `packages/design-system/index.tsx:20` → `packages/design-system/providers/theme.tsx`.
- Manifest dispatcher path confirmed: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` exists.
- Concrete command route count: `find apps -path '*/commands/*/route.ts'` returned 73 total; minus 1 dispatcher = 72 non-dispatcher (70 in apps/api, 2 in apps/app).
- No deprecated `afterSignInUrl`/`afterSignUpUrl` found anywhere in active source (only in `packages/analytics/INSTRUMENTATION.md` as documentation examples).
