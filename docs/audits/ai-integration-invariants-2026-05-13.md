# AI Integration Invariants Audit

**Last updated:** 2026-05-18T01:48Z (cron-31)
**Git HEAD:** d3bc878a57ba3fe7fa337c4694010b19159337b7
**Auditor:** automated cron — no files modified

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | File(s) |
|---|------|----------|---------|
| 1 | `useTheme()` called above `ThemeProvider` in ClerkProviderClient — Clerk dark mode always undefined | HIGH | `apps/app/app/clerk-provider.client.tsx:13` |
| 2 | Concrete command routes in frontend app (`apps/app`) — bypass API-layer rate limiting and key auth | HIGH | `apps/app/app/api/staff/shifts/commands/*/route.ts` |
| 3 | 80 concrete command route.ts files outside the single manifest dispatcher | MEDIUM | `apps/api/app/api/**/commands/*/route.ts` (78) + `apps/app` (2) |
| 4 | `apps/api` public route allowlist includes `/api/cron(.*)` — any request to a cron endpoint skips auth | MEDIUM | `apps/api/proxy.ts:11` |
| 5 | `apps/api` public route allowlist includes `/api/sentry-fixer/process` hardcoded — production endpoint silently unauthenticated | LOW-MEDIUM | `apps/api/proxy.ts:10` |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` above `ThemeProvider` in ClerkProviderClient

**File:** `apps/app/app/clerk-provider.client.tsx:13`

**Proof:**
```tsx
// clerk-provider.client.tsx
const { resolvedTheme } = useTheme();   // ← line 13 — no ThemeProvider above this component
```
```tsx
// layout.tsx — render tree (outer → inner)
<ClerkProviderClient>          // ← useTheme() fires here, ThemeProvider not yet mounted
  <QueryProvider>
    <AnalyticsProvider>
      <DesignSystemProvider>   // ← ThemeProvider is inside here
        {children}
      </DesignSystemProvider>
    </AnalyticsProvider>
  </QueryProvider>
</ClerkProviderClient>
```

`ClerkProviderClient` sits **above** `DesignSystemProvider` in the tree. `DesignSystemProvider` (packages/design-system/index.tsx:20) renders `ThemeProvider`. So when `ClerkProviderClient` calls `useTheme()`, there is no `ThemeProvider` ancestor — `resolvedTheme` is always `undefined`. The fallback (`undefined === "dark"` is false) means the Clerk `dark` theme is **never applied** even when the user is in dark mode.

**Product impact:** Clerk modals, sign-in, sign-up, and user button always render in light mode regardless of system/user theme setting.

**Regressed at:** cron-25 (commit fe88f5be). Previously fixed, then reintroduced.

**Smallest safe fix:** Move `ClerkProviderClient` to be a child of `DesignSystemProvider`, or move `DesignSystemProvider` above `ClerkProviderClient`, or accept a `resolvedTheme` prop passed down from a server component that reads a cookie.

---

### BUG-2 — Concrete command routes in frontend app (apps/app)

**Files:**
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Proof:** These are full concrete Next.js route handlers in `apps/app`. The `next.config.ts` rewrites `/api/staff/:path*` to the API app, but Next.js `afterFiles` rewrites only run when no filesystem route matches first. Since these files exist, they match before the rewrite fires — requests are handled locally in `apps/app`, bypassing:
- `apps/api/proxy.ts` (rate limiting, API key authentication, Sentry capture)
- The manifest command dispatcher

**Product impact:** Staff shift mutations from the frontend hit the unguarded local handler. Rate limiting is skipped. API key-authenticated integrations that call `/api/staff/shifts/commands/*` get the frontend's lighter auth check instead of the API app's full guard stack.

**Smallest safe fix:** Delete both files. The rewrite will then forward requests to the equivalent handlers in `apps/api/app/api/staff/shifts/commands/`.

---

### BUG-3 — 80 concrete command route.ts files outside manifest single-dispatcher

**Count:** 78 in `apps/api/app/api/**/commands/*/route.ts` + 2 in `apps/app/app/api/staff/shifts/commands/*/route.ts` = **80 total** (up from 79 in cron-30; one new route added).

Per AGENTS.md: _"Concrete generated command route files are illegal unless they are the single dispatcher: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`"_

The single legal dispatcher exists at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`. All other command route files are illegal per the manifest invariant.

**Product impact:** These routes operate outside the manifest runtime. Command lifecycle hooks, policy enforcement, and IR consistency guarantees the manifest dispatcher provides are bypassed for all these entities.

**Note:** This is a large-scale structural issue — not a quick fix. Treat as a backlog migration item, not a hotfix target.

---

## Suspicious but Unproven

### SUSP-1 — `NotificationsProvider` useTheme with mounted guard

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`

`useTheme()` called with `mounted` guard. If this component renders in a layout that doesn't have `ThemeProvider` in its ancestor chain, the guard would mask a crash into a perpetual "light" theme. Cannot confirm the full layout ancestry path from this audit pass alone.

### SUSP-2 — apps/api public route allows `/api/cron(.*)`

**File:** `apps/api/proxy.ts:11`

All cron routes are unauthenticated. If any cron endpoint performs destructive or sensitive operations, it can be triggered by any party with network access. No cron endpoint inventory was performed in this pass.

### SUSP-3 — apps/api public route allows `/api/sentry-fixer/process`

**File:** `apps/api/proxy.ts:10`

Hardcoded single endpoint exempted from auth. If this handler has side effects (queue processing, error mutation), it's exposed. Needs endpoint-level verification.

---

## False Alarms / Intentionally Valid

| ID | File | Reason Valid |
|----|------|-------------|
| FA-1 | `packages/auth/provider.tsx` | Intentionally does NOT render ClerkProvider — comment explains this. |
| FA-2 | `packages/auth/components/sign-in.tsx` / `sign-up.tsx` | Uses only `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` — no deprecated `afterSignInUrl`/`afterSignUpUrl` coexistence. |
| FA-3 | `packages/design-system/components/mode-toggle.tsx` | Called inside DesignSystemProvider subtree — ThemeProvider is present. |
| FA-4 | `packages/design-system/components/ui/sonner.tsx` | Same — always rendered inside DesignSystemProvider. |
| FA-5 | `apps/mobile/App.tsx` | ClerkProvider wraps QueryClientProvider wraps all hooks — correct order. |
| FA-6 | `apps/storybook/.storybook/preview.tsx` | ThemeProvider explicitly wraps stories — correct. |
| FA-7 | `apps/app/app/(unauthenticated)/sign-in/*` and `sign-up/*` | useAuth called inside ClerkProvider subtree (layout.tsx root wraps everything). |
| FA-8 | `apps/app/app/query-provider.tsx` | QueryClientProvider is present; all useQuery/useMutation hooks are children. |
| FA-9 | `apps/app/proxy.ts` | API routes return JSON 401/403 (jsonResponse helper). Page routes do HTML redirect — correct behavior for browser navigation. |
| FA-10 | `apps/api/proxy.ts` | Returns JSON 401 on all auth failures — correct for an API-only app. |

---

## Manifest Route Inventory

- **Legal dispatcher:** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` ✓ exists
- **Illegal concrete routes in apps/api:** 78 files
- **Illegal concrete routes in apps/app:** 2 files
- **Total illegal:** 80

Partial listing (apps/api, by domain):
- `events/catering-orders/commands/*` — 6 routes
- `events/import-workflows/commands/*` — 17 routes
- `events/profitability/commands/*` — 1 route
- `kitchen/prep-task-plan-workflows/commands/*` — 15 routes
- `kitchen/alerts-config/commands/*` — 3 routes
- `crm/proposals/commands/*` — 5 routes
- `crm/leads/commands/*` — 4 routes
- `inventory/bulk-order-rules/commands/*` — 2 routes
- `inventory/variance-reports/commands/*` — 2 routes
- `procurement/requisitions/commands/*` — 10 routes
- `procurement/purchase-orders/commands/*` — 2 routes
- `shipments/shipment/commands/*` — 7 routes
- `staff/shifts/commands/*` — 2 routes
- `communications/email-templates/commands/*` — 1 route

---

*No files were modified in this audit pass.*
