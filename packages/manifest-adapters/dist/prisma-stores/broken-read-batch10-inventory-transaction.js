/**
 * InventoryTransaction Prisma Store — BROKEN_PRISMA_READ Batch 10
 *
 * inventory_transactions uses mixed snake_case/camelCase Prisma field names
 * (unit_cost, total_cost, transaction_date, storage_location_id, employee_id
 * are snake_case WITHOUT @map). It has NO deletedAt and NO updatedAt columns,
 * so this store uses hard-delete semantics and omits soft-delete filtering.
 */
import { asNullableString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared.js";
export class InventoryTransactionPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.inventoryTransaction.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { transaction_date: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.inventoryTransaction.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.inventoryTransaction.create({
            data: {
                tenantId: this.tenantId,
                id,
                itemId: (data.itemId ?? data.item_id) ?? "",
                transactionType: (data.transactionType ?? data.transaction_type) ??
                    "adjustment",
                quantity: toDecimalRequired(data.quantity ?? data.quantityChange, 0),
                unit_cost: toDecimalRequired(data.unitCost ?? data.unit_cost, 0),
                total_cost: toDecimalInput(data.totalCost ?? data.total_cost),
                reference: asNullableString(data.reference),
                notes: asNullableString(data.notes),
                transaction_date: (data.transactionDate ?? data.transaction_date)
                    ? new Date((data.transactionDate ?? data.transaction_date))
                    : new Date(),
                storage_location_id: (data.storageLocationId ?? data.storage_location_id) ??
                    "00000000-0000-0000-0000-000000000000",
                reason: (data.reason ?? "") || "",
                referenceType: asNullableString(data.referenceType ?? data.reference_type),
                referenceId: asNullableString(data.referenceId ?? data.reference_id),
                employee_id: asNullableString(data.employeeId ?? data.employee_id),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.transactionType !== undefined ||
                data.transaction_type !== undefined)
                patch.transactionType = data.transactionType ?? data.transaction_type;
            if (data.quantity !== undefined || data.quantityChange !== undefined)
                patch.quantity = toDecimalRequired(data.quantity ?? data.quantityChange, 0);
            if (data.unitCost !== undefined || data.unit_cost !== undefined)
                patch.unit_cost = toDecimalRequired(data.unitCost ?? data.unit_cost, 0);
            if (data.totalCost !== undefined || data.total_cost !== undefined)
                patch.total_cost = toDecimalInput(data.totalCost ?? data.total_cost);
            if (data.reference !== undefined)
                patch.reference = data.reference;
            if (data.notes !== undefined)
                patch.notes = data.notes;
            if (data.transactionDate !== undefined ||
                data.transaction_date !== undefined)
                patch.transaction_date =
                    (data.transactionDate ?? data.transaction_date)
                        ? new Date((data.transactionDate ?? data.transaction_date))
                        : new Date();
            if (data.reason !== undefined)
                patch.reason = data.reason;
            if (data.referenceType !== undefined || data.reference_type !== undefined)
                patch.referenceType = data.referenceType ?? data.reference_type;
            if (data.referenceId !== undefined || data.reference_id !== undefined)
                patch.referenceId = data.referenceId ?? data.reference_id;
            if (data.employeeId !== undefined || data.employee_id !== undefined)
                patch.employee_id = data.employeeId ?? data.employee_id;
            if (data.storageLocationId !== undefined ||
                data.storage_location_id !== undefined)
                patch.storage_location_id =
                    data.storageLocationId ?? data.storage_location_id;
            const updated = await this.prisma.inventoryTransaction.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
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
            // Hard delete — no deletedAt column on inventory_transactions
            await this.prisma.inventoryTransaction.delete({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.inventoryTransaction.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            itemId: row.itemId,
            transactionType: row.transactionType,
            quantity: Number(row.quantity ?? 0),
            unitCost: Number(row.unit_cost ?? 0),
            totalCost: row.total_cost != null ? Number(row.total_cost) : null,
            reference: row.reference ?? null,
            notes: row.notes ?? null,
            transactionDate: row.transaction_date
                ? new Date(row.transaction_date).getTime()
                : 0,
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            storageLocationId: row.storage_location_id ?? "",
            reason: row.reason ?? "",
            referenceType: row.referenceType ?? null,
            referenceId: row.referenceId ?? null,
            employeeId: row.employee_id ?? null,
        };
    }
}
