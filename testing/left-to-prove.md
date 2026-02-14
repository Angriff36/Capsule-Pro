# Left To Prove

> Note: Historical gap list from pre-restructure testing. For active paths and workflow, use `docs/manifest/README.md`.

**Status**: ⚠️ **MAJOR GAPS IN TEST COVERAGE**

## What We Have (Limited)
- ✅ Constraint severity works for 3 unit test cases
- ✅ Projection system generates TypeScript-valid code
- ✅ Generator produces correct code for 1 entity

## Critical Gaps (Production Blockers)

### Must Have Before Production
1. **End-to-end HTTP execution** - Make real requests to Next.js
2. **All 7 commands tested** - Currently only 1 (claim) proven
3. **Real auth mode** - Actual Clerk, not `authProvider:"none"`
4. **Failure branch testing** - Verify 403/422/400 responses
5. **Database integration** - Real DB with transactions
6. **Multiple entities** - At least 2-3 different entities

### Should Have
7. Event stability (shape + ordering)
8. CLI error handling (bad inputs)
9. Snapshot update policy
10. Multi-constraint scenarios

### Nice to Have
11. Performance testing
12. Security audit
13. Tooling drift stability

## Current Reality

**Tested Scope**: 3 test suites, 10 tests total
- 3 severity unit tests (in-memory only)
- 2 projection tests (static check only)
- 5 generator tests (string matching only)

**Production Status**: ❌ NOT READY

We have infrastructure and passing tests, but insufficient coverage for production use.

See `proven-with-tests.md` for honest breakdown of what's actually been tested.
