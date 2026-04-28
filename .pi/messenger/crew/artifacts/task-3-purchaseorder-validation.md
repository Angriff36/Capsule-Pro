# Task-3: PurchaseOrder Validation Report

## Route/Storage Matrix

### Frontend entry points (VERIFIED)
| UI page | Fetch URL | HTTP method |
|---------|-----------|-------------|
| `apps/app/app/(authenticated)/procurement/purchase-orders/page.tsx` | `GET /api/procurement/purchase-orders/list` | GET |
| `apps/app/app/(authenticated)/procurement/purchase-orders/new/page.tsx` | `POST /api/procurement/purchase-orders/commands/create` | POST |
| `apps/app/app/(authenticated)/procurement/purchase-orders/[id]/page.tsx` | `GET /api/procurement/purchase-orders/{id}` | GET |
| Detail — status transitions | `POST /api/procurement/purchase-orders/commands/update-status` | POST |
| Detail — receiving | `POST /api/procurement/purchase-orders/commands/receive` | POST |

### API route trees

#### `/api/procurement/purchase-orders/` — **FRONTEND-ACTIVE** (raw SQL)
| Route | Method | Storage |
|-------|--------|---------|
| `list/` | GET | `$queryRawUnsafe` (raw SQL) |
| `[id]/` | GET | `$queryRawUnsafe` (raw SQL) |
| `commands/create` | POST | `$queryRaw` (raw SQL) |
| `commands/update-status` | POST | `$queryRaw` (raw SQL) |
| `commands/receive` | POST | `$queryRaw` (raw SQL) |

#### `/api/inventory/purchase-orders/` — **NOT CALLED BY FRONTEND**
| Route | Method | Storage |
|-------|--------|---------|
| `list/` | GET | Prisma ORM (`database.purchaseOrder.findMany`) |
| `[id]/` | GET | Prisma ORM (`database.purchaseOrder.findFirst`) |
| `route.ts` (root) | GET | Prisma ORM |
| `commands/approve` | POST | Manifest runtime (`runCommand`) |
| `commands/cancel` | POST | Manifest runtime (`runCommand`) |
| `commands/create` | POST | Manifest runtime (`runCommand`) |
| `commands/mark-ordered` | POST | Manifest runtime (`runCommand`) |
| `commands/mark-received` | POST | Manifest runtime (`runCommand`) |
| `commands/reject` | POST | Manifest runtime (`runCommand`) |
| `commands/submit` | POST | Manifest runtime (`runCommand`) |
| `[id]/items/[itemId]/quantity` | PUT | Prisma ORM (direct `$transaction`) |
| `[id]/items/[itemId]/quality` | PUT | Manifest runtime (`executeManifestCommand` → `PurchaseOrderItem.update`) |

#### `/api/inventory/purchase-order-items/` — **NOT CALLED BY FRONTEND**
| Route | Method | Storage |
|-------|--------|---------|
| `list/` | GET | (manifest-list pattern) |
| `[id]/` | GET | (manifest-detail pattern) |
| `commands/create` | POST | Manifest runtime |
| `commands/remove` | POST | Manifest runtime |
| `commands/update` | POST | Manifest runtime |

### Store claims (VERIFIED)
| Claim in Plan | Actual |
|---------------|--------|
| `PurchaseOrderItemPrismaStore` exists | ✅ TRUE — in `packages/manifest-adapters/src/prisma-stores/broken-read-batch13-order-proposal.ts` |
| No `PurchaseOrderPrismaStore` | ✅ TRUE — confirmed absent from `prisma-store.ts` and `manifest-runtime-factory.ts` |
| `ENTITIES_WITH_SPECIFIC_STORES` lacks `PurchaseOrder` | ✅ TRUE — only `PurchaseOrderItem` is listed |
| `PurchaseOrder` Prisma model exists | ✅ TRUE — `schema.prisma` line 2030, `@@map("purchase_orders")`, tenant_inventory |

### Command route `instanceId` audit (VERIFIED)
| Command route | `instanceId` passed? | Notes |
|---------------|---------------------|-------|
| approve | ❌ NO | `runCommand("approve", body, { entityName })` only |
| cancel | ❌ NO | Same pattern |
| create | N/A | Create is instance-scoped? No — create is always collection-level |
| mark-ordered | ❌ NO | `runCommand("markOrdered", body, ...)` — no instanceId |
| mark-received | ❌ NO | Same |
| reject | ❌ NO | Same |
| submit | ❌ NO | Same |

All 6 instance-scoped command routes (approve/cancel/mark-ordered/mark-received/reject/submit) are missing `instanceId`. This means even after a `PurchaseOrderPrismaStore` is built, `updateInstance` will no-op because the runtime can't identify which row to mutate.

---

## Incorrect / Stale Plan Text

### 1. Frontend path is WRONG
**Plan says:** `apps/app/app/(authenticated)/inventory/purchase-orders/...`
**Actual:** `apps/app/app/(authenticated)/procurement/purchase-orders/...`

### 2. Frontend API URLs are WRONG
**Plan says:** Frontend calls `GET /api/inventory/purchase-orders` and `POST /api/inventory/purchase-orders/commands/{create|submit|approve|reject|cancel|mark-ordered|mark-received}`
**Actual:** Frontend calls:
- `GET /api/procurement/purchase-orders/list`
- `GET /api/procurement/purchase-orders/{id}`
- `POST /api/procurement/purchase-orders/commands/create`
- `POST /api/procurement/purchase-orders/commands/update-status`
- `POST /api/procurement/purchase-orders/commands/receive`

The frontend does NOT use the individual status-transition commands (approve/submit/reject/cancel/mark-ordered/mark-received). It uses a single `update-status` route that accepts `{ orderId, status }` as raw SQL.

### 3. Item-level PATCH route HTTP method is WRONG
**Plan says:** `PATCH /api/inventory/purchase-orders/[id]/items/[itemId]/{quantity|quality}`
**Actual:** These routes use `PUT`, not `PATCH`.

### 4. Item-level routes are NOT called by frontend
**Plan says:** "Item-level edits hit `PATCH /api/inventory/purchase-orders/[id]/items/[itemId]/{quantity|quality}`"
**Actual:** The frontend detail page has no fetch call to these routes. Receiving is done via `POST /api/procurement/purchase-orders/commands/receive` with `{ orderId, items: [{ itemId, quantityReceived }] }`.

### 5. "Current split" description is misleading
**Plan says:** "List/detail — Prisma (`database.purchaseOrder.findMany / findUnique`)"
**Actual:** This is only true for `/api/inventory/` routes, which the frontend does NOT call. The frontend-active `/api/procurement/` routes use raw SQL for both list and detail.

### 6. Storage split is incomplete
**Plan says:** "Commands — manifest runtime"
**Actual:** Only the `/api/inventory/` command routes use manifest runtime. The frontend-active `/api/procurement/` command routes use raw SQL. There are effectively two completely separate code paths, and the frontend uses only the raw-SQL one.

### 7. Command verbs don't match
**Plan says:** `{create|submit|approve|reject|cancel|mark-ordered|mark-received}`
**Actual:** Frontend-facing procurement routes only have `{create|update-status|receive}`.

---

## Minimal Proposed Edits to IMPLEMENTATION_PLAN.md

### Step 2 header — replace the Frontend entry line:

**Old:**
```
**Frontend entry:** `apps/app/app/(authenticated)/inventory/purchase-orders/...` (and procurement screens) call `GET /api/inventory/purchase-orders` plus `POST /api/inventory/purchase-orders/commands/{create|submit|approve|reject|cancel|mark-ordered|mark-received}`. Item-level edits hit `PATCH /api/inventory/purchase-orders/[id]/items/[itemId]/{quantity|quality}`.
```

**New:**
```
**Frontend entry:** `apps/app/app/(authenticated)/procurement/purchase-orders/...` calls `GET /api/procurement/purchase-orders/list`, `GET /api/procurement/purchase-orders/{id}`, `POST /api/procurement/purchase-orders/commands/create`, `POST /api/procurement/purchase-orders/commands/update-status`, `POST /api/procurement/purchase-orders/commands/receive`. All five use raw SQL (`$queryRaw`/`$queryRawUnsafe`), NOT Prisma ORM and NOT manifest runtime.

**Parallel route tree:** `/api/inventory/purchase-orders/` exists with Prisma ORM reads (list/detail) and manifest-runtime command routes (approve/cancel/create/mark-ordered/mark-received/reject/submit), plus `PUT /items/[itemId]/quantity` (Prisma direct) and `PUT /items/[itemId]/quality` (manifest). This tree is NOT called by the frontend.
```

### Step 2 "Current split" — replace:

**Old:**
```
**Current split (verified 2026-04-28):**
- List/detail — Prisma (`database.purchaseOrder.findMany / findUnique`)
- Commands — manifest runtime
- Item-level PATCH — direct handlers (need to verify whether they hit Prisma or raw SQL — handle in step 1 of this phase)
- `PurchaseOrderItemPrismaStore` exists; **no** `PurchaseOrderPrismaStore`; `ENTITIES_WITH_SPECIFIC_STORES` lacks `PurchaseOrder`
```

**New:**
```
**Current split (verified 2026-04-28):**
- Frontend-active routes (`/api/procurement/purchase-orders/`) — ALL raw SQL:
  - list/detail: `$queryRawUnsafe` (no Prisma ORM)
  - create: `$queryRaw` inserts into `purchase_orders` + `purchase_order_items`
  - update-status: `$queryRaw` UPDATE with hardcoded state machine
  - receive: `$queryRaw` UPDATE items + UPDATE inventory + UPDATE PO status
- Inactive routes (`/api/inventory/purchase-orders/`) — Prisma + manifest:
  - list/detail: `database.purchaseOrder.findMany / findFirst` (Prisma ORM)
  - 7 command routes: manifest `runCommand` (approve/cancel/create/mark-ordered/mark-received/reject/submit)
  - `PUT /items/[itemId]/quantity`: direct Prisma `$transaction`
  - `PUT /items/[itemId]/quality`: manifest `executeManifestCommand` on `PurchaseOrderItem`
- `PurchaseOrderItemPrismaStore` exists; **no** `PurchaseOrderPrismaStore`; `ENTITIES_WITH_SPECIFIC_STORES` lacks `PurchaseOrder`
- All 6 instance-scoped manifest command routes (approve/cancel/mark-ordered/mark-received/reject/submit) are **missing `instanceId`** in their `runCommand` calls
```

### Step 2 concrete step 3 — revise item-level PATCH guidance:

**Old:**
```
3. Decide a single owner for the item-level PATCH routes (`/items/[itemId]/quantity`, `/items/[itemId]/quality`). Either route them through a manifest command on `PurchaseOrderItem` (preferred — matches the new store) or update them to use Prisma directly — but pick one and remove the other code path.
```

**New:**
```
3. **The frontend does NOT call the inventory item-level routes.** Receiving is handled via `POST /api/procurement/purchase-orders/commands/receive` (raw SQL batch update). The `PUT /items/[itemId]/quantity` and `PUT /items/[itemId]/quality` routes under `/api/inventory/` are orphaned from the frontend. Decision needed: (a) migrate the frontend receive flow to use the inventory routes (preferred if consolidating on manifest + Prisma), or (b) leave procurement raw-SQL receiving as-is and add `PurchaseOrderPrismaStore` only for the manifest tree.
```

### Step 2 concrete step 4 — update test path:

**Old:**
```
4. Add `apps/api/__tests__/inventory/purchase-orders/purchase-order-end-to-end.test.ts`:
   - Create PO via command → assert visible in `/list`.
   - Submit → approve → mark-ordered → mark-received transitions, each through the HTTP command route, asserting the read API reflects each status.
   - Item quantity PATCH → assert the change is visible in detail.
```

**New:**
```
4. Add `apps/api/__tests__/procurement/purchase-orders/purchase-order-end-to-end.test.ts` (test against the frontend-active routes):
   - Create PO via `POST /api/procurement/purchase-orders/commands/create` → assert visible in `GET /api/procurement/purchase-orders/list`.
   - update-status transitions (submitted → approved → ordered → received), each through `POST /api/procurement/purchase-orders/commands/update-status`, asserting the list/detail API reflects each status.
   - receive: `POST /api/procurement/purchase-orders/commands/receive` → assert item quantities updated and inventory incremented.
   - Optionally also add a parallel test for the `/api/inventory/` manifest command path if the store consolidation makes it the canonical path.
```

---

## Summary of Findings

1. **Frontend path wrong** — `procurement/` not `inventory/`
2. **Frontend API URLs wrong** — frontend uses `/api/procurement/` not `/api/inventory/`
3. **Frontend uses raw SQL exclusively** — the manifest/Prisma routes under `/api/inventory/` are NOT called
4. **Command verbs wrong** — frontend has only `create|update-status|receive`, not 7 separate commands
5. **Item-level PATCH is PUT, not PATCH** — and these routes are orphaned from the frontend
6. **Missing `instanceId`** confirmed in all 6 instance-scoped manifest command routes
7. **Store claims correct** — `PurchaseOrderItemPrismaStore` exists, `PurchaseOrderPrismaStore` does not
8. **Core architectural question:** The implementation plan assumes consolidating on the `/api/inventory/` manifest+Prisma route tree, but the frontend actively uses the `/api/procurement/` raw-SQL tree. The plan needs to address which tree to make canonical, or whether to refactor the frontend to use the inventory routes.
