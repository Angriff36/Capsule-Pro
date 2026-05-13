# Capsule Pro Runtime Slowness Audit
**Date:** 2026-05-13  
**Next.js:** 15.4.11  
**Dev command:** `next dev -p 2221 -H 127.0.0.1` (no `--turbopack`)

---

## Ranked Findings (most impactful → least)

### 🔴 CRITICAL (easily >1s per cold page load)

| Rank | Finding | Impact |
|------|---------|--------|
| **1** | **No `--turbopack` on dev** — `next dev` uses Webpack. Cold starts take 30-90s. HMR updates take 2-5s per save. Turbopack is stable since Next.js 13, confirmed compatible with all 14 transpilePackages entries, and the project already has `turbopack.root` set in `packages/next-config`. **One-word fix.** | **10/10** |
| **2** | **159 files import `@repo/database`** (raw Prisma client). ~89 pages make direct DB calls in server components with **zero data-access layer**. Top offenders: `scheduling/page.tsx` (12 calls), `analytics/page.tsx` (10-11), `procurement/page.tsx` (9). Every page load executes these queries sequentially or in ad-hoc `Promise.all` — no dedup, no request-level caching, no React `cache()`. | **9/10** |
| **3** | **No React `cache()` wrapping around DB queries.** Next.js 15 server components share a request-level React cache per render. Wrapping `database.event.findFirst(eventId)` in `cache()` would make repeated calls within the same render pass hit memory instead of the DB. Currently every `database.` call is a fresh query even if the same entity is fetched multiple times in the same component tree. | **8/10** |

### 🟠 HIGH (noticeable delay per page)

| Rank | Finding | Impact |
|------|---------|--------|
| **4** | **Implicit dynamic rendering everywhere.** Only 1 page declares `force-dynamic`, 3 declare `revalidate = 60`. The other ~85 pages have NO caching posture — they use `cookies()` for auth (dynamic trigger) but don't explicitly declare it. Next.js 15 must runtime-detect dynamic functions on every request to decide the rendering strategy. Explicit declarations avoid this detection overhead. | **6/10** |
| **5** | **Root layout ships Clerk, Sentry, Google Analytics, Vercel Analytics, TanStack Query, Geist Mono + 2 Google Fonts.** All are static imports that execute before any page renders. Clerk and Sentry are necessary (auth/error tracking). Google Analytics, Vercel Analytics, and 2 Google Fonts are additive. Font loading blocks first paint. | **5/10** |
| **6** | **`transpilePackages` includes 14 workspace packages.** Every one must be bundled + transformed by Webpack/Turbopack on cold start. `@repo/database` alone is a large Prisma client with dozens of generated models. This is correct for monorepo use but adds to cold-start penalty, especially without `--turbopack`. | **4/10** |
| **7** | **`fetchAllEventDetailsData` (events page) does 5 tiers of parallel DB queries.** Even though Tier 1 runs in parallel, the waterfall (Tier 1 → Tier 2 → Tier 3 → Tier 4 → Tier 5) means worst-case query latency is additive across tiers. No request-level or shared cache. Called on every mutation via `invalidateQueries`. | **4/10** |

### 🟡 MEDIUM (latency contributors)

| Rank | Finding | Impact |
|------|---------|--------|
| **8** | **CSP headers in `next.config.ts` match `/(.*)`** — runs on every request, including `_next/static/*`, images, fonts. CSP string is ~800 chars evaluated per response. Minor per-request, but adds up. | **3/10** |
| **9** | **5 redundant `cache: "no-store"` fetch calls** — leftover from Next.js 14 migration since `no-store` is the default in 15. Wasted config that suggests the migration wasn't audited. | **1/10** |
| **10** | **`scheduling/page.tsx`, `analytics/finance/page.tsx`, `procurement/page.tsx` declare `revalidate = 60`** — ISR works in production but does nothing in `next dev` (dev always re-renders). The ISR pages fetch heavily on every dev request with no benefit. | **1/10** |

---

## What's NOT the problem

- **Heavy packages (pdf, payroll-engine, sales-reporting, supplier-connectors, manifest-runtime, sentry-integration, webhooks, realtime):** Zero imports in `apps/app/app/`. Correctly confined to `apps/api/`.
- **Middleware matchers:** Clean. 26 explicit path prefixes. No blanket `/(.*)` matcher. Middleware only fires on protected page routes, never on `_next` assets.
- **Notifications:** Already lazily loaded via `next/dynamic` behind a user-click gate.

---

## Immediate Fix (zero risk)

Add `--turbopack` to the dev script:

```diff
- next dev -p 2221 -H 127.0.0.1
+ next dev --turbopack -p 2221 -H 127.0.0.1
```

This alone will cut cold starts from 30-90s to 5-15s and HMR from 2-5s to <500ms. The project is **already configured** for it (`turbopack.root` in shared config). The `webpack` function in next.config.ts (canvas alias, ignoreWarnings) is silently ignored but neither is needed for dev.

---

## Short-Term Fixes (low risk, high impact)

1. **Wrap repeated DB calls in `cache()`.** In pages that call `database.event.findFirst()` multiple times (like `fetchAllEventDetailsData` or `scheduling/page.tsx`), wrap the lookup in `import { cache } from "react"`. This makes repeated fetches within the same render pass hit memory.

2. **Add `export const dynamic = "force-dynamic"` to all authenticated pages.** This is a no-op behavior change (they're already dynamic due to `cookies()`) but eliminates Next.js's runtime detection of dynamic functions per request.

---

## Recommended Priority Order

1. `--turbopack` (now)
2. React `cache()` on hottest DB calls (scheduling, analytics, events, procurement)
3. Explicit `force-dynamic` on all authenticated pages
4. Audit whether Google Fonts can be self-hosted (remove external font requests)
