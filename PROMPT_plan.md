# Ralph Wiggum Diagnosis Prompt — Capsule Pro

## What's Already Done

0a. Study @IMPLEMENTATION_PLAN.md — it already has ELEVEN verification passes (plus 4 addenda/sub-passes). DO NOT repeat any of that work. The prior passes covered: (1) route-level claims & blockers, (2-3) blocker re-verification, (4) full package health audit of all 34 shared packages, (5) E2E test suite audit, (6-8) raw-SQL correctness audit (3 passes), (9) frontend health audit, (10) mobile app + public website audit, (11) auth, middleware & integration services audit (3 sub-passes). Your focus is entirely new.
0b. The test suite has 307 test files (296 unit via vitest, 117 E2E via Playwright). Prior passes noted test counts and skips but NEVER assessed test quality — whether tests actually catch real bugs, whether assertions are meaningful, or whether critical code paths have any coverage at all.
0c. Study `apps/api/__tests__/` — the main API unit test directory. Read at least 10 representative test files across different domains.
0d. Study `apps/app/__tests__/` — web app unit tests. Read at least 5 representative files.
0e. Study `packages/*/__tests__/` — package-level tests. Read at least 5 files.
0f. For reference, the main API routes are in `apps/api/app/api/`, shared packages are in `packages/`, and the web app is in `apps/app/`.

## FOCUS: Test Quality & Coverage Gap Audit (12th pass — NEW focus)

All prior audits focused on production code correctness. The **test suite itself** has never been audited for quality. This pass asks: do the tests actually protect against the bugs found in passes 6-11? Are critical code paths tested at all? Are assertions meaningful or just "it doesn't throw"?

### Part A: Assertion Effectiveness Analysis

#### 1. Weak Assertion Patterns
- Search for tests that only assert status codes without checking response bodies (e.g., `expect(res.status).toBe(200)` and nothing else)
- Find tests that use `.not.toThrow()` or empty `.resolves` — these pass regardless of behavior
- Find tests with `expect.anything()`, `expect.objectContaining({})` with empty objects, or overly loose matchers
- Count tests that don't assert on the returned data shape at all

#### 2. Mock-Heavy Tests That Don't Test Real Behavior
- Find tests where every dependency is mocked — the test only verifies the mock was called, not that the code produces correct output
- Look for `vi.mock` at module level that replaces entire modules — these tests may pass even if the real code is broken
- Identify tests where the mock return value is the same structure as the assertion — circular testing

#### 3. Tests That Would Pass Even If Code Was Deleted
- Find test files with no imports from the module under test
- Find tests that only test the test harness itself (setup, teardown, fixtures)
- Find describe blocks with no `it()`/`test()` calls

### Part B: Coverage Gap Analysis vs Known Bugs

#### 1. Cross-Reference Tests Against CRITICAL Findings
The prior passes found 19+ CRITICAL bugs (SQL injection, schema drift, broken endpoints, missing auth). For EACH CRITICAL finding from passes 6-11:
- Does a test exist that would have caught this bug BEFORE it was found by the audit?
- If not, flag as a coverage gap — the test suite failed to prevent this class of bug

Key CRITICAL findings to cross-reference:
- SQL injection in `payroll/approvals/history/route.ts` (pass 9, finding #1)
- Schema drift in `events/importer.ts` — camelCase vs snake_case (pass 8, finding #10)
- Broken `timecards/me/route.ts` — non-existent table JOIN (pass 8, finding #14)
- Missing auth on email webhook (pass 7, finding #7)
- Cross-tenant data access in outbox/publish (pass 7, finding #8)
- Chart-of-accounts PATCH vs PUT mismatch (pass 9, C1)
- Mobile API body field mismatch `{ taskId }` vs `{ id }` (pass 10, C1)

#### 2. Untested Critical Code Paths
For each of these high-risk areas, check if ANY test exists:
- Authentication middleware chain (`apps/api/proxy.ts`, `apps/api/middleware/`)
- Rate limiting (`apps/api/middleware/global-rate-limit.ts`)
- API key authentication (`apps/api/middleware/api-key-auth.ts`)
- Webhook signature verification (Clerk, Stripe, supplier-catalog)
- Tenant isolation in raw SQL queries
- Integration service sync logic (Goodshuffle, Nowsta)

#### 3. Test Distribution Heatmap
Count tests per domain module and compare against code complexity:
- Which modules have the MOST tests vs the MOST code?
- Which modules have ZERO tests despite having CRITICAL/HIGH findings?
- Is there a correlation between test coverage and bug density?

### Part C: Test Infrastructure Quality

#### 1. Test Setup & Fixtures
- Are test databases properly isolated? Do tests clean up after themselves?
- Are there shared mutable state issues between tests?
- Do integration tests use real databases or mocks?
- Is the test seed data consistent with the current Prisma schema?

#### 2. E2E Test Effectiveness
- Read at least 10 Playwright spec files from `apps/app/e2e/` or similar
- Do E2E tests cover authenticated flows or just public pages?
- Are there E2E tests for critical user journeys (event creation, kitchen task workflow, procurement approval)?
- Do E2E tests verify database state after actions, or just check UI elements?

#### 3. CI Integration
- Check if there's a CI configuration (`.github/workflows/`, `vercel.json`)
- Are tests run on every PR?
- Is there coverage reporting?
- Are there flaky test suppressions that hide real failures?

### Part D: Recommendations

Based on the audit, produce a prioritized list of:
1. Tests that should be WRITTEN to prevent the most impactful bugs found in prior passes
2. Existing tests that should be DELETED (they test nothing or test mocks)
3. Test infrastructure improvements (seeding, isolation, CI)
4. Coverage targets by module (prioritized by bug density)

### Investigation approach:

- Start with a grep for assertion patterns: `expect(.*status`, `expect(.*toBe`, `expect(.*toEqual`, `expect.anything`, `not.toThrow`
- Read test files proportional to the criticality of the code they test
- Cross-reference every CRITICAL finding from passes 6-11 against test existence
- Map test file locations to production source file locations to identify gaps
- Check CI configuration for test execution and coverage settings
- Read at least 30 test files total across all domains

### Output format:

Append findings to IMPLEMENTATION_PLAN.md under a new section:

```markdown
## Test Quality & Coverage Gap Audit (12th Pass)

> **Audited:** 2026-04-25
> **Scope:** All 307 test files (296 unit vitest + 117 E2E Playwright) across apps/ and packages/
> **Method:** Assertion pattern analysis, CRITICAL-finding cross-reference, coverage gap mapping, test infrastructure review

### Part A: Assertion Effectiveness
[Weak patterns, mock-heavy tests, tests that pass regardless]

### Part B: Coverage Gap Analysis
[Cross-reference against known CRITICAL bugs, untested critical paths, test distribution heatmap]

### Part C: Test Infrastructure Quality
[Setup/fixtures, E2E effectiveness, CI integration]

### Part D: Recommended Actions
[Prioritized test writing plan, deletion candidates, infrastructure improvements]
```

### Guardrails

- Do NOT modify any source code or test code. This is diagnosis only.
- Do NOT report issues already documented in IMPLEMENTATION_PLAN.md (check all prior sections first).
- Cite exact file:line for every finding.
- Distinguish between "no test exists" (coverage gap) and "test exists but is weak" (quality issue).
- Prioritize findings by the severity of the production bugs they fail to catch.
- Count test files and assertions — provide data, not vibes.
