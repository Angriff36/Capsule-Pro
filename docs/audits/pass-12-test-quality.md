# Audit Archive — Pass 12: Test Quality & Coverage Gap Audit

Test quality and coverage gap audit. Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## Test Quality & Coverage Gap Audit (12th Pass — Enhanced)

> **Audited:** 2026-04-25 (verified & corrected 2026-04-25)
> **Scope:** 142 unit test files (55 in `apps/api/__tests__`, 29 in `apps/app/__tests__`, 1 in `apps/web/__tests__`, 57 in `packages/` — 29 in `__tests__/` dirs + 28 colocated with source) + 59 E2E spec files (57 in `e2e/` + 2 in `apps/app/e2e/`). 8 parallel subagents performed: (1) assertion pattern grep across full suite, (2) mock-heavy/circular test analysis with per-file quality ratings for 19 files, (3) CRITICAL-finding cross-reference against test existence for all findings from passes 6-11, (4) untested critical paths audit (auth, rate limiting, webhooks, tenant isolation, sync services), (5) E2E effectiveness deep-read of 15 spec files, (6) test infrastructure & CI quality with vitest config analysis, (7) API test quality deep-dive of 12 files, (8) package test quality analysis of 13 files.
> **Method:** 8 parallel subagents (Sonnet model) + 4 verification subagents — every finding backed by file:line references. 30+ test files read in full across agents. Global assertion counts via grep, independently verified against codebase. Cross-reference of all 19 CRITICAL findings from passes 6-11 against test file existence and quality.

### Part A: Assertion Effectiveness

#### Global Metrics

| Metric | Value |
|---|---|
| Total `it()` + `test()` calls (unit) | **2,397** (832 API + 225 app + 14 web + 1,326 packages) |
| Total `it()` + `test()` calls (E2E) | **397** (382 in `e2e/` + 15 in `apps/app/e2e/`) |
| Total `it()` + `test()` calls (all) | **2,794** |
| Total `expect()` calls (unit) | **5,187** (2,080 API + 460 app + 33 web + 2,614 packages) |
| **Expects-to-tests ratio (unit)** | **2.16 : 1** |
| `vi.mock()` calls | **142 across 44 files** (137 in apps/ + 5 in packages/) |
| `vi.spyOn()` calls | **21** |

#### 1. Weak Assertion Patterns (~130 total)

**Status-only assertions — 30 instances:**

Tests that only assert `expect(res.status).toBe(NNN)` with no subsequent body/data assertion. 18 are on error paths (401, 404, 400 — partially defensible). 12 are on success paths (200) that never inspect response data.

Most concerning success-path tests:
- `apps/api/__tests__/command-board/smoke-board-health.test.ts:485` — "accepts valid timeRange" checks only status 200
- `apps/api/__tests__/command-board/smoke-board-health.test.ts:536` — "accepts valid entityTypes filter" same
- `apps/api/__tests__/command-board/board-crud.test.ts:181` — "should copy projections from template" at status 200 with no body check
- `apps/api/__tests__/conflicts/detect-route.stabilization.test.ts:195,210,230` — three tests "accepts X" at 200 with no data verification

**`.not.toThrow()` patterns — 30 instances:**

23 of 30 are in a single file: `apps/api/__tests__/inventory/inventory-item-crud.test.ts` (lines 568-1040). Validation functions like `validateCreateInventoryItemRequest`, `validateUnitOfMeasure`, `validateFSAStatus`, `validateNonNegativeNumber` are only checked for "doesn't throw" — return values are never verified. If these functions silently return wrong data, the tests still pass.

Additional 7 in `apps/app/__tests__/prep-task-contract.test.ts:19`, `packages/sales-reporting/__tests__/calculators.test.ts:645`, `packages/database/__tests__/critical-path.test.ts:58`, `packages/manifest-adapters/__tests__/rbac-permission-guard.test.ts:299-300`, and `packages/manifest-adapters/__tests__/permission-edge-cases.test.ts:648`, `packages/sales-reporting/__tests__/parsers.test.ts:123`.

**Empty/loose matchers — 30+ usages:**

- `expect.anything()` — **30 usages across 7 files** (verified by grep). Heaviest: `apps/api/__tests__/inventory/inventory-item-crud.test.ts` with 23 usages (wildcards in `toHaveBeenCalledWith` — structurally defensible but lack argument verification).
- `expect.any(String/Number/Object)` — 18 usages. Problematic: `apps/api/__tests__/command-board/board-crud.test.ts:296,335` uses `expect.any(Object)` where specific shape validation is needed; `board-crud.test.ts:546-547` uses `expect.objectContaining({ name: expect.any(Object) })` masking structural issues.

**Tautological assertions (`expect(true).toBe(true)`) — 57 instances across 5 files:**

- `apps/app/__tests__/settings/settings-workflow.test.ts` — **39 of 48** test blocks contain `expect(true).toBe(true)` (81% tautological). Only 9 tests have real assertions.
- `packages/notifications/__tests__/provider-disabled.test.ts` — **13 instances**. Tests document behavior without verifying it.
- `apps/api/__tests__/kitchen/manifest-code-generation.test.ts` — 2 instances.
- `apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts` — 2 instances.
- `e2e/tenant-audit-log-verification.spec.ts` — 1 instance.

**Tests with NO assertions — 17 instances:**

- `packages/manifest-adapters/__tests__/manifest-telemetry.test.ts` — **14 consecutive test blocks** (lines 121-515) with zero `expect()` calls. Tests call methods and `await collector.flush()` with zero verification. These will always pass regardless of whether the telemetry code works. **Most critical quality finding.**
- `apps/api/__tests__/sales-reporting/generate.test.ts:34` — entire `describe.skip` with 0 assertions.
- `apps/api/__tests__/kitchen/manifest-preptask-claim.test.ts:96` — uses `if (condition) throw new Error()` instead of `expect()`.
- `apps/api/__tests__/kitchen/manifest-build-determinism.test.ts:179` — same pattern.

**`resolves.toBeUndefined()` without value check — 2 instances:**
- `packages/sentry-integration/__tests__/fixer-real.test.ts:226`
- `packages/manifest-adapters/__tests__/prisma-idempotency-store.test.ts:204`

#### 2. Mock-Heavy Tests That Don't Test Real Behavior

**The "mock triad" pattern.** Nearly every API route test mocks the same three modules: `@repo/database` (25+ files), `@repo/auth/server` (15+ files), `@/app/lib/tenant` (10+ files). This is architecturally expected for boundary mocking, but the quality varies:

| Pattern | Files | Assessment |
|---|---|---|
| Boundary mock + real logic inside | 11 (e.g., event-lifecycle, tool-registry-context) | **STRONG** — tests real branching logic |
| Boundary mock + verify mock called | 8 (e.g., email-templates POST, manifest-runtime-factory) | **ADEQUATE** — tests glue code only |
| Full mock + no production code exercised | 4 (e.g., agent-loop-timeout, marketing-page-fallback) | **WEAK** |
| Inline code copy + assert on copy | 2 (publisher-concurrency, outbox-publish-e2e) | **CIRCULAR** |

**Circular mock testing — 3 files:**

1. `apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts` — Defines `TOOL_CALL_TIMEOUT_MS = 30_000` locally (line 93), then asserts `expect(TOOL_CALL_TIMEOUT_MS).toBe(30_000)`. Defines `expectedErrorEnvelope` inline, then asserts its own properties. The `import` on line 29 is unused — no production code is invoked. **Quality: CIRCULAR**

2. `packages/realtime/__tests__/publisher-concurrency.test.ts` — Copies `parseLimit` and `isAuthorized` functions inline from production (lines 19-40), then tests the inline copies. Lines 122-319 create literal objects and assert their own string properties: `expect(behavior.mechanism).toBe("FOR UPDATE SKIP LOCKED")`. The production publisher module is never imported. **Quality: CIRCULAR for 60% of file, ADEQUATE for utility functions**

3. `apps/app/__tests__/settings/settings-workflow.test.ts` — **39 of 48** test blocks contain `expect(true).toBe(true)` (81%). The file is a code review formatted as a test suite. Only 9 tests (formatRole, pagination clamping including a real NaN bug, Math.max/Min clamping) have real assertions. **Quality: CIRCULAR**

**Tests that delegate to `executeManifestCommand` mock** — inventory-item POST, email-template POST/PUT/DELETE, and similar routes all mock the manifest handler and verify it was called with the right arguments. These test delegation, not business logic. They would not catch bugs inside the manifest execution engine.

#### 3. Tests That Would Pass Even If Code Was Deleted

| File | Lines | Issue |
|---|---|---|
| `apps/app/__tests__/sign-in.test.tsx` | 1 test, 1 expect | `expect(container).toBeDefined()` — always true |
| `apps/app/__tests__/sign-up.test.tsx` | Same | Same pattern |
| `apps/app/__tests__/api/command-board/chat-route-runtime.test.ts` | 1 test, 2 expects | Reads source file from disk, checks for `runtime = "nodejs"` string. Static analysis, not runtime testing |
| `apps/api/__tests__/sales-reporting/generate.test.ts` | Entire file | `describe.skip` with 0 active assertions |
| `packages/manifest-adapters/__tests__/manifest-telemetry.test.ts` | Lines 121-515 | 14 tests with zero `expect()` calls |
| `apps/app/__tests__/settings/settings-workflow.test.ts` | 39 of 48 tests | `expect(true).toBe(true)` — always passes |
| `packages/notifications/__tests__/provider-disabled.test.ts` | 13 tests | `expect(true).toBe(true)` — always passes |

#### 4. Per-File Quality Ratings (30+ files deep-read)

**API tests (12 files):**

| File | Tests | Expects | Rating |
|---|---|---|---|
| `events/event-lifecycle.test.ts` | 26 | ~65 | **STRONG** — real Zod validation, tenant isolation checks, 400/401/500 error paths |
| `inventory/inventory-item-crud.test.ts` | 43 | ~100 | **STRONG** — extensive validation tests, error paths |
| `email-templates/templates.test.ts` | 28 | ~80 | **STRONG** — real route handler logic, error paths, tenant checks |
| `quickbooks-invoice-export.test.ts` | 12 | 30 | **STRONG** — pure functions, no mocks, CSV edge cases |
| `lib/api-key-service.test.ts` | 17 | 30 | **STRONG** — real crypto, no mocks, format validation |
| `ai/suggestions.test.ts` | 15 | ~55 | **ADEQUATE** — real validation, but AI output fully mocked |
| `inventory/forecasting.test.ts` | 21 | ~55 | **ADEQUATE** — heavy `as any` casts, 3 it.todo |
| `staff/auto-assignment.test.ts` | 11 | ~40 | **ADEQUATE** — conditional assertions undermine determinism |
| `recipe-costing-update.test.ts` | 5 | 13 | **ADEQUATE** — complex mock chains, no tenant filter assertions |
| `health.test.ts` | 1 | 2 | **ADEQUATE** — trivially simple, appropriate |
| `outbox-publish-e2e.test.ts` | 9 | 22 | **CIRCULAR** — reimplements production logic inline |
| `sales-reporting/generate.test.ts` | 1 (skipped) | 0 | **WEAK** — zero coverage |

**Average expects/test (API): ~2.8. 67% test error paths. 75% verify response bodies. 42% verify tenant isolation.**

**Package tests (8 files):**

| File | Tests | Expects | Rating |
|---|---|---|---|
| `realtime/channels.test.ts` | 17 | 36 | **STRONG** — pure functions, zero mocks, boundary coverage |
| `manifest-adapters/rbac-permission-checker.test.ts` | 30 | ~60 | **STRONG** — real wildcards, caching, role inheritance |
| `sales-reporting/calculators.test.ts` | 20 | ~70 | **STRONG** — pure functions, edge cases, no mocks |
| `sentry-integration/fixer-real.test.ts` | 14 | ~35 | **STRONG** — real filesystem ops, env-gated real OpenAI |
| `database/critical-path.test.ts` | 15 | ~60 | **STRONG** — CPM algorithm, precise numerical assertions |
| `manifest-adapters/prisma-json-store.test.ts` | 21 | ~55 | **ADEQUATE** — real merge/version logic through mocks |
| `notifications/outbound-webhook-service.test.ts` | 22 | ~40 | **ADEQUATE** — real HMAC/backoff, stubbed fetch |
| `realtime/publisher-concurrency.test.ts` | 22 | ~50 | **WEAK** — 60% circular (inline copies + literal assertions) |

**Package tests are significantly higher quality than app/api tests.** 5 of 8 are STRONG. Packages use dependency injection or test pure functions, avoiding the mock triad.

**Web app tests (5 files):**

| File | Tests | Expects | Rating |
|---|---|---|---|
| `menus/menu-actions.test.ts` | 26 | ~80 | **ADEQUATE** — real SQL assertion patterns, outbox verification |
| `calendar/unified-calendar.test.tsx` | 3 | ~12 | **ADEQUATE** — real user interactions via testing-library |
| `sign-in.test.tsx` | 1 | 1 | **WEAK** — `expect(container).toBeDefined()` |
| `api/command-board/chat-route-runtime.test.ts` | 1 | 2 | **WEAK** — reads source code text |
| `settings/settings-workflow.test.ts` | 28 | ~30 | **CIRCULAR** — 21 of 28 are `expect(true).toBe(true)` |

### Part B: Coverage Gap Analysis vs Known CRITICAL Bugs

#### 1. Cross-Reference: CRITICAL Findings vs Test Coverage

| # | CRITICAL Finding (Pass #) | Test Exists? | Would Catch Bug? | Gap Type |
|---|---|---|---|---|
| 1 | SQL injection in `payroll/approvals/history/route.ts` (pass 9, #1) | **NO** — only `payroll-page.test.tsx` (UI links) | N/A | **COVERAGE GAP** |
| 2 | Schema drift in `events/importer.ts` — camelCase vs snake_case (pass 8, #10) | **NO** | N/A | **COVERAGE GAP** |
| 3 | Broken `timecards/me/route.ts` — non-existent table JOIN (pass 8, #14) | **NO** | N/A | **COVERAGE GAP** |
| 4 | Missing auth on email webhook (pass 7, #7) | **NO** — outbound webhook test is unrelated | N/A | **COVERAGE GAP** |
| 5 | Cross-tenant data in `outbox/publish` (pass 7, #8) | Yes — `publish.integration.test.ts` | **NO** — test *documents and blesses* insecure behavior | **QUALITY ISSUE** |
| 6 | Chart-of-accounts PATCH vs PUT mismatch (pass 9) | **NO** | N/A | **COVERAGE GAP** |
| 7 | SQL injection in CRM scoring (pass 6, #1) | **NO** | N/A | **COVERAGE GAP** |
| 8 | SQL injection in kitchen allergens matrix (pass 6, #4) | **NO** — kitchen tests don't cover allergen endpoints | N/A | **COVERAGE GAP** |
| 9 | SQL injection in admin trash/list (pass 7, #5-6) | **NO** | N/A | **COVERAGE GAP** |
| 10 | Goodshuffle sync broken columns (pass 8, #11-12) | **NO** | N/A | **COVERAGE GAP** |
| 11 | Logistics drivers update correctness (Blocker 6) | **NO** | N/A | **COVERAGE GAP** |
| 12 | Mobile API `{taskId}` vs `{id}` mismatch (pass 10) | Partial — `offline-sync.test.ts` exists | **NO** — only tests local storage queue | **QUALITY ISSUE** |
| 13 | Labor-budget `Prisma.raw()` data corruption (pass 8, #16) | **NO** | N/A | **COVERAGE GAP** |
| 14 | Recipe optimization JOIN on non-existent column (pass 8, #15) | **NO** | N/A | **COVERAGE GAP** |
| 15 | Events actions `eventId` vs `event_id` drift (pass 8, #19) | **NO** | N/A | **COVERAGE GAP** |
| 16 | Staff availability SQL syntax error (pass 8, H12) | **NO** | N/A | **COVERAGE GAP** |
| 17 | Waste entries wrong join table (pass 8, C13) | **NO** | N/A | **COVERAGE GAP** |
| 18 | Systemic `|| null` falsy-value bug (pass 8, H25) | **NO** | N/A | **COVERAGE GAP** |
| 19 | Unbounded LIMIT/OFFSET DoS vectors (pass 8, M12) | **NO** | N/A | **COVERAGE GAP** |

**Scorecard: 16 of 19 CRITICAL/HIGH bugs have ZERO test coverage. 2 have tests that exist but would not catch the bug. 1 is not testable by automated tests. ZERO CRITICAL bugs would have been caught by the existing test suite before the audit discovered them.**

#### 2. High-Risk Areas Without ANY Tests

| Area | Source Files | Risk Level | Zero Tests? | Notes |
|---|---|---|---|---|
| Auth middleware chain (`proxy.ts`) | `apps/api/proxy.ts` | CRITICAL | **YES** | Public route matching, 401 handling, middleware ordering all untested |
| API key auth middleware | `apps/api/middleware/api-key-auth.ts` | HIGH | **YES** | Crypto layer tested, but DB lookup/revocation/expiry checks are not |
| Global rate limit middleware | `apps/api/middleware/global-rate-limit.ts` | HIGH | **YES** | Applied to every API request but never tested |
| Clerk webhook verification | `apps/api/app/webhooks/auth/route.ts` | CRITICAL | **YES** | Svix signature verification, event routing untested |
| Stripe webhook verification | `apps/api/app/webhooks/payments/route.ts` | CRITICAL | **YES** | Stripe signature verification untested |
| Supplier catalog webhook | `apps/api/app/api/webhooks/supplier-catalog/route.ts` | CRITICAL | **YES** | HMAC-SHA256 + timingSafeEqual verification untested |
| Email webhook (no auth) | `apps/api/app/api/collaboration/notifications/email/webhook/route.ts` | CRITICAL | **YES** | No auth + no tenant filter + no test |
| Goodshuffle sync | 4 files in `apps/api/app/lib/` | HIGH | **YES** | Column name mismatches would have been caught by basic tests |
| Nowsta sync | 2 files in `apps/api/app/lib/` | HIGH | **YES** | No test references `nowsta` or `Nowsta` |
| Accounting module (17 routes) | `apps/api/app/api/accounting/` | CRITICAL | **YES** | PATCH vs PUT, mock payments, missing export — zero tests |
| Facilities module (12 routes) | `apps/api/app/api/facilities/` | CRITICAL | **YES** | Only 1 widget test for upcoming maintenance |
| Logistics module (14 routes) | `apps/api/app/api/logistics/` | CRITICAL | **YES** | Driver update correctness, GPS simulation — zero tests |
| Payroll API routes (35 routes) | `apps/api/app/api/payroll/` | CRITICAL | **YES** | Engine package has 42 tests, API routes have zero |
| Procurement module (37 routes) | `apps/api/app/api/procurement/` | CRITICAL | **YES** | Runtime crashes would be caught by any smoke test |
| CRM module (61 routes) | `apps/api/app/api/crm/` | HIGH | **YES** | SQL injection in scoring — zero tests |
| Training module (12 routes) | `apps/api/app/api/training/` | MEDIUM | **YES** | |
| Timecards | `apps/api/app/api/timecards/` | CRITICAL | **YES** | Broken `me/route.ts` JOIN — zero tests |
| Calendar | `apps/api/app/api/calendar/` | CRITICAL | **YES** | Only UI test, no API tests |
| Mobile app screens (9 screens) | `apps/mobile/src/screens/` | HIGH | **YES** | Only offline queue storage tested |

#### 3. Test Distribution Heatmap

| Module | Route Files | Test Files | Test Cases | Had CRITICAL Finding? | Gap Severity |
|---|---:|---:|---:|---|---|
| Kitchen | 259 | 27 | ~200 | Schema drift in recipes | MEDIUM — best-tested module |
| Command Board | 39 | 9 | ~80 | UI removed (L1.1) | LOW — tests reference removed UI |
| Realtime/Outbox | — | 11 | ~100 | Cross-tenant in publish | HIGH — test blesses insecure behavior |
| Inventory | 102 | 3 | ~90 | Forecast cross-tenant, CRUD | HIGH |
| Events | 141 | 4 | ~30 | Importer broken, actions drift | HIGH |
| Staff | 50 | 1 | ~11 | Auto-assignment conditional | HIGH |
| Payroll (engine only) | 35 | 2 | 42 | SQL injection in API routes | HIGH |
| Facilities | 12 | 1 | ~5 | Assets broken | CRITICAL |
| CRM | 61 | 0 | 0 | SQL injection in scoring | CRITICAL |
| Accounting | 17 | 0 | 0 | PATCH vs PUT, mock payments | CRITICAL |
| Logistics | 14 | 0 | 0 | Driver update correctness | CRITICAL |
| Procurement | 37 | 0 | 0 | Runtime crashes (Blocker 2) | CRITICAL |
| Training | 12 | 0 | 0 | — | HIGH |
| Timecards | 22 | 0 | 0 | Broken me/route | CRITICAL |
| Calendar | 8 | 0 | 0 | Callback IDOR | CRITICAL |
| Webhooks | 5 | 0 | 0 | Signature bypass, missing auth | CRITICAL |

**Correlation:** Every module with CRITICAL/HIGH bugs has ZERO or near-zero test files. Kitchen (27 test files, fewest CRITICAL bugs) confirms the expected correlation: test coverage correlates inversely with bug density.

### Part C: Test Infrastructure Quality

#### 1. Test Setup & Fixtures

| Aspect | Finding | Assessment |
|---|---|---|
| Vitest configs | Multi-project workspace with 9 sub-projects in root `vitest.config.ts` | GOOD |
| Database mock plugin | Custom `vitest-database-mock` Vite plugin intercepts ALL `@repo/database` imports in unit tests | FRAGILE — tests can never catch real schema mismatches |
| Divergent mock files | `apps/api/test/mocks/@repo/database.ts` has 19-20 models; `apps/app/test/mocks/@repo/database.ts` has only `outboxEvent` (1 partial mock) | FRAGILE — schema changes risk desynchronizing these mocks |
| Integration test setup | `apps/api/test/setup.integration.ts` loads `.env.local` for real DB URL | CONCERN — no dedicated test database |
| Shared fixtures | **NONE** — no centralized test-utils.ts or fixture factory | POOR |
| Seed data | `packages/database/src/sample-data/seed.ts` exists but **zero test files import it** | POOR — seed data is demo-only |

**Integration tests target the development database.** No `TEST_DATABASE_URL`, no database-per-test-run, no CI service container. Integration tests use `deleteMany` cleanup that fails if the test crashes mid-execution. No transaction-rollback isolation.

**Module-level mutable state** in some tests: `cardCounter` (collaboration.integration.test.ts:42), `taskCounter` (manifest-event-preplist-seed-runtime.test.ts:135), `idCounter` (conformance.test.ts:21). These are not reset between runs and can produce non-deterministic behavior under parallel execution.

#### 2. E2E Test Effectiveness

**15 E2E spec files deep-read across different domains. Key findings:**

- **Average assertions per test: ~2.5** (borderline — workflow specs adequate at 2-3, many specs rely on single visibility assertions)
- **5 of 15 specs verify data persistence** (create → verify via UI round-trip). Zero specs query the database directly.
- **2 of 15 specs test error states** (rate-limiting validation, soft-delete auth gates). 13 of 15 have zero error-path coverage.
- **0 specs test a meaningful cross-module workflow** (e.g., create event → add dishes → generate prep list → verify inventory)
- **6 of 15 specs run with proper authenticated sessions.** The rest either skip auth or have comments saying "AUTH REQUIRED" but don't implement it.
- **`kitchen-workflow.spec.ts` has a compile-time bug:** references undefined `NOT_FOUND_REGEX` (line 104)
- **`procurement-automation-verification.spec.ts` is NOT an E2E test:** uses `require("fs")` to read files from disk, never starts a browser or makes an HTTP request (except one `/api/health` check)

**Overall E2E effectiveness rating: WEAK.** The workflow specs in `e2e/workflows/` are the strongest part — they create entities and verify them through the UI with a well-designed helper library. But they're undermined by inconsistent auth, zero cross-module coverage, zero error-path coverage, and several "verification" specs that are static file checks.

#### 3. CI Integration

| Aspect | Finding |
|---|---|
| CI workflow | `.github/workflows/ci.yml` runs `pnpm test` (unit tests) on every PR |
| Manifest CI | `.github/workflows/manifest-ci.yml` for manifest-specific tests |
| Coverage reporting | **NONE** — only `packages/payroll-engine` has a coverage config. No PR coverage status checks. |
| E2E in CI | **NOT CONFIGURED** — 57 Playwright specs exist but no CI workflow triggers them |
| Coverage thresholds | **NONE** — no minimum coverage enforced anywhere |
| Flaky test handling | **NONE** — Vitest configs have zero retry configuration; Playwright explicitly sets `retries: 0` |
| CI `continue-on-error` | 2 CI steps use `continue-on-error: true` with TODO comments (hardcoded route check, repo-ui import check) |

### Part D: Recommended Actions

#### Tier T0 — Delete or Rewrite Vacuous/Circular Tests (immediate, zero risk)

1. **Delete** `apps/app/__tests__/sign-in.test.tsx` — trivially passes
2. **Delete** `apps/app/__tests__/sign-up.test.tsx` — same
3. **Rewrite** `apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts` — currently asserts on locally-defined constants; import and test real production code
4. **Rewrite** `packages/realtime/__tests__/publisher-concurrency.test.ts` lines 122-319 — currently asserts on inline literal objects; import and test real publisher
5. **Rewrite** `apps/app/__tests__/settings/settings-workflow.test.ts` — convert 21 `expect(true).toBe(true)` blocks to real assertions or GitHub issues
6. **Rewrite** `packages/manifest-adapters/__tests__/manifest-telemetry.test.ts` — 14 tests with zero `expect()` calls; add output verification
7. **Fix** `apps/api/__tests__/outbox-publish-e2e.test.ts` — import envelope logic from production instead of inlining it

#### Tier T1 — Write Tests for CRITICAL Bug Classes (prevent re-introduction)

8. **SQL injection prevention tests** — parameterized tests for `payroll/approvals/history/route.ts`, `crm/scoring/calculate/route.ts`, `kitchen/allergens/matrix/route.ts`, `administrative/trash/list/route.ts` asserting that user inputs are validated/parameterized
9. **Schema drift invariant test** — extend `apps/api/__tests__/conflicts/detect-route-sql.invariant.test.ts` to cover camelCase-vs-snake_case column names across ALL modules
10. **Webhook auth enforcement test suite** — test ALL 5 webhook receivers asserting signature verification is required and correct
11. **Auth middleware chain test** — test `proxy.ts` public route matching, 401 handling, middleware ordering
12. **API key middleware test** — test `api-key-auth.ts` DB lookup, revocation, expiry checks (crypto layer already tested)
13. **Global rate limit middleware test** — test `global-rate-limit.ts` header injection, rate limit enforcement
14. **Tenant isolation integration test** — parameterized test asserting that outbox/publish, forecasts/batch, calendar callbacks, procurement approvals filter by `tenantId`
15. **Integration sync tests** — Goodshuffle + Nowsta sync service smoke tests (would have caught column name mismatches)
16. **Chart-of-accounts HTTP method test** — verify PATCH returns 405, PUT works
17. **Timecards smoke test** — verify `me/route.ts` doesn't 500

#### Tier T2 — Fix Quality Issues in Existing Tests

18. **Fix `outbox/publish.integration.test.ts`** — change from documenting/blessing insecure tenant behavior to asserting tenant filtering IS enforced
19. **Fix `staff/auto-assignment.test.ts`** — remove conditional assertions and `console.log` debug statements; assert specific outcomes
20. **Fix `inventory/inventory-item-crud.test.ts`** — replace 23 `.not.toThrow()` calls with return-value verification
21. **Unskip `sales-reporting/generate.test.ts`** — implement the PDF generation test or add a proper API-level test

#### Tier T3 — Test Infrastructure Improvements

22. **Create shared test fixtures** — centralized `test-utils.ts` with common mock patterns, auth helpers, tenant context
23. **Unify database mock files** — merge `apps/api/test/mocks/@repo/database.ts` and `apps/app/test/mocks/@repo/database.ts` into a shared package
24. **Add dedicated test database** — `TEST_DATABASE_URL` with transaction-rollback isolation for integration tests
25. **Add coverage reporting** — `text` + `json` reporters in main vitest config; minimum 50% coverage on new files
26. **Enable E2E in CI** — GitHub Actions step: start dev server → run migrations → seed → run E2E
27. **Create database seeding script for tests** — minimum: 1 org, 5 recipes, 10 inventory items, 5 staff, 2 events (seed data exists in `packages/database/src/sample-data/seed.ts` but is unused by tests)

#### Tier T4 — Coverage Targets by Module (Prioritized by Bug Density)

| Module | Target Test Files | Priority | Justification |
|---|---|---|---|
| Payroll API routes | 5 | P0 | CRITICAL SQL injection + bank accounts broken + approvals history |
| Accounting | 3 | P0 | CRITICAL PATCH vs PUT + mock payments + missing export |
| Procurement | 3 | P0 | CRITICAL runtime crashes + SQL injection in approvals |
| Logistics | 3 | P0 | CRITICAL correctness bugs + tenant isolation gaps |
| CRM | 3 | P1 | HIGH — SQL injection in scoring + IDOR |
| Events (importer, actions) | 2 | P1 | CRITICAL — entire import pipeline broken + camelCase drift |
| Facilities | 2 | P1 | HIGH — assets broken + falsy-value bugs |
| Timecards | 2 | P1 | CRITICAL — broken me/route + non-existent table JOIN |
| Integration sync (Goodshuffle/Nowsta) | 2 | P1 | HIGH — column name mismatches cause silent data loss |
| Webhook receivers (5 endpoints) | 2 | P2 | CRITICAL — no auth enforcement, signature bypass |
| Auth middleware chain | 1 | P2 | CRITICAL — tenant spoofing via middleware bypass |
| API key middleware | 1 | P2 | HIGH — revocation/expiry checks untested |
| Kitchen allergens | 2 | P2 | CRITICAL — SQL injection in matrix endpoint |
| Administrative trash | 1 | P2 | CRITICAL — multiple SQL injection points |
| Mobile screens | 3 | P2 | HIGH — contract mismatches |
| Training | 1 | P3 | MEDIUM — basic CRUD smoke tests |

### Summary Statistics

| Metric | Value |
|---|---|
| Total unit test files | **142** (55 API + 29 app + 1 web + 57 packages) |
| Total unit test cases (`it()` + `test()`) | **2,397** (832 API + 225 app + 14 web + 1,326 packages) |
| Total E2E spec files | **59** (57 in `e2e/` + 2 in `apps/app/e2e/`) |
| Total E2E test cases | **397** |
| Total `expect()` calls (unit) | **5,187** (2,080 API + 460 app + 33 web + 2,614 packages) |
| Expects-to-tests ratio (unit) | **2.16 : 1** |
| `vi.mock()` calls | **142** across 44 files |
| Circular test files (assert on own data) | **3 files** (agent-loop-timeout, publisher-concurrency, settings-workflow) |
| Tautological assertions (`expect(true).toBe(true)`) | **57** across 5 files (39 in settings-workflow alone) |
| Zero-assertion test blocks | **17** (14 in manifest-telemetry alone) |
| `.not.toThrow()` without return check | **30** (23 in inventory-item-crud) |
| `expect.anything()` loose matchers | **30** across 7 files (23 in inventory-item-crud) |
| Status-only assertions (no body check) | **30** |
| CRITICAL bugs with ZERO tests | **16 of 19 (84%)** |
| CRITICAL bugs with tests that don't catch them | **2 of 19 (11%)** |
| CRITICAL bugs prevented by tests | **0 of 19 (0%)** |
| API domains with zero test files | **16 of 24 (67%)** |
| High-risk untested areas | Auth middleware, ALL webhook receivers, ALL integration sync, global rate limit |
| E2E workflow coverage | ~7.5% of 10 documented workflows |
| E2E tests run in CI | **No** |
| CI coverage reporting | **None** |
| Integration test DB isolation | **None** (targets dev database via `.env.local`) |

---

