# Pass 4 Consolidated Findings — Config Alignment Audit (2026-05-16)

Generated from 13 parallel Sonnet audit agents. Only NEW findings not in pass 3 plan listed here.
Existing plan: IMPLEMENTATION_PLAN.md (pass 3, ~310 items).

---

## CORRECTIONS to Pass 3 Counts

1. RLS count WRONG: Plan says "126 of 223 tenant models lack RLS". Actual: **119 of 202** tenant models lack RLS (41.1% coverage). tenant_logistics has 100% coverage (not 12 gaps). tenant_inventory has 15 gaps (not 9). tenant_crm has 3 gaps (not 8).
2. apps/app transpilePackages missing 5 packages (not 4): adds @repo/realtime.
3. productionBrowserSourceMaps item targets apps/app but apps/app is already conditional — the real issue is apps/web (unconditional).
4. AGENTS.md RLS section STALE: tenant_accounting now has 100% coverage, inventory vendor_catalogs/pricing_tiers/bulk_order_rules now have RLS.

---

## NEW CRITICAL Findings

### CI/CD
- **[CI-NEW-1]** 5 of 6 cron routes check `Authorization` header but Vercel Crons send `x-vercel-cron-secret`. Only `inventory-audit` handles both. Routes: webhook-retry, idempotency-cleanup, contract-expiration-alerts, email-reminders, integration-auto-sync. Result: 5 routes return 401 on every invocation.
- **[CI-NEW-2]** `deploy.yml:36` sets `GITHUB_TOKEN: ${{ secrets.PKG_AUTH_TOKEN }}` — wrong token for `gh pr list`. PKG_AUTH_TOKEN has `read:packages` scope only.

### Prisma/Database
- **[PRISMA-NEW-1]** `relationMode = "prisma"` on main — the `foreignKeys` change was committed on `fix/prisma-validate` branch but lost during rebase to main. `DATABASE_PRE_MIGRATION_CHECKLIST.md` falsely claims it was applied.
- **[PRISMA-NEW-2]** `.npmrc` `link-workspace-packages=false` contradicts `workspace:*` usage throughout monorepo. Should be `true`.

### Build System
- **[BUILD-NEW-1]** `@repo/sentry-integration` bundles ALL runtime deps (ai, @ai-sdk/openai, @slack/web-api, @t3-oss/env-nextjs, @repo/database, @repo/observability, zod) — zero externalization. Creates duplicate class instances, breaks singletons, freezes workspace deps into dist.
- **[BUILD-NEW-2]** `@repo/ai` tsup external list only has [react, react-dom, zod] but imports ai, @ai-sdk/openai, uuid, @t3-oss/env-nextjs, streamdown, tailwind-merge — all get bundled.

### ENV/Security
- **[ENV-NEW-1]** Calendar sync routes use 6 unvalidated OAuth secrets via bare process.env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MICROROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, OAUTH_REDIRECT_URI, CALENDAR_SYNC_SECRET.
- **[ENV-NEW-2]** `packages/ai/src/keys.ts` missing `skipValidation` — every other package keys.ts has it.

### Sentry
- **[SENTRY-NEW-1]** `apps/app/sentry.edge.config.ts:28` has `sendDefaultPii: true` — sends user IPs, cookies, headers to Sentry (PII leak / GDPR risk).
- **[SENTRY-NEW-2]** `apps/app/sentry.edge.config.ts:29-31` restrictive tracePropagationTargets blocks cross-service tracing to API.

---

## NEW HIGH Findings

### CI/CD
- **[CI-NEW-3]** Missing `timeout-minutes` on 6 of 8 workflow jobs (ci.yml test, deploy.yml all 3 jobs, security.yml, manifest-ci.yml all 6 jobs, performance.yml both jobs, vercel-compat.yml). Only logging-sync.yml (10m) and ci.yml e2e (45m) have it.
- **[CI-NEW-4]** `security.yml` CodeQL uses `@v3` (deprecated) while `codeql.yml` uses `@v4`. Duplicate CodeQL configs (security.yml covers javascript only, codeql.yml covers javascript-typescript + actions + python).
- **[CI-NEW-5]** `codeql.yml` includes `python` in matrix but repo has no Python code — wastes Actions minutes.
- **[CI-NEW-6]** Missing pnpm dependency caching in deploy.yml, security.yml, performance.yml, logging-sync.yml.

### Next.js
- **[NEXT-NEW-1]** `apps/api/next.config.ts` missing `eslint.ignoreDuringBuilds: true` — inconsistent with Biome-only strategy (apps/app has it).
- **[NEXT-NEW-2]** `apps/docs` and `apps/storybook` have no security headers (poweredByHeader, X-Content-Type-Options, etc.).
- **[NEXT-NEW-3]** `apps/web` has no `serverExternalPackages`.

### Sentry
- **[SENTRY-NEW-3]** `apps/app/sentry.edge.config.ts` is fully inline — bypasses shared `@repo/observability/edge` package (unlike apps/api and apps/web which delegate).
- **[SENTRY-NEW-4]** `packages/mcp-server/src/index.ts:34-36` uses bare `process.env` for Sentry DSN, environment, and `tracesSampleRate: 1.0` (100% sampling in CLI tool).
- **[SENTRY-NEW-5]** Missing `normalizeDepth`, `serverName`, `beforeSendTransaction`, `attachStacktrace` in ALL Sentry configs.

### Vitest
- **[VITEST-NEW-1]** Zero of 16 configs have `restoreMocks: true` — mocks leak between test files.
- **[VITEST-NEW-2]** `globals: true` only in 4 of 14 configs — developers copying test patterns get `ReferenceError: vi is not defined`.
- **[VITEST-NEW-3]** 4 packages missing from root workspace `projects` array: manifest-adapters, manifest-runtime, notifications, sales-reporting. Tests invisible to top-level runner.
- **[VITEST-NEW-4]** `apps/api/vitest.config.mts` (jsdom + db-mock plugin) is dead code — .ts takes precedence.

### Turbo/Vercel
- **[TURBO-NEW-1]** `globalEnv` and `globalPassThroughEnv` have 4 overlapping vars (DATABASE_URL, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN) — passThrough takes precedence, making cache invalidation non-functional for these vars. Combined with envMode "loose", env-var caching is completely broken.
- **[TURBO-NEW-2]** ~30 env vars missing from turbo.json globalEnv (ABLY_API_KEY, CRON_SECRET, OPENAI_API_KEY, STRIPE_SECRET_KEY, etc.).
- **[TURBO-NEW-3]** Missing `pnpm-lock.yaml` in `globalDependencies`.
- **[TURBO-NEW-4]** Missing `passThroughEnv` for Vercel system vars (VERCEL_URL, VERCEL_REGION, etc.).
- **[TURBO-NEW-5]** AGENTS.md cron registry missing 2 crons: `integration-auto-sync` (*/15) and `/outbox/publish` (*). Registry lists 6 but actual is 8.
- **[TURBO-NEW-6]** `/outbox/publish` route at `/outbox/publish` (no /api/ prefix) — inconsistent with all other crons under `/api/cron/`.

### Build System
- **[BUILD-NEW-3]** `@repo/mcp-server` has no `main`/`exports`/`types` fields despite building to dist/.
- **[BUILD-NEW-4]** `@repo/payroll-engine` no build script, exports source directly (`main: ./src/index.ts`).
- **[BUILD-NEW-5]** `@repo/pdf` no build script, exports source directly.
- **[BUILD-NEW-6]** `@repo/kitchen-state-transitions` no build script, exports source directly.
- **[BUILD-NEW-7]** `@repo/sentry-integration` build is raw CLI args with 9 entry points — no config file, no clean, no sourcemap.
- **[BUILD-NEW-8]** `@repo/next-config` has both `@t3-oss/env-core` AND `@t3-oss/env-nextjs` — redundant.

### TypeScript
- **[TS-NEW-1]** `packages/sales-reporting/tsconfig.json` uses `module: "commonjs"` with `moduleResolution: "bundler"` — contradictory config.
- **[TS-NEW-2]** `packages/sentry-integration/tsconfig.json` uses `moduleResolution: "bundler"` but is a Node.js library with `type: "module"` — should use NodeNext.
- **[TS-NEW-3]** 5 server-only packages with NO next/react deps extend `nextjs.json` (database, storage, webhooks, payments, kitchen-state-transitions) — get DOM types and Next.js plugin unnecessarily.

### Package.json
- **[PKG-NEW-1]** `@repo/sentry-integration` severely outdated deps (@t3-oss/env-nextjs ^0.10 vs ^0.13, @types/node ^20 vs 25, typescript ^5.3 vs ^5.9).
- **[PKG-NEW-2]** 13 packages have react in dependencies instead of peerDependencies.
- **[PKG-NEW-3]** Missing `clean` script in sales-reporting, manifest-runtime, sentry-integration, event-parser, docs.
- **[PKG-NEW-4]** `packages/manifest-runtime/packages/cli` uses `@types/node: "latest"` — nondeterministic.
- **[PKG-NEW-5]** Missing `@repo/typescript-config` devDep in brand, sales-reporting, types, manifest-runtime.
- **[PKG-NEW-6]** `packages/kitchen-state-transitions` and `packages/payroll-engine` have `main` pointing to `.ts` source.
- **[PKG-NEW-7]** 23 of 33 packages missing `exports` map (confirmed count).

### ENV
- **[ENV-NEW-3]** 5 apps have NO env.ts validation: docs, email, storybook, forecasting-service, mobile.
- **[ENV-NEW-4]** `apps/api/env.ts` duplicates sentry-integration keys instead of importing them.
- **[ENV-NEW-5]** `packages/ai/keys.ts` and `packages/ai/src/keys.ts` are duplicates with different schemas.
- **[ENV-NEW-6]** `packages/ai/keys` never imported by any app — package.json doesn't export `"./keys"`.
- **[ENV-NEW-7]** `packages/mcp-server` has no keys.ts at all — reads 8+ env vars via bare process.env.
- **[ENV-NEW-8]** `packages/storage/upload.ts` bypasses own keys.ts for BLOB_READ_WRITE_TOKEN.
- **[ENV-NEW-9]** `apps/app/app/api/command-board/chat/route.ts` reads COMMAND_BOARD_AI_MODEL and OPENAI_API_KEY via bare process.env.

---

## NEW MEDIUM Findings

### CI/CD
- Inconsistent Node version spec: ci.yml uses `22.x` hardcoded, others use `.nvmrc`.
- Inconsistent pnpm caching: some use setup-node cache, some explicit actions/cache, some none.
- `manifest-ci.yml` has ~20 env vars copy-pasted across 4 jobs.
- `performance.yml:59` Lighthouse step with continue-on-error.

### Vitest
- 7 console.log statements in vitest mock plugins (apps/app and apps/api .mts).
- `apps/api/vitest.config.integration.mts` has no-op `process.env.VITEST === "true"` guard.
- `packages/manifest-runtime/vitest.config.ts` uses deprecated `deps.interopDefault` (v4 renamed to webanimator).
- `apps/api/vitest.config.ts.bak2` is committed — violates AGENTS.md no-bak rule.
- Inconsistent test file patterns across 16 configs (5 different conventions).
- `packages/notifications` explicitly sets `globals: false` — unclear why.
- Only 1 of 16 configs has coverage configuration.

### Next.js
- `apps/docs` minimal config, no security headers.
- `apps/web` missing `serverExternalPackages`.
- Shared headers include unnecessary `X-DNS-Prefetch-Control: on`.
- `optimizePackageImports` incomplete in apps/api.

### Sentry
- `apps/app/sentry.edge.config.ts` missing: enableLogs, consoleLoggingIntegration, beforeSend, DSN guard.
- `vercelAIIntegration` only in edge config (should be in shared).
- Inconsistent sample rates: shared=5%, client=10% hardcoded, edge=5% env-var, MCP=100% hardcoded.
- Missing `replaysSessionSampleRate` not an issue (replay is client-only, correctly configured).

### Build System
- `@repo/sentry-integration` no clean step, no sourcemap.
- `@repo/ai` uses `@t3-oss/env-nextjs` (framework-specific) in shared package — AGENTS.md boundary violation.
- `@repo/sentry-integration` same violation.
- Root `tsup.config.ts` is stale/leftover.
- `packages/ai/tsup.config.bundled_exb4bysso7a.mjs` — stale build artifact with hardcoded Windows paths.
- `@repo/realtime` exports `require` pointing to ESM output.
- `@repo/supplier-connectors` build is `tsc --noEmit` (typecheck only, not a build).
- Inconsistent build tools across packages (tsup config, tsup CLI, tsc, echo skip).

### TypeScript
- `packages/rate-limit` uses `rootDir: "."` with broad include.
- `packages/ai/tsconfig.json` includes DOM types for server-side AI package.
- `packages/manifest-runtime/tsconfig.lib.json` includes DOM types for CLI library.
- `apps/app/tsconfig.json` excludes command-board directories from type checking.
- `apps/app/tsconfig.json` redundantly sets noEmit, declaration, declarationMap, emitDeclarationOnly.
- `packages/realtime` and `packages/pdf` use `"include": ["src"]` (directory ref without glob).
- `packages/supplier-connectors/tsconfig.json` no test exclude.
- `packages/design-system/tsconfig.json` redundantly sets Next.js plugin.
- No `incremental: true` anywhere (base.json sets `false`).

### Package.json
- `@repo/manifest-runtime` has `private: false` — only non-private package.
- Missing `engines` field in 4 apps and all 33 packages.
- Missing `files` field in 32 of 33 packages.
- No `sideEffects` field in any package.
- Missing `license` field in 39 of 40 package.json files.

### ENV
- `SENTRY_DSN` used as fallback in instrumentation files but never validated.
- `SENTRY_TRACES_SAMPLE_RATE` read via bare process.env in tracing.ts.
- Plasmic secrets (PLASMIC_PROJECT_ID, PLASMIC_API_TOKEN) unvalidated.
- REVALIDATION_SECRET unvalidated in apps/web.
- CAPSULE_SENTRY_CANARY_SECRET unvalidated.
- RESEND_WEBHOOK_SECRET unvalidated.
- APP_URL used with hardcoded fallback in 4 route files.
- NODE_ENV never validated in any schema.
- ABLY_API_KEY unvalidated in apps/app (validated only in apps/api).
- PRISMA_LOG_QUERIES unvalidated in apps/app.
- packages/database/keys.ts has URL rewrite side effect in validation layer.
- packages/email/keys.ts conditionally changes schema shape based on SKIP_ENV_VALIDATION.

### Prisma
- Stale migration folder `20260304210000` creates tables in wrong schema (tenant. instead of tenant_admin.).
- `prisma.config.ts` uses mixed env access patterns (process.env vs Prisma env()).
- `@types/node` version mismatches: sentry-integration ^20, sales-reporting ^25.2.1, rest 25.2.0.
- .gitignore lists DATABASE_PRE_MIGRATION_CHECKLIST.md 4 times but file is tracked (no-op).
- .gitignore massive duplication (472 lines, .vercel listed 5x, .env*.local 4x).
- 30 models lack @@map annotations (snake_case model names used directly).
- 87 migration folders, ~28 are repair_drift (32%).

### Security/RLS
- `tenant` schema (not tenant_*) has 7 of 8 models WITHOUT RLS (Location, documents, settings, OutboxEvent, ManifestEntity, ManifestIdempotency, KnowledgeBaseEntry). Only venues has RLS.
- Phantom RLS entries: tenant_admin.audit_log (model is in platform schema), tenant_inventory.vendor_catalog (singular, actual is plural).
- Most dangerous RLS gaps: EmployeeTaxInfo, EmployeePin/AccessLog, TaxConfiguration, RolePolicy, EventContract/Signature, EventGuest (PII), admin_users/roles/permissions, OutboundWebhook (secrets).

### Cross-Config
- Phantom `@repo/manifest` in api transpilePackages — package doesn't exist.
- `eslint.config.mjs` has active rules but ESLint not installed — @repo/ui import ban has NO CI enforcement.
- `@repo/observability` has no exports field.
- `@repo/ai` extends library.json (NodeNext) but builds with tsup (ESM) — resolution mismatch.
- 33 empty IMPLEMENTATION_PLAN stubs in specs/ directory.
- 33MB log file in specs/ that should not be in repo.

---

## NEW LOW Findings

- `packages/sales-reporting` engines says `>=18.0.0` but monorepo requires Node 22.
- `apps/docs` unscoped name (should be `@repo/docs` for consistency).
- `apps/mobile/studio` extends nextjs.json — likely not a Next.js app.
- No matrix testing across Node versions.
- No release automation or rollback mechanism.
- `packages/manifest-adapters` missing clean script.
- `packages/manifest-runtime/packages/cli` uses `vitest: "latest"` — nondeterministic.
- `apps/api/vitest.config.mts` intercepts @repo/storage but active .ts config does not.
- Root `tsconfig.build.json` extends scripts then reverses 4 settings.
- `tsup.config.bundled_*.mjs` pattern not in .gitignore.
- Stale worktree `.worktrees/ui-regression-bugfixes/` with outdated configs.
- `apps/storybook/vercel.json` lacks ignoreCommand.
- `apps/web` and `apps/docs` vercel.json lack security headers.
- `dev:infisical` turbo task defined but may not be used by any package.

---

## Summary Statistics

| Domain | Agent Findings | Already Tracked | NEW |
|--------|---------------|-----------------|-----|
| CI/CD | 27 | 8 | 19 |
| Package.json | 27 | 2 | 25 |
| Sentry | 18 | 2 | 16 |
| Next.js | 15 | 8 | 7 |
| Vitest | 18 | 0 | 18 |
| Turbo/Vercel | 22 | 3 | 19 |
| Playwright/Biome/Misc | 17 | ~5 | ~12 |
| TypeScript | 33 | 13 | 20 |
| Build System | 26 | 1 | 25 |
| ENV | 30 | 0 | 30 |
| RLS/Security | verified | corrections | corrected counts |
| Prisma/Database | 14 | 2 | 12 |
| Specs/Cross-config | 25 | 1 | 24 |
| **TOTAL** | **~300** | **~45** | **~250+** |

**Updated total estimate: ~560 unique actionable items** (up from ~310 in pass 3).
