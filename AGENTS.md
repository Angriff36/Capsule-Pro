# AGENTS.md — Operational Guide

## Build & Run

- Monorepo with pnpm (ONLY — no npm, no yarn)
- Primary folders: `apps/`, `packages/`, `specs/`

## Session Start
- Read `tasks/ledger.md` before starting work (know the scoring system, know the leaderboard)

## Validation
Run these after implementing to get immediate feedback:
- Tests (targeted): `pnpm --filter @capsule/app test [specific-test]`
- Typecheck: `pnpm tsc --noEmit`
- Lint: `pnpm biome check`
- Build: `pnpm turbo build --filter=@capsule/app`

## Manifest Commands

- Routes from IR: `pnpm manifest:routes:ir -- --format summary`
- Lint routes: `pnpm manifest:lint-routes`
- After .manifest edits: `pnpm manifest:build`
- Manifest CLI must run from the installed/published `@angriff36/manifest` package (`pnpm exec manifest ...`), not from `packages/manifest-runtime/...` source paths

## Operational Notes

- **GitHub Packages (`@angriff36`):** local dev — run once: `pnpm config set //npm.pkg.github.com/:_authToken <PAT> --location=user` (PAT with `read:packages`; same value as CI secret `PKG_AUTH_TOKEN`). Then use normal `pnpm install`. CI/Vercel inject auth via `scripts/ensure-github-packages-npmrc.sh`.
- IR is authority — filesystem is not source of truth for routes
- `@angriff36/manifest` must be consumed as the published package version (currently pinned), not `workspace:*` in `apps/*` or `packages/*`
- All mutations compile to Manifest domain commands
- New/changed API write handlers (`POST`/`PUT`/`PATCH`/`DELETE`) under `apps/api/app/api` must exist in canonical route surface (`packages/manifest-ir/dist/routes.manifest.json`) unless explicitly infrastructure-allowlisted (`webhooks`/`auth`/`cron`/`health`)
- Generated code is projection — never edit generated files
- Exactly one commit per iteration, conventional commit format

### Codebase Patterns

- Command Board UI: `apps/app/app/(authenticated)/command-board/`
- Command Board API: `apps/api/app/api/command-board/`
- AI API: `apps/api/app/api/ai/`
- Shared packages: `packages/ai/`, `packages/database/`
- Specs: `specs/command-board/`

## Dev Workflow

### Web-Only (day-to-day)
```sh
pnpm dev:web    # app (2221) + api (2223) — no mobile
pnpm dev:app    # app only
pnpm dev:api    # api only
```

### Full Stack (when mobile is in scope)
```sh
pnpm dev:apps   # app + api + mobile
```

Avoid `pnpm dev` (starts everything) unless doing integration testing across all services.

## Package Boundaries

Shared packages (`packages/`) must be framework-agnostic:
- **No `next/*` imports** in shared packages — use DI or move to `apps/` or adapter packages
- **No `react-native` imports** in web apps (`apps/app`, `apps/api`)
- Allowed exceptions: `packages/next-config`, `packages/seo`, `packages/cms` (framework-specific by design)

### Known Violations (to remediate)
- `packages/design-system/lib/fonts.ts` — imports `next/font/google`
- `packages/design-system/components/ui/chart.tsx` — imports `next/dynamic`
- `packages/design-system/components/blocks/manifest-test-playground.tsx` — imports `next/link`
- `packages/design-system/components/blocks/getting-started-checklist.tsx` — imports `next/link`
- `packages/feature-flags/access.ts` — imports `next/server`
- `packages/internationalization/proxy.ts` — imports `next/server`

React Native boundary: clean (no violations in web apps).

## Important Efficiency Standards.
- Never re-read files you just wrote or edited. You know the contents.
- Never re-run commands to "verify" unless the outcome was uncertain.
- Don't echo back large blocks of code or file contents unless asked.
- Batch related edits into single operations. Don't make 5 edits when 1 handles it.
- Skip confirmations like "I'll continue..."  Lust do it.
- If a task needs 1 tool call, don't use 3. Plan before acting.
- Do not summarize what you just did unless the result is ambiguous or you need additional input.
