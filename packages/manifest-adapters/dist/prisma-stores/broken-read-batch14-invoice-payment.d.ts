/**
 * Prisma stores for BROKEN_PRISMA_READ batch 14 — Invoice, PaymentMethod, Payment.
 *
 * Invoice  — tenant_accounting.invoices
 *   - Composite key: tenantId_id
 *   - Required Decimals: subtotal, total, amountDue
 *   - Default Decimals: taxAmount(0), discountAmount(0), amountPaid(0)
 *   - Nullable Decimals: depositPercentage, depositRequired, depositPaid
 *   - Timestamps: issuedAt, dueDate, sentAt, viewedAt, paidAt, voidedAt
 *   - JSON columns: lineItems, metadata
 *   - Manifest-only props stored in metadata: reminderCount, overdueSince,
 *     lastReminderAt, quickBooksId, goodshuffleId, externalSyncStatus
 *
 * PaymentMethod — tenant_accounting.payment_methods
 *   - Composite key: tenantId_id
 *   - Soft-delete via deletedAt
 *   - Manifest-only props stored in metadata: externalMethodId, cardExpiryMonth,
 *     cardExpiryYear, cardHolderName, bankAccountLastFour, bankAccountType,
 *     bankRoutingNumber, walletProvider, walletEmail, status, fraudFlagged,
 *     verifiedAt, verificationMethod, nickname, expiresAt
 *
 * Payment — tenant_accounting.payments
 *   - Composite key: tenantId_id
 *   - Required Decimal: amount
 *   - Soft-delete via deletedAt
 *   - Manifest-only props stored in metadata: processorResponseCode,
 *     processorResponseMessage, chargebackAt, fraudStatus, fraudScore,
 *     fraudReasons, reviewedAt, reviewedBy, description, externalReference
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class InvoicePrismaStore implements Store<EntityInstance> {
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
export declare class PaymentMethodPrismaStore implements Store<EntityInstance> {
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
export declare class PaymentPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch14-invoice-payment.d.ts.map