Task-3 is complete. Here's a summary of what I found:

## Key Findings

1. **Frontend path is WRONG in plan** — Frontend lives at `procurement/purchase-orders/` not `inventory/purchase-orders/`
2. **Frontend API URLs are WRONG** — Frontend calls `/api/procurement/purchase-orders/...` (raw SQL), not `/api/inventory/purchase-orders/...` (manifest + Prisma)
3. **Two completely separate route trees exist:**
   - `/api/procurement/` — **frontend-active**, all raw SQL, 3 commands (create/update-status/receive)
   - `/api/inventory/` — **orphaned from frontend**, Prisma reads + manifest commands, 7 command routes
4. **All 6 instance-scoped manifest commands missing `instanceId`** — even after building `PurchaseOrderPrismaStore`, they'll no-op
5. **Item-level routes use PUT not PATCH** and are orphaned from frontend (receiving goes through the procurement receive endpoint)
6. **Store claims verified correct** — `PurchaseOrderItemPrismaStore` exists, `PurchaseOrderPrismaStore` does not

The full validation report with route/storage matrix and proposed plan edits is at `.pi/messenger/crew/artifacts/task-3-purchaseorder-validation.md`.