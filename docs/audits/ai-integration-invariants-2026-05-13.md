# AI Integration Invariants Audit
**File:** `docs/audits/ai-integration-invariants-2026-05-13.md`
**Last updated:** 2026-05-14T10:11Z
**Git HEAD at last update:** b10436ed77ef793ab505f3ca816aa18cddb4993c
**Audit scope:** Provider graph, Clerk, Auth route, Manifest route invariants

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity |
|---|------|----------|
| 1 | `ClerkProviderClient` calls `useTheme()` above `ThemeProvider` — Clerk dark mode is permanently broken | HIGH |
| 2 | Duplicate `<Toaster />` in root layout — users see doubled toast notifications | MEDIUM |
| 3 | 2 concrete command routes live in `apps/app` (frontend) — bypass API-layer auth/rate-limiting | HIGH |
| 4 | 70 concrete command route files in `apps/api` outside the manifest single-dispatcher — violates manifest invariant, creates maintenance surface with no dispatch contract | MEDIUM |
| 5 | `notifications-provider.tsx` calls `useTheme()` with a `mounted` guard as hydration mitigation — masks an upstream provider-ordering issue | LOW |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` called above `ThemeProvider` in ClerkProviderClient
**Files:**
- `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` call
- `apps/app/app/layout.tsx:36–57` — `ClerkProviderClient` wraps `DesignSystemProvider` (which contains `ThemeProvider`)

**Proof:**
```
layout.tsx:36  <ClerkProviderClient>        ← renders first
layout.tsx:40    <DesignSystemProvider>     ← contains ThemeProvider inside
...
layout.tsx:57  </ClerkProviderClient>
```
`DesignSystemProvider` → `ThemeProvider` is a **descendant** of `ClerkProviderClient`.
`useTheme()` at `clerk-provider.client.tsx:13` executes in `ClerkProviderClient` which is the **ancestor** of `ThemeProvider` — it therefore always gets `resolvedTheme = undefined`, `theme` is always `undefined`, and Clerk's dark appearance is never applied.

**Product impact:** Clerk modals (sign-in, sign-up, user profile) are permanently light-mode regardless of user theme preference.

**Smallest safe fix:** Extract `ClerkProviderClient` into two components: an outer shell that renders `<ClerkProvider>` unconditionally, and an inner `ClerkAppearanceBridge` rendered below `DesignSystemProvider` (i.e., below `ThemeProvider`) that reads `useTheme()` and calls `clerk.setAppearance()` via the Clerk JS `__unstable_updateProps` API or by moving the appearance prop to a child context. Alternatively, invert the render order so `ThemeProvider` wraps `ClerkProvider`.

---

### BUG-2 — Duplicate `<Toaster />`
**Files:**
- `apps/app/app/layout.tsx:55` — explicit `<Toaster />`
- `packages/design-system/index.tsx:23` — `<Toaster />` inside `DesignSystemProvider`

**Proof:** `layout.tsx` mounts `<DesignSystemProvider>` (line 40–52) which renders a `<Toaster />` internally (design-system/index.tsx:23), and then also mounts a standalone `<Toaster />` at line 55. Both are in the DOM simultaneously.

**Product impact:** Every toast notification fires twice — doubled UI noise, potential z-index stacking issues.

**Smallest safe fix:** Remove the standalone `<Toaster />` at `layout.tsx:55`; rely on the one inside `DesignSystemProvider`.

---

### BUG-3 — Concrete command routes in `apps/app` (frontend)
**Files:**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Proof:** These are `route.ts` files under `apps/app` (the Next.js frontend app), not `apps/api` (the API service). The frontend app's middleware (`apps/app/proxy.ts`) protects page routes but these API routes use Clerk's `auth()` directly without the API service's rate-limiting, key validation, or centralized auth pipeline.

**Product impact:** Shift create/update commands skip API-layer protections. If the frontend app's Clerk config drifts or is misconfigured, these commands are unprotected.

**Smallest safe fix:** Move both routes to `apps/api/app/api/staff/shifts/commands/` and remove the copies from `apps/app`.

---

### BUG-4 — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher
**Count:** 70 files in `apps/api` + 2 in `apps/app` = **72 total non-dispatcher concrete command routes**

**The one legitimate dispatcher:**
`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

**Examples of violations:**
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/*/route.ts` (14 files)
- `apps/api/app/api/events/import-workflows/commands/*/route.ts` (17 files)
- `apps/api/app/api/inventory/*/commands/*/route.ts` (4 files)
- etc.

**Proof:** Per AGENTS.md: *"Concrete generated command route files are illegal unless they are the single dispatcher."* These are concrete files, not the `[entity]/[command]` dynamic segment.

**Product impact:** Each concrete route is a maintenance liability with no manifest dispatch contract — command additions don't flow through the IR, breaking the single-source-of-truth invariant. Some may also silently bypass manifest-level validation or tenant isolation logic.

**Smallest safe fix:** Migrate each concrete command handler to be invoked via the manifest single-dispatcher, or formally document each as an intentional bypass with a linked issue. Do not add new concrete command routes.

---

## Suspicious / Unproven

### SUSP-1 — `NotificationsProvider` calls `useTheme()` with `mounted` guard
**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`

The component uses a `mounted` state to default to `"light"` during SSR and switches to actual theme post-mount. This pattern correctly avoids hydration mismatch **if** `ThemeProvider` is an ancestor. This component is used inside the `(authenticated)` layout tree, which sits below `DesignSystemProvider` (which contains `ThemeProvider`) — so the provider ordering is likely correct here. The `mounted` guard is a belt-and-suspenders hydration fix, not evidence of a broken hierarchy. **Demoted from BUG to SUSP** pending confirmation of the full `(authenticated)` layout tree.

### SUSP-2 — `sign-in-with-analytics.tsx` calls `useAuth()` in unauthenticated layout
**File:** `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`

`useAuth()` is called from a component in the unauthenticated layout. Clerk docs allow `useAuth()` to return `isSignedIn: false` before authentication — this is intentional for tracking the sign-in completion event. However if `ClerkProvider` is not an ancestor of this layout, the hook throws. `ClerkProvider` is at root layout (`apps/app/app/layout.tsx:36`) which wraps all routes including unauthenticated — so this is likely fine. **Unproven risk** only if a nested layout shadow-removes `ClerkProvider`.

### SUSP-3 — `apps/app/proxy.ts` public route list uses prefix matchers only
**File:** `apps/app/proxy.ts:5–11`

Public routes are `["/sign-in(.*)", "/sign-up(.*)", "/plasmic(.*)", "/view/proposal(.*)", "/sign/contract(.*)"]`. No catch-all for static assets or `_next` — this is fine because Clerk middleware skips those by default. However `/plasmic(.*)` is a broad prefix — any new route under `/plasmic/` is automatically public. If an authenticated page is accidentally nested under `/plasmic/`, it silently becomes public. Not a current confirmed bug but worth noting.

---

## False Alarms / Intentionally Valid

| Item | Why it's fine |
|------|---------------|
| `packages/auth/provider.tsx` — `AuthProvider` that doesn't render `ClerkProvider` | Intentional by design — comment at line 13 confirms this. `ClerkProvider` must exist exactly once at app root. |
| `packages/design-system/components/mode-toggle.tsx` — `useTheme()` call | Rendered inside app content tree, always below `ThemeProvider`. Not a placement violation. |
| `packages/design-system/components/ui/sonner.tsx` — `useTheme()` call | Same — always below `ThemeProvider` when used. |
| `apps/mobile/App.tsx` — `ClerkProvider` wrapping the mobile app | Correct — separate app, single root `ClerkProvider`, `QueryClientProvider` nested inside. |
| `packages/auth/components/sign-in.tsx` — uses `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` | These are the current Clerk API props (not deprecated). No `afterSignInUrl`/`afterSignUpUrl` coexistence detected. |
| `apps/api/proxy.ts` — separate `clerkMiddleware` for the API service | Correct — `apps/api` is a separate Next.js app with its own middleware boundary. |
| `apps/storybook/.storybook/preview.tsx` — `ThemeProvider` wrapping stories | Correct — standalone Storybook context, not part of app tree. |

---

## Audit Notes
- No deprecated `afterSignInUrl`/`afterSignUpUrl` props found in any production code.
- No nested `ClerkProvider` beyond the one root instance in `apps/app/app/layout.tsx`.
- `QueryClientProvider` is properly scoped in `apps/app/app/query-provider.tsx` and `apps/mobile/App.tsx`; all `useQuery`/`useMutation` hooks are in components below these providers.
- API routes return JSON 401/403 correctly (`apps/app/proxy.ts:59,66`).
