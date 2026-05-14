# AI Integration Invariants Audit
**Scope:** Provider graph, Clerk, auth routes, manifest routes, stale wrappers  
**Last updated:** 2026-05-14T13:32Z  
**Current HEAD:** bbccf85ac35b70c44750e2ca4f894420f9fcdcae  

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | File |
|---|------|----------|------|
| 1 | `useTheme()` called above `ThemeProvider` in `ClerkProviderClient` — Clerk dark theme never resolves | **HIGH** | `apps/app/app/clerk-provider.client.tsx:13` |
| 2 | Duplicate `<Toaster />` — one inside `DesignSystemProvider`, one explicitly in root layout | **MEDIUM** | `apps/app/app/layout.tsx:54`, `packages/design-system/index.tsx:23` |
| 3 | Two concrete command route files live in `apps/app` instead of `apps/api` — bypass API-layer rate limiting, API-key auth, and the canonical middleware chain | **HIGH** | `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` |
| 4 | 70 concrete command route files in `apps/api` violate the manifest single-dispatcher invariant | **MEDIUM** | `apps/api/app/api/**/commands/*/route.ts` (70 files) |
| 5 | Auth sign-in redirect in `apps/app` middleware issues HTML 307 redirect for page routes — correct, but `isPublicApiRoute` matcher is a narrow allow-list; new API routes added to `apps/app` that are intended to be public will be silently blocked unless added | **LOW/WATCH** | `apps/app/proxy.ts:13–18` |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` above `ThemeProvider` in `ClerkProviderClient`

**File:** `apps/app/app/clerk-provider.client.tsx:13`  
**Proof:**  
```
layout.tsx:36   <DesignSystemProvider>     ← contains ThemeProvider (next-themes)
layout.tsx:47     <ClerkProviderClient>    ← calls useTheme() at line 13 — ABOVE ThemeProvider
layout.tsx:48       <QueryProvider>
```
`DesignSystemProvider` wraps `ThemeProvider` internally (`packages/design-system/index.tsx:20`). `ClerkProviderClient` is rendered *inside* `DesignSystemProvider` in the JSX tree (layout.tsx:47), so at runtime it IS below `ThemeProvider`. 

**Wait — re-evaluation:** The component renders inside `<DesignSystemProvider>`, which renders `<ThemeProvider>` before its children. So `ClerkProviderClient` is a *child* of `ThemeProvider` in the render tree and `useTheme()` SHOULD resolve correctly.

**Revised verdict:** This is the known "Clerk theming bug" pattern, but the current layout wiring is actually correct. `ClerkProviderClient` at `layout.tsx:47` is nested inside `DesignSystemProvider` which emits `ThemeProvider` before rendering children. `useTheme()` at line 13 of `clerk-provider.client.tsx` is called inside a component that will be mounted as a child of `ThemeProvider`. **This is NOT broken in the current code.**

**Status: Demoted to FALSE ALARM.** The prior audits incorrectly flagged this. The render order is: `ThemeProvider` → `ClerkProviderClient` (child) → `useTheme()` call. Correct.

---

### BUG-1 (REAL) — Duplicate `<Toaster />`

**File A:** `apps/app/app/layout.tsx:54`  
**File B:** `packages/design-system/index.tsx:23`  
**Proof:**  
- `layout.tsx` explicitly imports and renders `<Toaster />` from `@repo/design-system/components/ui/sonner`
- `DesignSystemProvider` in `packages/design-system/index.tsx:23` *also* renders `<Toaster />` unconditionally
- `ClerkProviderClient` is nested inside `DesignSystemProvider`, so both `<Toaster />` instances are active
- Result: every toast fires twice in the DOM

**Product impact:** Users see duplicate toast notifications for every action (save, error, success). Visually degraded UX; non-crashing but obvious.

**Smallest safe fix:** Remove the explicit `<Toaster />` at `apps/app/app/layout.tsx:54` and rely on the one inside `DesignSystemProvider`.

**Fixed:** 2026-05-14T13:50Z — automated fix cron. Removed import of `Toaster` and the standalone `<Toaster />` JSX element from `apps/app/app/layout.tsx`.

---

### BUG-2 — Concrete command routes in `apps/app`

**Files:**  
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`  
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`  

**Proof:** Both files export `POST` handlers with full business logic (Prisma writes, overlap detection). They live in the frontend Next.js app (`apps/app`), not the API app (`apps/api`). The `apps/app` middleware (`proxy.ts`) does NOT implement API-key bearer authentication or global rate limiting — those only exist in `apps/api/proxy.ts`. These two endpoints silently bypass `applyGlobalRateLimit` and the API-key auth path.

**Product impact:** Shift create/update endpoints are unprotected from rate-abuse and cannot be called via the API-key machine-to-machine auth path that external integrations use.

**Smallest safe fix:** Move both route files to `apps/api/app/api/staff/shifts/commands/create-validated/route.ts` (and `update-validated`). Update any frontend fetch calls from `/api/staff/shifts/commands/...` to proxy through `apps/app`'s API proxy or hit the API app URL.

---

### BUG-3 — 70 concrete command route files in `apps/api` outside manifest single-dispatcher

**Rule (AGENTS.md):** The only legal concrete command route file is:  
`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

**Proof:**  
```
find apps/api -path '*/commands/*/route.ts' | grep -v 'manifest/\[entity\]' | wc -l
→ 70
```

Examples:
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/*/route.ts` (15 files)
- `apps/api/app/api/events/import-workflows/commands/*/route.ts` (17 files)
- `apps/api/app/api/crm/proposals/commands/*/route.ts` (5 files)

**Product impact:** These routes are functional and actively used, but they bypass the manifest IR, making manifest-level policy enforcement, audit, and tooling blind to them. Accruing tech debt; not a runtime crash.

**Smallest safe fix:** Incrementally migrate each concrete route into the manifest dispatcher pattern per `AGENTS.md` guidance. This is a multi-sprint effort; flag for backlog, not hotfix.

---

## Suspicious But Unproven

### SUSP-1 — `NotificationsProvider` `useTheme()` with `mounted` guard

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`  
**Issue:** Component calls `useTheme()` and gates on a `mounted` state to avoid hydration mismatch. This pattern is correct *only if* this component is rendered below `ThemeProvider`. Need to confirm the authenticated layout tree includes `DesignSystemProvider` as an ancestor. If a mobile-kitchen or other nested layout replaces the root layout without wrapping in `DesignSystemProvider`, this breaks silently (returns `"light"` indefinitely).  
**Action needed:** Trace the `(authenticated)` layout tree to confirm `DesignSystemProvider` is always an ancestor.

### SUSP-2 — `sign-in-with-analytics.tsx` / `sign-up-with-analytics.tsx` call `useAuth()` on unauthenticated routes

**Files:**  
- `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`  
- `apps/app/app/(unauthenticated)/sign-up/[[...sign-up]]/sign-up-with-analytics.tsx:14`  

**Issue:** `useAuth()` is called in these components. They sit in the `(unauthenticated)` route group. `ClerkProvider` is at root layout, so these ARE below `ClerkProvider` — the call is valid. However, the logic fires a PostHog `sign_in` event when `isSignedIn` transitions to `true`. If the sign-in flow redirects before the component unmounts, the event may fire with stale state or double-fire on remount. Unproven without runtime trace.

### SUSP-3 — `apps/app/proxy.ts` public API allow-list is narrow

**File:** `apps/app/proxy.ts:13–18`  
**Issue:** `isPublicApiRoute` only allows `/api/health`, `/api/healthz`, `/api/live`, `/api/ready`. Any new public-facing API route added to `apps/app` (e.g., a webhook or public data endpoint) will be blocked by Clerk auth and return a 401 JSON instead of the intended response, silently. Not currently broken, but the pattern is fragile.

---

## False Alarms / Intentionally Valid

1. **`ClerkProviderClient` `useTheme()` call** — Previously flagged as BUG-1 in earlier audit passes. Confirmed valid: component is rendered as a child of `DesignSystemProvider` → `ThemeProvider` in the root layout. `useTheme()` resolves correctly.

2. **Single `ClerkProvider` in `apps/app`** — Only one `ClerkProvider` exists, in `clerk-provider.client.tsx`, mounted once in `layout.tsx`. No nested duplicates. Correct.

3. **`QueryProvider` placement** — `QueryProvider` wraps all authenticated content and is placed correctly below `ClerkProviderClient`. All `useQuery`/`useMutation` consumers are in `(authenticated)` routes which are children of `QueryProvider`. Valid.

4. **`packages/auth/components/sign-in.tsx` and `sign-up.tsx`** — Uses `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` (current Clerk API). No deprecated `afterSignInUrl`/`afterSignUpUrl` props present. Clean.

5. **`apps/api/proxy.ts` public routes** — Webhook, health, sentry-fixer, and outbox routes are explicitly allowlisted. API-key bearer path bypasses Clerk session check intentionally and is documented. Valid pattern.

6. **`apps/app/proxy.ts` JSON 401 for API routes** — `isApiRoute(req)` check at line 55–68 correctly returns `jsonResponse("Unauthorized", 401)` for unauthenticated API requests. Does not issue HTML redirects for API paths. Correct.

7. **`tracked-user-button.tsx` `useAuth()` call** — Component is in `(authenticated)` layout, below `ClerkProvider`. Valid.

---

## Summary Table

| ID | Category | Severity | File | Status |
|----|----------|----------|------|--------|
| BUG-1 | Provider — Duplicate Toaster | MEDIUM | `layout.tsx:54` + `design-system/index.tsx:23` | **FIXED** 2026-05-14T13:50Z |
| BUG-2 | Auth route invariant | HIGH | `apps/app/.../shifts/commands/{create,update}-validated/route.ts` | OPEN |
| BUG-3 | Manifest route invariant | MEDIUM | 70 files in `apps/api/**/commands/*/route.ts` | OPEN (backlog) |
| SUSP-1 | Provider graph | LOW | `notifications-provider.tsx:16` | Needs layout trace |
| SUSP-2 | Clerk analytics hook | LOW | `sign-{in,up}-with-analytics.tsx:14` | Needs runtime trace |
| SUSP-3 | Auth route allow-list | LOW/WATCH | `apps/app/proxy.ts:13` | Watch — fragile pattern |
