# AI Integration Invariants Audit
**Date:** 2026-05-14 (updated — scheduled cron, read-only pass)
**Git HEAD:** 742341a54a1bff2777c2ea8a93eec0bca4cc618a

---

## Executive Summary — Top 5 Risks

| Rank | Risk | Severity |
|------|------|----------|
| 1 | **70 concrete command route.ts files exist outside the single manifest dispatcher** | HIGH |
| 2 | **3 of those 70 routes bypass manifest runtime entirely** (raw SQL, hardcoded cost percentages) | HIGH |
| 3 | `ClerkProviderClient` calls `useTheme()` before mounting — correctly inside ThemeProvider at runtime but the hook runs before hydration confirms theme | LOW-MEDIUM (mitigated) — **FIXED 2026-05-14** |
| 4 | `apps/api/proxy.ts` whitelists `/api/sentry-fixer/process` as a public route — accidental public exposure of an internal cron handler | MEDIUM |
| 5 | `sign-in.tsx` and `sign-up.tsx` redirect fallback URL computation may cross-wire in certain env configurations | LOW |

---

## Confirmed Bugs

### BUG-1 — Manifest route invariant: 70 concrete command route files outside single-dispatcher

**Files:** All files under `apps/api/app/api/` matching `*/commands/*/route.ts` **excluding** `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

**Count:** 70 files (as of this audit pass)

**Product Impact:** These routes are not managed by the manifest IR. Policy guards, constraints, and audit events defined in `.manifest` files are not applied. Any breaking change to the manifest schema bypasses these routes silently.

**Proof:** `find apps -path '*/commands/*/route.ts' | grep -v "manifest/\[entity\]"` returns 70 results. The only legal concrete command file per AGENTS.md is the single dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`.

**Smallest safe fix:** Route each concrete command through the manifest dispatcher, or document and allowlist them explicitly in AGENTS.md if they are intentionally bypass routes. Do not do both.

---

### BUG-2 — 3 concrete command routes bypass manifest runtime entirely

**Files:**
- `apps/api/app/api/events/profitability/commands/recalculate/route.ts` — direct Prisma writes, hardcoded cost-percentage constants, no `runCommand()` call
- `apps/api/app/api/procurement/purchase-orders/commands/update-status/route.ts` — raw SQL via `database` (non-Prisma ORM client), local state-machine transition table
- `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts` — raw SQL

**Product Impact:** State machine for PO status is duplicated locally (`VALID_TRANSITIONS` map). If the manifest PO domain adds constraints, they will not fire. Profitability recalculation uses hardcoded food/labor cost percentages that may drift from business rules.

**Proof:** Source reads confirm no `createManifestRuntime()` / `runtime.runCommand()` calls in those three files. Direct `database.*` calls write to Prisma tables without manifest middleware.

**Smallest safe fix:** Wire through manifest runtime for guard evaluation, then persist via Prisma store — same pattern as `alerts-config` batch01/batch02. Hardcoded cost percentages should be extracted to config or DB values.

---

### BUG-3 — `apps/api/proxy.ts` exposes `/api/sentry-fixer/process` as a public route

**File:** `apps/api/proxy.ts:10`

```ts
const isPublicRoute = createRouteMatcher([
  "/webhooks(.*)",
  "/outbox/publish",
  "/api/health(.*)",
  "/api/sentry-fixer/process",   // ← no auth required
]);
```

**Product Impact:** Anyone can POST to `/api/sentry-fixer/process` without authentication. The route processes Sentry data and may trigger writes. This is an internal cron endpoint (verified in `vercel.json` — scheduled at `0 0 * * *`).

**Proof:** Route is in `isPublicRoute` matcher; middleware returns early without checking `userId`. Route handler does not perform its own auth check.

**Correction (2026-05-14):** The POST handler (line 318-417) **does** perform its own auth check via `isAuthenticated()` (line 323), which validates `CRON_SECRET` Bearer token or `x-vercel-cron` header. The **GET** handler (line 427-455) is fully public by design (monitoring endpoint). Removing from `isPublicRoute` would break Vercel cron (Clerk middleware would reject cron requests lacking a session). The remaining exposure is the GET handler returning operational config without auth.

**Smallest safe fix:** Remove `/api/sentry-fixer/process` from `isPublicRoute`. Add a cron-secret or API-key check inside the route handler itself (same pattern as `webhook-retry`).

---

## Suspicious / Unproven

### SUSP-1 — `ClerkProviderClient` calls `useTheme()` at render time

**File:** `apps/app/app/clerk-provider.client.tsx:13`

`ClerkProviderClient` calls `useTheme()` to drive the Clerk appearance theme. It is rendered inside `DesignSystemProvider → ThemeProvider`, so the hook is technically below the provider. However, `ThemeProvider` is a server component that wraps a `"use client"` boundary — on first render `resolvedTheme` will be `undefined` (before hydration), causing a brief flash where Clerk renders with `undefined` theme (defaults to light). The component does **not** guard with `mounted` state the way `notifications-provider.tsx` does.

**Impact:** Minor — possible theme flash on Clerk modal open. Not a broken invariant.
**Status:** **FIXED** — 2026-05-14T16:10Z (automated fix cron). Added `mounted` guard with `useState`/`useEffect` matching `notifications-provider.tsx` pattern. Clerk now defaults to `undefined` (light) during SSR, only applying dark theme after hydration confirms `resolvedTheme === "dark"`.

### SUSP-2 — `sign-up.tsx` derives `signInFallbackRedirectUrl` from `signUpFallbackRedirectUrl`

**File:** `packages/auth/components/sign-up.tsx:29-35`

```ts
const signUpFallbackRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL, "/"
);
const signInFallbackRedirectUrl = normalizePath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
  signUpFallbackRedirectUrl   // ← fallback to sign-up URL, not "/"
);
```

Mirror issue in `sign-in.tsx`: `signUpFallbackRedirectUrl` defaults to `signInFallbackRedirectUrl`. These are intentional cross-references but create confusing circular defaults if neither env var is set. When both are unset, both resolve to `"/"` — which is fine. When only one is set, the other borrows it. This may be intentional design but is fragile and undocumented.

**Impact:** Low — only affects fallback redirect in edge cases.

### SUSP-3 — `apps/api/proxy.ts` imports from `@repo/auth/server` (re-export) while `apps/app/proxy.ts` imports from `@clerk/nextjs/server` directly

**Files:**
- `apps/api/proxy.ts:1` — `from "@repo/auth/server"`
- `apps/app/proxy.ts:1` — `from "@clerk/nextjs/server"`

If `@repo/auth/server` pins a different Clerk version than what `apps/api` has resolved, the middleware behaviors may diverge silently. Low probability given monorepo lockfile, but worth auditing on Clerk upgrades.

---

## False Alarms / Intentionally Valid

- **`packages/auth/provider.tsx`** — `AuthProvider` wraps nothing, deliberately avoiding a second `ClerkProvider`. Comment confirms intent. Not a bug.
- **`packages/design-system/index.tsx`** — `DesignSystemProvider` wraps `ThemeProvider` around `AuthProvider`. Correct ordering. Not a bug.
- **`apps/app/app/(authenticated)/components/notifications-provider.tsx`** — Uses `useTheme()` inside the `(authenticated)` subtree, which is below `DesignSystemProvider → ThemeProvider` in root layout. Uses `mounted` guard for hydration safety. Correct. Not a bug.
- **`packages/design-system/components/ui/sonner.tsx`** — Uses `useTheme()` inside `Toaster`, rendered inside `ThemeProvider` via `DesignSystemProvider`. Correct. Not a bug.
- **`apps/mobile/App.tsx`** — Has its own `ClerkProvider` for React Native / Expo. Separate app, not a duplicate. Not a bug.
- **`QueryProvider` placement** — Placed in root layout at `apps/app/app/layout.tsx:47`, wrapping all children. All `useQuery`/`useMutation` consumers are in `(authenticated)` subtree below. Correct. Not a bug.
- **`afterSignInUrl` / `afterSignUpUrl`** — Zero occurrences in codebase. Deprecated props are not present. No conflict.

---

## Notes
- No files modified in this pass (read-only audit).
- BUG-1 and BUG-2 are carry-forward from prior audit passes. Git HEAD `742341a` shows no fixes landed since last run.
- BUG-3 (`sentry-fixer/process` public exposure) is a **new finding** in this pass.

## Fix History

| Date | Bug | Action |
|------|-----|--------|
| 2026-05-14T16:10Z | SUSP-1 | Added `mounted` guard to `ClerkProviderClient` (`apps/app/app/clerk-provider.client.tsx`). Prevents Clerk theme flash during SSR hydration by defaulting to light theme until `resolvedTheme` is confirmed. Follows `notifications-provider.tsx` pattern. |
| 2026-05-14T16:10Z | BUG-3 | **Note:** POST handler already has CRON_SECRET auth (line 323). GET handler is intentionally public for monitoring (line 424-425). Removing from `isPublicRoute` would break Vercel cron. No code change made — report analysis partially incorrect. |
