# Ledger Archive

Archived ledger entries. See tasks/ledger.md for current entries and rules.

---

# Agent 42

**Agent ID:** 42
**Date/Time:** 2026-02-23 13:52
**Base branch/commit:** fix/dev-server-stability @ HEAD (v0.7.32)

**Goal:**
Implement conformance tests for PrismaJsonStore and PrismaIdempotencyStore per specs/manifest/prisma-adapter/prisma-adapter.md.

**Points tally:** 18 points

---

# Agent 43

**Agent ID:** 43
**Date/Time:** 2026-02-23 15:45
**Base branch/commit:** fix/dev-server-stability @ 01c0d8b92

**Goal:**
Migrate `ai/bulk-generate/prep-tasks` service to use manifest runtime for PrepTask creation instead of raw Prisma operations.

**Points tally:** 15 points

---

# Agent 1 (Example)

**Agent ID:** 1
**Date/Time:** EXAMPLE
**Base branch/commit:** EXAMPLE

**Goal:**
Demonstrate how to correctly fill out a ledger entry.

**Invariants enforced:**

- Tests are used to expose real failures, not to go green.
- "Pre-existing" requires action, not dismissal.

**Subagents used:**

- Reproducer agent: illustrates what a minimal failing test would be.
- Tracing agent: illustrates how a root cause would be identified.

**Reproducer:**
EXAMPLE: `path/to/minimal-reproducer.test.ts`

**Root cause:**
EXAMPLE: An invariant is violated at a system boundary due to an unguarded assumption.

**Fix strategy:**
EXAMPLE: Fix the violation at the boundary, not downstream symptoms. Minimal scope.

**Verification evidence:**
EXAMPLE:

```
pnpm test <target>
pnpm build <affected>
```

**Follow-ups filed:**
None (example entry).

**Points tally:**
0 — instructional entry only.

---
