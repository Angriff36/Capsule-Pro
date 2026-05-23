/**
 * BROKEN_PRISMA_READ batch 16 — InventoryTransfer Prisma store.
 *
 * Why this exists (per IMPLEMENTATION_PLAN.md "InventoryTransfer.transferNumber — deferred"):
 *
 * Before this store, InventoryTransfer fell back to the generic PrismaJsonStore,
 * which wrote a JSON blob to `manifest_instances` instead of a row to the
 * dedicated `inventory_transfers` table. The UI POSTs items in the body, and
 * those items had no destination. The manifest's `command create` declared
 * `requestedBy` as a required-but-defaulted `""` param that the UI never sent,
 * resulting in silent empty-string writes for an audit-sensitive field.
 *
 * This store:
 *   1. Persists InventoryTransfer rows in the real `inventory_transfers` table.
 *   2. Generates `transferNumber` server-side via `count() + 1` zero-padded
 *      to 6 digits (e.g. "TRF-000004"). Matches the pre-existing test fixture
 *      contract in apps/api/__tests__/inventory/transfers/transfers.quarantine.test.ts.
 *   3. Persists `items: [{ itemId, quantity, notes }]` to the
 *      `inventory_transfer_items` child table in the same `$transaction` as
 *      the parent row.
 *   4. Injects `requestedBy` from RuntimeContext.user.id (plumbed via the
 *      store provider's `userId` arg) — the manifest no longer captures it
 *      as a create param. Per IMPLEMENTATION_PLAN.md §101 and constitution
 *      §2/§14 — no silent `?? ""` fallback.
 *
 * Schema-drift allowlist entries that point at this file:
 *   - adapterDerived.InventoryTransfer.transferNumber → generated here
 *   - adapterDerived.InventoryTransfer.requestedBy    → injected here
 */
import { asNullableString, asString, reportOp, toDecimalRequired, } from "./shared";
/** Coerce items payload to a normalized array regardless of whether the caller
 * sent an array, a JSON string, or nothing. */
function asTransferItems(value) {
    if (value == null)
        return [];
    if (Array.isArray(value))
        return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    return [];
}
/** Zero-pad an integer to N digits. */
function pad(n, width) {
    return String(n).padStart(width, "0");
}
export class InventoryTransferPrismaStore {
    prisma;
    tenantId;
    requestedBy;
    constructor(prisma, tenantId, 
    /** RuntimeContext.user.id, plumbed via createPrismaStoreProvider's 3rd arg.
     * Used as InventoryTransfer.requestedBy (audit field for who initiated). */
    requestedBy) {
        this.prisma = prisma;
        this.tenantId = tenantId;
        this.requestedBy = requestedBy;
    }
    async getAll() {
        const rows = await this.prisma.inventoryTransfer.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { items: true },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.inventoryTransfer.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
            include: { items: true },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        // 1. Generate server-side transferNumber (count + 1, zero-padded to 6).
        //    Tenant-scoped count so each tenant has its own sequence.
        const existing = await this.prisma.inventoryTransfer.count({
            where: { tenantId: this.tenantId },
        });
        const transferNumber = `TRF-${pad(existing + 1, 6)}`;
        const id = data.id ?? crypto.randomUUID();
        const items = asTransferItems(data.items);
        // 2. Transactionally insert parent + child rows.
        //    If items fan-out fails, the parent transfer rolls back too.
        const created = await this.prisma.$transaction(async (tx) => {
            const transfer = await tx.inventoryTransfer.create({
                data: {
                    tenantId: this.tenantId,
                    id,
                    transferNumber,
                    fromLocationId: asString(data.fromLocationId),
                    toLocationId: asString(data.toLocationId),
                    status: asString(data.status) || "pending",
                    // requestedBy is adapter-derived from RuntimeContext.user.id;
                    // the manifest no longer captures it as a create-command param.
                    requestedBy: this.requestedBy || null,
                    notes: asNullableString(data.notes),
                },
            });
            for (const item of items) {
                const itemId = asString(item.itemId ?? item.item_id);
                if (!itemId)
                    continue;
                await tx.inventoryTransferItem.create({
                    data: {
                        tenantId: this.tenantId,
                        transferId: transfer.id,
                        itemId,
                        quantity: toDecimalRequired(item.quantity, 0),
                        notes: asNullableString(item.notes),
                    },
                });
            }
            return transfer;
        });
        // Re-fetch with items so the returned entity surfaces the child rows.
        const full = await this.prisma.inventoryTransfer.findFirst({
            where: { tenantId: this.tenantId, id: created.id },
            include: { items: true },
        });
        return this.mapToManifestEntity(full ?? created);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.approvedBy !== undefined)
                patch.approvedBy = asNullableString(data.approvedBy);
            if (data.shippedBy !== undefined)
                patch.shippedBy = asNullableString(data.shippedBy);
            if (data.receivedBy !== undefined)
                patch.receivedBy = asNullableString(data.receivedBy);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const updated = await this.prisma.inventoryTransfer.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
                include: { items: true },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.inventoryTransfer.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.inventoryTransfer.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        const items = Array.isArray(row.items) ? row.items : [];
        return {
            id: row.id,
            tenantId: row.tenantId,
            transferNumber: row.transferNumber ?? "",
            fromLocationId: row.fromLocationId ?? "",
            toLocationId: row.toLocationId ?? "",
            status: row.status ?? "pending",
            requestedBy: row.requestedBy ?? "",
            approvedBy: row.approvedBy ?? "",
            shippedBy: row.shippedBy ?? "",
            receivedBy: row.receivedBy ?? "",
            shipDate: row.shippedAt
                ? new Date(row.shippedAt).getTime()
                : 0,
            receiveDate: row.receivedAt
                ? new Date(row.receivedAt).getTime()
                : 0,
            notes: row.notes ?? "",
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            updatedAt: row.updatedAt
                ? new Date(row.updatedAt).getTime()
                : 0,
            // Items as a JSON-serializable array — surfaces child rows for reads.
            items: items.map((it) => ({
                id: it.id,
                itemId: it.itemId,
                quantity: String(it.quantity ?? "0"),
                receivedQuantity: it.receivedQuantity != null
                    ? String(it.receivedQuantity)
                    : null,
                notes: it.notes ?? null,
            })),
        };
    }
}
