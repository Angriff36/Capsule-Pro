# Ledger Archive

Archived ledger entries. See tasks/ledger.md for current entries and rules.

---

# Agent 46

**Agent ID:** 46
**Date/Time:** 2026-02-28 22:50
**Base branch/commit:** codex/manifest-cli-doctor @ 5e8b3b983

**Goal:**
Fix false-positive COMMAND_ROUTE_ORPHAN detection in manifest CLI — kebab-case filesystem paths were not matching camelCase IR command names, causing 59 of 61 orphan warnings to be false positives.

**Points tally:** 16 points

---

# Agent 45

**Agent ID:** 45
**Date/Time:** 2026-02-28 22:00
**Base branch/commit:** codex/manifest-cli-doctor @ 47ccabd90

**Goal:**
Complete the manifest route ownership enforcement wiring: fix the CLI path resolution bug blocking the audit, publish 0.3.28, wire the audit into the build pipeline as non-blocking, and add CI job for rollout.

**Points tally:** 13 points

---

# Agent 44

**Agent ID:** 44
**Date/Time:** 2026-02-28 18:00
**Base branch/commit:** codex/manifest-cli-doctor @ 47ccabd90

**Goal:**
Implement manifest deterministic write-route ownership: compile emits `kitchen.commands.json`, generator validates forward/mirror/method checks, audit-routes gains 3 new ownership rules with exemption registry.

**Points tally:** 20 points

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
