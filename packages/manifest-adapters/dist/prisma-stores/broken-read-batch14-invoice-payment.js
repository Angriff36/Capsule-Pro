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
import { asBool, asJsonInput, asNullableDate, asNullableNumber, asNullableString, asString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared";
// ---------------------------------------------------------------------------
// Metadata keys for manifest-only properties (no dedicated Prisma column)
// ---------------------------------------------------------------------------
const INVOICE_METADATA_KEYS = [
    "reminderCount",
    "overdueSince",
    "lastReminderAt",
    "quickBooksId",
    "goodshuffleId",
    "externalSyncStatus",
];
const PAYMENT_METHOD_METADATA_KEYS = [
    "externalMethodId",
    "cardExpiryMonth",
    "cardExpiryYear",
    "cardHolderName",
    "bankAccountLastFour",
    "bankAccountType",
    "bankRoutingNumber",
    "walletProvider",
    "walletEmail",
    "status",
    "fraudFlagged",
    "verifiedAt",
    "verificationMethod",
    "nickname",
    "expiresAt",
];
const PAYMENT_METADATA_KEYS = [
    "processorResponseCode",
    "processorResponseMessage",
    "chargebackAt",
    "fraudStatus",
    "fraudScore",
    "fraudReasons",
    "reviewedAt",
    "reviewedBy",
    "description",
    "externalReference",
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
// InvoicePrismaStore
// ---------------------------------------------------------------------------
export class InvoicePrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.invoice.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.invoice.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const metaOverrides = extractMetadata(data, INVOICE_METADATA_KEYS);
        const existingMeta = data.metadata ?? {};
        const mergedMeta = { ...existingMeta, ...metaOverrides };
        const row = await this.prisma.invoice.create({
            data: {
                tenantId: this.tenantId,
                id,
                invoiceNumber: asString(data.invoiceNumber) || `INV-${Date.now()}`,
                invoiceType: (asString(data.type ?? data.invoiceType) ||
                    "FINAL_PAYMENT"),
                status: (asString(data.status) || "DRAFT"),
                clientId: asString(data.clientId),
                eventId: asString(data.eventId),
                subtotal: toDecimalRequired(data.subtotal, 0),
                taxAmount: toDecimalRequired(data.taxAmount, 0),
                discountAmount: toDecimalRequired(data.discountAmount, 0),
                total: toDecimalRequired(data.total, 0),
                amountPaid: toDecimalRequired(data.amountPaid, 0),
                amountDue: toDecimalRequired(data.amountDue, 0),
                paymentTerms: asNullableNumber(data.paymentTerms) ?? 30,
                dueDate: asNullableDate(data.dueDate) ?? new Date(),
                issuedAt: asNullableDate(data.issuedAt) ?? new Date(),
                depositPercentage: toDecimalInput(data.depositPercentage),
                depositRequired: toDecimalInput(data.depositRequired),
                depositPaid: toDecimalInput(data.depositPaid),
                notes: asNullableString(data.notes),
                internalNotes: asNullableString(data.internalNotes),
                lineItems: asJsonInput(data.lineItems),
                metadata: asJsonInput(mergedMeta),
                sentAt: asNullableDate(data.sentAt),
                viewedAt: asNullableDate(data.viewedAt),
                paidAt: asNullableDate(data.paidAt),
                voidedAt: asNullableDate(data.voidedAt),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            // Scalar fields
            if (data.invoiceNumber !== undefined)
                patch.invoiceNumber = asString(data.invoiceNumber);
            if (data.type !== undefined)
                patch.invoiceType = asString(data.type);
            if (data.invoiceType !== undefined)
                patch.invoiceType = asString(data.invoiceType);
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.clientId !== undefined)
                patch.clientId = asNullableString(data.clientId);
            if (data.eventId !== undefined)
                patch.eventId = asNullableString(data.eventId);
            if (data.subtotal !== undefined)
                patch.subtotal = toDecimalRequired(data.subtotal, 0);
            if (data.taxAmount !== undefined)
                patch.taxAmount = toDecimalRequired(data.taxAmount, 0);
            if (data.discountAmount !== undefined)
                patch.discountAmount = toDecimalRequired(data.discountAmount, 0);
            if (data.total !== undefined)
                patch.total = toDecimalRequired(data.total, 0);
            if (data.amountPaid !== undefined)
                patch.amountPaid = toDecimalRequired(data.amountPaid, 0);
            if (data.amountDue !== undefined)
                patch.amountDue = toDecimalRequired(data.amountDue, 0);
            if (data.paymentTerms !== undefined)
                patch.paymentTerms = asNullableNumber(data.paymentTerms) ?? 30;
            if (data.dueDate !== undefined)
                patch.dueDate = asNullableDate(data.dueDate);
            if (data.issuedAt !== undefined)
                patch.issuedAt = asNullableDate(data.issuedAt);
            if (data.depositPercentage !== undefined)
                patch.depositPercentage = toDecimalInput(data.depositPercentage);
            if (data.depositRequired !== undefined)
                patch.depositRequired = toDecimalInput(data.depositRequired);
            if (data.depositPaid !== undefined)
                patch.depositPaid = toDecimalInput(data.depositPaid);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.internalNotes !== undefined)
                patch.internalNotes = asNullableString(data.internalNotes);
            if (data.lineItems !== undefined)
                patch.lineItems = asJsonInput(data.lineItems);
            if (data.sentAt !== undefined)
                patch.sentAt = asNullableDate(data.sentAt);
            if (data.viewedAt !== undefined)
                patch.viewedAt = asNullableDate(data.viewedAt);
            if (data.paidAt !== undefined)
                patch.paidAt = asNullableDate(data.paidAt);
            if (data.voidedAt !== undefined)
                patch.voidedAt = asNullableDate(data.voidedAt);
            // Merge manifest-only props into metadata
            const metaOverrides = extractMetadata(data, INVOICE_METADATA_KEYS);
            if (Object.keys(metaOverrides).length > 0 ||
                data.metadata !== undefined) {
                const existingMeta = data.metadata ?? {};
                patch.metadata = { ...existingMeta, ...metaOverrides };
            }
            const row = await this.prisma.invoice.update({
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
            await this.prisma.invoice.update({
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
        await this.prisma.invoice.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        const meta = (r.metadata ?? {});
        return {
            id: r.id,
            tenantId: r.tenantId,
            invoiceNumber: r.invoiceNumber ?? "",
            type: r.invoiceType ?? "FINAL_PAYMENT",
            invoiceType: r.invoiceType ?? "FINAL_PAYMENT",
            status: r.status ?? "DRAFT",
            clientId: r.clientId ?? "",
            eventId: r.eventId ?? "",
            subtotal: r.subtotal ?? 0,
            taxAmount: r.taxAmount ?? 0,
            discountAmount: r.discountAmount ?? 0,
            total: r.total ?? 0,
            amountPaid: r.amountPaid ?? 0,
            amountDue: r.amountDue ?? 0,
            paymentTerms: r.paymentTerms ?? 30,
            dueDate: r.dueDate ?? null,
            issuedAt: r.issuedAt ?? null,
            depositPercentage: r.depositPercentage ?? null,
            depositRequired: r.depositRequired ?? null,
            depositPaid: r.depositPaid ?? null,
            notes: r.notes ?? null,
            internalNotes: r.internalNotes ?? null,
            lineItems: r.lineItems ?? null,
            metadata: r.metadata ?? {},
            sentAt: r.sentAt ?? null,
            viewedAt: r.viewedAt ?? null,
            paidAt: r.paidAt ?? null,
            voidedAt: r.voidedAt ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
            // Manifest-only props from metadata
            reminderCount: meta.reminderCount ?? 0,
            overdueSince: meta.overdueSince ?? null,
            lastReminderAt: meta.lastReminderAt ?? null,
            quickBooksId: meta.quickBooksId ?? null,
            goodshuffleId: meta.goodshuffleId ?? null,
            externalSyncStatus: meta.externalSyncStatus ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// PaymentMethodPrismaStore
// ---------------------------------------------------------------------------
export class PaymentMethodPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.paymentMethod.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.paymentMethod.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const metaOverrides = extractMetadata(data, PAYMENT_METHOD_METADATA_KEYS);
        const row = await this.prisma.paymentMethod.create({
            data: {
                tenantId: this.tenantId,
                id,
                clientId: asString(data.clientId),
                type: asString(data.type) || "CREDIT_CARD",
                cardLastFour: asNullableString(data.cardLastFour),
                cardNetwork: asNullableString(data.cardNetwork),
                isDefault: asBool(data.isDefault, false),
            },
        });
        // Manifest-only props are passed through to mapped output (no dedicated columns)
        return this.mapToManifestEntity({ ...row, ...metaOverrides });
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.clientId !== undefined)
                patch.clientId = asString(data.clientId);
            if (data.type !== undefined)
                patch.type = asString(data.type);
            if (data.cardLastFour !== undefined)
                patch.cardLastFour = asNullableString(data.cardLastFour);
            if (data.cardNetwork !== undefined)
                patch.cardNetwork = asNullableString(data.cardNetwork);
            if (data.isDefault !== undefined)
                patch.isDefault = asBool(data.isDefault, false);
            const row = await this.prisma.paymentMethod.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            // Manifest-only properties don't have Prisma columns; include in mapped output
            const metaOverrides = extractMetadata(data, PAYMENT_METHOD_METADATA_KEYS);
            return this.mapToManifestEntity({ ...row, ...metaOverrides });
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.paymentMethod.update({
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
        await this.prisma.paymentMethod.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            clientId: r.clientId ?? "",
            type: r.type ?? "CREDIT_CARD",
            cardLastFour: r.cardLastFour ?? null,
            cardNetwork: r.cardNetwork ?? null,
            isDefault: r.isDefault ?? false,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
            // Manifest-only props (passed through if provided in data)
            externalMethodId: r.externalMethodId ?? null,
            cardExpiryMonth: r.cardExpiryMonth ?? null,
            cardExpiryYear: r.cardExpiryYear ?? null,
            cardHolderName: r.cardHolderName ?? null,
            bankAccountLastFour: r.bankAccountLastFour ?? null,
            bankAccountType: r.bankAccountType ?? null,
            bankRoutingNumber: r.bankRoutingNumber ?? null,
            walletProvider: r.walletProvider ?? null,
            walletEmail: r.walletEmail ?? null,
            status: r.status ?? "ACTIVE",
            fraudFlagged: r.fraudFlagged ?? false,
            verifiedAt: r.verifiedAt ?? null,
            verificationMethod: r.verificationMethod ?? null,
            nickname: r.nickname ?? null,
            expiresAt: r.expiresAt ?? null,
            metadata: r.metadata ?? {},
        };
    }
}
// ---------------------------------------------------------------------------
// PaymentPrismaStore
// ---------------------------------------------------------------------------
export class PaymentPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.payment.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.payment.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.payment.create({
            data: {
                tenantId: this.tenantId,
                id,
                amount: toDecimalRequired(data.amount, 0),
                currency: asString(data.currency) || "USD",
                status: asString(data.status) || "PENDING",
                methodType: asString(data.methodType) || "CREDIT_CARD",
                invoiceId: asString(data.invoiceId),
                eventId: asString(data.eventId),
                clientId: asString(data.clientId),
                gatewayTransactionId: asNullableString(data.gatewayTransactionId),
                gatewayPaymentMethodId: asNullableString(data.gatewayPaymentMethodId),
                processor: asNullableString(data.processor),
                processedAt: asNullableDate(data.processedAt),
                completedAt: asNullableDate(data.completedAt),
                refundedAt: asNullableDate(data.refundedAt),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.amount !== undefined)
                patch.amount = toDecimalRequired(data.amount, 0);
            if (data.currency !== undefined)
                patch.currency = asString(data.currency);
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.methodType !== undefined)
                patch.methodType = asString(data.methodType);
            if (data.invoiceId !== undefined)
                patch.invoiceId = asString(data.invoiceId);
            if (data.eventId !== undefined)
                patch.eventId = asString(data.eventId);
            if (data.clientId !== undefined)
                patch.clientId = asString(data.clientId);
            if (data.gatewayTransactionId !== undefined)
                patch.gatewayTransactionId = asNullableString(data.gatewayTransactionId);
            if (data.gatewayPaymentMethodId !== undefined)
                patch.gatewayPaymentMethodId = asNullableString(data.gatewayPaymentMethodId);
            if (data.processor !== undefined)
                patch.processor = asNullableString(data.processor);
            if (data.processedAt !== undefined)
                patch.processedAt = asNullableDate(data.processedAt);
            if (data.completedAt !== undefined)
                patch.completedAt = asNullableDate(data.completedAt);
            if (data.refundedAt !== undefined)
                patch.refundedAt = asNullableDate(data.refundedAt);
            const row = await this.prisma.payment.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            // Manifest-only props pass through to mapped output
            const metaOverrides = extractMetadata(data, PAYMENT_METADATA_KEYS);
            return this.mapToManifestEntity({ ...row, ...metaOverrides });
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.payment.update({
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
        await this.prisma.payment.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            amount: r.amount ?? 0,
            currency: r.currency ?? "USD",
            status: r.status ?? "PENDING",
            methodType: r.methodType ?? "CREDIT_CARD",
            invoiceId: r.invoiceId ?? "",
            eventId: r.eventId ?? "",
            clientId: r.clientId ?? "",
            gatewayTransactionId: r.gatewayTransactionId ?? null,
            gatewayPaymentMethodId: r.gatewayPaymentMethodId ?? null,
            processor: r.processor ?? null,
            processedAt: r.processedAt ?? null,
            completedAt: r.completedAt ?? null,
            refundedAt: r.refundedAt ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
            // Manifest-only props (passed through)
            processorResponseCode: r.processorResponseCode ?? null,
            processorResponseMessage: r.processorResponseMessage ?? null,
            chargebackAt: r.chargebackAt ?? null,
            fraudStatus: r.fraudStatus ?? "NOT_CHECKED",
            fraudScore: r.fraudScore ?? null,
            fraudReasons: r.fraudReasons ?? null,
            reviewedAt: r.reviewedAt ?? null,
            reviewedBy: r.reviewedBy ?? null,
            description: r.description ?? null,
            externalReference: r.externalReference ?? null,
            metadata: r.metadata ?? {},
        };
    }
}
