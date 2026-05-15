# AI Integration Invariants Audit

**Last updated:** 2026-05-14T20:45Z (automated fix cron)
**Git HEAD:** cbc329bd081de7418b043ca8f836b071d8c3b6a3

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | 70 concrete command `route.ts` files exist outside the single manifest dispatcher | Medium | Unresolved (backlog) |
| 2 | `sign-up.tsx` wires `signInFallbackRedirectUrl` to `signUpFallbackRedirectUrl` as fallback (cross-contaminated default) | Low | Fixed (automated fix cron) |
| 3 | `sign-in.tsx` mirrors the same cross-contaminated fallback pattern in reverse | Low | Fixed (automated fix cron) |
| 4 | `ClerkProviderClient` previously had a theme-flash / hydration mismatch bug | — | Fixed (e7234fa7) |
| 5 | `sentry-fixer/process` cron previously on public route allowlist | — | Fixed (f6243963) |

---

## Confirmed Bugs

### BUG-1 — Concrete command routes exist outside manifest single-dispatcher

**Status:** Unresolved.

**Files:** 70 `route.ts` files matching `apps/api/app/api/*/commands/*/route.ts` (excluding `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`).

**Examples:**
- `apps/api/app/api/communications/email-templates/commands/create/route.ts`
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/create/route.ts`
- `apps/api/app/api/events/catering-orders/commands/confirm/route.ts`
- `apps/api/app/api/crm/proposals/commands/accept/route.ts`
- `apps/api/app/api/procurement/requisitions/commands/approve-finance/route.ts`
- … (65 more)

**Invariant violated:** Per AGENTS.md and audit rules, the only legal concrete command route file is `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`. All other per-entity command routes are illegal.

**Impact:** Entity-specific command routes may diverge from manifest IR semantics, bypass guards/policies, or accumulate permanent drift as the manifest evolves.

**Proof:** `find apps/api/app/api -path '*/commands/*/route.ts' | grep -v 'manifest/\[entity\]'` returns 70 paths.

**Mitigating factor:** Most of these routes delegate to `executeManifestCommand()` in `apps/api/lib/manifest-command-handler.ts`, which enforces auth, tenant resolution, guards, and policies. The risk is structural (illegal by invariant) rather than immediately dangerous at runtime.

**Smallest safe fix:** Entity-by-entity, wire each concrete route to the canonical dispatcher and delete the concrete file. Do not batch-delete; each entity needs verification that the manifest IR defines the command.

---

## Suspicious But Unproven

### SUSP-1 — Cross-contaminated fallback redirect URLs in `packages/auth`

**Status:** Fixed. 2026-05-14T20:45Z — automated fix cron.

**Files:**
- `packages/auth/components/sign-up.tsx` lines 29–31
- `packages/auth/components/sign-in.tsx` lines 29–31

**Issue:** In `sign-up.tsx`, `signInFallbackRedirectUrl` was constructed with `signUpFallbackRedirectUrl` as its default fallback. `sign-in.tsx` did the same in reverse: `signUpFallbackRedirectUrl` defaulted to `signInFallbackRedirectUrl`.

**Fix:** Both now use `"/"` as their independent fallback default, matching the pattern used by `signUpFallbackRedirectUrl` in sign-up.tsx and `signInFallbackRedirectUrl` in sign-in.tsx.

---

## False Alarms / Intentionally Valid

### FA-1 — `ClerkProviderClient` calls `useTheme()` outside `ThemeProvider`

**Why NOT a bug:** In `apps/app/app/layout.tsx`, `DesignSystemProvider` (which wraps `next-themes` `ThemeProvider`) is the *outermost* provider. `ClerkProviderClient` is rendered *inside* it (line 46 is inside the `DesignSystemProvider` that opens at line 35). Provider order is correct.

The `mounted` guard (added in e7234fa7) prevents a hydration mismatch by defaulting to `undefined` (light) during SSR.

### FA-2 — `NotificationsProvider` in `sidebar.tsx` calls `useTheme()`

**Why NOT a bug:** `NotificationsProvider` is lazy-loaded inside `GlobalSidebar`, which renders inside the `(authenticated)` route layout, which is a descendant of `app/layout.tsx` → `DesignSystemProvider` → `ThemeProvider`. Ordering is correct. Mounted guard present.

### FA-3 — No duplicate `ClerkProvider` in nested layouts

All nested layouts (`(authenticated)/layout.tsx`, `(unauthenticated)/layout.tsx`, `(dev-console)/layout.tsx`, `(mobile-kitchen)/layout.tsx`) were checked. None add an extra `ClerkProvider`. The single root provider is `apps/app/app/clerk-provider.client.tsx`.

### FA-4 — `sign-up.tsx` and `sign-in.tsx` use `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` (not deprecated props)

`afterSignInUrl` / `afterSignUpUrl` do not appear anywhere in `apps/` or `packages/`. Only the current Clerk API (`fallbackRedirectUrl`, `forceRedirectUrl`) is used. No deprecated prop coexistence issue.

### FA-5 — API middleware returns JSON 401/403

`apps/api/proxy.ts` returns `application/json` responses for both `401 Unauthorized` and rate-limit 429 paths. HTML redirect is not used for API routes. Clean.

### FA-6 — App middleware returns JSON 401 for API routes

`apps/app/proxy.ts` (line 59) returns `jsonResponse("Unauthorized", 401)` for unauthenticated API requests. Page routes redirect to `/sign-in` (correct for browser navigation). Clean.

---

## Previously Reported Bugs — Current Status

| Bug | Description | Status |
|-----|-------------|--------|
| Duplicate Toaster provider | Toaster rendered twice | Fixed (2dbdaa48) |
| Shift command routes in `apps/app` | Frontend had concrete command routes | Fixed (2d60b7ac) |
| SUSP-1 ClerkProviderClient theme-flash | `useTheme()` without mounted guard caused hydration mismatch | Fixed (e7234fa7) |
| BUG-3 sentry-fixer on public allowlist | `apps/api/proxy.ts` exposed cron endpoint | Fixed (f6243963) |
| BUG-2 hardcoded business logic in command routes | Cost ratios / SQL status strings | Fixed (cbc329bd) |
| BUG-1 concrete manifest command routes | 70 routes outside single dispatcher | **Still unresolved** |
| SUSP-1 cross-contaminated redirect fallback URLs | sign-up/sign-in default fallback URLs wired to each other | Fixed (2026-05-14T20:45Z — automated fix cron) |
