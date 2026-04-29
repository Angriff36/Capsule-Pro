/**
 * BROKEN_RAW_SQL parent workflow — PurchaseRequisition Prisma store.
 *
 * PurchaseRequisition — tenant_inventory.purchase_requisitions
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimals (default 0): subtotal, estimatedTax, estimatedShipping, estimatedTotal
 *   - Status lifecycle: draft → pending → approved → rejected / converted
 *   - Approval chain: managerApproval → financeApproval
 *   - Soft-delete via deletedAt
 */
import { asNullableDate, asNullableString, reportOp, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// PurchaseRequisitionPrismaStore
// ---------------------------------------------------------------------------
export class PurchaseRequisitionPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.purchaseRequisition.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.purchaseRequisition.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.purchaseRequisition.create({
            data: {
                tenantId: this.tenantId,
                id,
                requisitionNumber: data.requisitionNumber ?? `REQ-${Date.now()}`,
                requestedBy: data.requestedBy ?? crypto.randomUUID(),
                requestDate: asNullableDate(data.requestDate) ?? new Date(),
                requiredBy: asNullableDate(data.requiredBy),
                locationId: asNullableString(data.locationId),
                department: asNullableString(data.department),
                justification: asNullableString(data.justification),
                status: asNullableString(data.status) ?? "draft",
                subtotal: toDecimalRequired(data.subtotal, 0),
                estimatedTax: toDecimalRequired(data.estimatedTax, 0),
                estimatedShipping: toDecimalRequired(data.estimatedShipping, 0),
                estimatedTotal: toDecimalRequired(data.estimatedTotal, 0),
                approvedBy: asNullableString(data.approvedBy),
                approvedAt: asNullableDate(data.approvedAt),
                managerApprovalBy: asNullableString(data.managerApprovalBy),
                managerApprovalAt: asNullableDate(data.managerApprovalAt),
                financeApprovalBy: asNullableString(data.financeApprovalBy),
                financeApprovalAt: asNullableDate(data.financeApprovalAt),
                convertedToPoId: asNullableString(data.convertedToPoId),
                convertedAt: asNullableDate(data.convertedAt),
                rejectionReason: asNullableString(data.rejectionReason),
                notes: asNullableString(data.notes),
                submittedAt: asNullableDate(data.submittedAt),
                itemCategory: asNullableString(data.itemCategory),
                priority: asNullableString(data.priority) ?? "normal",
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.requisitionNumber !== undefined)
                patch.requisitionNumber = data.requisitionNumber;
            if (data.requestedBy !== undefined)
                patch.requestedBy = asNullableString(data.requestedBy);
            if (data.requestDate !== undefined)
                patch.requestDate = asNullableDate(data.requestDate);
            if (data.requiredBy !== undefined)
                patch.requiredBy = asNullableDate(data.requiredBy);
            if (data.locationId !== undefined)
                patch.locationId = asNullableString(data.locationId);
            if (data.department !== undefined)
                patch.department = asNullableString(data.department);
            if (data.justification !== undefined)
                patch.justification = asNullableString(data.justification);
            if (data.status !== undefined)
                patch.status = asNullableString(data.status);
            if (data.subtotal !== undefined)
                patch.subtotal = toDecimalRequired(data.subtotal, 0);
            if (data.estimatedTax !== undefined)
                patch.estimatedTax = toDecimalRequired(data.estimatedTax, 0);
            if (data.estimatedShipping !== undefined)
                patch.estimatedShipping = toDecimalRequired(data.estimatedShipping, 0);
            if (data.estimatedTotal !== undefined)
                patch.estimatedTotal = toDecimalRequired(data.estimatedTotal, 0);
            if (data.approvedBy !== undefined)
                patch.approvedBy = asNullableString(data.approvedBy);
            if (data.approvedAt !== undefined)
                patch.approvedAt = asNullableDate(data.approvedAt);
            if (data.managerApprovalBy !== undefined)
                patch.managerApprovalBy = asNullableString(data.managerApprovalBy);
            if (data.managerApprovalAt !== undefined)
                patch.managerApprovalAt = asNullableDate(data.managerApprovalAt);
            if (data.financeApprovalBy !== undefined)
                patch.financeApprovalBy = asNullableString(data.financeApprovalBy);
            if (data.financeApprovalAt !== undefined)
                patch.financeApprovalAt = asNullableDate(data.financeApprovalAt);
            if (data.convertedToPoId !== undefined)
                patch.convertedToPoId = asNullableString(data.convertedToPoId);
            if (data.convertedAt !== undefined)
                patch.convertedAt = asNullableDate(data.convertedAt);
            if (data.rejectionReason !== undefined)
                patch.rejectionReason = asNullableString(data.rejectionReason);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.submittedAt !== undefined)
                patch.submittedAt = asNullableDate(data.submittedAt);
            if (data.itemCategory !== undefined)
                patch.itemCategory = asNullableString(data.itemCategory);
            if (data.priority !== undefined)
                patch.priority = asNullableString(data.priority);
            const row = await this.prisma.purchaseRequisition.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            return this.mapToManifestEntity(row);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.purchaseRequisition.update({
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
        await this.prisma.purchaseRequisition.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        const status = r.status ?? "draft";
        const priority = r.priority ?? "normal";
        return {
            id: r.id,
            tenantId: r.tenantId,
            requisitionNumber: r.requisitionNumber ?? "",
            requestedBy: r.requestedBy ?? "",
            requestDate: r.requestDate ?? null,
            requiredBy: r.requiredBy ?? null,
            locationId: r.locationId ?? null,
            department: r.department ?? null,
            justification: r.justification ?? null,
            status,
            subtotal: r.subtotal ?? 0,
            estimatedTax: r.estimatedTax ?? 0,
            estimatedShipping: r.estimatedShipping ?? 0,
            estimatedTotal: r.estimatedTotal ?? 0,
            approvedBy: r.approvedBy ?? null,
            approvedAt: r.approvedAt ?? null,
            managerApprovalBy: r.managerApprovalBy ?? null,
            managerApprovalAt: r.managerApprovalAt ?? null,
            financeApprovalBy: r.financeApprovalBy ?? null,
            financeApprovalAt: r.financeApprovalAt ?? null,
            convertedToPoId: r.convertedToPoId ?? null,
            convertedAt: r.convertedAt ?? null,
            rejectionReason: r.rejectionReason ?? null,
            notes: r.notes ?? null,
            submittedAt: r.submittedAt ?? null,
            itemCategory: r.itemCategory ?? null,
            priority,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
            // Computed fields — no Prisma columns; return defaults
            itemCount: 0,
            isDraft: status === "draft",
            isPending: status === "pending",
            isApproved: status === "approved",
            isRejected: status === "rejected",
            isConverted: status === "converted",
            isHighPriority: priority === "high",
            requiresFinanceApproval: false,
            isEditable: status === "draft",
        };
    }
}
