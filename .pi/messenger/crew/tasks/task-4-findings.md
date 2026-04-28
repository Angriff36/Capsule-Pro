# Task-4 Findings: Blockers, Followups, and Verification Review

Review of IMPLEMENTATION_PLAN.md Known Blockers, Open Followups, Required Verification, and Done Criteria against AGENTS.md and actual code. Checked for duplicates, contradictions, stale claims, missing commands, and actionability.

---

## CRITICAL — Stale/Incorrect Frontend Path Claims

### F1. Proposal frontend does NOT call manifest command routes
**Location:** IMPLEMENTATION_PLAN Step 1
**Stale claim:** "Frontend entry: `apps/app/app/(authenticated)/crm/proposals/...` calls `POST /api/crm/proposals/commands/{create|update|send|accept|reject|withdraw|mark-viewed}` for actions."
**Reality:** The CRM proposals UI uses **Server Actions** (`apps/app/app/(authenticated)/crm/proposals/actions.ts`) with **direct Prisma calls** (`database.proposal.create(...)`, `database.proposal.update(...)`, `database.proposal.findMany(...)`). Zero references to `/api/crm/proposals` exist anywhere in `apps/app/`. The manifest command routes are completely unused by the frontend.
**Impact:** The claimed read/write split (manifest writes → Prisma reads) **does not exist** from the user's perspective. Both reads and writes already go through Prisma. Step 1's entire premise (add `ProposalPrismaStore` + wire into manifest runtime) would fix unused routes while the Server Actions continue working independently.
**Proposed edit:** Replace Step 1's frontend entry with: "Frontend uses Server Actions (`actions.ts`) that call Prisma directly. The `/api/crm/proposals/commands/*` manifest routes are NOT called by any frontend page. The real question is whether to align Server Actions with the manifest or abandon the manifest route path for this entity."

### F2. PurchaseOrder frontend path is under `procurement/`, not `inventory/`
**Location:** IMPLEMENTATION_PLAN Step 2
**Stale claim:** "Frontend entry: `apps/app/app/(authenticated)/inventory/purchase-orders/...`"
**Reality:** The frontend entry is `apps/app/app/(authenticated)/procurement/purchase-orders/...`. The frontend calls `/api/procurement/purchase-orders/*`, NOT `/api/inventory/purchase-orders/*`.
**Proposed edit:** Replace `inventory/purchase-orders` with `procurement/purchase-orders` in Step 2's frontend entry.

### F3. PurchaseOrder command routes and storage mismatch
**Location:** IMPLEMENTATION_PLAN Step 2
**Stale claims:**
- Claims frontend calls `POST /api/inventory/purchase-orders/commands/{create|submit|approve|reject|cancel|mark-ordered|mark-received}` — the frontend never calls these routes.
- Claims "Commands — manifest runtime" — the actual frontend-facing routes use `$queryRaw` (raw SQL), not manifest runtime.
**Reality:** The frontend calls:
- `/api/procurement/purchase-orders/commands/create` — raw SQL (`$queryRaw`)
- `/api/procurement/purchase-orders/commands/update-status` — raw SQL
- `/api/procurement/purchase-orders/commands/receive` — raw SQL
- `/api/procurement/purchase-orders/list` — raw SQL (`$queryRawUnsafe`)
- `/api/procurement/purchase-orders/[id]` — raw SQL (`$queryRawUnsafe`)
- `/api/inventory/purchase-orders/[id]/items/[itemId]/quantity` — Prisma (used by warehouse/receiving page)
- `/api/inventory/purchase-orders/[id]/items/[itemId]/quality` — Prisma (used by warehouse/receiving page)
- `/api/inventory/purchase-orders/[id]/complete` — (used by warehouse/receiving page)
**Impact:** Step 2's plan to add `PurchaseOrderPrismaStore` and wire manifest commands won't fix the routes the frontend actually uses, because those routes bypass the manifest entirely and use raw SQL.
**Proposed edit:** Replace Step 2's "Current split" with the actual routes above. Add a decision point: either (a) migrate the `/api/procurement/` routes from raw SQL to Prisma (which would fix persistence without manifest involvement), or (b) redirect the frontend to use the `/api/inventory/` manifest routes after wiring the store.

---

## CRITICAL — Blocker Accuracy

### F4. Blocker #1 (`instanceId`) — accurate, but generator contradiction
**Location:** IMPLEMENTATION_PLAN Known Blockers #1
**Claim:** "Generated HTTP command handlers that mutate an existing row must pass `instanceId` into `runtime.runCommand(...)`."
**Verified accurate:** All 6 Proposal status-transition command routes (`accept`, `markViewed`, `reject`, `send`, `update`, `withdraw`) pass only `{entityName: "Proposal"}` with NO `instanceId`. Same pattern for all 7 PurchaseOrder command routes under `/api/inventory/`. The `kitchen-tasks/commands/claim` reference correctly demonstrates the fix pattern.
**However — contradiction with AGENTS.md:** AGENTS.md says "Generated code is projection — never edit generated files" and the routes are marked "Generated from Manifest IR - DO NOT EDIT". The plan says "fix it in this phase" but doesn't address whether the fix should be in (a) the generator (which produces the route), or (b) the generated file itself (violating the rule). If the fix is generator-level, the scope is much larger.
**Proposed edit:** Add a note to Blocker #1: "Fix must be in the generator + regeneration, not hand-edited in generated files (per AGENTS.md 'never edit generated files' rule). If a quick generator fix isn't feasible, the route can be overridden as a one-off with a TODO linking back to the generator fix."

### F5. Blocker #2 (constraint polarity) — accurate core claim, missing detail
**Location:** IMPLEMENTATION_PLAN Known Blockers #2
**Claim:** `RuntimeEngine.evaluateConstraint` uses `constraint.name.startsWith("severity")` to detect negative-type constraints; `block*` named constraints are treated as positive.
**Verified accurate:** Runtime code at line 2629: `const isNegativeType = constraint.name.startsWith("severity")`. Zero constraints in the IR have names starting with "severity" — the check is dead code. All 16 `block*` named constraints across the codebase are treated as positive, inverting their logic.
**Missing detail:** The Proposal manifest has `block*` constraints at the **command level** (inside `command send`, `command accept`, `command withdraw`), not the entity level. The IR shows only 8 entity-level constraints for Proposal (none `block*`-named). It's unclear whether command-level constraints use the same `evaluateConstraint` path. The blocker should note this distinction.
**Proposed edit:** Add: "Note: `block*` constraints may appear at both entity-level and command-level. Verify command-level constraint evaluation uses the same polarity logic before assuming the bug applies there."

---

## MODERATE — Stale Counts & References

### F6. Quarantined manifests count is stale (AGENTS.md)
**Location:** AGENTS.md Known Gotchas
**Stale claim:** "17 manifests are quarantined in `packages/manifest-adapters/manifests-disabled/`"
**Reality:** 13 files total (12 active manifests + 1 `.bak` file `_digital-twin-rules.manifest.bak`).
**Proposed edit:** Change "17 manifests" to "12 manifests (plus 1 `.bak` file)".

### F7. Open Followups E1, E3, E5 are unresolvable references
**Location:** IMPLEMENTATION_PLAN Open Followups
**Claim:** "E1, E3, E5 — runtime/generator items tied to Blockers #1 and #2"
**Problem:** These IDs have no cross-reference or link. An implementer cannot determine what E1, E3, E5 specifically are without finding the original context (likely in an archive file, but which one?).
**Proposed edit:** Either expand each to a one-line description or link to the specific archive section where they're defined.

---

## MODERATE — Verification & Done Criteria Gaps

### F8. Missing `pnpm biome check` in verification block
**Location:** IMPLEMENTATION_PLAN Required Verification per Entity
**Gap:** The verification block lists `pnpm --filter @repo/manifest-adapters typecheck/test`, `pnpm --filter api typecheck/test`, and Playwright E2E. AGENTS.md's Validation section also includes `pnpm biome check` as a standard step.
**Proposed edit:** Add `pnpm biome check` to the verification block.

### F9. Done criteria missing standard checks
**Location:** IMPLEMENTATION_PLAN Done Criteria
**Claim:** "A parent entity is not done unless: the new HTTP-route test passes, `pnpm --filter api typecheck` is clean, and the visible behavior listed below works against a fresh database."
**Missing per AGENTS.md:**
- `pnpm biome check` should pass
- No `console.log` in new code (Test & Logging Hygiene rule)
- E2E product-flow test should pass if create/edit/delete UI is touched
**Proposed edit:** Add these three items to the done criteria.

---

## MINOR — Redundancy

### F10. "Required pattern" duplicates Blocker instructions
**Location:** IMPLEMENTATION_PLAN Required Pattern steps 5 and 6
**Issue:** Steps 5 and 6 repeat the same guidance as Known Blockers #1 and #2. This isn't contradictory but is redundant.
**Proposed edit:** Collapse steps 5 and 6 to: "5. Apply Blocker #1 fix if hit (see Known Blockers #1). 6. Apply Blocker #2 protocol if hit (see Known Blockers #2)."

---

## MINOR — Verified Correct (for completeness)

- **`store Proposal in memory`** — confirmed in manifest file
- **No `ProposalPrismaStore`** — confirmed; only `ProposalLineItem` in stores
- **No `PurchaseOrderPrismaStore`** — confirmed; only `PurchaseOrderItem` in stores
- **`ENTITIES_WITH_SPECIFIC_STORES` lacks `Proposal` and `PurchaseOrder`** — confirmed
- **Item-level PATCH routes use Prisma** (not raw SQL) — confirmed via `database.$transaction(...)` in quantity/quality routes
- **Line count at 207** — under the 300-line target
- **`createPrismaStoreProvider` switch pattern** — confirmed, would need new cases added

---

## Summary of Action Items

| Priority | Finding | Fix |
|----------|---------|-----|
| CRITICAL | F1: Proposal frontend uses Server Actions, not manifest routes | Rewrite Step 1 scope — address Server Actions or acknowledge routes are unused |
| CRITICAL | F2: PO frontend is under `procurement/`, not `inventory/` | Fix path in Step 2 |
| CRITICAL | F3: PO frontend-facing routes use raw SQL, not manifest runtime | Rewrite Step 2 to target actual routes or redirect frontend |
| CRITICAL | F4: Generator vs generated-file contradiction | Add guidance to Blocker #1 |
| HIGH | F5: Command-level vs entity-level constraints unclear | Add note to Blocker #2 |
| MODERATE | F6: Stale "17 manifests" count | Update to 12 |
| MODERATE | F7: E1/E3/E5 are opaque references | Expand or link |
| MODERATE | F8-F9: Missing verification/done items | Add biome check, logging hygiene, E2E |
| LOW | F10: Redundant blocker instructions | Collapse |
