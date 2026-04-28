# Task-2 Validation Report: Proposal Claims in IMPLEMENTATION_PLAN.md Step 1

## Route/Storage Matrix

### API Routes (under `apps/api/app/api/crm/proposals/`)

| Route | Method | Storage | instanceId? |
|-------|--------|---------|-------------|
| `/list/route.ts` | GET | `database.proposal.findMany` (Prisma) | N/A (read) |
| `/[id]/route.ts` | GET | `database.proposal.findFirst` (Prisma) | N/A (read) |
| `/[id]/route.ts` | PUT | `executeManifestCommand` → `runtime.runCommand("update", ...)` | **NO** |
| `/[id]/route.ts` | DELETE | `executeManifestCommand` → `runtime.runCommand("withdraw", ...)` | **NO** |
| `/[id]/send/route.ts` | POST | `executeManifestCommand` → `runtime.runCommand("send", ...)` | **NO** |
| `/route.ts` | GET | `database.proposal.findMany` (Prisma, filtered/paginated) | N/A (read) |
| `/route.ts` | POST | `executeManifestCommand` → `runtime.runCommand("create", ...)` | **NO** (but create has fallback) |
| `/commands/create/route.ts` | POST | `runtime.runCommand("create", body, {entityName:"Proposal"})` | **NO** (but create has fallback) |
| `/commands/update/route.ts` | POST | `runtime.runCommand("update", body, {entityName:"Proposal"})` | **NO** ⚠️ |
| `/commands/send/route.ts` | POST | `runtime.runCommand("send", body, {entityName:"Proposal"})` | **NO** ⚠️ |
| `/commands/accept/route.ts` | POST | `runtime.runCommand("accept", body, {entityName:"Proposal"})` | **NO** ⚠️ |
| `/commands/reject/route.ts` | POST | `runtime.runCommand("reject", body, {entityName:"Proposal"})` | **NO** ⚠️ |
| `/commands/withdraw/route.ts` | POST | `runtime.runCommand("withdraw", body, {entityName:"Proposal"})` | **NO** ⚠️ |
| `/commands/mark-viewed/route.ts` | POST | `runtime.runCommand("markViewed", body, {entityName:"Proposal"})` | **NO** ⚠️ |
| `/templates/route.ts` | GET/POST | (ProposalTemplate, out of scope) | N/A |

### Manifest/Store Status

| Claim in Plan | Verified? |
|---------------|-----------|
| Manifest declares `store ... in memory` | ✅ Correct — `store Proposal in memory` at line end of proposal entity |
| No `ProposalPrismaStore` exists | ✅ Correct — not found anywhere |
| `ENTITIES_WITH_SPECIFIC_STORES` does not list `Proposal` | ✅ Correct — only `ProposalLineItem` is listed |
| `ProposalLineItemPrismaStore` exists in batch13 file | ✅ Correct — at line 150 of `broken-read-batch13-order-proposal.ts` |

### Frontend Entry Paths

| Plan Claim | Actual Code | Match? |
|------------|-------------|--------|
| `apps/app/app/(authenticated)/crm/proposals/...` | Path exists ✅ | ✅ |
| Frontend calls `GET /api/crm/proposals/list` for index | **WRONG** — `proposals-client.tsx` calls server action `getProposalsAction()` which does direct `database.proposal.findMany` (Prisma). The API route is never called from the frontend. | ❌ |
| Frontend calls `POST /api/crm/proposals/commands/{create\|send\|...}` for actions | **WRONG** — `actions.ts` does all CRUD via direct Prisma (`database.proposal.create`, `database.proposal.update`, etc.). None of the command API routes are called from the frontend. `sendProposal` sets status to "sent" via `database.proposal.update()`. | ❌ |

## Incorrect/Stale Plan Text

### 1. Frontend entry claim is wrong (HIGH)

**Plan says:**
> Frontend entry: `apps/app/app/(authenticated)/crm/proposals/...` calls `GET /api/crm/proposals/list` for the index and `POST /api/crm/proposals/commands/{create|update|send|accept|reject|withdraw|mark-viewed}` for actions.

**Reality:** The frontend uses **Next.js server actions** (`actions.ts`) that call Prisma directly. The API routes under `apps/api/app/api/crm/proposals/` are dead code from the frontend's perspective — no client component or server action fetches them. This is important because it means the plan's Step 1 fix (adding `ProposalPrismaStore` for manifest commands) would fix the API routes but **would NOT fix the actual user-facing flow** since the frontend bypasses manifest entirely.

### 2. "Status-transition commands likely missing instanceId" is confirmed but undersells the problem (HIGH)

**Plan says:**
> Status-transition commands — `runtime.runCommand(<verb>, ...)`, several **likely missing `instanceId`** (Blocker #1 candidates)

**Reality:** Not "several" — **ALL 7 command routes** (create, update, send, accept, reject, withdraw, mark-viewed) pass only `{ entityName: "Proposal" }` as the third argument to `runCommand`, with no `instanceId`. For `create`, the runtime has a special fallback path (`createInstance`) so it works. For all 6 status-transition commands, the `mutate` actions no-op at `runtime-engine.ts:2163-2166` because `options.instanceId` is falsy. This means:

- All command routes **silently return success** with events emitted
- **No data is persisted** to any store for status changes
- This is true regardless of whether a `ProposalPrismaStore` is added

The `executeManifestCommand` handler also never passes `instanceId` — so the PUT/DELETE on `[id]/route.ts` and POST on `[id]/send/route.ts` have the same bug.

### 3. Read/write split is actually a read/manifest-vs-direct-Prisma split (MEDIUM)

**Plan implies:** The issue is that writes go to manifest store (in memory) while reads go to Prisma, creating a split.

**Reality is more nuanced:** The frontend server actions write directly to Prisma (working). The API command routes write to manifest in-memory (broken due to missing `instanceId`). There are **two separate write paths**, and only the server-action path actually works for users. Adding a `ProposalPrismaStore` alone won't fix the command routes — they also need `instanceId`.

### 4. Additional route not mentioned in plan

The plan lists 7 commands (`create|update|send|accept|reject|withdraw|mark-viewed`) but there are additional API surfaces not covered:
- `proposals/route.ts` — GET (list with filters) and POST (create via `executeManifestCommand`)
- `[id]/route.ts` — PUT (update via `executeManifestCommand`) and DELETE (withdraw via `executeManifestCommand`)
- `[id]/send/route.ts` — POST (send via `executeManifestCommand`)

These all share the same `instanceId` bug.

## Minimal Proposed Edits to IMPLEMENTATION_PLAN.md

### Edit 1: Fix the frontend entry description

**Current:**
```
**Frontend entry:** `apps/app/app/(authenticated)/crm/proposals/...` calls `GET /api/crm/proposals/list` for the index and `POST /api/crm/proposals/commands/{create|update|send|accept|reject|withdraw|mark-viewed}` for actions.
```

**Proposed:**
```
**Frontend entry:** `apps/app/app/(authenticated)/crm/proposals/...` uses **Next.js server actions** (`actions.ts`) that call Prisma directly (`database.proposal.create`, `database.proposal.update`, etc.). The API routes under `apps/api/app/api/crm/proposals/` are **not called from the frontend**. The UI's `sendProposal` action sets `status: "sent"` via direct `database.proposal.update()` and sends email via Resend.
```

### Edit 2: Expand the instanceId claim

**Current:**
```
- Status-transition commands — `runtime.runCommand(<verb>, ...)`, several **likely missing `instanceId`** (Blocker #1 candidates)
```

**Proposed:**
```
- **ALL** command routes (create, update, send, accept, reject, withdraw, mark-viewed) call `runtime.runCommand(verb, body, { entityName: "Proposal" })` with **no `instanceId`**. `create` has a runtime fallback (`createInstance` when `instanceId` is absent), so it works. All 6 status-transition commands' `mutate` actions no-op silently (runtime-engine.ts:2163-2166). The same bug affects `executeManifestCommand`-based routes: `[id]/route.ts` PUT/DELETE, `[id]/send/route.ts` POST, and `proposals/route.ts` POST — none pass `instanceId`. **Confirmed Blocker #1.**
```

### Edit 3: Update concrete steps to address frontend reality

Add a new step 0 before the current step 1:

```
0. **Decide architecture:** The frontend server actions write directly to Prisma (working). The API command routes write through manifest runtime (broken, no `instanceId`). Decide whether to: (a) route frontend writes through the API/manifest commands (requires fixing `instanceId` + adding `ProposalPrismaStore`), or (b) remove the dead API command routes and treat server actions as canonical. Option (a) is aligned with the manifest-persistence repair goal.
```

### Edit 4: Update step 4 (instanceId fix)

**Current:**
```
4. Audit each command route under `apps/api/app/api/crm/proposals/commands/`. For every status-transition command (`accept`, `reject`, `send`, `withdraw`, `mark-viewed`, `update`), confirm the route passes `instanceId` to `runtime.runCommand`. Fix any that don't (Rule 7 of the task brief — fix in this phase).
```

**Proposed:**
```
4. Fix **every** Proposal command route to extract `instanceId` (the proposal `id`) from the request body and pass it as `instanceId` in the `runCommand` options. This applies to all 7 routes under `commands/` AND the 3 `executeManifestCommand`-based routes (`proposals/route.ts` POST, `[id]/route.ts` PUT/DELETE, `[id]/send/route.ts` POST). Without `instanceId`, `mutate` actions silently no-op at runtime-engine.ts:2163-2166.
```

### Edit 5: Add note about dual write paths

After the "Current split" section, add:

```
**⚠ Dual-write concern:** The frontend server actions (`actions.ts`) bypass manifest entirely, writing directly to Prisma. Even after adding `ProposalPrismaStore` and fixing `instanceId`, the user-facing flow will still use direct Prisma writes unless the server actions are also refactored to call the API routes or manifest runtime. If the goal is manifest-mediated writes for the user flow, the server actions need updating too. If the goal is only fixing the API routes (for any external/machine callers), the current server actions can remain as-is.
```

## Summary

| Category | Plan Claims Verified | Issues Found |
|----------|---------------------|--------------|
| Frontend paths | Path exists | Fetch URLs wrong — uses server actions, not API routes |
| API routes | All 7 commands found | Also 3 additional `executeManifestCommand` routes not listed |
| Manifest store | `store in memory` correct | ✅ |
| ProposalLineItemPrismaStore | Exists in batch13 | ✅ |
| ProposalPrismaStore | Correctly absent | ✅ |
| ENTITIES_WITH_SPECIFIC_STORES | Correctly excludes Proposal | ✅ |
| instanceId usage | "likely missing" on "several" | **ALL routes missing**, not just several — confirmed blocker |
| Overall | Read/write split described | Underestimates scope: frontend bypasses manifest entirely |
