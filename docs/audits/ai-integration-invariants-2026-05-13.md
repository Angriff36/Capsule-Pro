# AI Integration Invariants Audit
**Last updated:** 2026-05-14T15:15Z  
**Git HEAD:** 2d60b7acae29000c33c38d94c4bf3f34f8059936  
**Audit scope:** Provider graph · Clerk · Auth routes · Manifest routes · Stale-code smell

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | 70 concrete command routes in `apps/api` bypass the manifest single-dispatcher | High | UNRESOLVED |
| 2 | 3 of those routes also bypass manifest runtime entirely (direct Prisma/raw SQL) | High | UNRESOLVED |
| 3 | Mobile app falls back to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in Expo context | Medium | **FIXED** |
| 4 | App public-route allowlist has no `/_next` static asset entries (potential middleware overhead) | Low | Suspicious |
| 5 | `apps/api/proxy.ts` re-exports Clerk from `@repo/auth/server`; version drift risk | Low | Suspicious |

Previously confirmed bugs now **fixed**: Duplicate `<Toaster />` (commit `2dbdaa48`), two concrete shift command routes in `apps/app` (fix run 2026-05-14T20:15Z).

---

## Confirmed Bugs

### BUG-1 — 70 concrete command routes outside manifest single-dispatcher

**File pattern:** `apps/api/app/api/**/commands/*/route.ts` (excluding `manifest/[entity]/commands/[command]/route.ts`)  
**Count:** 70 files across 13 entity groups  
**Proof:** `find apps/api -path '*/commands/*/route.ts' -print | grep -v 'manifest/\[entity\]'` returns 70 results.

**AGENTS.md invariant (Manifest route invariants):**
> Concrete generated command route files are illegal unless they are the single dispatcher:
> `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`

**Entity groups affected:**
- `communications/email-templates` (1)
- `crm/leads` (6), `crm/proposals` (5)
- `events/catering-orders` (6), `events/import-workflows` (16), `events/profitability` (1)
- `inventory/bulk-order-rules` (2), `inventory/variance-reports` (2)
- `kitchen/alerts-config` (3), `kitchen/prep-task-plan-workflows` (13)
- `procurement/purchase-orders` (2), `procurement/requisitions` (8), `staff/shifts` (5)

**Product impact:** These routes are not tracked by the manifest IR. Any policy, guard, or constraint defined in a `.manifest` file does not run for requests hitting these routes directly. Audit trail and command replay are also bypassed.

**Smallest safe fix:** Move logic into the manifest dispatcher or route each entity through `executeManifestCommand` with the entity's PrismaStore wired. Do not delete; do this entity by entity. See AGENTS.md "Manifest Persistence Repair Rules."

---

### BUG-2 — 3 routes bypass manifest runtime entirely (direct Prisma / raw SQL)

**Files:**
1. `apps/api/app/api/events/profitability/commands/recalculate/route.ts` — direct Prisma calls + hardcoded cost percentages; no manifest runtime invocation.
2. `apps/api/app/api/procurement/purchase-orders/commands/update-status/route.ts` — raw SQL via `$queryRaw`; no `executeManifestCommand` / `runCommand` / `createManifestRuntime`.
3. `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts` — same pattern.

**Proof:** `grep -L "executeManifestCommand|runCommand|createManifestRuntime"` on those files returns their paths (no match = no runtime invocation).

**Product impact:** Business rules (cost validation, receiving constraints, status-transition guards) defined in the manifest are silently skipped. Reads from the profitability route will see raw recalculated values that may diverge from the event model's computed fields.

**Smallest safe fix:** Wrap each with `createManifestRuntime` + `executeManifestCommand`. For profitability's hardcoded percentages, extract them to a config field in the manifest or a DB-backed table before the wrap. Do not delete the files.

---

## Suspicious but Unproven

### SUSP-1 — Mobile fallback to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

**File:** `apps/mobile/App.tsx:84`
```ts
const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
```
**Risk:** `NEXT_PUBLIC_*` env vars are Next.js build-time inlined. In a React Native / Expo bundle they will be `undefined` unless the bundler is explicitly configured to expose them. If `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is not set, the fallback silently resolves to `undefined`, and `MissingConfig` renders. The fallback looks like it works but actually doesn't — it just surfaces a slightly friendlier error. Not a runtime crash but a misleading false safety net.  
**Action needed:** Remove the fallback or document why it is intentional.
**Fixed:** 2026-05-14T23:45Z — automated fix cron. Removed `?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` dead-code fallback from `apps/mobile/App.tsx:84`.

### SUSP-2 — App middleware public route allowlist excludes `/_next` assets

**File:** `apps/app/proxy.ts:5-11`  
Public routes: `/sign-in(.*)`, `/sign-up(.*)`, `/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`. No `/_next/(.*)` or `/favicon(.*)`.  
**Risk:** Next.js middleware runs on all matched paths. Clerk middleware should not slow down static asset delivery, but if the matcher config (`config.matcher`) in the compiled middleware catches `/_next/static` paths, auth overhead applies. Check the `config.matcher` export — if it's missing or broad, static assets incur unnecessary Clerk roundtrips. Not confirmed without seeing the compiled matcher.

### SUSP-3 — API middleware imports Clerk via `@repo/auth/server` re-export

**File:** `apps/api/proxy.ts:1`
```ts
import { clerkMiddleware, createRouteMatcher } from "@repo/auth/server";
```
The app-side middleware imports directly from `@clerk/nextjs/server`. If `@repo/auth/server` pins a different `@clerk/nextjs` version than the one installed in `apps/api`, you get a version split. No confirmed breakage — only risk if the packages diverge during an upgrade.

---

## False Alarms / Intentionally Valid

1. **`ClerkProviderClient` calling `useTheme()` above ThemeProvider** — Previously flagged. **FALSE ALARM.** Render order in `layout.tsx`: `DesignSystemProvider` (which wraps `ThemeProvider`) → `ClerkProviderClient`. `useTheme()` is called inside `ClerkProviderClient` which is a *child* of `ThemeProvider`. The nesting is correct. Reclassified 2026-05-14T13:32Z run.

2. **`NotificationsProvider` using `mounted` guard for `useTheme()`** — `apps/app/app/(authenticated)/components/notifications-provider.tsx:16-24`. The `mounted` pattern is a standard next-themes SSR hydration workaround, not a bug. Intentional.

3. **`packages/auth/provider.tsx` `AuthProvider` intentionally skips ClerkProvider** — Line 13 comment: "Intentionally does NOT render `<ClerkProvider>`. ClerkProvider must exist exactly once in the app root." This is by design.

4. **Single `ClerkProvider` root** — `apps/app/app/layout.tsx:46` → `ClerkProviderClient` → renders one `<ClerkProvider>`. No nested layouts add another. Clean.

5. **`QueryClientProvider` placement** — `query-provider.tsx` renders at root layout level (line 47 in `layout.tsx`), above all authenticated routes and their query hooks. No hooks called outside the provider tree.

6. **App middleware returns JSON 401/403 for API routes** — `apps/app/proxy.ts:58-60` returns `jsonResponse("Unauthorized", 401)`. Clean. HTML redirect only for non-API unauthenticated page requests.

7. **API middleware returns JSON 401** — `apps/api/proxy.ts` returns `new Response(JSON.stringify({message:"Unauthorized"}), {status:401})`. Clean.

8. **Mobile `QueryClientProvider` wraps `ClerkLoaded`/`SignedIn`** — `apps/mobile/App.tsx:94-107`. `useAuth()` (called in `AuthTokenBridge`) is inside `SignedIn` which is inside `ClerkLoaded` which is inside `QueryClientProvider`. Provider order is valid: `ClerkProvider` → `QueryClientProvider` → `ClerkLoaded` → `useAuth()`. No broken dependency order.

---

## Closed / Fixed in Prior Passes

| Bug | Description | Fixed |
|-----|-------------|-------|
| Duplicate `<Toaster />` | `layout.tsx` rendered an extra `<Toaster />` outside `DesignSystemProvider` | commit `2dbdaa48` |
| Shift command routes in `apps/app` | `create-validated` and `update-validated` route.ts in frontend app bypassed API middleware | fix run 2026-05-14T20:15Z |
| `useTheme()` above `ThemeProvider` (false alarm) | Was misread as inverted nesting; actually correct | Reclassified 2026-05-14T13:32Z |
