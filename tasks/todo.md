# Partition the generated Capsule client into domain-scoped chunks

Feature: feature-1781435713420-506r2pr8i

## Problem
`manifest-client.generated.ts` is a 14k-line monolith holding list/get/command
callers for all ~188 entities / ~1054 commands across every domain. Every page
that imports a single caller pulls the whole module graph (the hooks file makes
it worse with `import * as client`). A CRM page ships kitchen/payroll code.

## Approach (generation-layer; zero churn at 100+ import sites)
Derive domain chunks from `ENTITY_DOMAIN_MAP` (first route segment), consolidated
into 7 client chunks (6 named domains + shared core). Each chunk is its own file
so the bundler can emit separate JS chunks and tree-shake aggressively.

### Route-segment → client-chunk map (`CLIENT_DOMAIN_MAP`)
| route segment        | client chunk | entities |
|----------------------|--------------|----------|
| kitchen              | kitchen      | 40       |
| events + command-board| events      | 31       |
| inventory + procurement + shipments + logistics + facilities | logistics | 44 |
| staff + timecards + training | staffing   | 24       |
| accounting + payroll | finance      | 17       |
| crm                  | crm          | 11       |
| collaboration + communications + administrative + settings + rolepolicy | core | 21 |

(command-board → events: AGENTS.md BOARD disambiguation — CommandBoard* = event tree.)

## Output layout
```
apps/app/app/lib/
  manifest-types.generated.ts          # UNCHANGED (type-only, zero runtime payload)
  manifest-client.generated.ts         # SHIM: export * from "./manifest-client/index.generated"
  manifest-client/
    core.generated.ts                  # PaginatedResponse<T> + dynamic import() domain loader
    events.generated.ts                # list/get/command callers for events domain
    kitchen.generated.ts
    finance.generated.ts
    staffing.generated.ts
    crm.generated.ts
    logistics.generated.ts
    index.generated.ts                 # static barrel (tree-shakeable re-exports) + loadClientDomain()
  manifest-hooks.generated.ts          # SHIM: export * from "./manifest-hooks/index.generated"
  manifest-hooks/
    core.generated.ts                  # full queryKeys factory (constant arrays, negligible)
    <domain>.generated.ts              # per-domain useQuery/useMutation, star-import scoped to 1 domain chunk
    index.generated.ts
```

## Why backward compatible
- Shim files keep `@/app/lib/manifest-client.generated` / `…-hooks.generated`
  imports working unchanged (100+ sites).
- Modern SWC/Turbopack tree-shakes `export *` re-exports, so a CRM page still
  only bundles the crm chunk.
- `loadClientDomain(name)` (`() => import('./<domain>.generated')`) lets
  route-based layouts opt into explicit async chunks.

## Checklist
- [x] Explore generators + conventions + import surface
- [ ] Add CLIENT_DOMAIN_MAP to entity-domain-map.mjs
- [ ] Rewrite generate-capsule-client.mjs (chunks + core + barrel + shim)
- [ ] Rewrite generate-react-query-hooks.mjs (per-domain chunks + barrel + shim)
- [ ] Update capsule-conventions.json client paths
- [ ] Regenerate + typecheck
- [ ] Playwright verify

## Review
**Status: COMPLETE & verified.**

Distribution: 188 entities / 1054 commands across 6 domain chunks + core:
core=21, events=31 (incl. command-board event tree), kitchen=40, finance=17
(accounting+payroll), staffing=24 (staff+timecards+training), crm=11,
logistics=44 (inventory+procurement+shipments+logistics+facilities).

Verification performed:
- TypeScript (`tsc --noEmit`): 0 errors in any generated/consumer file. The 25
  pre-existing errors (Set.difference/ArrayIterator, es2025 lib) are in 2
  unrelated component files and unchanged by this feature.
- 100+ existing `@/app/lib/manifest-client.generated` import sites resolve
  unchanged via the shim (proven by the typecheck).
- Client generator is deterministic (idempotent regenerate → byte-identical).
- `check-react-query-drift.mjs`: extended to cover the chunk dir + shim, passes
  (all chunks in sync, working tree left clean).
- Playwright (10 tests, all passed): generated-artifact integrity — chunk
  layout, barrel re-exports, typed `loadClientDomain` dynamic loader, per-domain
  star-imports scoped to one client chunk, queryKeys defined-once-in-core /
  imported-by-domains (no circular import), command-board routed to events
  (AGENTS.md disambiguation), and dev-server smoke load with no module errors.

Notes:
- The monolithic `manifest-client.generated.ts` (14008 lines) is now a 7-line
  shim; the monolithic hooks file is now a 4-line shim. Real callers/hooks live
  in `manifest-client/` and `manifest-hooks/` chunk dirs.
- `manifest-types.generated.ts` kept monolithic — it is type-only (zero runtime
  payload), so it does not affect JS bundle size.
- Route-based layouts can now either import from a specific domain chunk
  (`@/app/lib/manifest-client/crm.generated`) for tree-shaken bundling, or use
  `loadClientDomain('crm')` for an explicit async JS chunk.
- The drift gate previously would have mutated chunk files + only compared the
  shim; now it snapshots/restores the whole chunk dir and compares every file.
- Playwright config's `e2e/` helper files (`detect-browser-endpoint.ts`,
  `env.ts`) are gitignored local-only files absent from this worktree; temporary
  stubs were created to run the verification and then removed.
