# Audit Archive — Pass 4: Package Health Audit

Original audit of the 35 shared packages under `packages/`. Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## Package Health Audit (4th Pass)

Scope: the 35 shared packages under `packages/`. Each package was audited "guilty until proven innocent" by parallel subagents. Evidence is cited file:line where available.

### A. Synthesis: Packages by Verdict Tier

| Package | LOC | Tests | Consumers | Verdict |
|---|---:|---:|---:|---|
| realtime | 7678 | 247 it / 9 files | multi | PRODUCTION |
| sales-reporting | 2428 | 42 it / 2 files | apps/api | PRODUCTION |
| manifest-ir | 18 src (+361KB JSON) | 0 | transport-wide | PRODUCTION |
| manifest-adapters | 20.5k | 178 pass + 1 broken suite | 838+ imports | MATURE-BUT-GAPS |
| mcp-server | 4071 + 1551 | 115 it / 10 files | `.mcp.json` | MATURE-BUT-GAPS |
| database | 3398 + 5493 prisma | 232 it / 2 files | apps/* | MATURE-BUT-GAPS |
| notifications | 3869 | ~113 assertions / 3 files | apps/api | MATURE-BUT-GAPS |
| sentry-integration | 2394 | 35 it / 3 files | **0** | MATURE-BUT-GAPS |
| observability | 689 | 0 | 6 | MATURE-BUT-GAPS |
| payroll-engine | 4722 | 46 it / 2 files | 6 API routes | PARTIAL |
| ai | 2207 | 0 | **0** | PARTIAL |
| security | 83 | 0 | 3 | PARTIAL |
| manifest-runtime | 22.7k (pre-built) | 0 | downstream of adapters | SCAFFOLD |
| kitchen-state-transitions | 282 | 0 | **0** | SCAFFOLD |
| auth | 57 | 0 | apps/* | SCAFFOLD |
| rate-limit | 32 | 0 | 0 real | SCAFFOLD |
| event-parser | 4738 | 0 | 2 | SCAFFOLD |
| supplier-connectors | 975 | 0 | 1 (inventory) | SCAFFOLD |
| pdf | 2913 | 0 | 4+ API routes | SCAFFOLD |
| brand | 100 | 0 | **0** | DEAD |
| packages/apps/app | meta | 0 | **0** | DEAD |
| analytics | 106 | 0 | 5+ | WRAPPER |
| feature-flags | 77 | 0 | 4+ | WRAPPER |
| email | 309 | 0 | apps/* | WRAPPER |
| webhooks | 72 | 0 | apps/api | WRAPPER |
| payments | 43 | 0 | apps/api | WRAPPER |
| storage | 15 | 0 | dynamic | WRAPPER |
| cms | 253 | 0 | 6+ (web) | WRAPPER |
| seo | 96 | 0 | 6+ | WRAPPER |
| internationalization | 117 | 0 | 6+ | WRAPPER |
| collaboration | 681 | 0 | 5+ | WRAPPER |
| design-system | ~85 components | 2 files + 18 stories | 377 imports | FOUNDATIONAL |
| typescript-config | n/a | n/a | 10+ | FOUNDATIONAL |
| next-config | ~70 | 0 | 3 | FOUNDATIONAL |
| types | 177 | 0 | design-system + apps/app | FOUNDATIONAL |

### B. Per-Package Findings

**PRODUCTION**
- `realtime` — Ably transport via transactional outbox, vector clocks, payload size gates (32K warn / 64K reject), SKIP LOCKED concurrency. 247 it blocks, 0 skips, 0 `any`, 0 console. Earlier plan claim of 1838 LOC was src-only; full LOC is 7678.
- `sales-reporting` — PDFKit engine, 0 `any`, 0 console. `describe.skip` at `apps/api/__tests__/sales-reporting/generate.test.ts:33` is NOT this package and has a documented PDFKit-in-Node rationale.
- `manifest-ir` — thin loader; 361KB `routes.manifest.json` + `kitchen.ir.json` + `marketing.ir.json` drive transport contract.

**MATURE-BUT-GAPS**
- `manifest-adapters` — 20.5k LOC, 50 enabled / 18 disabled manifests. Broken suite: `rbac-permission-checker.test.ts:428` references `beforeEach` without importing it. 91 `any` in nutrition/recipe/scaling. 6 `console.error` (prisma-*.ts, `nutrition-label-engine.ts:664`).
- `mcp-server` — 115 it across 10 files (contradicts 3rd pass "165"). 11 MCP tools across 5 plugins, stdio-only, governance scanners are regex-based, admin plugins are placeholders. 12 `as any` (mostly test mocks).
- `database` — 195 Prisma models, 452 indices. Tenant isolation is app-level via `tenant.ts:51-95` (whitelist of 13 models); **no row-level security**. `schema.prisma.backup` and `.bak` still in tree.
- `notifications` — Resend/Twilio/Knock + outbound webhook DLQ (exp backoff 1s→30s, HMAC-SHA256, auto-disable@5 fails). Orphan files: `sms-temp.ts` (TODO stub) and `sms.ts.new`. 7 console.*.
- `sentry-integration` — webhook→queue (30m dedup/60m ratelimit)→GPT-4o→search-and-replace with exact-match validation→pnpm test→revert/PR. Blocked-path regex. **No human-review gate, no cost cap, zero consumers.**
- `observability` — 3-tier Sentry + Logtail + correlation helpers. No OpenTelemetry, no metrics API. 2 console.log.

**PARTIAL**
- `payroll-engine` — 4722 LOC, 46 it (24 calculator + 22 export). Tax engine math is real but `employee.taxInfo` is undefined at `PrismaPayrollDataSource:58` (TODO); tip pool data TODO at line 125; `SOCIAL_SECURITY_WAGE_BASE` declared but unused; 1 `console.log` line 289.
- `ai` — 2207 LOC across index/agent/workflow/metrics/errors/retry/tool. `metrics.ts` confirmed complete at 205 LOC. ToolRegistry exists, ToolLoop not wired (single-turn only). OpenAI-only. **Zero consumers.**
- `security` — Arcjet shield (LIVE) + Nosecone headers (CSP disabled by default). 3 declared consumers but no actual imports verified.

**SCAFFOLD**
- `manifest-runtime` — 22.7k LOC is a **pre-built distribution** wrapping `@angriff36/manifest@0.3.35`. Build script: `echo 'dist is pre-built, skipping'`. Real implementation lives upstream.
- `auth` — 57 LOC pure Clerk re-export across server.ts/client.ts/keys.ts/proxy.ts. No tenant propagation, no RBAC helpers, no tests.
- `rate-limit` — 32 LOC Upstash sliding-window. Overlaps with `security` Arcjet. Neither actually imported in any app.
- `kitchen-state-transitions` — 282 LOC custom FSM (open→in_progress→done/canceled). Zero imports anywhere; Kitchen API routes bypass it.
- `event-parser` — 4738 LOC rule-based TPP PDF parser (regex + string match). 9 console.* in `document-router` + `pdf-extractor`. Brittle, no tests.
- `supplier-connectors` — 975 LOC, both connectors are stubs: `us-foods.ts` TODOs at 65, 90, 111, 138, 171-174; `charlies-produce.ts` TODOs at 65, 93, 132, 169. 10 TODOs, 12 console, 1 `any`. No AS2/SFTP/X12.
- `pdf` — 2913 LOC @react-pdf/renderer with 6 templates (BattleBoard/Contract/EventDetail/PackingList/PrepList/Proposal). **Zero tests**, 3 `@ts-expect-error` (library gaps), 3 console.error in error handlers, no visual/snapshot tests. Classified SCAFFOLD on test-coverage risk despite real consumers.

**DEAD**
- `brand` — 100 LOC date/time + ampersand helpers. **Zero imports in repo.**
- `packages/apps/app` — package.json listing 73 workspace deps as a meta-manifest. Not imported anywhere.

**WRAPPER** — Thin vendor wrappers; treat as configuration, not product code.
- `analytics` (posthog + @vercel/analytics), `feature-flags` (`flags` pkg + toolbar), `email` (Resend + 3 React Email templates), `webhooks` (Svix send + portal), `payments` (Stripe singleton + AgentToolkit; webhook at `apps/api/app/webhooks/payments/route.ts` handles checkout + schedule cancel with signature validation), `storage` (Vercel Blob re-export, dynamic consumption), `cms` (Basehub GraphQL, 72KB generated types, 6+ web consumers), `seo` (metadata + JSON-LD), `internationalization` (next-international + formatjs, languine pipeline), `collaboration` (Liveblocks auth/config/room/hooks/cursors/presence — largest wrapper at 681 LOC).

**FOUNDATIONAL**
- `design-system` — 55 UI + 30 blocks, 18 `.stories.tsx` but **no Storybook config dir**, 2 real test files (ambient-animation, micro-tour). Tailwind v4 + Radix + shadcn. 377 import sites.
- `typescript-config`, `next-config`, `types` — configuration/type surface only; types scope is narrow (manifest-editor only).

### C. Cross-cutting Concerns

**Test coverage gaps (0 tests; 22 packages):**
manifest-runtime, manifest-ir, auth, observability, security, rate-limit, ai, payroll-engine*, kitchen-state-transitions, event-parser, pdf, email, webhooks, storage, analytics, feature-flags, cms, collaboration, seo, internationalization, brand, next-config, types, supplier-connectors, payments. *payroll-engine has tests but data paths are inert.

**Logging inconsistency (direct console vs `@repo/observability`):**
- manifest-adapters (6), event-parser (9), supplier-connectors (12), notifications (7), observability (2), pdf (3), payroll-engine (1). All should route via observability.

**TypeScript debt (`any` / `@ts-ignore` / `@ts-expect-error`):**
- manifest-adapters: 91 `any` (nutrition/recipe/scaling engines — top hotspot)
- mcp-server: 12 `as any` (mostly test mocks)
- database: 3 `any`, pdf: 3 `@ts-expect-error`, sentry-integration: 1 `any`, supplier-connectors: 1 `any`.

**Orphaned files + dead code:**
- `packages/database/prisma/schema.prisma.backup`, `schema.prisma.bak`
- `packages/notifications/.../sms-temp.ts` (TODO stub), `sms.ts.new`
- `packages/ai/agent.ts.bak` (old stub version)
- `packages/brand/*` (entire package unused)
- `packages/apps/app/*` (meta-manifest package)

**No-consumer packages (declared but not imported):**
`@repo/ai` (2207 LOC), `@repo/sentry-integration` (2394 LOC), `@capsule/brand` (100 LOC), `packages/apps/app`, `@repo/rate-limit`, `@repo/security` (declared 3 consumers, imports unverified), `@repo/kitchen-state-transitions`.

### D. Dependency Graph Notes

**Circular deps:** None detected in the audit sample. `types` → design-system → apps is one-way; manifest-adapters → manifest-runtime → manifest-ir is one-way.

**Duplication / overlap:**
- `rate-limit` (Upstash) vs `security` (Arcjet includes rate-limit). Pick one.
- `observability` (Sentry wrapper) vs `sentry-integration` (auto-fix bot). Different purposes but both own the word "Sentry"; naming collision is a maintenance trap.
- `webhooks` (Svix wrapper) vs `notifications/outbound-webhook-service.ts` (full DLQ). The DLQ cron is `apps/api/app/cron/webhook-retry/route.ts` on `*/5 * * * *`.
- `brand` vs `design-system` — date/ampersand helpers overlap with design-system utilities.

**Manifest trio coupling:** `manifest-adapters` (20.5k) consumes `manifest-runtime` (pre-built 22.7k wrapping `@angriff36/manifest@0.3.35`) which ships with `manifest-ir` JSON payloads. Effective code owned locally is small; the bulk is upstream npm.

### E. Reconciliation vs Prior Plan

1. **payroll-engine test count.** 3rd pass said 42 (24+18). Actual: **46 (24+22)**. Second pass was right; third pass overcorrected.
2. **mcp-server it blocks.** 3rd pass said 165. Actual: **115 across 10 files**. Both prior passes were wrong.
3. **ai/metrics.ts size.** Plan says "complete at 206 lines" — **accurate** (205 LOC, fully exported).
4. **@repo/ai is consumed.** Plan implies yes — **FALSE**. Zero imports in apps/.
5. **@repo/sentry-integration is wired.** Plan implies yes — **pipeline is real, consumers are zero**. Needs a webhook route to run.
6. **manifest-runtime is production-quality.** Plan implies locally-owned — actually a pre-built vendored distribution of `@angriff36/manifest@0.3.35`; local source is a shim.
7. **@repo/auth is a production Clerk integration.** Actually a **57-LOC re-export shim** with no custom logic and no tests.
8. **Schema drift.** Add: `packages/database/prisma/schema.prisma.backup` and `schema.prisma.bak` are still in-tree noise (git has history; delete).

### F. Investment Recommendations

| Tag | Packages |
|---|---|
| INVEST | manifest-adapters, realtime, sales-reporting, database, design-system |
| HARDEN | manifest-runtime (clarify vendored status), ai (ToolLoop + tests + consumers), sentry-integration (human-review + cost cap + wire webhook), payroll-engine (TaxInfo/PayrollPrefs models + YTD enforcement), pdf (snapshot tests), notifications (remove orphans, split concerns), mcp-server (AST scanners, admin plugins), auth (tenant/RBAC/tests), observability (OpenTelemetry + metrics API) |
| MAINTAIN | email, webhooks, payments, storage, types, typescript-config, next-config, analytics, feature-flags, seo, internationalization, manifest-ir, cms, collaboration |
| DEPRECATE | rate-limit, kitchen-state-transitions, event-parser, security (merge w/ rate-limit decision) |
| DELETE | brand, packages/apps/app, supplier-connectors stubs, schema.prisma.backup/.bak, sms-temp.ts, sms.ts.new, agent.ts.bak |

### G. Immediate Tier-1 Follow-ups

- Fix `packages/manifest-adapters/.../rbac-permission-checker.test.ts:428` — add missing `beforeEach` import; currently breaks the manifest-adapters test suite (1 failed suite among 178 passing).
- Delete `packages/database/prisma/schema.prisma.backup` and `schema.prisma.bak` (git history already covers them).
- Decide rate-limit vs security: fold Upstash into Arcjet config OR delete `@repo/rate-limit`.
- Wire `@repo/ai` OR `@repo/sentry-integration` to a consumer — 4601 combined LOC with no current caller. Easiest first wire: sentry-integration to `apps/api/app/webhooks/sentry/route.ts`.
- Remove orphan files: `agent.ts.bak`, `sms-temp.ts`, `sms.ts.new`.
- Add `@capsule/brand` and `packages/apps/app` to the dead-code removal list in Tier 1 task 30 (dead-code cleanup).
- Introduce `observability`-only logging rule (biome lint) to retire the 40+ direct `console.*` calls across manifest-adapters, event-parser, supplier-connectors, notifications, pdf.

---

## Package Health Audit (4th Pass)

Scope: 34 shared packages under `packages/` audited "guilty until proven innocent" by 34 per-package subagents plus 4 cross-cutting analyses (specs scan, dep graph, apps consumption, manifest architecture). This section synthesizes those 38 reports. A prior draft of this section exists above; this block supersedes it where they disagree and is keyed off the current finding set.

### Executive Summary

Of 34 packages: **5 production-ready** (`manifest-adapters`, `sales-reporting`, `sentry-integration`, `internationalization`, `next-config`), **19 functional-with-gaps**, **5 partial scaffolds** (`observability`, `supplier-connectors`, `cms`, `analytics`, plus `manifest-runtime` with a runtime bug), and **2 genuinely dead** (`brand`, `kitchen-state-transitions`). `mcp-server` is a standalone stdio service and is treated separately from the orphan set. The plan's "core shared packages" framing is directionally correct but oversells several as "production" when they are untested wrappers (`payments`, `storage`, `webhooks`, `auth`, `security`, `rate-limit`) or carry correctness bugs (`manifest-runtime` at runtime-engine.ts:1189-1203). The heaviest-shared package is `design-system` (5 apps, 1,098 imports across consumers). The largest risk surface is `observability` adoption: 24 files import `@repo/observability` versus 2,198 raw `console.*` calls in 1,316 files in `apps/api` alone (1.6% adoption).

### Per-Package Findings Table

| Package | Verdict | LOC | Tests | Consumers | Key Issue |
|---|---|---:|---:|---:|---|
| brand | DEAD | 100 | 0 | 0 | `packages/brand/package.json` — zero imports anywhere |
| kitchen-state-transitions | DEAD | 282 | 0 | 0 | `packages/kitchen-state-transitions/package.json` — declared by apps/app, never imported |
| analytics | PARTIAL_SCAFFOLD | 106 | 0 | 5 | `packages/analytics/server.ts:10-17` noop stubs; `provider.tsx:15` TODO |
| cms | PARTIAL_SCAFFOLD | 252 | 0 | 1 | `apps/web/app/[locale]/blog/page.tsx:39` blog explicitly disabled |
| observability | PARTIAL_SCAFFOLD | 689 | 0 | 3 | 1.6% adoption; `error.ts:19` falls back to `console.error` |
| supplier-connectors | PARTIAL_SCAFFOLD | 975 | 0 | 0 | `us-foods.ts:174` and `charlies-produce.ts:93` stubbed bodies |
| manifest-runtime | PARTIAL_SCAFFOLD | 10,451 | 363 it / 8 files | 4 | `runtime-engine.ts:1189-1203` policy-denial event leak |
| ai | FUNCTIONAL_WITH_GAPS | 2,156 | 0 | 1 | `agent.ts:526` naive token estimation + 0 tests on 11 files |
| auth | FUNCTIONAL_WITH_GAPS | 179 | 0 | 6 | No RBAC abstractions; `AuthProvider` is a no-op component |
| collaboration | FUNCTIONAL_WITH_GAPS | 681 | 0 | 2 | `room.tsx:12` undocumented `any` + zero coverage on Liveblocks auth |
| database | FUNCTIONAL_WITH_GAPS | 6,701 | 70 it / 2 files | 9 | `KNOWN_ISSUES.md:67-95` 4 missing FK indexes; composite-FK gap |
| design-system | FUNCTIONAL_WITH_GAPS | 19,845 | 9 it / 2 files | 5 apps | `prep-task-dependency-graph.tsx:470` `as any`; 2/99 components unit-tested |
| email | FUNCTIONAL_WITH_GAPS | 309 | 0 | 3 | `proposal.tsx:46` unused `_secondaryColor`; zero template render tests |
| event-parser | FUNCTIONAL_WITH_GAPS | 4,800 | 0 | 1 | `battle-board-adapter.ts:259` CommonJS `require()` in ESM |
| feature-flags | FUNCTIONAL_WITH_GAPS | 77 | 0 | 2 | `package.json:7` vestigial `@repo/design-system` dep; 1 flag total |
| mcp-server | FUNCTIONAL_WITH_GAPS | 4,577 + 1,551 tests | 115 it / 10 files | 0 (stdio) | `governance-scanners.ts:165-424` regex-only (not AST) |
| notifications | FUNCTIONAL_WITH_GAPS | 2,974 | 56 it / 3 files | 2 | `sms-temp.ts:2` dead stub; `sms-new.ts` duplicates `sms.ts` |
| payments | FUNCTIONAL_WITH_GAPS | 43 | 0 | 2 | `apps/api/app/api/accounting/payments/[id]/route.ts:90-95` mocks despite real client |
| payroll-engine | FUNCTIONAL_WITH_GAPS | 3,638 | 42 it / 2 files | 1 | `PrismaPayrollDataSource.ts:393-394` returns hardcoded `[]`/0 |
| pdf | FUNCTIONAL_WITH_GAPS | 2,913 | 0 | 2 | `generator.tsx:80,108,143` `@ts-expect-error` + 0 tests |
| rate-limit | FUNCTIONAL_WITH_GAPS | 32 + 600 (middleware) | 88 it / 1 file (in apps/api) | 2 | `middleware/rate-limiter.ts:289` inline `require("crypto")` |
| realtime | FUNCTIONAL_WITH_GAPS | 1,838 | 263 it / 9 files | 2 | `replay-buffer.ts:56` class never instantiated |
| seo | FUNCTIONAL_WITH_GAPS | 96 | 0 | 2 | `metadata.ts:10-16` hardcoded "next-forge" branding |
| security | FUNCTIONAL_WITH_GAPS | 83 | 0 | 3 | `index.ts:47-49` no rate-limit rule actually declared |
| storage | FUNCTIONAL_WITH_GAPS | 44 | 0 | 1 | `apps/app/recipes/actions.ts:5` no error handling on `put` |
| types | FUNCTIONAL_WITH_GAPS | 178 | 0 | 2 | `manifest-editor.ts:1` redundant re-export; no `tsconfig.json` |
| typescript-config | FUNCTIONAL_WITH_GAPS | n/a | n/a | 20 | `base.json:17` strict on; `noUncheckedIndexedAccess` OFF |
| webhooks | FUNCTIONAL_WITH_GAPS | 72 (+ 900 in notifications) | 21 it / 1 file | 2 | `apps/api/app/api/integrations/webhooks/dlq/*` zero tests |
| manifest-ir | FUNCTIONAL_WITH_GAPS | 18 src + 135,601 data | 0 | 2 | `dist/routes.manifest.json` committed — desync risk |
| internationalization | PRODUCTION_READY | 117 | 0 | 2 | `index.ts:69` silent fallback on dictionary import failure |
| manifest-adapters | PRODUCTION_READY | 20,500 + 4,000 tests | 212 it / 10 files | 2 | 28 `any`/`as any` across 13 files (Prisma dynamic tables, justified) |
| next-config | PRODUCTION_READY | 210 | 0 | 3 | `keys.ts:14-32` `getPreviewUrl` unused param |
| sales-reporting | PRODUCTION_READY | 2,428 + 959 tests | 42 it / 2 files | 1 | `apps/api/__tests__/sales-reporting/generate.test.ts:33` `describe.skip` lives in apps/api, documented |
| sentry-integration | PRODUCTION_READY | 3,500 | 32 it / 3 files | 1 | `prisma-store.ts:32` `as any` on `payloadSnapshot`; no rollback if push fails post-commit |

### Package Highlights

**manifest-runtime** — runtime-engine.ts is 2,606 LOC with 363 `it()` in 6,419 LOC of tests, but carries a correctness bug at `runtime-engine.ts:1189-1203`: the policy denial path does not roll back events emitted by prior actions/constraints, so `eventLog` leaks on partial success. Transition errors additionally clear `constraintOutcomes` at lines 1293-1304, losing diagnostic context. Event listener errors are swallowed at line 2514 with `catch {}`. No mutation rollback on concurrency conflict (lines 1309-1324). Action: classify PARTIAL_SCAFFOLD despite heavy test count; remediate rollback semantics before relying on it as the authoritative dispatch engine.

**payments** — `packages/payments/index.ts` creates a real Stripe v20.3.0 client with `sk_` validation, and `apps/api/app/webhooks/payments/route.ts` uses it. However `apps/api/app/api/accounting/payments/[id]/route.ts:90-95` returns a mocked `gatewayResponse`, bypassing the real client entirely. Architectural inconsistency: the plan treats payments as wired; one consumer is, the other is a mock. Action: audit all accounting payment routes, replace mock branches with the real `@repo/payments` singleton.

**observability** — `Sentry` fully wired across server/client/edge (`server.ts:43`, `client.ts:40`, `edge.ts:50`), but adoption is 24 files consuming `@repo/observability` vs 2,198 `console.*` calls across 1,316 files in `apps/api` alone (1.6% adoption). Internal bypass at `error.ts:19` (parseError falls back to `console.error`). Action: INVEST — biome lint rule banning raw `console.*` in `apps/**` outside of `packages/observability/*`, then migrate in waves.

**brand** — `packages/brand/index.ts` exports 7 functions (date/time/ampersand helpers), zero `@capsule/brand` imports anywhere in the tree. Completely unused. Action: DELETE from `pnpm-workspace.yaml`.

**kitchen-state-transitions** — `packages/kitchen-state-transitions/index.ts` exports an ad-hoc FSM (plain `Record` object, not XState) for `open → in_progress → done → canceled`. Declared in `apps/app/package.json` but no imports anywhere in source. The Kitchen module routes bypass it entirely. Action: DELETE.

**ai** — 2,156 LOC across 11 files with 30 exports, zero tests. `agent.ts:526` uses `Math.ceil(text.length/4)` as a token estimator — fine for logging, unsafe for budget enforcement. ToolRegistry exists; ToolLoop wiring is single-turn only. Only consumer is `apps/app`. Action: HARDEN — add real tokenizer, wire `ToolLoop`, add at minimum smoke tests for workflow/retry.

**sentry-integration** — Full real pipeline: webhook → queue → stack resolution → context build → GPT-4o prompt → JSON validation → search-and-replace with exact-match guard → branch creation → `pnpm test` → revert on failure → `git commit` → `gh pr create`. `fixer-real.test.ts` and `fixer-live.test.ts` use `it.skipIf` on `OPENAI_API_KEY`/`SENTRY_TOKEN` — real end-to-end AI tests exist, env-gated. `fixer.ts:501` intentionally asserts no placeholders or TODOs in the output. Action: MAINTAIN — this is the rare genuinely-production package.

**supplier-connectors** — `us-foods.ts` (199 LOC) and `charlies-produce.ts` (185 LOC) are stub shells: all 4 methods return `false`/`[]`. TODOs at `us-foods.ts:65,90,111,138,171,174` and `charlies-produce.ts:65,93,132,169`. No EDI library in `package.json`. The `sync-service.ts` wrapper is production-grade. Action: Tier 4 task 27 owns this; classify connectors PARTIAL_SCAFFOLD; do not enable in any flow.

**analytics** — Declares PostHog + GA + Vercel Analytics, but `server.ts:10-17` are noop stubs returning `undefined`; `instrumentation-client.ts:14-18` initializes PostHog without any `.capture()` calls. Two explicit TODOs (`provider.tsx:15`, `instrumentation-client.ts:20`). Five consumers depend on a package that dispatches zero events. Action: HARDEN — define first event schema + consent gate + one real `capture()`.

**payroll-engine** — 42 tests (24 calculator + 18 export) confirm tax math works; however `PrismaPayrollDataSource.ts:393-394` returns hardcoded `taxesWithheld: []` and `totalTaxes: 0` from `getPayrollRecords()`, destroying calculation output on retrieval. `getTipPools()` returns `[]` unconditionally (line 125). YTD is not tracked (`calculator.ts:205`), so SS wage cap will not enforce across pay periods. Action: HARDEN — ship the Prisma TaxInfo/TipPool/YTD models before enabling payroll in any org.

### Cross-Cutting Concerns

**1. Test coverage cliff (0 test files).** 21 of 34 packages: `ai`, `auth`, `analytics`, `brand`, `cms`, `collaboration`, `email`, `event-parser`, `feature-flags`, `internationalization`, `kitchen-state-transitions`, `manifest-ir`, `next-config`, `observability`, `payments`, `pdf`, `rate-limit` (package itself), `security`, `seo`, `storage`, `supplier-connectors`, `types`. Eleven of these are consumed in production code paths by `apps/api` or `apps/app`.

**2. Observability bypass.** `apps/api` alone contains 2,198 `console.*` calls across 1,316 files. Only 24 files in `apps/api` import `@repo/observability`. Adoption ratio: 24 / (24 + 1,316) ≈ 1.8% of files touch the package even when raw `console` is factored out; weighted by call count, ≈1.1%. Internal bypass at `packages/observability/error.ts:19` means even the wrapper falls back to `console.error`. Action: biome rule + scripted migration.

**3. Payment gateway stub vs real client.** `packages/payments/index.ts` wires a real Stripe v20.3.0 client, used by `apps/api/app/webhooks/payments/route.ts`. Yet `apps/api/app/api/accounting/payments/[id]/route.ts:90-95` returns a mocked `gatewayResponse` object. This is a split-brain architecture: real on webhooks, mocked on accounting mutations.

**4. Dead packages (not imported by anything).**
- `packages/brand/package.json` — zero consumers.
- `packages/kitchen-state-transitions/package.json` — declared in `apps/app/package.json`, no source imports.
- (`packages/mcp-server/package.json` is standalone stdio; not counted as dead.)

**5. Vestigial internal dependencies.** `packages/feature-flags/package.json:7` declares `@repo/design-system`, never imported inside the package. Removing it simplifies the dep graph's one remaining heavy hitter.

**6. TypeScript suppression count correction.** Prior pass claimed "15 `as any` / `@ts-expect-error` across 9 files." Packages alone contain far more: `manifest-adapters` 28 (justified, Prisma dynamic event tables), `mcp-server` 4 (`zod-from-ir.ts:89` plus Sentry dynamic access), `notifications` 22 across 8 files, `pdf` 3 `@ts-expect-error` (`generator.tsx:80,108,143`), `collaboration` 1 `@ts-ignore` + 2 `any` (`room.tsx:12`), `manifest-runtime` 1 `@ts-ignore` (`stores.node.ts:202`), `sentry-integration` 1 `as any` (`prisma-store.ts:32`), `database` 1 `as any` (`ingredient-resolution.ts:42`), `design-system` 2 `as any` (`button-group.tsx:54`, `prep-task-dependency-graph.tsx:470`), `supplier-connectors` 4 `any` (`sync-service.ts`), `cms` 2 `any` + 1 `@ts-expect-error` (`toc.tsx:25`), `event-parser` 9 `any` across 3 files, `ai` 0. Revised package-scope total: **≈78 suppressions across ~35 files in packages/ alone**, the majority in `manifest-adapters` and `notifications` and most with defensible Prisma/SDK reasoning.

### Package Dependency Graph Findings

- Node count: 34 local packages.
- Circular dependencies: **none detected**.
- Heavy hitters (most internal `@repo/*` deps): `feature-flags` (3 — analytics, auth, design-system; design-system is vestigial), `manifest-adapters` (2), `mcp-server` (2), `notifications` (2), `payroll-engine` (2), `sentry-integration` (2). `design-system` has only 1 internal dep but is the most consumed.
- Orphan set (no inbound imports from `apps/` or `packages/`): 2 truly orphaned (`brand`, `kitchen-state-transitions`). 1 standalone service (`mcp-server`, stdio). `ai` has 1 consumer (`apps/app`), so is NOT orphaned. `manifest-runtime` is a local package (the `@angriff36/manifest` referenced by tests is an external ref), consumed by `manifest-adapters` and `mcp-server` — not an orphan.
- Apps consumption: `design-system` in 5 apps; `analytics`, `email`, `next-config`, `observability` in 3 apps each; `auth`, `database`, `event-parser`, `feature-flags`, `realtime`, `security`, `seo` in 2 apps each; remainder in 1 app each; `brand` and `kitchen-state-transitions` in 0 apps.

### Specs Alignment Findings

- All 16 named specs under `docs/specs/` have corresponding code — no orphan specs.
- **Post-expansion modules have NO specs.** Commit `b8c31eef` (2026-04-19) added accounting, facilities, logistics, payroll, procurement modules; none have a spec in `docs/specs/`. This is an unknown-to-spec ratio of 5/5.
- Command Board `SPEC_connections.md` claims an edge-label component is done (`STATUS.md` 2026-02-18) — **falsified**: no such component exists in source.
- Training HRMS spec from `2025-02-09` is 14 months stale as of audit date.

### Manifest Architecture Quality (Deep-Check)

- 63 active manifests are **substantive** — full guards, constraints, mutations, events. Not shells.
- 17 quarantined manifests are **procedurally written** but use imperative syntax (`if/else`, `for` loops, `let`) that the functional DSL compiler rejects. Quality is fine; dialect is wrong. Tooling mismatch, not content decay.
- Active dispatch pipeline: route handler → `manifest-runtime-factory` → `ManifestRuntimeEngine` → `prisma-store` → outbox. Clean layering.
- IR generation is offline: `packages/manifest-ir/dist/routes.manifest.json` is a committed artifact, regenerated by `@angriff36/manifest` ir-compiler during `loadManifests.ts:233`. No dev/deploy regen.
- Top 3 risks: (a) **134 hand-coded routes exempt from IR conformance** — the bypass allowlist is the growing seam; (b) **no pre-flight validation for manifest syntax dialect** — quarantined set will grow silently until caught at runtime; (c) **idempotency collision window in factory** between dedup-key insert and engine-dispatch phase.

### Recommendations by Tier

**INVEST** — critical shared infrastructure with closable gaps worth funding this cycle.
- `manifest-runtime` — fix `runtime-engine.ts:1189-1203` event leak and constraint-outcome loss; this package owns dispatch semantics.
- `observability` — rip out `console.*` from `apps/api` (2,198 call migration); wire OpenTelemetry; close `error.ts:19` bypass.
- `database` — close `KNOWN_ISSUES.md:67-95` FK index gaps; resolve composite-FK gap for EventGuest/AllergenWarning.
- `manifest-adapters` — fix broken suite reference (`rbac-permission-checker.test.ts:428` missing `beforeEach` import); retain rest as-is.
- `payroll-engine` — ship TaxInfo/TipPool/YTD Prisma models and remove hardcoded returns at `PrismaPayrollDataSource.ts:393-394`.
- `ai` — replace naive tokenizer (`agent.ts:526`), wire `ToolLoop`, add smoke tests.
- `payments` — unify accounting route (`apps/api/app/api/accounting/payments/[id]/route.ts:90-95`) with real Stripe client.

**MAINTAIN** — production-ready, do not touch.
- `manifest-adapters`, `sales-reporting`, `sentry-integration`, `internationalization`, `next-config`, `realtime` (if event leak fixed elsewhere).

**DEPRECATE / DELETE** — remove from `pnpm-workspace.yaml`.
- `packages/brand` — zero imports.
- `packages/kitchen-state-transitions` — zero imports; replaced by per-module state logic.
- Consider also: `packages/rate-limit` vs `packages/security` — one owns rate-limiting, pick one, delete the other.

### Package Health Audit Deltas vs Prior Plan Claims

Factual corrections and reclassifications this pass forced:

1. **"`@repo/ai` is unused."** Prior prose implied it was integrated; audit confirms exactly 1 consumer (`apps/app`) but zero tests. Reclassify FUNCTIONAL_WITH_GAPS, not DEAD. The earlier table row "ai ... 0 consumers" is wrong.
2. **`mcp-server` `it()` count.** Prior pass 3 said 165; pass 4 synthesis recorded 115 earlier on this page. Re-verified: **115 across 10 test files.** Earlier prose of "1551 LOC tests" is consistent.
3. **`payroll-engine` test count.** Second pass: 42. Third pass: varied. Audit: **42 (24 calculator + 18 export)**. The earlier table entry of 46 (24+22) on this page is wrong; the canonical figure is 42 plus **6 TODOs** (not 5): `PrismaPayrollDataSource.ts:58,59,125,287,383,389` + `calculator.ts:205`.
4. **`manifest-runtime` is production-quality.** FALSE at runtime semantics level. `runtime-engine.ts:1189-1203` leaks events on policy denial. Reclassify PARTIAL_SCAFFOLD despite 363 `it()`.
5. **`@repo/auth` is a Clerk integration.** Under-recognized: it is a 179-LOC re-export shim with 0 tests, 0 RBAC helpers, and `AuthProvider` is intentionally a no-op component. Functional but thin.
6. **`sentry-integration` has zero consumers.** FALSE per this audit — `fixer-real.test.ts:242,321,380,406` and `fixer-live.test.ts:121,172,219` run env-gated against real Sentry/OpenAI. `apps/api` is the consumer. Upgrade from "pipeline is real, consumers are zero" to PRODUCTION_READY.
7. **Payments module status.** Under-recognized split: real on webhooks, **mocked** on `apps/api/app/api/accounting/payments/[id]/route.ts:90-95`. Plan treated as done.
8. **Observability adoption.** Not previously quantified. **1.6% adoption** is the headline; any plan item that assumes observability is "integrated" must be rewritten to "wired but unadopted."
9. **Specs gap for expansion modules.** Prior passes did not flag this. Five modules (accounting, facilities, logistics, payroll, procurement) were added in `b8c31eef` with no spec. Add spec-writing to Tier 3.
10. **TypeScript suppression total.** Prior claim "15 across 9 files" was apps-only. Package-scope audit: ≈78 suppressions across ~35 files. Most defensible (Prisma dynamic event tables in `manifest-adapters`, Liveblocks generics in `collaboration`), but the figure materially resets the ceiling.

---

