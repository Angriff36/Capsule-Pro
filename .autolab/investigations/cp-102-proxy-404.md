# cp-102 — CAPSULE-PRO-3C proxy 404 investigation

## Summary
The 404 is not an Arcjet/Clerk failure. It is a normal Next.js App Router `notFound()` / route-miss control-flow error (`NEXT_HTTP_ERROR_FALLBACK;404`) that happens **after** the request passes through `apps/web/proxy.ts`.

Two things make it noisy:
1. `apps/web/proxy.ts` matches almost every non-`_next` request and runs i18n rewriting on it.
2. There is no custom `not-found.tsx`, so Next falls back to its thrown 404 mechanism, which Sentry sees unless filtered.

## Evidence

### 1) Proxy matcher is broad and forwards many non-page requests
`apps/web/proxy.ts:18-22`:
- matcher = `/((?!_next/static|_next/image|ingest|favicon.ico).*)`
- That still includes requests like `/robots.txt`, `/sitemap.xml`, `/manifest.json`, `/sw.js`, `/apple-touch-icon.png`, bot probes, and any unknown marketing path.

### 2) i18n middleware rewrites any path without an exact locale prefix
`packages/internationalization/proxy.ts:9-25` wraps `next-international`.

`node_modules/.../next-international/dist/app/middleware/index.js:48-53`:
- if the pathname does **not** start with an exact locale prefix, it rewrites to `/${locale}${pathname}`.
- Example: `/robots.txt` becomes `/en/robots.txt`.

That means non-page requests are pushed into the App Router locale tree instead of short-circuiting as plain 404s.

### 3) The app has very few locale routes, so rewritten paths 404 downstream
Current route tree under `apps/web/app` is small:
- `[locale]/(home)/page.tsx`
- `[locale]/contact/page.tsx`
- `[locale]/pricing/page.tsx`
- `[locale]/blog/page.tsx`
- `[locale]/blog/[slug]/page.tsx`
- `[locale]/legal/[slug]/page.tsx`

Anything else under `/${locale}/...` becomes a route miss.

Also, some routes intentionally call `notFound()`:
- `apps/web/app/[locale]/blog/[slug]/page.tsx:23-28` always 404s
- `apps/web/app/[locale]/legal/[slug]/page.tsx:55-59` 404s when the CMS slug is missing

So the proxied request classes most likely to produce CAPSULE-PRO-3C are:
- rewritten static-file requests (`/robots.txt`, `/manifest.json`, `/sw.js`, etc.)
- bot/probe paths and arbitrary unknown URLs
- valid app routes that intentionally call `notFound()` (`/blog/[slug]`, missing `/legal/[slug]`)

### 4) Why Sentry sees `NEXT_HTTP_ERROR_FALLBACK;404`
Per Next.js docs, `notFound()` throws `NEXT_HTTP_ERROR_FALLBACK;404` as control flow.

There is **no** `app/not-found.tsx` or `app/[locale]/not-found.tsx` in this app, so there is no custom not-found boundary/UI to absorb these gracefully.

Sentry already has a filter for this exact class in `packages/observability/server.ts:60-71`:
- drops any exception whose type starts with `NEXT_HTTP_ERROR_FALLBACK;`

That matches the earlier task note that this issue was treated as noise rather than a crash.

### 5) There is already older guard logic that would have prevented this class of noise
`apps/web/middleware.ts:7-22, 59-90` contains earlier logic to:
- detect common static-file paths
- detect obvious bot probes
- return a plain 404 or redirect before routing deeper

That guard logic is **not** present in current `apps/web/proxy.ts`.

## Root cause
`apps/web/proxy.ts` is too permissive for non-page traffic. It runs locale rewriting on requests that should have been excluded or short-circuited first. Those requests then miss App Router routes (or hit intentional `notFound()` paths), and Next surfaces them as `NEXT_HTTP_ERROR_FALLBACK;404`.

## Proposed fix
Recommended:
1. Restore the old early-exit guard behavior in `apps/web/proxy.ts` before `internationalizationMiddleware` runs:
   - short-circuit common root static files
   - short-circuit obvious bot/probe paths and extension-based asset requests
2. Tighten the proxy matcher to exclude more non-page traffic (at minimum `.*\..*`, and likely `api|trpc` too if appropriate for this app)
3. Add `app/[locale]/not-found.tsx` (or root `app/not-found.tsx`) so intentional 404s render a controlled UI instead of only relying on the thrown fallback
4. Keep the Sentry `beforeSend` filter as a backstop, since App Router 404s are expected even after matcher cleanup

## Bottom line
Most likely culprit: non-page requests rewritten by the i18n proxy into `/${locale}/...`, then 404ing in App Router. The error shows up in `proxy.ts` because every request passes through that boundary first, but the actual failure is expected downstream 404 control flow, not a broken middleware exception.
