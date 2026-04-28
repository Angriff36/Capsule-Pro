# Task-3 Validation Report: PurchaseOrder Claims in IMPLEMENTATION_PLAN.md Step 2

## Route/Storage Matrix

### Frontend-Active Routes (called by procurement UI)

The frontend lives under `apps/app/app/(authenticated)/procurement/purchase-orders/...` and calls:

| Frontend Page | API Called | Method | Storage | instanceId? |
|---------------|-----------|--------|---------|-------------|
| `page.tsx` (list) | `/api/procurement/purchase-orders/list` | GET | **Raw SQL** (`$queryRawUnsafe`) | N/A |
| `[id]/page.tsx` (detail) | `/api/procurement/purchase-orders/${id}` | GET | **Raw SQL** (`$queryRawUnsafe`) | N/A |
| `[id]/page.tsx` (status change) | `/api/procurement/purchase-orders/commands/update-status` | POST | **Raw SQL** (`$queryRaw`) | N/A |
| `[id]/page.tsx` (receive items) | `/api/procurement/purchase-orders/commands/receive` | POST | **Raw SQL** (`$queryRaw`) | N/A |
| `new/page.tsx` (create) | `/api/procurement/purchase-orders/commands/create` | POST | **Raw SQL** (`$queryRaw`) | N/A |

### Manifest-Backed Routes (under `inventory/purchase-orders` — NOT called by frontend)

| Route | Method | Storage | instanceId? |
|-------|--------|---------|-------------|
| `inventory/purchase-orders/list/route.ts` | GET | **Prisma** (`database.purchaseOrder.findMany`) | N/A |
| `inventory/purchase-orders/route.ts` | GET/POST | GET: Prisma / POST: `executeManifestCommand` | **NO** |
| `inventory/purchase-orders/[id]/route.ts` | GET/PUT/DELETE | GET: Prisma / PUT,DELETE: `executeManifestCommand` | **NO** |
| `inventory/purchase-orders/commands/create/route.ts` | POST | `runtime.runCommand("create", body, {entityName})` | **NO** (but create has fallback) |
| `inventory/purchase-orders/commands/submit/route.ts` | POST | `runtime.runCommand("submit", body, {entityName})` | **NO** ⚠️ |
| `inventory/purchase-orders/commands/approve/route.ts` | POST | `runtime.runCommand("approve", body, {entityName})` | **NO** ⚠️ |
| `inventory/purchase-orders/commands/reject/route.ts` | POST | `runtime.runCommand("reject", body, {entityName})` | **NO** ⚠️ |
| `inventory/purchase-orders/commands/cancel/route.ts` | POST | `runtime.runCommand("cancel", body, {entityName})` | **NO** ⚠️ |
| `inventory/purchase-orders/commands/mark-ordered/route.ts` | POST | `runtime.runCommand("markOrdered", body, {entityName})` | **NO** ⚠️ |
| `inventory/purchase-orders/commands/mark-received/route.ts` | POST | `runtime.runCommand("markReceived", body, {entityName})` | **NO** ⚠️ |

### Item-Level Routes (under `inventory/purchase-orders` — NOT called by frontend)

| Route | Method | Storage | instanceId? |
|-------|--------|---------|-------------|
| `[id]/items/[itemId]/quantity/route.ts` | **PUT** (not PATCH) | **Prisma** (`database.purchaseOrderItem.update` in transaction) | N/A |
| `[id]/items/[itemId]/quality/route.ts` | **PUT** (not PATCH) | `executeManifestCommand` → `runtime.runCommand("update", ...)` on `PurchaseOrderItem` | **NO** |
| `[id]/complete/route.ts` | POST | **Prisma** (transaction with `database.purchaseOrder.update`) | N/A |

### CamelCase Duplicate Routes (under `purchaseorder` — stale, not called)

Found at `apps/api/app/api/purchaseorder/`:
- `approve/route.ts`, `cancel/route.ts`, `create/route.ts`, `mark-ordered/route.ts`, `mark-received/route.ts`, `reject/route.ts`, `submit/route.ts`
- `apps/api/app/api/purchaseorderitem/` — `create/route.ts`, `remove/route.ts`, `update/route.ts`

These are auto-generated duplicates per Known Gotchas.

### Manifest/Store Status

| Claim in Plan | Verified? |
|---------------|-----------|
| `PurchaseOrderItemPrismaStore` exists | ✅ Correct — in `broken-read-batch13-order-proposal.ts` |
| No `PurchaseOrderPrismaStore` | ✅ Correct — not found anywhere |
| `ENTITIES_WITH_SPECIFIC_STORES` lacks `PurchaseOrder` | ✅ Correct |
| Manifest declares `store ... in memory` | ✅ Correct — `store PurchaseOrder in memory` in `purchase-order-rules.manifest` |
| List/detail — Prisma | ⚠️ Partially correct — `inventory/` routes use Prisma, but `procurement/` routes (frontend-active) use raw SQL |
| Commands — manifest runtime | ⚠️ Partially correct — `inventory/` routes use manifest runtime, but `procurement/` routes (frontend-active) use raw SQL |
| Item-level PATCH | ❌ Wrong — they're **PUT**, not PATCH |

## Incorrect/Stale Plan Text

### 1. Frontend path is wrong (HIGH)

**Plan says:**
> Frontend entry: `apps/app/app/(authenticated)/inventory/purchase-orders/...` (and procurement screens)

**Reality:** The frontend is at `apps/app/app/(authenticated)/procurement/purchase-orders/...`. There is **no** `inventory/purchase-orders` directory in the frontend. The plan lists the wrong path first and treats procurement as secondary.

### 2. Frontend API calls are wrong (HIGH)

**Plan says:**
> calls `GET /api/inventory/purchase-orders` plus `POST /api/inventory/purchase-orders/commands/{create|submit|approve|reject|cancel|mark-ordered|mark-received}`

**Reality:** The frontend calls:
- `GET /api/procurement/purchase-orders/list` (raw SQL, not Prisma)
- `GET /api/procurement/purchase-orders/${id}` (raw SQL)
- `POST /api/procurement/purchase-orders/commands/create` (raw SQL)
- `POST /api/procurement/purchase-orders/commands/update-status` (raw SQL — single endpoint, not separate approve/reject/cancel)
- `POST /api/procurement/purchase-orders/commands/receive` (raw SQL)

The `inventory/purchase-orders` manifest-backed routes are **never called from the frontend**.

### 3. Item-level route method is wrong (MEDIUM)

**Plan says:**
> Item-level edits hit `PATCH /api/inventory/purchase-orders/[id]/items/[itemId]/{quantity|quality}`

**Reality:**
- Routes exist at `PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quantity` and `PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quality` — they use **PUT**, not PATCH.
- Neither route is called from the frontend. The frontend uses `POST /api/procurement/purchase-orders/commands/receive` instead.

### 4. Command names are wrong (MEDIUM)

**Plan says:**
> `POST /api/inventory/purchase-orders/commands/{create|submit|approve|reject|cancel|mark-ordered|mark-received}`

**Reality:** The frontend-active procurement API has different commands:
- `create` — creates PO with line items (raw SQL)
- `update-status` — generic status transition (raw SQL, single endpoint handles all status changes)
- `receive` — receive items against PO (raw SQL)

The 7 separate command routes under `inventory/` exist but are unused by the frontend.

### 5. "Item-level PATCH — direct handlers (need to verify whether they hit Prisma or raw SQL)" (MEDIUM)

**Plan says:**
> Item-level PATCH — direct handlers (need to verify whether they hit Prisma or raw SQL — handle in step 1 of this phase)

**Reality:**
- `quantity` route: **Prisma** (full transaction with inventory update, outbox events)
- `quality` route: **manifest runtime** via `executeManifestCommand` (also broken — no `instanceId`)
- Neither is called from the frontend

### 6. Same instanceId bug as Proposal, not mentioned as confirmed (HIGH)

**Plan says:**
> Audit each command route's `runCommand` call for `instanceId` on instance-scoped verbs

**Reality:** Like Proposal, **ALL 6 non-create command routes** under `inventory/purchase-orders/commands/` call `runtime.runCommand(verb, body, {entityName:"PurchaseOrder"})` with no `instanceId`. The `executeManifestCommand`-based routes (root POST, `[id]` PUT/DELETE, `[id]/items/[itemId]/quality` PUT) also lack `instanceId`. All `mutate` actions silently no-op. This is **confirmed** (not just "need to audit").

### 7. Dual write path problem (HIGH — same as Proposal)

The frontend-active `procurement` routes write via raw SQL (working). The `inventory` routes write via manifest runtime (broken). Adding `PurchaseOrderPrismaStore` would only fix the `inventory` manifest routes, which the frontend doesn't call. The plan doesn't acknowledge this split.

## Minimal Proposed Edits to IMPLEMENTATION_PLAN.md

### Edit 1: Fix frontend entry path and API calls

**Current:**
```
**Frontend entry:** `apps/app/app/(authenticated)/inventory/purchase-orders/...` (and procurement screens) call `GET /api/inventory/purchase-orders` plus `POST /api/inventory/purchase-orders/commands/{create|submit|approve|reject|cancel|mark-ordered|mark-received}`. Item-level edits hit `PATCH /api/inventory/purchase-orders/[id]/items/[itemId]/{quantity|quality}`.
```

**Proposed:**
```
**Frontend entry:** `apps/app/app/(authenticated)/procurement/purchase-orders/...` calls:
- `GET /api/procurement/purchase-orders/list` (raw SQL via `$queryRawUnsafe`)
- `GET /api/procurement/purchase-orders/${id}` (raw SQL)
- `POST /api/procurement/purchase-orders/commands/create` (raw SQL)
- `POST /api/procurement/purchase-orders/commands/update-status` (raw SQL — single endpoint for all transitions)
- `POST /api/procurement/purchase-orders/commands/receive` (raw SQL)

The `inventory/purchase-orders` routes (Prisma + manifest runtime) are **not called from the frontend**. Item-level `PUT` routes at `/api/inventory/purchase-orders/[id]/items/[itemId]/{quantity|quality}` are also unused.
```

### Edit 2: Fix current split description

**Current:**
```
**Current split (verified 2026-04-28):**
- List/detail — Prisma (`database.purchaseOrder.findMany / findUnique`)
- Commands — manifest runtime
- Item-level PATCH — direct handlers (need to verify whether they hit Prisma or raw SQL — handle in step 1 of this phase)
- `PurchaseOrderItemPrismaStore` exists; **no** `PurchaseOrderPrismaStore`; `ENTITIES_WITH_SPECIFIC_STORES` lacks `PurchaseOrder`
```

**Proposed:**
```
**Current split (verified 2026-04-28):**
- **Frontend-active routes** (`procurement/purchase-orders`): ALL raw SQL (`$queryRawUnsafe` / `$queryRaw`). Working but outside ORM/RLS.
- **Manifest-backed routes** (`inventory/purchase-orders`): List/detail use Prisma; commands use manifest runtime. **Not called from frontend.**
- All 6 non-create manifest command routes lack `instanceId` — `mutate` actions no-op silently (confirmed, same bug as Proposal).
- `PurchaseOrderItemPrismaStore` exists; **no** `PurchaseOrderPrismaStore`; `ENTITIES_WITH_SPECIFIC_STORES` lacks `PurchaseOrder`
- Item-level routes: `quantity` uses Prisma transactions (working but unused by frontend), `quality` uses manifest runtime (broken — no `instanceId`, also unused by frontend).
```

### Edit 3: Update concrete steps

**Current step 1:**
```
1. Same shape as Proposal: build `PurchaseOrderPrismaStore` (tenant_inventory, camelCase, Decimal totals, soft-delete via `deletedAt`), wire into `ENTITIES_WITH_SPECIFIC_STORES` + provider.
```

**Proposed:**
```
1. **Decide architecture:** Frontend-active `procurement/` routes use raw SQL (working but outside ORM/RLS). `inventory/` manifest routes are unused and broken (no `instanceId`). Options:
   - (a) Route frontend through `inventory/` manifest routes (fix `instanceId` + add `PurchaseOrderPrismaStore`) — aligns with manifest-persistence goal but requires frontend URL changes.
   - (b) Replace `procurement/` raw SQL with Prisma ORM (keeps frontend URLs, skips manifest for now) — simpler but doesn't advance manifest goal.
   - (c) Move `procurement/` routes to manifest runtime with `instanceId` + `PurchaseOrderPrismaStore` — both fixes frontend and aligns with manifest.
   Build `PurchaseOrderPrismaStore` (tenant_inventory, camelCase, Decimal totals, soft-delete via `deletedAt`), wire into `ENTITIES_WITH_SPECIFIC_STORES` + provider regardless of option chosen.
```

### Edit 4: Fix step 2 (instanceId)

**Current:**
```
2. Audit each command route's `runCommand` call for `instanceId` on instance-scoped verbs (`approve`, `cancel`, `submit`, `mark-ordered`, `mark-received`, `reject`). Fix any missing.
```

**Proposed:**
```
2. Fix **all** `inventory/purchase-orders` command routes to pass `instanceId` (the PO `id` from request body) to `runCommand`. Confirmed: all 6 non-create routes lack it. Also fix `executeManifestCommand`-based routes: root POST, `[id]` PUT/DELETE, `[id]/items/[itemId]/quality` PUT.
```

### Edit 5: Fix step 3 (item-level routes)

**Current:**
```
3. Decide a single owner for the item-level PATCH routes (`/items/[itemId]/quantity`, `/items/[itemId]/quality`). Either route them through a manifest command on `PurchaseOrderItem` (preferred — matches the new store) or update them to use Prisma directly — but pick one and remove the other code path.
```

**Proposed:**
```
3. Item-level routes (`/items/[itemId]/quantity` and `/items/[itemId]/quality`) use **PUT** not PATCH. Neither is called from the frontend (frontend uses `POST /api/procurement/purchase-orders/commands/receive`). If these `inventory/` routes should remain functional: fix `quality` to pass `instanceId`, keep `quantity` (already uses Prisma). If they're dead code, mark for removal.
```

### Edit 6: Add dual-write warning

After the "Current split" section:

```
**⚠ Dual-write / dual-path concern:** The frontend calls `procurement/` routes (raw SQL, working). The `inventory/` routes (Prisma + manifest) are never called. Adding `PurchaseOrderPrismaStore` and fixing `instanceId` only fixes the unused `inventory/` path. To make manifest-mediated writes work end-to-end, either refactor the frontend to call `inventory/` routes, or migrate the `procurement/` routes to use manifest runtime.
```

## Summary

| Category | Plan Claims Verified | Issues Found |
|----------|---------------------|--------------|
| Frontend paths | Wrong directory | `procurement/` not `inventory/` |
| Frontend API URLs | All wrong | Frontend calls `procurement/` not `inventory/` |
| Procurement routes | Not mentioned | Use raw SQL, are the actual frontend-active routes |
| Inventory routes | Described as canonical | Not called from frontend, use Prisma + manifest |
| Item-level method | PATCH | Actually PUT |
| Item-level usage | "hit from frontend" | Neither route called from frontend |
| Command names | 7 separate commands | Frontend uses 3 combined commands |
| instanceId | "audit needed" | Confirmed: ALL 6 non-create commands missing |
| Store claims | All correct | ✅ |
| Manifest store | Correct | ✅ |
