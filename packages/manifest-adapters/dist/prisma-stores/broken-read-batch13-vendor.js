/**
 * BROKEN_PRISMA_READ batch 13 — VendorCatalog + VendorContract Prisma stores.
 *
 * VendorCatalog  — tenant_inventory.vendor_catalog   (camelCase fields, Decimal, String[] tags)
 * VendorContract  — tenant_inventory.vendor_contracts (camelCase fields, many Decimals/Ints)
 */
import { asBool, asNullableDate, asNullableNumber, asNullableString, asString, asStringArray, reportOp, toDecimalInput, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// VendorCatalogPrismaStore
// ---------------------------------------------------------------------------
export class VendorCatalogPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.vendorCatalog.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.vendorCatalog.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.vendorCatalog.create({
            data: {
                tenantId: this.tenantId,
                id,
                supplierId: asString(data.supplierId),
                itemNumber: asString(data.itemNumber),
                itemName: asString(data.itemName),
                description: asNullableString(data.description),
                category: asNullableString(data.category),
                baseUnitCost: toDecimalRequired(data.baseUnitCost, 0),
                currency: asString(data.currency) || "USD",
                unitOfMeasure: asString(data.unitOfMeasure),
                leadTimeDays: asNullableNumber(data.leadTimeDays),
                leadTimeMinDays: asNullableNumber(data.leadTimeMinDays),
                leadTimeMaxDays: asNullableNumber(data.leadTimeMaxDays),
                minimumOrderQuantity: toDecimalInput(data.minimumOrderQuantity),
                orderMultiple: toDecimalInput(data.orderMultiple),
                isActive: asBool(data.isActive, true),
                effectiveFrom: asNullableDate(data.effectiveFrom),
                effectiveTo: asNullableDate(data.effectiveTo),
                supplierSku: asNullableString(data.supplierSku),
                notes: asNullableString(data.notes),
                tags: asStringArray(data.tags),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.itemName !== undefined)
                patch.itemName = asString(data.itemName);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.category !== undefined)
                patch.category = asNullableString(data.category);
            if (data.baseUnitCost !== undefined)
                patch.baseUnitCost = toDecimalRequired(data.baseUnitCost, 0);
            if (data.currency !== undefined)
                patch.currency = asString(data.currency);
            if (data.unitOfMeasure !== undefined)
                patch.unitOfMeasure = asString(data.unitOfMeasure);
            if (data.leadTimeDays !== undefined)
                patch.leadTimeDays = asNullableNumber(data.leadTimeDays);
            if (data.minimumOrderQuantity !== undefined)
                patch.minimumOrderQuantity = toDecimalInput(data.minimumOrderQuantity);
            if (data.isActive !== undefined)
                patch.isActive = asBool(data.isActive);
            if (data.effectiveFrom !== undefined)
                patch.effectiveFrom = asNullableDate(data.effectiveFrom);
            if (data.effectiveTo !== undefined)
                patch.effectiveTo = asNullableDate(data.effectiveTo);
            if (data.supplierSku !== undefined)
                patch.supplierSku = asNullableString(data.supplierSku);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.tags !== undefined)
                patch.tags = asStringArray(data.tags);
            if (data.lastCostUpdate !== undefined)
                patch.lastCostUpdate = asNullableDate(data.lastCostUpdate);
            const updated = await this.prisma.vendorCatalog.update({
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
            await this.prisma.vendorCatalog.update({
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
        await this.prisma.vendorCatalog.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            supplierId: row.supplierId ?? "",
            itemNumber: row.itemNumber ?? "",
            itemName: row.itemName ?? "",
            description: row.description ?? null,
            category: row.category ?? null,
            baseUnitCost: String(row.baseUnitCost ?? "0"),
            currency: row.currency ?? "USD",
            unitOfMeasure: row.unitOfMeasure ?? "",
            leadTimeDays: row.leadTimeDays ?? null,
            leadTimeMinDays: row.leadTimeMinDays ?? null,
            leadTimeMaxDays: row.leadTimeMaxDays ?? null,
            minimumOrderQuantity: row.minimumOrderQuantity != null ? String(row.minimumOrderQuantity) : null,
            orderMultiple: row.orderMultiple != null ? String(row.orderMultiple) : null,
            isActive: row.isActive ?? true,
            effectiveFrom: row.effectiveFrom
                ? new Date(row.effectiveFrom).getTime()
                : null,
            effectiveTo: row.effectiveTo
                ? new Date(row.effectiveTo).getTime()
                : null,
            supplierSku: row.supplierSku ?? null,
            notes: row.notes ?? null,
            tags: row.tags ?? [],
            lastCostUpdate: row.lastCostUpdate
                ? new Date(row.lastCostUpdate).getTime()
                : null,
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
// VendorContractPrismaStore
// ---------------------------------------------------------------------------
export class VendorContractPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.vendorContract.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.vendorContract.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.vendorContract.create({
            data: {
                tenantId: this.tenantId,
                id,
                contractNumber: asString(data.contractNumber) || `VC-${crypto.randomUUID().slice(0, 8)}`,
                vendorId: asString(data.vendorId),
                vendorName: asNullableString(data.vendorName),
                contractType: asString(data.contractType) || "purchase",
                status: asString(data.status) || "draft",
                startDate: asNullableDate(data.startDate) ?? new Date(),
                endDate: asNullableDate(data.endDate),
                autoRenew: asBool(data.autoRenew, false),
                renewalTermDays: data.renewalTermDays ?? 365,
                noticeDaysBeforeRenewal: data.noticeDaysBeforeRenewal ?? 30,
                paymentTerms: asString(data.paymentTerms) || "NET_30",
                deliveryTerms: asNullableString(data.deliveryTerms),
                minimumOrderQuantity: toDecimalRequired(data.minimumOrderQuantity, 0),
                annualSpendCommitment: toDecimalRequired(data.annualSpendCommitment, 0),
                spendToPeriod: asNullableDate(data.spendToPeriod),
                currencyCode: asString(data.currencyCode) || "USD",
                approvedBy: asNullableString(data.approvedBy),
                approvedAt: asNullableDate(data.approvedAt),
                contractUrl: asNullableString(data.contractUrl),
                notes: asNullableString(data.notes),
                complianceScore: data.complianceScore ?? 100,
                slaBreachCount: data.slaBreachCount ?? 0,
                onTimeDeliveryRate: toDecimalRequired(data.onTimeDeliveryRate, 0),
                qualityRating: toDecimalRequired(data.qualityRating, 0),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.endDate !== undefined)
                patch.endDate = asNullableDate(data.endDate);
            if (data.autoRenew !== undefined)
                patch.autoRenew = asBool(data.autoRenew);
            if (data.paymentTerms !== undefined)
                patch.paymentTerms = asString(data.paymentTerms);
            if (data.deliveryTerms !== undefined)
                patch.deliveryTerms = asNullableString(data.deliveryTerms);
            if (data.minimumOrderQuantity !== undefined)
                patch.minimumOrderQuantity = toDecimalRequired(data.minimumOrderQuantity, 0);
            if (data.annualSpendCommitment !== undefined)
                patch.annualSpendCommitment = toDecimalRequired(data.annualSpendCommitment, 0);
            if (data.approvedBy !== undefined)
                patch.approvedBy = asNullableString(data.approvedBy);
            if (data.approvedAt !== undefined)
                patch.approvedAt = asNullableDate(data.approvedAt);
            if (data.terminatedBy !== undefined)
                patch.terminatedBy = asNullableString(data.terminatedBy);
            if (data.terminatedAt !== undefined)
                patch.terminatedAt = asNullableDate(data.terminatedAt);
            if (data.terminationReason !== undefined)
                patch.terminationReason = asNullableString(data.terminationReason);
            if (data.contractUrl !== undefined)
                patch.contractUrl = asNullableString(data.contractUrl);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.complianceScore !== undefined)
                patch.complianceScore = data.complianceScore;
            if (data.lastComplianceReview !== undefined)
                patch.lastComplianceReview = asNullableDate(data.lastComplianceReview);
            if (data.slaBreachCount !== undefined)
                patch.slaBreachCount = data.slaBreachCount;
            if (data.onTimeDeliveryRate !== undefined)
                patch.onTimeDeliveryRate = toDecimalRequired(data.onTimeDeliveryRate, 0);
            if (data.qualityRating !== undefined)
                patch.qualityRating = toDecimalRequired(data.qualityRating, 0);
            const updated = await this.prisma.vendorContract.update({
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
            await this.prisma.vendorContract.update({
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
        await this.prisma.vendorContract.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            contractNumber: row.contractNumber ?? "",
            vendorId: row.vendorId ?? "",
            vendorName: row.vendorName ?? null,
            contractType: row.contractType ?? "purchase",
            status: row.status ?? "draft",
            startDate: row.startDate
                ? new Date(row.startDate).getTime()
                : 0,
            endDate: row.endDate
                ? new Date(row.endDate).getTime()
                : null,
            autoRenew: row.autoRenew ?? false,
            renewalTermDays: row.renewalTermDays ?? 365,
            noticeDaysBeforeRenewal: row.noticeDaysBeforeRenewal ?? 30,
            paymentTerms: row.paymentTerms ?? "NET_30",
            deliveryTerms: row.deliveryTerms ?? null,
            minimumOrderQuantity: String(row.minimumOrderQuantity ?? "0"),
            annualSpendCommitment: String(row.annualSpendCommitment ?? "0"),
            spendToPeriod: row.spendToPeriod
                ? new Date(row.spendToPeriod).getTime()
                : null,
            currencyCode: row.currencyCode ?? "USD",
            approvedBy: row.approvedBy ?? null,
            approvedAt: row.approvedAt
                ? new Date(row.approvedAt).getTime()
                : null,
            terminatedBy: row.terminatedBy ?? null,
            terminatedAt: row.terminatedAt
                ? new Date(row.terminatedAt).getTime()
                : null,
            terminationReason: row.terminationReason ?? null,
            contractUrl: row.contractUrl ?? null,
            notes: row.notes ?? null,
            complianceScore: row.complianceScore ?? 100,
            lastComplianceReview: row.lastComplianceReview
                ? new Date(row.lastComplianceReview).getTime()
                : null,
            slaBreachCount: row.slaBreachCount ?? 0,
            onTimeDeliveryRate: String(row.onTimeDeliveryRate ?? "0"),
            qualityRating: String(row.qualityRating ?? "0"),
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
