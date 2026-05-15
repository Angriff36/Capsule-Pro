# IMPLEMENTATION_PLAN.md -- v104

> Updated 2026-05-14
> CI Truth Gate Repair + Regression Audit. CI configs upgraded, auth gating fixed, typecheck verified.
> **v104 KEY CHANGES OVER v103:**
> - CI: full repo typecheck, prisma generate added, continue-on-error removed from hard gates, concurrency groups added
> - Security: CodeQL v3→v4, Trivy pinned @0.28.0, concurrency group added
> - CodeQL: python matrix removed (unnecessary), CodeQL v3→v4 consolidated
> - `/api/public(.*)` added to API proxy public route matcher (P0.8 resolved)
> - event-parser `type-check` → `typecheck` (fixes turbo typecheck --dry integration)
> - All 3 apps (app/api/web) typecheck clean — `ignoreBuildErrors` removal now SAFE

---

## P0 — Critical Infrastructure

### P0.1 — Remove `ignoreBuildErrors` [SAFE TO REMOVE — v104]

**Status:** All 3 apps pass `tsc --noEmit` with zero errors. `skipLibCheck: true` masks node_modules type issues (Next.js 15.4, Clerk, Vite — upstream type incompatibilities). Removing `ignoreBuildErrors` will NOT break production builds.

**Locations to remove:**
- `apps/app/next.config.ts:195` — `ignoreBuildErrors: true`
- `apps/api/next.config.ts:102` — `ignoreBuildErrors: true`
- `apps/web/next.config.ts:17` — `ignoreBuildErrors: true`
- `apps/app/next.config.ts:189` — `eslint.ignoreDuringBuilds: true`
- `packages/typescript-config/base.json:16` — `skipLibCheck: true` (7 tsconfigs inherit this)

**Recommended order:** Remove `ignoreBuildErrors` from `apps/web` first (lowest risk), then `apps/api`, then `apps/app`. Keep `skipLibCheck: true` until node_modules type issues are resolved upstream. Remove `eslint.ignoreDuringBuilds` last (requires lint cleanup).

### P0.2 — Prisma Generate + Validate in CI [RESOLVED — v104]

**Done:**
- `pnpm --filter @repo/database exec prisma generate` added before typecheck in ci.yml
- `pnpm --filter @repo/database exec prisma validate` added after typecheck
- `scripts/db-drift-check.mjs` remains NO-OP (not touched — out of scope)

### P0.4 — Typecheck + Lint CI Label Fix [RESOLVED — v104]

**Done:**
- Step renamed: "Run linting" → "Run typecheck (full repo)"
- Command changed: `pnpm turbo typecheck --filter=./apps/app...` → `pnpm turbo typecheck` (no filter, full 36 packages)
- `pnpm biome check` step added for linting
- `continue-on-error: true` removed from check-hardcoded-routes (line 50), check-repo-ui-imports (line 54)
- `continue-on-error: true` preserved on npm audit (security.yml) — audit failures are advisory, not gates
- Concurrency groups added to ci.yml, security.yml
- CodeQL v3→v4 in both security.yml and codeql.yml
- Python matrix removed from codeql.yml
- Trivy pinned to `aquasecurity/trivy-action@0.28.0` (was `@master`)
- Node version: `"22.x"` → `"22.18.0"` (matches .nvmrc)

### P0.8 — /api/public/ Auth Gating [RESOLVED — v104]

**Done:** Added `"/api/public(.*)"` to `isPublicRoute` matcher in `apps/api/proxy.ts`.

**Public routes now accessible without auth:**
- `/api/public/proposals/[token]/respond` — contract proposal response
- `/api/public/proposals/[token]` — proposal detail view
- `/api/public/contracts/[token]/sign` — contract signing
- `/api/public/contracts/[token]` — contract detail view

**Rate limiting:** Public routes skip Clerk auth but the route handlers apply their own token validation. `sign` and `respond` mutations pass through the API key bearer path rate limit. GET routes are un-rate-limited (read-only). If rate-limiting GET is desired, add server-action or route-level throttling.

---

## Test Audit

### Deleted Tests (v103 → v104)

**55 test files removed** between early v103 and v0.12.2. Deletions happened in commits:
- `aea6d702` — "delete 43 dead routes and components (P3-1)"
- `c8166a0d` — "resolve all TypeScript errors across api + app packages"
- `42faa9c2` — "E2e workflow improvements"
- `232343c8` — "migrate frontend to composite routes and delete legacy actions"

**Deletion pattern:** Most were tests for routes/components that no longer exist. Deletions look justified — they tracked removed code.

### Current Test Skips (v104)

**E2E test.skip: 7 across 5 files:**
| File | Count |
|------|-------|
| `e2e/workflows/authentication.workflow.spec.ts` | 3 |
| `e2e/workflows/command-board.workflow.spec.ts` | 1 |
| `e2e/workflows/facilities-assets.workflow.spec.ts` | 1 |
| `e2e/workflows/facilities.workflow.spec.ts` | 1 |
| `e2e/workflows/logistics.workflow.spec.ts` | 1 |

**Note:** v103 reported "47 test.skip (was 41, up 6)" — current count of 7 suggests the 47 included non-E2E test skips or was counting differently.

**describe.skip in non-e2e tests: 7 across 2 files:**
- `apps/api/__tests__/events/event-timeline.test.ts` — 4 describe.skips
- `apps/api/__tests__/sales-reporting/generate.test.ts` — 1 describe.skip

**test.skip in unit tests: 0** — clean.

---

## Files Changed (v104)

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Full rewrite: concurrency, prisma generate, full typecheck, biome lint, removed continue-on-error, node 22.18.0 |
| `.github/workflows/security.yml` | CodeQL v3→v4, Trivy pinned @0.28.0, concurrency group, node 22.18.0 |
| `.github/workflows/codeql.yml` | CodeQL v3→v4, python matrix removed, cleanup |
| `packages/event-parser/package.json` | `type-check` → `typecheck` |
| `apps/api/proxy.ts` | Added `/api/public(.*)` to public routes |

---

## Verified Commands

```sh
# All pass with zero errors
pnpm --filter app typecheck     # ✓ 0 errors
pnpm --filter api typecheck     # ✓ 0 errors
pnpm --filter web typecheck     # ✓ 0 errors

# Turbo typecheck --dry shows 36 packages in scope
pnpm turbo typecheck --dry      # ✓ full repo scope
```

---

## Remaining Blockers

| Blocker | Description |
|---------|-------------|
| `skipLibCheck: true` | Next.js 15.4, Clerk, Vite type declarations have upstream incompatibilities with TypeScript 5.9. Removing skipLibCheck would surface ~40 node_modules errors. Keep until upstream fixes ship. |
| `eslint.ignoreDuringBuilds` | Not yet removed — requires lint pass across all packages first |
| `db-drift-check.mjs` | Still NO-OP. Real drift validation requires Neon connection in CI (SECRETS_BLOCKED). |
| Full repo `pnpm turbo typecheck` | Not yet verified in production CI — next push to main will be first run |
