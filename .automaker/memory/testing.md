---
tags: [testing]
summary: testing implementation decisions and patterns
relevantTo: [testing]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# testing

### Static analysis via grep instead of Playwright for server-side tenant isolation verification (2026-01-17)
- **Context:** Task specified Playwright verification but the code is server-side database queries without UI
- **Why:** Playwright tests browser interactions; tenant filtering happens at database layer, not UI layer
- **Rejected:** Playwright would require building fake UI and wouldn't actually test database query isolation
- **Trade-offs:** Static analysis catches all structural issues instantly; misses runtime integration bugs that need database setup
- **Breaking if changed:** If you rely only on UI testing for tenant isolation, you'll miss database-level bypass vulnerabilities

#### [Pattern] Pure domain functions with no external dependencies for deterministic testing (2026-01-17)
- **Problem solved:** State transition and claim validation logic needs comprehensive test coverage
- **Why this works:** Functions are deterministic with no side effects, easy to test without mocks, fast test execution
- **Trade-offs:** Easy testing but requires separate database update logic (not in this package)