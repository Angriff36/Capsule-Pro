/**
 * BROKEN_PRISMA_READ batch 13 — PurchaseOrderItem + ProposalLineItem Prisma stores.
 *
 * PurchaseOrderItem — tenant_inventory.purchase_order_items (camelCase, Decimals)
 * ProposalLineItem  — tenant_crm.proposal_line_items         (camelCase, Decimals)
 */
import { asNullableString, asString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared";
// ---------------------------------------------------------------------------
// PurchaseOrderItemPrismaStore
// ---------------------------------------------------------------------------
export class PurchaseOrderItemPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.purchaseOrderItem.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.purchaseOrderItem.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.purchaseOrderItem.create({
            data: {
                tenantId: this.tenantId,
                id,
                purchaseOrderId: asString(data.purchaseOrderId),
                itemId: asString(data.itemId),
                quantityOrdered: toDecimalRequired(data.quantityOrdered, 0),
                quantityReceived: toDecimalRequired(data.quantityReceived, 0),
                unitId: data.unitId ?? 1,
                unitCost: toDecimalRequired(data.unitCost, 0),
                totalCost: toDecimalRequired(data.totalCost, 0),
                qualityStatus: asNullableString(data.qualityStatus) ?? "pending",
                discrepancyType: asNullableString(data.discrepancyType),
                discrepancyAmount: toDecimalInput(data.discrepancyAmount),
                notes: asNullableString(data.notes),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.quantityOrdered !== undefined)
                patch.quantityOrdered = toDecimalRequired(data.quantityOrdered, 0);
            if (data.quantityReceived !== undefined)
                patch.quantityReceived = toDecimalRequired(data.quantityReceived, 0);
            if (data.unitCost !== undefined)
                patch.unitCost = toDecimalRequired(data.unitCost, 0);
            if (data.totalCost !== undefined)
                patch.totalCost = toDecimalRequired(data.totalCost, 0);
            if (data.qualityStatus !== undefined)
                patch.qualityStatus = asNullableString(data.qualityStatus);
            if (data.discrepancyType !== undefined)
                patch.discrepancyType = asNullableString(data.discrepancyType);
            if (data.discrepancyAmount !== undefined)
                patch.discrepancyAmount = toDecimalInput(data.discrepancyAmount);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const updated = await this.prisma.purchaseOrderItem.update({
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
            await this.prisma.purchaseOrderItem.update({
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
        await this.prisma.purchaseOrderItem.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            purchaseOrderId: row.purchaseOrderId ?? "",
            itemId: row.itemId ?? "",
            quantityOrdered: String(row.quantityOrdered ?? "0"),
            quantityReceived: String(row.quantityReceived ?? "0"),
            unitId: row.unitId ?? 1,
            unitCost: String(row.unitCost ?? "0"),
            totalCost: String(row.totalCost ?? "0"),
            qualityStatus: row.qualityStatus ?? "pending",
            discrepancyType: row.discrepancyType ?? null,
            discrepancyAmount: row.discrepancyAmount != null ? String(row.discrepancyAmount) : null,
            notes: row.notes ?? null,
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            updatedAt: row.updatedAt
                ? new Date(row.updatedAt).getTime()
                : 0,
            deletedAt: row.deletedAt
                ? new Date(row.deletedAt).getTime()
                : null,
        };
    }
}
// ---------------------------------------------------------------------------
// ProposalLineItemPrismaStore
// ---------------------------------------------------------------------------
export class ProposalLineItemPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.proposalLineItem.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.proposalLineItem.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.proposalLineItem.create({
            data: {
                tenantId: this.tenantId,
                id,
                proposalId: asString(data.proposalId),
                itemType: asString(data.itemType),
                category: asString(data.category),
                description: asString(data.description),
                quantity: toDecimalRequired(data.quantity, 0),
                unitOfMeasure: asNullableString(data.unitOfMeasure),
                unitPrice: toDecimalRequired(data.unitPrice, 0),
                total: toDecimalRequired(data.total, 0),
                totalPrice: toDecimalRequired(data.totalPrice, 0),
                sortOrder: data.sortOrder ?? 0,
                notes: asNullableString(data.notes),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.itemType !== undefined)
                patch.itemType = asString(data.itemType);
            if (data.category !== undefined)
                patch.category = asString(data.category);
            if (data.description !== undefined)
                patch.description = asString(data.description);
            if (data.quantity !== undefined)
                patch.quantity = toDecimalRequired(data.quantity, 0);
            if (data.unitOfMeasure !== undefined)
                patch.unitOfMeasure = asNullableString(data.unitOfMeasure);
            if (data.unitPrice !== undefined)
                patch.unitPrice = toDecimalRequired(data.unitPrice, 0);
            if (data.total !== undefined)
                patch.total = toDecimalRequired(data.total, 0);
            if (data.totalPrice !== undefined)
                patch.totalPrice = toDecimalRequired(data.totalPrice, 0);
            if (data.sortOrder !== undefined)
                patch.sortOrder = data.sortOrder;
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const updated = await this.prisma.proposalLineItem.update({
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
            await this.prisma.proposalLineItem.update({
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
        await this.prisma.proposalLineItem.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            proposalId: row.proposalId ?? "",
            itemType: row.itemType ?? "",
            category: row.category ?? "",
            description: row.description ?? "",
            quantity: String(row.quantity ?? "0"),
            unitOfMeasure: row.unitOfMeasure ?? null,
            unitPrice: String(row.unitPrice ?? "0"),
            total: String(row.total ?? "0"),
            totalPrice: String(row.totalPrice ?? "0"),
            sortOrder: row.sortOrder ?? 0,
            notes: row.notes ?? null,
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            updatedAt: row.updatedAt
                ? new Date(row.updatedAt).getTime()
                : 0,
            deletedAt: row.deletedAt
                ? new Date(row.deletedAt).getTime()
                : null,
        };
    }
}
