---
tags: [architecture]
summary: architecture implementation decisions and patterns
relevantTo: [architecture]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# architecture

### Created separate @repo/kitchen-state-transitions package instead of embedding in @repo/database (2026-01-17)
- **Context:** State machine logic needed by both server (API) and client (kitchen mobile app)
- **Why:** Decouples domain logic from database implementation, avoids server-only dependency constraints from Prisma, enables pure client-side validation
- **Rejected:** Putting in @repo/database package - rejected because it has server-only directive preventing client-side imports
- **Trade-offs:** Easier client usage and testing, but requires type mirroring and maintaining synchronization with database schema
- **Breaking if changed:** Moving to server-only package would break kitchen mobile app imports requiring client-side state validation

#### [Pattern] Discriminated union result type pattern (success/error with type guards) (2026-01-17)
- **Problem solved:** Need type-safe error handling without throwing exceptions for domain validation
- **Why this works:** Compile-time type checking of success/error paths, explicit error handling at call sites, no try/catch boilerplate
- **Trade-offs:** More verbose result objects vs simpler exception flow, but enforces explicit error handling

### Allowed in_progress -> open transition (revert) instead of strictly forward-only state progression (2026-01-17)
- **Context:** Kitchen tasks need to be moved back to unassigned pool if chef cannot complete
- **Why:** Real-world kitchen workflows need error recovery without creating new tasks, enables flexible task reassignment
- **Rejected:** Strict forward-only progression - rejected because would require creating new tasks for reassignment
- **Trade-offs:** Enables flexibility but potential for inconsistent workflows if abused
- **Breaking if changed:** Removing this transition would break task reassignment flow and require task duplication