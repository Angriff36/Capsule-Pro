# Manifest Governance Boundary — Implementation Plan
**Date:** 2026-02-22  
**Status:** Proposed  
**Goal:** Make Manifest the single governance boundary for domain mutations, with stable idempotency and single-point outbox emission.

---

## Why this exists (plain English)
Right now there are multiple independent writers touching the same domain state:
1) Manifest runtime path (good intent) + idempotency store (broken key generation).
2) `approveManifestPlan()` executes “commands” via direct Prisma writes (bypasses runtime).
3) Outbox events emitted from multiple uncontrolled points (duplicated, non-atomic, inconsistent).

This plan makes the rule real:
**All domain mutations happen by executing Manifest commands.**

---

## Non-negotiables
1) **One canonical mutation path:** “execute command” only.
2) **Stable idempotency keys:** same logical action => same key (no random UUID in the fallback).
3) **Outbox emission is a consequence of commit:** exactly-once per committed command, emitted from a single point.

---

## A. Fix idempotency key generation (tool-registry)
### Problem
The current fallback idempotency key includes randomness (UUID), so retries are never deduped.

### Change
**File:** `apps/app/app/api/command-board/chat/tool-registry.ts`  
**Change:** remove random component from fallback.  
Fallback should be stable for the same logical tool call:
- `idempotencyKey = "${correlationId}:${callId}"`

### Why
- `correlationId` identifies the chat message/session unit of work.
- `callId` identifies the tool call within that unit.
- If the network retries the same tool call, the key stays identical.

---

## B. Make `approveManifestPlan()` stop being a second command engine
### Problem
`approveManifestPlan()` currently executes most “domain steps” via direct Prisma writes, plus it writes its own results to `manifest_idempotency`. That creates:
- a second mutation engine
- a parallel idempotency system
- inconsistent outbox emission

### Design: Plan approval becomes an orchestrator, not a writer
Plan approval should:
1) Decide which manifest commands to execute and in what order.
2) Execute them through the canonical manifest command path.
3) Record plan-level status (fine).
4) Never directly mutate domain tables (except allowlisted UI-only tables like board projections).

### Implementation approach options
- **Option A (preferred for consistency):** For each step, call the existing generated manifest command routes via `fetch()` (same as AI tool calls).
- **Option B (higher performance, more wiring):** Run an embedded runtime in the server action (call `runtime.runCommand()` directly).
- **Option C (needed for multi-entity steps):** Create a composite manifest command route that executes multiple commands inside a single transaction.

This plan uses:
- Option A for most steps (reuse the canonical HTTP surface).
- Option C only where you truly need atomic multi-entity behavior.

---

## C. Stable idempotency in plan execution
### Rule
Each plan step must have a stable idempotency key that represents the logical step, not the request attempt.

**Standard:**
- `stepIdempotencyKey = "plan:${planId}:step:${stepId}"`

That key must be passed to the manifest command execution path (header + payload if you support both).

---

## D. Outbox emission: single canonical point
### Problem
Outbox events are emitted from multiple places today, including:
- telemetry hooks
- server actions
- ad-hoc helpers
- routes that mutate tables directly

This causes duplicates, missing events, and non-atomic commits.

### Rule
**Outbox records must be written inside the same transaction that commits the command’s state changes.**

No other code path is allowed to write domain outbox events.

### Required changes (high-level)
1) Ensure the runtime/store layer is the only place that writes outbox events for domain commands.
2) Remove manual outbox emission from server actions that already execute manifest commands.
3) Remove ad-hoc outbox emission in helper routes by migrating those mutations into manifest commands (or composite routes).

---

## E. approveManifestPlan(): per-step routing decision (the 9 bad ones)
These are the direct-Prisma “command types” you listed. Each needs an explicit routing decision:

1) `create_event`
- **Decision:** (a) Call existing manifest command route.
- **Note:** if `BattleBoard` creation is required, that should be a consequence of the command (hook) or a follow-up manifest command, not a direct Prisma side-effect.

2) `link_menu` (currently writing to event_dishes join table)
- **Decision:** (c) Needs a composite or a new manifest entity/command for EventDish (because MenuDish is not the same concept).
- **Reason:** Don’t map unrelated tables just to reuse a route.

3) `create_task`
- **Decision:** (a) Call existing PrepTask.create route.
- **Prereq:** if required args like `prepListId` block you, you must either (1) make it derivable, or (2) provide a canonical “create task for event/preplist” composite command.

4) `assign_employee` (EventStaffAssignment-like join)
- **Decision:** (c) Create a manifest entity/command (EventStaffAssignment) OR a composite route that performs the join as a governed command.
- **Do not allowlist:** this is domain state.

5) `update_inventory`
- **Decision:** (a) Call existing InventoryItem.adjust/update route.

6) `update_task`
- **Decision:** (c) Add missing manifest commands (updateStatus/updatePriority/etc) then call those routes.
- **Reason:** “generic update via SQL” is exactly how governance dies.

7) `update_event`
- **Decision:** (a) Call existing Event.update route.

8) `update_role_policy`
- **Decision:** (c) Create Role/Policy manifest entity/commands OR treat as admin-config and move behind a governed admin command surface.
- **Do not allowlist if it affects behavior:** policy changes are governance-critical.

9) Board mutations (projections/annotations)
- **Decision:** Allow direct Prisma writes (UI-layer state), but they must not emit domain outbox events.

---

## F. Migration order (incremental, don’t nuke prod)
1) **Idempotency key stability in tool-registry** (small, safe).
2) **Refactor approveManifestPlan to execute steps via canonical manifest route** for the easy ones:
   - update_event, update_inventory, create_task (if args workable).
3) **Introduce missing manifest commands/entities**:
   - PrepTask update commands
   - EventDish entity/command
   - EventStaffAssignment entity/command
4) **Outbox consolidation**:
   - stop emitting outbox from anywhere except the runtime/store commit path.
5) **Delete plan-level “pretend command engine” remnants**:
   - the only thing plan approval stores in `manifest_idempotency` should be plan-level receipts, not domain mutation receipts.

---

## G. Verification checklist
- For a single user action (tool call or plan approval step), repeated retries produce:
  - identical idempotency key
  - only one domain mutation
  - subsequent retries return the same stored result
- For a single command commit:
  - exactly one outbox event set is emitted
  - emitted within the same transaction as state change (atomicity)
- For recipe versioning flows:
  - there is exactly one writer responsible for recipe mutations
  - recipe.updated events appear once per committed recipe command

---

## H. Notes on production-safe index rollout (from DB audit)
If you apply `CREATE INDEX CONCURRENTLY`, PostgreSQL forbids running it inside a transaction block, so it must be executed accordingly.  
Reference: PostgreSQL `CREATE INDEX CONCURRENTLY` restriction.  
Reference: Prisma `db execute` can apply SQL scripts directly when needed.

(Links/citations should be included in the PR description.)