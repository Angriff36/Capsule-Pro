# AI-Integration Invariants Audit

**Last updated:** 2026-05-15 (cron-8)
**Git HEAD:** ec1aad0bc4e045df5ea300e9667759b88b90ea03
**Audit scope:** Provider graph, Clerk, auth routes, manifest route invariants, stale-code smell

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | **70 concrete command `route.ts` files** outside the manifest single-dispatcher | HIGH | Unresolved — backlog |
| 2 | **3 routes fully bypass manifest runtime** (raw SQL / hardcoded logic) | HIGH | Unresolved — backlog |
| 3 | **`ClerkProviderClient` useTheme flash** — light-mode Clerk UI flashes on dark pages during hydration | LOW-COSMETIC | **FIXED** (2026-05-15T01:09Z) |
| 4 | **Prefix-based public route matchers** silently expose any future paths under `/plasmic`, `/view/proposal`, `/sign/contract` | MEDIUM | Unresolved — design risk |
| 5 | **`/api/public(.*)` blanket GET bypass** in api middleware — per-handler token validation not statically enforced | MEDIUM | Unresolved — design risk |

---

## Confirmed Bugs

### BUG-1 — Illegal Concrete Command Route Files (70 routes)

**Invariant violated:** Manifest route invariant — concrete command routes are illegal; only the single dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` should exist.

**Files:** All 70 files under `apps/api/app/api/**/commands/*/route.ts` except the dispatcher above.

**Product impact:** These routes shadow or bypass the manifest single-dispatcher, creating dual write paths that are inconsistent with the manifest IR as authority.

**Worst offenders (fully bypass manifest runtime):**
- `apps/api/app/api/events/profitability/commands/recalculate/route.ts` — hardcoded cost ratios, pure direct DB write, no `runCommand`/`executeManifestCommand`
- `apps/api/app/api/procurement/purchase-orders/commands/update-status/route.ts` — raw SQL
- `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts` — raw SQL

**Smallest safe fix:** Migrate each route to call `executeManifestCommand` (via `@/lib/manifest-command-handler`) and delete the concrete file, routing through the manifest dispatcher. Do not attempt all 70 at once — work in batches, proving persistence via read API after each migration.

---

### BUG-2 — ClerkProviderClient: `useTheme()` Before Hydration Causes Clerk Theme Flash

**File:** `apps/app/app/clerk-provider.client.tsx:13`

**Status: FIXED** — 2026-05-15T01:09Z — automated fix cron

**Fix applied:** Replaced `useState`/`useEffect` guard with `useSyncExternalStore` reading `document.documentElement.classList.contains("dark")` synchronously. Since `next-themes` uses `attribute="class"`, the `dark` class is present on `<html>` before React hydrates via an inline script, so the correct theme is known on the very first render frame — no flash.

**Invariant violated:** Provider graph — `ClerkProvider` wraps `useTheme()` but the resolved theme is `undefined` on first render before client mount.

**Proof:**
```tsx
// line 13
const { resolvedTheme } = useTheme();
// line 14
const [mounted, setMounted] = useState(false);
// line 21 — theme is undefined until useEffect fires
const theme = mounted && resolvedTheme === "dark" ? dark : undefined;
```

The `mounted` guard prevents a React error but not a visual flash: Clerk renders with `appearance={{ theme: undefined }}` (light) for one frame even when the user is in dark mode, then re-renders with the dark theme after hydration.

**Product impact:** Cosmetic — users on dark mode see a brief flash of light-themed Clerk UI (sign-in modal, user button). No auth breakage.

**Smallest safe fix:** Pass the initial theme server-side via a cookie or CSS class read synchronously (e.g., `next-themes`' `class` strategy on `<html>`), then read it from `document.documentElement.classList` synchronously in the component instead of waiting for `useEffect`.

---

## Suspicious But Unproven

### SUSP-1 — Prefix-Based Public Route Matchers in `apps/app/proxy.ts`

**File:** `apps/app/proxy.ts:5-11`

```ts
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/plasmic(.*)",           // entire subtree public
  "/view/proposal(.*)",     // entire subtree public
  "/sign/contract(.*)",     // entire subtree public
]);
```

Any new page added under `/plasmic/`, `/view/proposal/`, or `/sign/contract/` is automatically public without explicit review. This is an architectural risk if future pages are added under these prefixes that contain protected data.

**Not a confirmed bug** — current routes under these paths are intentionally public. Risk materializes only if prefixes expand.

---

### SUSP-2 — `/api/public(.*)` Blanket GET Bypass in API Middleware

**File:** `apps/api/proxy.ts:11`

```ts
const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health(.*)",
  "/api/public(.*)",   // all GETs bypass auth
]);
```

Per the middleware logic, GET/HEAD to any `/api/public/*` path skips auth entirely. Token validation is delegated to individual route handlers. No static enforcement exists to ensure all handlers under this prefix actually validate.

**Not confirmed broken** — current handlers appear to validate. Risk is that a new route added under `/api/public/` that forgets token validation silently becomes open.

---

## False Alarms / Intentionally Valid

| ID | Item | Why it's fine |
|----|------|---------------|
| FA-1 | `NotificationsProvider` calls `useTheme()` | Rendered inside `DesignSystemProvider` (which wraps `ThemeProvider`) — ordering is valid |
| FA-2 | `SignInWithAnalytics` calls `useAuth()` at `(unauthenticated)` sign-in page | `ClerkProvider` is at root layout, so it's above this component |
| FA-3 | `tracked-user-button.tsx` calls `useAuth()` | Inside `(authenticated)` group — `ClerkProvider` at root covers it |
| FA-4 | All `useQuery`/`useMutation` hooks in `app/lib/` and `(authenticated)/` | `QueryProvider` is mounted at root layout (`layout.tsx:47`) — correct ordering |
| FA-5 | Mobile `App.tsx` — `useAuth()` inside `AuthTokenBridge` below `ClerkProvider` | Provider order is correct: `ClerkProvider → QueryClientProvider → ClerkLoaded → AuthTokenBridge` |
| FA-6 | `packages/auth/components/sign-in.tsx` uses `signInFallbackRedirectUrl` | This IS the current Clerk API — `afterSignInUrl` (deprecated) is absent from the entire codebase |
| FA-7 | Multiple `apps/api/**/commands/*/route.ts` files use `executeManifestCommand` | These delegate to the manifest handler correctly; they're wrapper shims, not bypasses — though still technically illegal per the invariant (BUG-1) |
| FA-8 | `ClerkProviderClient` is a local wrapper around `ClerkProvider` | Not a duplicate provider — it's the sole `ClerkProvider` in the app tree. Wrapper is justified (theme wiring) |

---

## Provider Graph — Render Order Summary

```
RootLayout (apps/app/app/layout.tsx)
  └── DesignSystemProvider  (wraps next-themes ThemeProvider) ✅
        └── ClerkProviderClient  (ClerkProvider + useTheme) ✅ theme below ThemeProvider
              └── QueryProvider  (QueryClientProvider) ✅
                    └── AnalyticsProvider ✅
                          └── children
                                └── (authenticated) layout
                                      └── sidebar.tsx
                                            └── NotificationsProvider (useTheme) ✅
```

No broken dependency ordering detected.

---

## Clerk Invariants Summary

- **One `ClerkProvider` at root:** ✅ Confirmed — `apps/app/app/layout.tsx` → `ClerkProviderClient` is the only instance in `apps/app`
- **No nested duplicate ClerkProviders:** ✅ Clean
- **Deprecated redirect props absent:** ✅ `afterSignInUrl`/`afterSignUpUrl` not found anywhere
- **Current redirect API in use:** ✅ `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` used correctly in `packages/auth/components/sign-in.tsx` and `sign-up.tsx`
- **Clerk appearance API:** ✅ `cssLayerName` and `dark` theme from `@clerk/themes` — current API

---

## Auth Route Invariants Summary

- **API routes return JSON 401/403:** ✅ Both `apps/app/proxy.ts` and `apps/api/proxy.ts` return JSON responses for auth failures, not HTML redirects
- **Public routes are explicit allowlist:** ✅ (with SUSP-1/SUSP-2 caveats above — prefix matchers are a design risk)
- **`auth.protect` / `clerkMiddleware` usage:** ✅ Correct in both middleware files

---

## Manifest Route Invariants Summary

- **Legal dispatcher:** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` ✅ exists
- **Illegal concrete routes:** 70 files — **BUG-1** (see above)
- **Worst offenders:** 8 routes that don't call `executeManifestCommand` at all

---

*Audit history: cron-1 (2026-05-13) through cron-8 (2026-05-15). No source files modified in this pass.*
