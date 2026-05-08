/**
 * Prisma stores for BROKEN_PRISMA_READ batch 14 — CollectionCase, CollectionAction,
 * CollectionPaymentPlan.
 *
 * CollectionCase — tenant_accounting.collection_cases
 *   - Composite key: tenantId_id
 *   - Required Decimals: originalAmount, outstandingAmount
 *   - Default Decimal: collectedAmount(0)
 *   - Enum-like: status (CollectionStatus), priority (CollectionPriority),
 *     dunningStage (DunningStage)
 *   - Soft-delete via deletedAt
 *   - JSON column: metadata
 *   - Manifest-only props stored in metadata: assignedAt, paymentPlanId,
 *     nextPaymentDue, disputeReason, disputeResolvedAt, internalNotes,
 *     lastActivityAt, legalCaseNumber, legalFirm, resolvedAt, closedAt
 *
 * CollectionAction — tenant_accounting.collection_actions
 *   - Composite key: tenantId_id
 *   - Required fields: collectionCaseId, actionType, description, contactedAt
 *   - No soft-delete (immutable audit trail)
 *   - Manifest-only props: caseId, direction, status, contactedBy, contactName,
 *     contactMethod, subject, nextActionDate, promiseAmount, promiseDate,
 *     notes, metadata, scheduledFor, completedAt, updatedAt
 *
 * CollectionPaymentPlan — tenant_accounting.collection_payment_plans
 *   - Composite key: tenantId_id
 *   - Required Decimal: totalAmount
 *   - Required fields: collectionCaseId, installments, frequencyDays, startDate
 *   - JSON column: metadata
 *   - Manifest-only props: caseId, installmentAmount, installmentCount,
 *     completedInstallments, endDate, frequency, nextPaymentDate, notes,
 *     completedAt, defaultedAt
 */
import { asBool, asJsonInput, asNullableDate, asNullableNumber, asNullableString, asString, reportOp, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// Metadata keys for manifest-only CollectionCase properties
// ---------------------------------------------------------------------------
const COLLECTION_CASE_METADATA_KEYS = [
    "assignedAt",
    "paymentPlanId",
    "nextPaymentDue",
    "disputeReason",
    "disputeResolvedAt",
    "internalNotes",
    "lastActivityAt",
    "legalCaseNumber",
    "legalFirm",
    "resolvedAt",
    "closedAt",
];
const COLLECTION_ACTION_METADATA_KEYS = [
    "caseId",
    "direction",
    "status",
    "contactedBy",
    "contactName",
    "contactMethod",
    "subject",
    "nextActionDate",
    "promiseAmount",
    "promiseDate",
    "notes",
    "metadata",
    "scheduledFor",
    "completedAt",
    "updatedAt",
];
const COLLECTION_PAYMENT_PLAN_METADATA_KEYS = [
    "caseId",
    "installmentAmount",
    "installmentCount",
    "completedInstallments",
    "endDate",
    "frequency",
    "nextPaymentDate",
    "notes",
    "completedAt",
    "defaultedAt",
];
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Extract metadata-only keys from a data bag into a JSON object. */
function extractMetadata(data, keys) {
    const meta = {};
    for (const key of keys) {
        if (data[key] !== undefined) {
            meta[key] = data[key];
        }
    }
    return meta;
}
// ---------------------------------------------------------------------------
// CollectionCasePrismaStore
// ---------------------------------------------------------------------------
export class CollectionCasePrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.collectionCase.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.collectionCase.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const metaOverrides = extractMetadata(data, COLLECTION_CASE_METADATA_KEYS);
        const existingMeta = data.metadata ?? {};
        const mergedMeta = { ...existingMeta, ...metaOverrides };
        const row = await this.prisma.collectionCase.create({
            data: {
                tenantId: this.tenantId,
                id,
                invoiceId: asString(data.invoiceId),
                invoiceNumber: asString(data.invoiceNumber),
                eventId: asString(data.eventId),
                clientId: asString(data.clientId),
                clientName: asString(data.clientName),
                originalAmount: toDecimalRequired(data.originalAmount, 0),
                outstandingAmount: toDecimalRequired(data.outstandingAmount, 0),
                collectedAmount: toDecimalRequired(data.collectedAmount, 0),
                status: (asString(data.status) || "ACTIVE"),
                priority: (asString(data.priority) || "MEDIUM"),
                dunningStage: (asString(data.dunningStage) || "CURRENT"),
                daysOverdue: asNullableNumber(data.daysOverdue) ?? 0,
                agingBucket: asNullableString(data.agingBucket),
                notes: asNullableString(data.notes),
                metadata: asJsonInput(mergedMeta),
                assignedTo: asNullableString(data.assignedTo),
                hasPaymentPlan: asBool(data.hasPaymentPlan, false),
                isDisputed: asBool(data.isDisputed, false),
                isEscalatedToLegal: asBool(data.isEscalatedToLegal, false),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.invoiceId !== undefined)
                patch.invoiceId = asString(data.invoiceId);
            if (data.invoiceNumber !== undefined)
                patch.invoiceNumber = asString(data.invoiceNumber);
            if (data.eventId !== undefined)
                patch.eventId = asString(data.eventId);
            if (data.clientId !== undefined)
                patch.clientId = asString(data.clientId);
            if (data.clientName !== undefined)
                patch.clientName = asString(data.clientName);
            if (data.originalAmount !== undefined)
                patch.originalAmount = toDecimalRequired(data.originalAmount, 0);
            if (data.outstandingAmount !== undefined)
                patch.outstandingAmount = toDecimalRequired(data.outstandingAmount, 0);
            if (data.collectedAmount !== undefined)
                patch.collectedAmount = toDecimalRequired(data.collectedAmount, 0);
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.priority !== undefined)
                patch.priority = asString(data.priority);
            if (data.dunningStage !== undefined)
                patch.dunningStage = asString(data.dunningStage);
            if (data.daysOverdue !== undefined)
                patch.daysOverdue = asNullableNumber(data.daysOverdue) ?? 0;
            if (data.agingBucket !== undefined)
                patch.agingBucket = asNullableString(data.agingBucket);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.assignedTo !== undefined)
                patch.assignedTo = asNullableString(data.assignedTo);
            if (data.hasPaymentPlan !== undefined)
                patch.hasPaymentPlan = asBool(data.hasPaymentPlan, false);
            if (data.isDisputed !== undefined)
                patch.isDisputed = asBool(data.isDisputed, false);
            if (data.isEscalatedToLegal !== undefined)
                patch.isEscalatedToLegal = asBool(data.isEscalatedToLegal, false);
            // Merge manifest-only props into metadata
            const metaOverrides = extractMetadata(data, COLLECTION_CASE_METADATA_KEYS);
            if (Object.keys(metaOverrides).length > 0 ||
                data.metadata !== undefined) {
                const existingMeta = data.metadata ?? {};
                patch.metadata = { ...existingMeta, ...metaOverrides };
            }
            const row = await this.prisma.collectionCase.update({
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
            await this.prisma.collectionCase.update({
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
        await this.prisma.collectionCase.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        const meta = (r.metadata ?? {});
        return {
            id: r.id,
            tenantId: r.tenantId,
            invoiceId: r.invoiceId ?? "",
            invoiceNumber: r.invoiceNumber ?? "",
            eventId: r.eventId ?? "",
            clientId: r.clientId ?? "",
            clientName: r.clientName ?? "",
            originalAmount: r.originalAmount ?? 0,
            outstandingAmount: r.outstandingAmount ?? 0,
            collectedAmount: r.collectedAmount ?? 0,
            status: r.status ?? "ACTIVE",
            priority: r.priority ?? "MEDIUM",
            dunningStage: r.dunningStage ?? "CURRENT",
            daysOverdue: r.daysOverdue ?? 0,
            agingBucket: r.agingBucket ?? null,
            notes: r.notes ?? null,
            metadata: r.metadata ?? {},
            assignedTo: r.assignedTo ?? null,
            hasPaymentPlan: r.hasPaymentPlan ?? false,
            isDisputed: r.isDisputed ?? false,
            isEscalatedToLegal: r.isEscalatedToLegal ?? false,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
            // Manifest-only props from metadata
            assignedAt: meta.assignedAt ?? null,
            paymentPlanId: meta.paymentPlanId ?? null,
            nextPaymentDue: meta.nextPaymentDue ?? null,
            disputeReason: meta.disputeReason ?? null,
            disputeResolvedAt: meta.disputeResolvedAt ?? null,
            internalNotes: meta.internalNotes ?? null,
            lastActivityAt: meta.lastActivityAt ?? null,
            legalCaseNumber: meta.legalCaseNumber ?? null,
            legalFirm: meta.legalFirm ?? null,
            resolvedAt: meta.resolvedAt ?? null,
            closedAt: meta.closedAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// CollectionActionPrismaStore
// ---------------------------------------------------------------------------
export class CollectionActionPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.collectionAction.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.collectionAction.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const metaOverrides = extractMetadata(data, COLLECTION_ACTION_METADATA_KEYS);
        const row = await this.prisma.collectionAction.create({
            data: {
                tenantId: this.tenantId,
                id,
                collectionCaseId: asString(data.caseId ?? data.collectionCaseId),
                actionType: asString(data.actionType),
                description: asString(data.description),
                outcome: asNullableString(data.outcome),
                contactedAt: asNullableDate(data.contactedAt) ?? new Date(),
            },
        });
        return this.mapToManifestEntity({ ...row, ...metaOverrides });
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.collectionCaseId !== undefined)
                patch.collectionCaseId = asString(data.collectionCaseId);
            if (data.caseId !== undefined)
                patch.collectionCaseId = asString(data.caseId);
            if (data.actionType !== undefined)
                patch.actionType = asString(data.actionType);
            if (data.description !== undefined)
                patch.description = asString(data.description);
            if (data.outcome !== undefined)
                patch.outcome = asNullableString(data.outcome);
            if (data.contactedAt !== undefined)
                patch.contactedAt = asNullableDate(data.contactedAt);
            const row = await this.prisma.collectionAction.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            const metaOverrides = extractMetadata(data, COLLECTION_ACTION_METADATA_KEYS);
            return this.mapToManifestEntity({ ...row, ...metaOverrides });
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            // CollectionAction has no soft-delete; hard delete the audit row
            await this.prisma.collectionAction.delete({
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
        await this.prisma.collectionAction.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            caseId: r.collectionCaseId ?? "",
            collectionCaseId: r.collectionCaseId ?? "",
            actionType: r.actionType ?? "",
            description: r.description ?? "",
            outcome: r.outcome ?? null,
            contactedAt: r.contactedAt ?? null,
            createdAt: r.createdAt ?? null,
            // Manifest-only props (passed through)
            direction: r.direction ?? null,
            status: r.status ?? "PENDING",
            contactedBy: r.contactedBy ?? null,
            contactName: r.contactName ?? null,
            contactMethod: r.contactMethod ?? null,
            subject: r.subject ?? null,
            nextActionDate: r.nextActionDate ?? null,
            promiseAmount: r.promiseAmount ?? null,
            promiseDate: r.promiseDate ?? null,
            notes: r.notes ?? null,
            metadata: r.metadata ?? {},
            scheduledFor: r.scheduledFor ?? null,
            completedAt: r.completedAt ?? null,
            updatedAt: r.updatedAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// CollectionPaymentPlanPrismaStore
// ---------------------------------------------------------------------------
export class CollectionPaymentPlanPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.collectionPaymentPlan.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.collectionPaymentPlan.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const metaOverrides = extractMetadata(data, COLLECTION_PAYMENT_PLAN_METADATA_KEYS);
        const existingMeta = data.metadata ?? {};
        const mergedMeta = { ...existingMeta, ...metaOverrides };
        const row = await this.prisma.collectionPaymentPlan.create({
            data: {
                tenantId: this.tenantId,
                id,
                collectionCaseId: asString(data.caseId ?? data.collectionCaseId),
                totalAmount: toDecimalRequired(data.totalAmount, 0),
                installments: asNullableNumber(data.installments ?? data.installmentCount) ?? 1,
                frequencyDays: asNullableNumber(data.frequencyDays) ?? 30,
                startDate: asNullableDate(data.startDate) ?? new Date(),
                status: asString(data.status) || "ACTIVE",
                metadata: asJsonInput(mergedMeta),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.collectionCaseId !== undefined)
                patch.collectionCaseId = asString(data.collectionCaseId);
            if (data.caseId !== undefined)
                patch.collectionCaseId = asString(data.caseId);
            if (data.totalAmount !== undefined)
                patch.totalAmount = toDecimalRequired(data.totalAmount, 0);
            if (data.installments !== undefined)
                patch.installments = asNullableNumber(data.installments) ?? 1;
            if (data.installmentCount !== undefined)
                patch.installments = asNullableNumber(data.installmentCount) ?? 1;
            if (data.frequencyDays !== undefined)
                patch.frequencyDays = asNullableNumber(data.frequencyDays) ?? 30;
            if (data.startDate !== undefined)
                patch.startDate = asNullableDate(data.startDate);
            if (data.status !== undefined)
                patch.status = asString(data.status);
            // Merge manifest-only props into metadata
            const metaOverrides = extractMetadata(data, COLLECTION_PAYMENT_PLAN_METADATA_KEYS);
            if (Object.keys(metaOverrides).length > 0 ||
                data.metadata !== undefined) {
                const existingMeta = data.metadata ?? {};
                patch.metadata = { ...existingMeta, ...metaOverrides };
            }
            const row = await this.prisma.collectionPaymentPlan.update({
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
            await this.prisma.collectionPaymentPlan.delete({
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
        await this.prisma.collectionPaymentPlan.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        const meta = (r.metadata ?? {});
        return {
            id: r.id,
            tenantId: r.tenantId,
            caseId: r.collectionCaseId ?? "",
            collectionCaseId: r.collectionCaseId ?? "",
            totalAmount: r.totalAmount ?? 0,
            installments: r.installments ?? 0,
            frequencyDays: r.frequencyDays ?? 30,
            startDate: r.startDate ?? null,
            status: r.status ?? "ACTIVE",
            metadata: r.metadata ?? {},
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            // Manifest-only props from metadata
            installmentAmount: meta.installmentAmount ?? null,
            installmentCount: meta.installmentCount ?? r.installments ?? null,
            completedInstallments: meta.completedInstallments ?? 0,
            endDate: meta.endDate ?? null,
            frequency: meta.frequency ?? null,
            nextPaymentDate: meta.nextPaymentDate ?? null,
            notes: meta.notes ?? null,
            completedAt: meta.completedAt ?? null,
            defaultedAt: meta.defaultedAt ?? null,
        };
    }
}
