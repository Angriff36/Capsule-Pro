# AI Integration Invariants Audit
**Last updated:** 2026-05-14 (run against HEAD e7234fa7)
**Scope:** Provider graph, Clerk, auth routes, manifest route, stale-code invariants.
**Mode:** Read-only. No files changed.

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | 70 concrete command `route.ts` files outside the single manifest dispatcher | HIGH | UNRESOLVED (ongoing) |
| 2 | 3 of those routes bypass manifest runtime entirely (direct Prisma / raw SQL) | HIGH | UNRESOLVED |
| 3 | `/api/sentry-fixer/process` listed as public route — no auth required | MEDIUM | FIXED |
| 4 | `events/profitability/commands/recalculate` hardcodes cost percentages in route logic | MEDIUM | UNRESOLVED |
| 5 | SUSP-1 (ClerkProviderClient theme-flash) — **FIXED** in e7234fa7 | — | RESOLVED ✅ |

---

## Confirmed Bugs

### BUG-1 — 70 concrete command route files outside manifest dispatcher

**Files:** All files matching `apps/api/app/api/*/commands/*/route.ts` except
`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`.

**Count:** 70 concrete handlers. The canonical pattern requires exactly one dispatcher.

**Product impact:** These routes are not subject to manifest guard middleware, RBAC
enforcement, or command-definition validation that the dispatcher provides. Any
per-command policy wired into the manifest IR is silently bypassed for all 70 routes.

**Proof:** `find apps/api/app/api -path '*/commands/*/route.ts' | grep -v manifest` returns
70 paths covering communications, staff/shifts, inventory, kitchen, events, CRM, and
procurement domains.

**Smallest safe fix:** Each route family needs to either be deleted and rerouted through
the dispatcher, or the team must formally declare them infrastructure-allowlisted and
document why. Do not delete blindly — some carry hand-rolled business logic (see BUG-2).

---

### BUG-2 — 3 routes bypass manifest runtime with hardcoded business logic / raw SQL

**Files:**
- `apps/api/app/api/events/profitability/commands/recalculate/route.ts` — direct Prisma writes + hardcoded cost-ratio constants (35%/15%/5% of revenue)
- `apps/api/app/api/procurement/purchase-orders/commands/update-status/route.ts` — raw SQL for state-machine transitions
- `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts` — raw SQL

**Product impact:**
- Profitability: cost estimates are always hardcoded ratios regardless of actual item-level
  cost data. Clients will see fabricated accuracy.
- Purchase orders: state transitions implemented in raw SQL outside the manifest state
  machine — schema changes or constraint additions won't automatically guard these paths.

**Proof:** `grep -L "runtime\|runCommand\|Manifest\|dispatch"` on all concrete command
routes returns exactly these 3 files.

**Smallest safe fix (per file):**
- `recalculate`: derive costs from actual `EventBudget.lineItems` amounts (already fetched
  in `calculateBudgetTotals`) rather than applying percentage multipliers to revenue.
- `update-status` / `receive`: replace raw SQL with Prisma ORM calls against the
  `PurchaseOrder` model. Enforce the `VALID_TRANSITIONS` guard already present in the file
  but wire it into the schema-level status enum.

---

### BUG-3 — `/api/sentry-fixer/process` listed as unauthenticated public route

**File:** `apps/api/proxy.ts:11`

```ts
const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health(.*)",
  "/api/sentry-fixer/process",   // ← no auth required
]);
```

**Product impact:** Any unauthenticated actor on the internet can trigger the sentry-fixer
cron endpoint. Depending on what it does (Sentry issue resolution, data mutations), this
is at minimum an unmetered cost sink and at worst a data-integrity risk.

**Status:** FIXED  
**Fixed:** 2026-05-14T17:10Z — automated fix cron  
**Fix applied:** Removed `/api/sentry-fixer/process` from the `isPublicRoute` matcher in
`apps/api/proxy.ts`. Added an `x-vercel-cron` header bypass in the middleware so Vercel
cron jobs still reach the handler (which performs its own authentication via
`isAuthenticated()` checking `x-vercel-cron`, `Authorization: Bearer`, and `CRON_SECRET`).

**Proof:** The route is in the `isPublicRoute` matcher. The cron schedule for this endpoint
is `0 0 * * *` (daily), meaning it's intended for internal use only.

**Smallest safe fix:** Remove `/api/sentry-fixer/process` from `isPublicRoute`. In the
route handler, add a cron-secret header check:
```ts
if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```
And set `CRON_SECRET` in Vercel environment variables, adding the header to the
`vercel.json` cron job definition.

---

## Suspicious but Unproven

### SUSP-1 — RESOLVED (see below)

Previously flagged: `ClerkProviderClient` calling `useTheme()` before mount could cause
hydration mismatch. Fixed in commit e7234fa7 with a `mounted` state guard. Verified clean.

### SUSP-2 — `NotificationsProvider` inside `(mobile-kitchen)` layout — ordering unverified

**File:** `apps/app/app/(mobile-kitchen)/layout.tsx:30`

`NotificationsProvider` calls `useTheme()`. It's mounted inside `(mobile-kitchen)/layout.tsx`
which is a nested layout below root. The root layout wraps with `DesignSystemProvider`
(which contains `ThemeProvider`), so ordering is valid **if** `(mobile-kitchen)` is a child
of the root layout and shares its provider tree. Unproven without seeing the actual layout
tree composition. Low risk — flagging for manual confirmation only.

### SUSP-3 — `sign-up.tsx` uses `signInFallbackRedirectUrl` for both sign-in and sign-up

**File:** `packages/auth/components/sign-up.tsx:29-35`

```ts
const signInFallbackRedirectUrl = normalizePath(
  signUpFallbackRedirectUrl   // ← assigns sign-UP url to sign-IN variable name
);
```

The variable naming is confusing — `signInFallbackRedirectUrl` is derived from
`signUpFallbackRedirectUrl`. Both are ultimately passed to the `<SignUp>` component.
This is likely intentional (same destination URL for both flows), but a misread during
future edits could accidentally swap redirect targets. No runtime bug confirmed, but it's
a footgun.

---

## False Alarms / Intentionally Valid

1. **`ClerkProviderClient` calling `useTheme()`** — Valid. It sits below `DesignSystemProvider`
   which wraps `next-themes ThemeProvider`. Provider ordering is correct. The mounted guard
   (added in e7234fa7) prevents the pre-mount hydration mismatch.

2. **Mobile `App.tsx` provider nesting** — Valid. `ClerkProvider` → `QueryClientProvider` →
   `ClerkLoaded` → `AuthTokenBridge` (calls `useAuth()`). All hooks are below their providers.

3. **`useAuth` in unauthenticated sign-in/sign-up pages** — Valid. These pages render inside
   `ClerkProvider` at root layout. `useAuth` is safe to call from unauthenticated contexts —
   it returns `{ isSignedIn: false }` when no session exists. The analytics hooks only fire
   when `isSignedIn` becomes `true`.

4. **`apps/app/proxy.ts` API routes returning HTML redirect** — Not happening. The middleware
   correctly gates on `isApiRoute(req)` first and returns JSON 401 for API paths. Non-API
   pages get the HTML redirect, which is expected behavior.

5. **`packages/auth/components/sign-in.tsx` and `sign-up.tsx` using `signInFallbackRedirectUrl`/
   `signUpFallbackRedirectUrl`** — No deprecated props (`afterSignInUrl`/`afterSignUpUrl`).
   Using the current fallback API throughout.

6. **`QueryProvider` position in root layout** — Valid. It's nested inside `ClerkProviderClient`.
   No Clerk hooks are called from within `QueryProvider` itself.

7. **No nested/duplicate `ClerkProvider` in app layouts** — Confirmed. Only one
   `ClerkProvider` path in web app: `layout.tsx` → `ClerkProviderClient` → `<ClerkProvider>`.
   No authenticated sub-layouts add another provider.

8. **Mobile `App.tsx` `ClerkProvider` isolation** — Correct. Mobile uses `@clerk/clerk-expo`,
   entirely separate from `@clerk/nextjs`. No sharing, no conflict.

---

## Appendix: Concrete Command Routes by Domain (BUG-1 full list)

| Domain | Count |
|--------|-------|
| kitchen/prep-task-plan-workflows | 14 |
| events/import-workflows | 15 |
| events/catering-orders | 6 |
| crm/proposals | 5 |
| crm/leads | 3 |
| inventory/bulk-order-rules | 2 |
| inventory/variance-reports | 2 |
| staff/shifts | 2 |
| communications/email-templates | 1 |
| kitchen/alerts-config | 3 |
| events/profitability | 1 |
| procurement/purchase-orders | 2+ |
| **Total** | **~70** |
