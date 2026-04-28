# Task-4 Report: Review Blockers, Followups, and Verification Criteria

## Findings by Section

### Known Blocker #1 — `instanceId` on instance-scoped commands

**Current text:**
> Generated HTTP command handlers that mutate an existing row must pass `instanceId` into `runtime.runCommand(...)`. Today archive / acknowledge–style routes call `runCommand` with only `entityName`, so `mutate` / `updateInstance` no-op at the store even after a dedicated Prisma store exists.

**Assessment:**
- ✅ Mechanically correct — confirmed by task-2 and task-3 that `mutate` no-ops at `runtime-engine.ts:2163-2166` when `options.instanceId` is absent.
- ⚠️ **Undersells scope.** The text says "archive / acknowledge–style routes" as if only some routes have this bug. Task-2 confirmed **ALL 7** Proposal command routes (not just "several") lack `instanceId`. Task-3 confirmed **ALL 7** PurchaseOrder `inventory/` command routes lack `instanceId`. The `executeManifestCommand` helper (used by `proposals/[id]/route.ts` PUT/DELETE, `proposals/[id]/send/route.ts`, `inventory/purchase-orders/[id]/route.ts` PUT/DELETE, `inventory/purchase-orders/[id]/items/[itemId]/quality/route.ts`) also never passes `instanceId`.
- ⚠️ **Missing the `executeManifestCommand` angle.** The blocker text focuses on "generated HTTP command handlers" but doesn't mention the shared `executeManifestCommand` helper in `apps/api/app/lib/manifest-command-handler.ts`, which also doesn't pass `instanceId`. Any route using this helper (PUT/DELETE on `[id]` routes) has the same bug.

**Proposed edit:**
> **Generator — `instanceId` on instance-scoped commands.** All generated HTTP command handlers that mutate an existing row must pass `instanceId` into `runtime.runCommand(...)`. Today **every** Proposal and PurchaseOrder command route calls `runCommand` with only `{ entityName }` and no `instanceId` — `mutate` actions silently no-op at `runtime-engine.ts:2163-2166`. The shared `executeManifestCommand` helper in `apps/api/app/lib/manifest-command-handler.ts` has the same gap. **Confirmed on ALL routes**, not just "some archive/acknowledge-style" ones. Reference pattern: `kitchen-tasks/commands/claim`. **In-phase rule:** fix on every in-scope route, add regression test.

### Known Blocker #2 — constraint polarity for `:block`

**Assessment:**
- ✅ Plausible and actionable. Describes a real mechanism.
- ⚠️ **Not encountered in task-2 or task-3** — we didn't test actual command execution, so we can't confirm or deny whether Proposal/PurchaseOrder manifests trigger this. The `proposal-rules.manifest` has several `:block` constraints (`blockNoLineItems`, `blockExpired`, `blockAlreadyAccepted`, `blockAlreadyWithdrawn`) that would be affected if this bug exists.

### Known Blocker #3 — `@angriff36/manifest` publish/version

**Assessment:**
- ✅ Valid coordination concern. Not testable through static analysis alone.

### Known Blocker #4 — Bypass / camelCase duplicates

**Assessment:**
- ✅ Valid. Task-3 confirmed `apps/api/app/api/purchaseorder/` and `apps/api/app/api/purchaseorderitem/` exist as stale duplicates.
- ⚠️ **Missing the `procurement/` vs `inventory/` dual-path issue.** Blocker #4 covers camelCase duplicates but doesn't address the more significant problem: many entities have **two kebab-case route sets** (e.g., `procurement/purchase-orders` + `inventory/purchase-orders`) where the frontend only calls one. This is a distinct category from camelCase duplicates.

**Proposed addition (new Blocker #5):**
> **Frontend-active routes may differ from manifest-backed routes.** For PurchaseOrder, the frontend calls `/api/procurement/purchase-orders/` (raw SQL), not `/api/inventory/purchase-orders/` (Prisma + manifest). For Proposal, the frontend uses server actions (direct Prisma), not the API routes at all. Fixing the manifest-backed routes alone won't fix the user-facing flow. For each entity, trace which routes the frontend actually calls before investing in manifest/store fixes.

### Open Followups

**E3-2 — generator emit `instanceId`:**
- ✅ Valid and directly related to Blocker #1.
- Task-2/task-3 confirmed this is broader than the generator — even manually-written routes (via `executeManifestCommand`) don't pass `instanceId`. The fix may need to be in `executeManifestCommand` itself, not just the generator.

**Procurement requisitions / vendor-contracts 500s:**
- ✅ Valid. Confirmed in AGENTS.md Known Gotchas.

**Quarantined manifests:**
- ✅ Valid. No action needed now.

**Missing from followups:**
- **Server actions bypassing manifest.** The Proposal frontend uses server actions (`actions.ts`) that call Prisma directly, completely bypassing manifest runtime. This is a significant architectural split not mentioned in followups.
- **Procurement routes using raw SQL.** The PurchaseOrder frontend-active routes use `$queryRawUnsafe` and `$queryRaw` instead of Prisma ORM or manifest. This sits outside RLS and ORM safety.

### Required Verification Per Entity

**Current text:**
```sh
pnpm --filter @repo/manifest-adapters typecheck
pnpm --filter @repo/manifest-adapters test
pnpm --filter api typecheck
pnpm --filter api test
pnpm exec playwright test e2e/workflows/<relevant>.workflow.spec.ts --project=chromium --workers=1
```

**Assessment:**
- ✅ Correct commands.
- ⚠️ **No E2E test file exists for proposals or purchase orders.** There is no `e2e/workflows/proposals.workflow.spec.ts` or `e2e/workflows/purchase-orders.workflow.spec.ts`. The plan's Step 1 step 5 proposes creating `apps/api/__tests__/crm/proposals/proposal-end-to-end.test.ts` — this is an API-level test, not an E2E test. The verification block should distinguish between "API integration test" and "E2E product-flow test".
- ⚠️ **The verification should test through the route the frontend actually calls**, not just the manifest-backed route. Per the "Required pattern" step 4: "Prove it through the same route the frontend uses." For Proposal, the frontend uses server actions, not API routes. For PurchaseOrder, the frontend uses `procurement/` routes, not `inventory/` routes.

### "Required pattern" Section Issues

**Step 1 — "Trace the live route":**
> Open the page the user actually visits in `apps/app/`, capture the `fetch(...)` URL

⚠️ **Misleading for Proposal.** The Proposal page doesn't use `fetch()` at all — it uses Next.js server actions. The instruction to "capture the fetch URL" doesn't account for server actions. Should be: "capture the API route or server action the page uses."

**Step 2 — "Classify each route's storage path":**
✅ Good instruction.

**Step 3 — "Align write and read":**
> If the entity has a Prisma model and read APIs already use Prisma, add a parent `<Entity>PrismaStore`

⚠️ This guidance assumes writes flow through manifest runtime. For Proposal, writes flow through server actions (Prisma). Adding `ProposalPrismaStore` only fixes the unused API command routes. The step should acknowledge that some entities may need server actions refactored too.

**Step 4 — "Prove it through the same route the frontend uses":**
> Add an API-level integration test ... that calls `POST /api/<canonical>/commands/<verb>`

⚠️ For Proposal, the "same route the frontend uses" is a server action, not an API route. For PurchaseOrder, it's `/api/procurement/purchase-orders/commands/*`, not `/api/inventory/purchase-orders/commands/*`.

### Contradictions Found

1. **"Don't rewrite routes the frontend doesn't call" (Out of scope) vs. "fix manifest-backed routes" (Required pattern).** The out-of-scope section says don't rewrite routes the frontend doesn't call. But for PurchaseOrder, the manifest-backed `inventory/` routes are exactly that — routes the frontend doesn't call. The plan then instructs fixing those same routes (Step 2 concrete steps). This is contradictory.

2. **"Always trace from the frontend" (Blocker #4) vs. Step 2 fixing `inventory/` routes.** For PurchaseOrder, tracing from the frontend leads to `procurement/` (raw SQL), not `inventory/` (manifest). Yet the plan's Step 2 focuses entirely on `inventory/` routes.

3. **Step 1 Proposal plan says "verify frontend calls GET /api/crm/proposals/list"** but the frontend actually uses server actions. The plan's own instruction to trace from the frontend was not followed when writing Step 1.

### Missing Items

1. **No mention of the `executeManifestCommand` helper as a systemic source of the `instanceId` bug.** Fixing individual route files is treating the symptom; the helper itself should be updated.

2. **No mention that Proposal frontend uses server actions, not API routes.** This is a fundamentally different architecture than what the plan assumes.

3. **No Blocker or followup for the procurement/inventory dual-path problem.** For PurchaseOrder (and potentially other entities), there are two separate kebab-case API surfaces, only one of which the frontend calls.

4. **The "done criteria" doesn't mention testing through the frontend's actual write path.** If the server action works but the manifest route doesn't (or vice versa), the plan should specify which one must pass.

## Summary of Proposed Edits

| Location | Issue | Edit Needed |
|----------|-------|-------------|
| Blocker #1 | Undersells scope; misses `executeManifestCommand` | Expand to note ALL routes affected, mention `executeManifestCommand` helper |
| Blocker #4 area | Missing dual-path issue | Add Blocker #5: frontend-active routes may differ from manifest routes |
| Open Followups | Missing server-action bypass, raw SQL concern | Add followups for server actions and procurement raw SQL |
| Required pattern step 1 | Assumes `fetch()` | Generalize to "API route or server action" |
| Required pattern step 3 | Assumes manifest writes | Acknowledge server action path |
| Required pattern step 4 | Assumes canonical API routes | "Same route frontend uses" = server action for Proposal, procurement for PO |
| Out of scope | Contradicts fixing `inventory/` routes | Clarify which routes are canonical |
| Verification block | No E2E tests for proposals/POs | Distinguish API test vs E2E test |
| Step 1 | Frontend fetch URLs wrong | Fix per task-2 report |
| Step 2 | Frontend path and APIs wrong | Fix per task-3 report |
