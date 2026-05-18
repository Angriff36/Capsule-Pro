# AI Integration Invariants Audit — Capsule Pro

**Last updated:** 2026-05-18T00:05Z (cron-28)
**Git HEAD:** 0e4e06379c6bf8a5f5e1aa5ecaaff057422f91a6

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | `useTheme()` called in `ClerkProviderClient` before `ThemeProvider` mounts — Clerk dark mode permanently broken | HIGH | REGRESSED / UNRESOLVED |
| 2 | Concrete command `route.ts` files in `apps/app` (`create-validated`, `update-validated`) bypass API-layer auth pipeline | HIGH | REGRESSED / UNRESOLVED |
| 3 | 77 concrete command route files in `apps/api` outside the single manifest dispatcher | MEDIUM | UNRESOLVED (backlog) |
| 4 | `NotificationsProvider` calls `useTheme()` in `(mobile-kitchen)/layout.tsx` below `ThemeProvider` only via a fragile `mounted` guard | LOW | SUSPICIOUS |
| 5 | `apps/app` middleware public-route allowlist uses both path and config matcher; gaps are possible for new routes outside covered prefixes | LOW | SUSPICIOUS |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` above `ThemeProvider` in `ClerkProviderClient`

**File:** `apps/app/app/clerk-provider.client.tsx:13`
**Also:** `apps/app/app/layout.tsx:36,40`

**Proof:**

`layout.tsx` render order:
```
<ClerkProviderClient>          ← line 36 — calls useTheme() at line 13
  <QueryProvider>
    ...
    <DesignSystemProvider>     ← line 40 — this contains ThemeProvider
      {children}
    </DesignSystemProvider>
```

`ClerkProviderClient` is an ancestor of `DesignSystemProvider`. `DesignSystemProvider` renders `ThemeProvider` as its outermost wrapper (`packages/design-system/index.tsx:20`). `ClerkProviderClient` calls `useTheme()` at line 13, which requires being rendered *below* that `ThemeProvider`. It is instead *above* it.

At runtime `useTheme()` will return `{ resolvedTheme: undefined }` because no `ThemeProvider` is in the ancestor chain. The ternary `resolvedTheme === "dark" ? dark : undefined` always evaluates to `undefined` — Clerk dark mode is permanently disabled regardless of the user's system/app preference.

**Product impact:** Users in dark mode see Clerk modals (sign-in, user profile, org switcher) rendered in light theme. No crash; silent visual regression.

**Smallest safe fix:** Move `<ClerkProviderClient>` to be a child of `<DesignSystemProvider>`, or extract the theme read into a child component that is rendered below `ThemeProvider`.

---

### BUG-2 — Concrete command routes in `apps/app` bypass API pipeline

**Files:**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Proof:**

Both files are live Next.js route handlers under `apps/app`. The `apps/app` middleware (`proxy.ts`) applies Clerk session auth only — it does **not** apply rate limiting or API-key auth. The canonical API app (`apps/api`) applies both Clerk session + `cp_` bearer key auth + global rate limiting in its middleware.

These two routes implement their own inline `auth()` + Prisma calls, completely outside the manifest runtime (no policy evaluation, no guard enforcement, no emitted events). They also call `revalidatePath()` — a frontend concern that should not exist in a "command" route.

**Product impact:** Shift create/update commands skip rate limiting, API-key authentication, and Manifest policy/guard enforcement. An authenticated user can create overlapping shifts at any volume without triggering rate limits. Manifest events are never emitted (no audit trail).

**Smallest safe fix:** Delete both files. `apps/app/next.config.ts` already proxies `/api/staff/:path*` to the API app. The corresponding canonical routes in `apps/api/app/api/staff/shifts/commands/` exist and are correct.

---

### BUG-3 — 77 concrete command `route.ts` files in `apps/api` outside manifest dispatcher

**Pattern:** `apps/api/app/api/**/commands/*/route.ts` (excluding `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`)

**Count this run:** 77 files in `apps/api` + 2 in `apps/app` = **79 total non-dispatcher concrete command routes**.

**Proof:** The manifest design contract in `AGENTS.md` states:
> Concrete generated command route files are illegal unless they are the single dispatcher: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

These routes handle commands directly, bypassing the manifest runtime's policy/guard/event pipeline for each of their entity domains (events, kitchen, inventory, CRM, procurement, shipments, communications, staff).

**Product impact:** Any command handled by a concrete route is not subject to Manifest policy evaluation or guard enforcement. Events are not emitted through the manifest event bus, breaking audit trails and integrations that subscribe to domain events.

**Note:** This is backlog scope — a large-footprint change. Tracked for visibility but not expected to be fixed in a single sprint.

**Smallest safe fix (per entity):** Delete the concrete route file and ensure the entity + command are registered in the Manifest IR so the dispatcher handles them. Work entity-by-entity.

---

## Suspicious / Unproven Issues

### SUSP-1 — `NotificationsProvider` fragile `mounted` guard in mobile-kitchen layout

**File:** `apps/app/app/(mobile-kitchen)/layout.tsx:30`
**Also:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16-24`

`NotificationsProvider` calls `useTheme()` and guards SSR with a `mounted` flag that defaults to `"light"`. This layout sits below `DesignSystemProvider` / `ThemeProvider` in the root layout, so `useTheme()` should work. The guard itself is harmless but masks whether the hook would work without it. Not a confirmed bug — no incorrect provider ordering detected in current layout tree. Flagged because the guard could silently absorb a future provider ordering regression.

### SUSP-2 — `apps/app` middleware config matcher vs. path-based allowlist divergence

**File:** `apps/app/proxy.ts:91-99`

The `config.matcher` regex and the `isPublicRoute` / `isPublicApiRoute` matchers are maintained separately. The regex excludes known public path prefixes and static assets; the `createRouteMatcher` calls list explicit patterns. A new route added to `createRouteMatcher` but not reflected in the config regex (or vice versa) could either fail to be protected or fail to be served. Not a confirmed auth bypass in the current codebase — all current public paths appear consistently in both — but the dual-maintenance is a latent trap.

### SUSP-3 — `sign-in-with-analytics.tsx` and `sign-up-with-analytics.tsx` call `useAuth()` from unauthenticated layout

**Files:**
- `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`
- `apps/app/app/(unauthenticated)/sign-up/[[...sign-up]]/sign-up-with-analytics.tsx:14`

Both call `useAuth()` inside the unauthenticated layout group. `ClerkProvider` is at the root layout, so the hook is technically within the provider. However the `(unauthenticated)` layout has no auth guard — if `ClerkProvider` were ever accidentally removed from the root or conditionally rendered, these calls would throw. Currently not broken; flagged as a dependency on correct root layout ordering.

---

## False Alarms / Intentionally Valid

| ID | Description |
|----|-------------|
| FA-1 | `packages/auth/provider.tsx` — `AuthProvider` intentionally does NOT render `ClerkProvider`; comment confirms it. Valid. |
| FA-2 | `packages/design-system/providers/theme.tsx` — thin wrapper over `next-themes` `ThemeProvider`. Not a duplicate provider. |
| FA-3 | `packages/auth/components/sign-in.tsx` and `sign-up.tsx` — use `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` only (no deprecated `afterSignInUrl`/`afterSignUpUrl`). Clean. |
| FA-4 | `apps/mobile/App.tsx` — `ClerkProvider` wraps `QueryClientProvider` wraps content; provider order correct. `useAuth()` called inside `SignedIn` which is inside both providers. Clean. |
| FA-5 | `packages/design-system/components/mode-toggle.tsx` and `ui/sonner.tsx` — call `useTheme()` but are always rendered as children of `DesignSystemProvider` which contains `ThemeProvider`. Clean. |
| FA-6 | `apps/api/proxy.ts` — API middleware correctly returns JSON 401 for missing session and for auth errors. No HTML redirects. Clean. |
| FA-7 | `apps/app/proxy.ts` — App middleware returns JSON 401 for API routes, HTML redirect for page routes. Expected and correct pattern. Clean. |
| FA-8 | `apps/storybook/.storybook/preview.tsx` — wraps stories in `ThemeProvider`. Standalone storybook context, not part of app provider graph. Clean. |
| FA-9 | `packages/collaboration/hooks.ts` — `useMutation` is Liveblocks, not TanStack Query. Different package, no `QueryClientProvider` dependency. Clean. |
| FA-10 | `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` — This IS the single legal dispatcher. Clean. |

---

## Appendix — Provider Render Order (Root Layout)

```
<html>
  <body>
    <ClerkProviderClient>          ← calls useTheme() — BUG-1: no ThemeProvider above here
      <QueryProvider>              ← QueryClientProvider
        <AuthHeader />
        <AnalyticsProvider>
          <DesignSystemProvider>   ← ThemeProvider is HERE (too late for ClerkProviderClient)
            <TooltipProvider>
              {children}
            </TooltipProvider>
            <Toaster />            ← single Toaster (duplicate was fixed in 2dbdaa48)
          </DesignSystemProvider>
        </AnalyticsProvider>
        <Toolbar />
      </QueryProvider>
    </ClerkProviderClient>
  </body>
</html>
```
