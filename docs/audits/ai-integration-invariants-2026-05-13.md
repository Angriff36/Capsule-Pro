# AI Integration Invariants Audit
**Last updated:** 2026-05-17T23:32Z (cron-27)
**Git HEAD:** b7f62f4ee2eecb034271999543460ccb0396c312

---

## Executive Summary — Top 5 Risks

| # | Risk | File | Impact |
|---|------|------|--------|
| 1 | `useTheme()` called above `ThemeProvider` in `ClerkProviderClient` | `apps/app/app/clerk-provider.client.tsx:13` | Clerk dark mode never applies — always renders light theme |
| 2 | Concrete shift command routes in `apps/app` bypass API-layer auth | `apps/app/app/api/staff/shifts/commands/*/route.ts` | Rate limiting and key-scoped auth skipped |
| 3 | 77 concrete command routes in `apps/api` outside manifest dispatcher | `apps/api/app/api/**/commands/*/route.ts` | Manifest runtime invariant violated at scale |
| 4 | Prefix-based public route matchers silently expose future paths | `apps/app/proxy.ts:5-11` | New pages under `/plasmic/`, `/view/proposal/`, `/sign/contract/` bypass auth |
| 5 | `NotificationsProvider` sends `"light"` theme to Knock SDK on SSR | `apps/app/app/(authenticated)/components/notifications-provider.tsx:24` | Dark-mode users see incorrect Knock UI until hydration |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` above `ThemeProvider` in `ClerkProviderClient`
**Status:** REGRESSED (was fixed at `9ba9b4d1`; re-introduced by merge commit)
**File:** `apps/app/app/clerk-provider.client.tsx:13`

**Proof:**
```
apps/app/app/layout.tsx:36  <ClerkProviderClient>         ← useTheme() fires here
apps/app/app/layout.tsx:40    <DesignSystemProvider>      ← ThemeProvider lives inside this
```
`ClerkProviderClient` calls `useTheme()` at line 13. `ThemeProvider` is mounted as a descendant inside `DesignSystemProvider` (line 40). Because `ClerkProviderClient` renders as the ancestor, `useTheme()` has no `ThemeProvider` above it — `resolvedTheme` is always `undefined`. The `dark` Clerk theme is therefore never applied; users always get the light appearance.

**Product impact:** Dark-mode users see Clerk modals (sign-in, user profile) rendered in light theme. Visually jarring and inconsistent with app theming.

**Smallest safe fix:** Move `ClerkProviderClient` to render below `DesignSystemProvider`, or split it so the `ClerkProvider` wrapper is at root (doesn't need theme) and the `appearance` prop is injected from a child that can read `useTheme()`.

---

### BUG-2 — Concrete shift command routes in `apps/app`
**Status:** REGRESSED (was fixed at `2d60b7ac`; re-introduced by merge commit)
**Files:**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Proof:** `find apps/app -path '*/commands/*/route.ts' -not -path '*/.next/*'` returns both files. `apps/app/next.config.ts` rewrites `/api/staff/:path*` to the API app — but Next.js `afterFiles` rewrites are skipped when a filesystem route matches. These two files intercept the request locally, never reaching `apps/api`.

**Product impact:** Staff shift mutations bypass the API app's rate limiter, key-scoped auth validation, Sentry instrumentation, and manifest runtime guard enforcement.

**Smallest safe fix:** Delete both files. The rewrite already handles routing to `apps/api/app/api/staff/shifts/commands/`.

---

### BUG-3 — 77 concrete command routes in `apps/api` outside manifest dispatcher
**Status:** UNRESOLVED (backlog, count up from 70 pre-merge)
**Pattern:** `apps/api/app/api/**/commands/*/route.ts` (excluding `manifest/[entity]/commands/[command]/route.ts`)

**Proof:** `find apps/api -path '*/commands/*/route.ts' -not -path '*/.next/*' -not -path '*/manifest/*/route.ts'` returns 77 files.

The single-dispatcher per AGENTS.md is: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

All 77 are concrete routes handling commands directly. Examples:
- `apps/api/app/api/events/catering-orders/commands/create/route.ts`
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/approve-plan/route.ts`
- `apps/api/app/api/procurement/requisitions/commands/create/route.ts`

**Product impact:** Manifest runtime invariant violated. Bypasses centralized command dispatch, policy enforcement, and IR-based routing authority. New commands added directly instead of through manifest codegen will silently diverge.

**Smallest safe fix:** Backlog task — migrate all 77 to dispatch through the manifest `[entity]/[command]` router. Not a one-line fix; requires coordinated migration plan.

---

## Suspicious But Unproven

### SUSP-1 — Prefix-based public matchers (`apps/app/proxy.ts:5-11`)
```typescript
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/plasmic(.*)",         // ← blanket prefix
  "/view/proposal(.*)",  // ← blanket prefix
  "/sign/contract(.*)",  // ← blanket prefix
]);
```
Any future page added under these prefixes is silently public. Not currently broken — all existing pages under these paths should be public — but creates a footgun. Risk: a developer adds `/view/proposal/admin` expecting auth protection and gets none.

### SUSP-2 — `/api/public(.*)` blanket bypass in `apps/api/proxy.ts:7-11`
`apps/api/proxy.ts` includes `/api/public(.*)` as a public route. Per-handler token validation is not statically enforced. If a future handler is added under `/api/public/` that reads org-scoped data, it will be fully unauthenticated.

### SUSP-3 — `NotificationsProvider` sends `"light"` theme to Knock SDK on SSR
`apps/app/app/(authenticated)/components/notifications-provider.tsx:16` calls `useTheme()`. On SSR and initial hydration, `resolvedTheme` is `undefined` — the Knock feed UI receives `"light"` until hydration completes. Dark-mode users will see a flash of incorrect theme in the notification panel on page load. Not a crash, but visible UX regression.

---

## False Alarms / Intentionally Valid

| Item | Why it's clean |
|------|---------------|
| `packages/auth/provider.tsx` — no `ClerkProvider` | Intentional per comment on line 13: `ClerkProvider` must exist exactly once at root. |
| `packages/auth/components/sign-in.tsx` — uses `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` | Uses current non-deprecated API only. No `afterSignInUrl`/`afterSignUpUrl` present. |
| `packages/design-system/components/ui/sonner.tsx:14` — `useTheme()` | `Toaster` is rendered inside `DesignSystemProvider` which wraps `ThemeProvider`. Correctly ordered. |
| `packages/design-system/components/mode-toggle.tsx:21` — `useTheme()` | Same — always rendered as a descendant of `ThemeProvider`. |
| `apps/app/app/query-provider.tsx` — `QueryClientProvider` | Root-level provider, all `useQuery`/`useMutation` hooks are descendants. |
| `apps/mobile/App.tsx` — `ClerkProvider` wrapping `QueryClientProvider` | Single provider, correct nesting in mobile app. |
| `apps/app/app/components/auth-header.tsx` — `SignedIn`/`SignedOut` | Rendered inside `ClerkProviderClient`. Correctly ordered. |
| `apps/app/proxy.ts` — API routes return JSON 401/403 | `jsonResponse()` at lines 59/66 confirmed. |
| `apps/app/__tests__/auth-routing.test.ts` — `clerkMiddleware` mock | Test mock only, not production code. |
| `packages/collaboration/hooks.ts` — `useMutation` from Liveblocks | Different library (`@liveblocks/react`), not TanStack Query. Liveblocks provider wraps correctly in storybook. |

---

## Provider Graph Summary

```
RootLayout (layout.tsx)
└─ <ClerkProviderClient>          ← BUG-1: calls useTheme() HERE
   └─ <QueryProvider>             ← QueryClientProvider ✓
      └─ <AnalyticsProvider>      ✓
         └─ <DesignSystemProvider>
            └─ <ThemeProvider>    ← useTheme() needs to be below here
               └─ {children}
```

Correct order after fix would place `ClerkProviderClient`'s `useTheme()` call below `ThemeProvider`.

---

## Clerk Invariants

- **Single `ClerkProvider` path:** Confirmed. Only `apps/app/app/clerk-provider.client.tsx` renders `<ClerkProvider>`. `packages/auth/provider.tsx` explicitly does not. No nested layouts add another.
- **Deprecated redirect props:** None found. `afterSignInUrl`/`afterSignUpUrl` absent from entire codebase. `signInFallbackRedirectUrl`/`signUpFallbackRedirectUrl` used correctly.
- **Appearance API:** `dark` theme from `@clerk/themes` and `cssLayerName` are current supported API. No deprecated fields.

---

## Auth Route Invariants

- **API routes return JSON:** `apps/app/proxy.ts` — `isApiRoute` branch returns `jsonResponse("Unauthorized", 401)` / `jsonResponse("Forbidden", 403)`. Clean.
- **Public allowlist is explicit:** `isPublicRoute` and `isPublicApiRoute` matchers are explicit patterns. SUSP-1 prefix risk noted above.
- **New pages silently bypassing auth:** No evidence found. All new pages land under `/` which is caught by the default deny rule unless explicitly added to `isPublicRoute`.
