# Task-1 Report: Review IMPLEMENTATION_PLAN.md Structure and Archive Discipline

## Overall Assessment

IMPLEMENTATION_PLAN.md is **207 lines** (within the ≤300 target). The overall structure follows AGENTS.md planning-file discipline well. All 15 archive map paths resolve to existing files. "Recently Resolved" is concise (highlights + archive pointers only, not full write-ups). Update Discipline rules are internally consistent.

**Verdict: Structure is sound. A few content accuracy issues and minor structural nits.**

## Findings

### 1. Archive Map — All Paths Exist ✅

All 15 referenced paths in the Archive Map section exist on disk:
- 5 under `docs/implementation-history/`
- 10 under `docs/audits/`

No stale or broken archive links.

### 2. Line Count — Within Target ✅

207 lines, well under the ≤300 target.

### 3. Recently Resolved — Good Discipline ✅

The "Recently Resolved" section contains only highlights with archive pointers. No completed pass write-ups are inlined. It correctly defers to `docs/implementation-history/passes-38-63.md` for batch details.

### 4. Update Discipline — Internally Consistent ✅

The 5 rules in "Update Discipline" are self-consistent and align with AGENTS.md rules:
- Move detailed write-ups to archive
- Only update Recently Resolved, in-scope table, and Known Blockers
- Replace Step 1 with next entity
- Keep ≤300 lines
- Never delete archive content

### 5. "verified 2026-04-28" Claims Are Inaccurate ⚠️

**Lines 64 and 99** (Step 1 and Step 2 "Current split" headers) say `(verified 2026-04-28)` but task-2 and task-3 found these "verified" claims are **wrong**:

**Step 1 (line 64):** Claims frontend calls `GET /api/crm/proposals/list` and `POST /api/crm/proposals/commands/{...}` — actually uses server actions with direct Prisma.

**Step 2 (line 99):** Claims frontend calls `GET /api/inventory/purchase-orders` — actually calls `GET /api/procurement/purchase-orders/list` (raw SQL). Claims item-level routes are PATCH — actually PUT.

**Proposed edit:** Remove "(verified 2026-04-28)" from both headers until the claims are actually verified through code. Or replace with "(needs re-verification — see task-2/task-3 reports)".

### 6. Step 2 Label Inconsistency ⚠️ (MINOR)

**Line 88:** `## Step 2 — PurchaseOrder (Inventory)` 

The frontend routes are under `procurement/`, not `inventory/`. The label suggests the entity lives in the inventory domain, which is technically correct (tenant_inventory schema), but it's misleading given the frontend architecture.

**Proposed edit:** `## Step 2 — PurchaseOrder (Procurement / Inventory)` to acknowledge both the frontend path and schema location.

### 7. Section Structure — Clean ✅

All major sections are present and in a logical order:
1. Current Task (overview)
2. Step 1 (active work)
3. Step 2 (next work)
4. Tracked but not started
5. Known Blockers
6. Recently Resolved
7. Open Followups
8. Archive Map
9. Update Discipline

### 8. "Required Pattern" Section — Missing Server Action Guidance ⚠️

The "Required pattern" section (lines ~28-38) gives instructions for tracing `fetch(...)` URLs, but doesn't account for Next.js server actions. Step 1 says "capture the fetch URL" but the Proposal frontend uses no `fetch()` — it uses server actions.

**Proposed edit:** Change step 1 from "capture the `fetch(...)` URL" to "capture the API route or server action the page uses" to cover both patterns.

### 9. Out-of-Scope vs. Active Work Contradiction ⚠️

"Out of scope" (line ~44) says: "Rewriting routes that the frontend doesn't actually call." But Step 2's concrete steps focus on `inventory/purchase-orders/` routes, which the frontend **doesn't call** (frontend uses `procurement/` routes). This is a real contradiction.

**Proposed edit:** Clarify that "out of scope" refers to camelCase duplicate cleanup, not to fixing manifest-backed routes that share a domain with the frontend-active routes. Or acknowledge the dual-path and decide which set to fix.

### 10. No Progress Notes in AGENTS.md ✅

Checked AGENTS.md — it contains only durable operational rules, no progress notes or per-pass status updates. ✅

### 11. Archive Content Not Deleted ✅

All archive files are present and contain content. No evidence of deletion. ✅

## Summary

| Check | Result |
|-------|--------|
| ≤ 300 lines | ✅ 207 lines |
| Archive map paths exist | ✅ All 15 exist |
| Recently Resolved is concise | ✅ Highlights only |
| No completed write-ups inlined | ✅ |
| Update Discipline consistent | ✅ |
| AGENTS.md has no progress notes | ✅ |
| Archive content not deleted | ✅ |
| Section structure logical | ✅ |
| "verified" claims accurate | ❌ Both are wrong per task-2/task-3 |
| Step 2 label | ⚠️ Misleading (Inventory vs Procurement) |
| Server action guidance | ⚠️ Missing from Required Pattern |
| Out-of-scope vs active work | ⚠️ Contradictory for PurchaseOrder |

## Minimal Proposed Edits

1. **Remove or correct "verified 2026-04-28"** from Step 1 and Step 2 "Current split" headers
2. **Change Step 2 label** from `(Inventory)` to `(Procurement / Inventory)`
3. **Update Required Pattern step 1** to cover server actions, not just `fetch()`
4. **Clarify Out-of-Scope** to distinguish camelCase cleanup from dual-path route sets
