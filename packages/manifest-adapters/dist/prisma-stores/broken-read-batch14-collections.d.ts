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
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class CollectionCasePrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
export declare class CollectionActionPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
export declare class CollectionPaymentPlanPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
//# sourceMappingURL=broken-read-batch14-collections.d.ts.map