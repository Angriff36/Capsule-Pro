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
import {
  asBool,
  asJsonInput,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalInput,
  toDecimalRequired,
} from "./shared.js";

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
] as const;

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
] as const;

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
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract metadata-only keys from a data bag into a JSON object. */
function extractMetadata(
  data: Partial<EntityInstance>,
  keys: readonly string[],
): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
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

export class InvoicePrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.invoice.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const metaOverrides = extractMetadata(data, INVOICE_METADATA_KEYS);
    const existingMeta = (data.metadata as Record<string, unknown>) ?? {};
    const mergedMeta = { ...existingMeta, ...metaOverrides };

    const row = await this.prisma.invoice.create({
      data: {
        tenantId: this.tenantId,
        id,
        invoiceNumber: asString(data.invoiceNumber) || `INV-${Date.now()}`,
        invoiceType: (asString(data.type ?? data.invoiceType) || "FINAL_PAYMENT") as "DEPOSIT" | "FINAL_PAYMENT" | "PROGRESS" | "MISC" | "CREDIT_NOTE" | "DEBIT_NOTE",
        status: (asString(data.status) || "DRAFT") as "DRAFT" | "SENT" | "VIEWED" | "OVERDUE" | "PARTIALLY_PAID" | "PAID" | "VOID" | "WRITE_OFF",
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

  async update(
    id: string,
    data: Partial<EntityInstance>,
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};

      // Scalar fields
      if (data.invoiceNumber !== undefined) patch.invoiceNumber = asString(data.invoiceNumber);
      if (data.type !== undefined) patch.invoiceType = asString(data.type);
      if (data.invoiceType !== undefined) patch.invoiceType = asString(data.invoiceType);
      if (data.status !== undefined) patch.status = asString(data.status);
      if (data.clientId !== undefined) patch.clientId = asNullableString(data.clientId);
      if (data.eventId !== undefined) patch.eventId = asNullableString(data.eventId);
      if (data.subtotal !== undefined) patch.subtotal = toDecimalRequired(data.subtotal, 0);
      if (data.taxAmount !== undefined) patch.taxAmount = toDecimalRequired(data.taxAmount, 0);
      if (data.discountAmount !== undefined) patch.discountAmount = toDecimalRequired(data.discountAmount, 0);
      if (data.total !== undefined) patch.total = toDecimalRequired(data.total, 0);
      if (data.amountPaid !== undefined) patch.amountPaid = toDecimalRequired(data.amountPaid, 0);
      if (data.amountDue !== undefined) patch.amountDue = toDecimalRequired(data.amountDue, 0);
      if (data.paymentTerms !== undefined) patch.paymentTerms = asNullableNumber(data.paymentTerms) ?? 30;
      if (data.dueDate !== undefined) patch.dueDate = asNullableDate(data.dueDate);
      if (data.issuedAt !== undefined) patch.issuedAt = asNullableDate(data.issuedAt);
      if (data.depositPercentage !== undefined) patch.depositPercentage = toDecimalInput(data.depositPercentage);
      if (data.depositRequired !== undefined) patch.depositRequired = toDecimalInput(data.depositRequired);
      if (data.depositPaid !== undefined) patch.depositPaid = toDecimalInput(data.depositPaid);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      if (data.internalNotes !== undefined) patch.internalNotes = asNullableString(data.internalNotes);
      if (data.lineItems !== undefined) patch.lineItems = asJsonInput(data.lineItems);
      if (data.sentAt !== undefined) patch.sentAt = asNullableDate(data.sentAt);
      if (data.viewedAt !== undefined) patch.viewedAt = asNullableDate(data.viewedAt);
      if (data.paidAt !== undefined) patch.paidAt = asNullableDate(data.paidAt);
      if (data.voidedAt !== undefined) patch.voidedAt = asNullableDate(data.voidedAt);

      // Merge manifest-only props into metadata
      const metaOverrides = extractMetadata(data, INVOICE_METADATA_KEYS);
      if (Object.keys(metaOverrides).length > 0 || data.metadata !== undefined) {
        const existingMeta = (data.metadata as Record<string, unknown>) ?? {};
        patch.metadata = { ...existingMeta, ...metaOverrides };
      }

      const row = await this.prisma.invoice.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.invoice.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.invoice.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      invoiceNumber: (r.invoiceNumber as string) ?? "",
      type: (r.invoiceType as string) ?? "FINAL_PAYMENT",
      invoiceType: (r.invoiceType as string) ?? "FINAL_PAYMENT",
      status: (r.status as string) ?? "DRAFT",
      clientId: (r.clientId as string) ?? "",
      eventId: (r.eventId as string) ?? "",
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
      notes: (r.notes as string) ?? null,
      internalNotes: (r.internalNotes as string) ?? null,
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
      reminderCount: (meta.reminderCount as number) ?? 0,
      overdueSince: (meta.overdueSince as string) ?? null,
      lastReminderAt: (meta.lastReminderAt as string) ?? null,
      quickBooksId: (meta.quickBooksId as string) ?? null,
      goodshuffleId: (meta.goodshuffleId as string) ?? null,
      externalSyncStatus: (meta.externalSyncStatus as string) ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// PaymentMethodPrismaStore
// ---------------------------------------------------------------------------

export class PaymentMethodPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.paymentMethod.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.paymentMethod.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
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

  async update(
    id: string,
    data: Partial<EntityInstance>,
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};

      if (data.clientId !== undefined) patch.clientId = asString(data.clientId);
      if (data.type !== undefined) patch.type = asString(data.type);
      if (data.cardLastFour !== undefined) patch.cardLastFour = asNullableString(data.cardLastFour);
      if (data.cardNetwork !== undefined) patch.cardNetwork = asNullableString(data.cardNetwork);
      if (data.isDefault !== undefined) patch.isDefault = asBool(data.isDefault, false);

      const row = await this.prisma.paymentMethod.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });

      // Manifest-only properties don't have Prisma columns; include in mapped output
      const metaOverrides = extractMetadata(data, PAYMENT_METHOD_METADATA_KEYS);
      return this.mapToManifestEntity({ ...row, ...metaOverrides });
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.paymentMethod.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.paymentMethod.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      clientId: (r.clientId as string) ?? "",
      type: (r.type as string) ?? "CREDIT_CARD",
      cardLastFour: (r.cardLastFour as string) ?? null,
      cardNetwork: (r.cardNetwork as string) ?? null,
      isDefault: r.isDefault ?? false,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
      // Manifest-only props (passed through if provided in data)
      externalMethodId: (r.externalMethodId as string) ?? null,
      cardExpiryMonth: (r.cardExpiryMonth as number) ?? null,
      cardExpiryYear: (r.cardExpiryYear as number) ?? null,
      cardHolderName: (r.cardHolderName as string) ?? null,
      bankAccountLastFour: (r.bankAccountLastFour as string) ?? null,
      bankAccountType: (r.bankAccountType as string) ?? null,
      bankRoutingNumber: (r.bankRoutingNumber as string) ?? null,
      walletProvider: (r.walletProvider as string) ?? null,
      walletEmail: (r.walletEmail as string) ?? null,
      status: (r.status as string) ?? "ACTIVE",
      fraudFlagged: (r.fraudFlagged as boolean) ?? false,
      verifiedAt: (r.verifiedAt as string) ?? null,
      verificationMethod: (r.verificationMethod as string) ?? null,
      nickname: (r.nickname as string) ?? null,
      expiresAt: (r.expiresAt as string) ?? null,
      metadata: r.metadata ?? {},
    };
  }
}

// ---------------------------------------------------------------------------
// PaymentPrismaStore
// ---------------------------------------------------------------------------

export class PaymentPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.payment.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.payment.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();

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

  async update(
    id: string,
    data: Partial<EntityInstance>,
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};

      if (data.amount !== undefined) patch.amount = toDecimalRequired(data.amount, 0);
      if (data.currency !== undefined) patch.currency = asString(data.currency);
      if (data.status !== undefined) patch.status = asString(data.status);
      if (data.methodType !== undefined) patch.methodType = asString(data.methodType);
      if (data.invoiceId !== undefined) patch.invoiceId = asString(data.invoiceId);
      if (data.eventId !== undefined) patch.eventId = asString(data.eventId);
      if (data.clientId !== undefined) patch.clientId = asString(data.clientId);
      if (data.gatewayTransactionId !== undefined) patch.gatewayTransactionId = asNullableString(data.gatewayTransactionId);
      if (data.gatewayPaymentMethodId !== undefined) patch.gatewayPaymentMethodId = asNullableString(data.gatewayPaymentMethodId);
      if (data.processor !== undefined) patch.processor = asNullableString(data.processor);
      if (data.processedAt !== undefined) patch.processedAt = asNullableDate(data.processedAt);
      if (data.completedAt !== undefined) patch.completedAt = asNullableDate(data.completedAt);
      if (data.refundedAt !== undefined) patch.refundedAt = asNullableDate(data.refundedAt);

      const row = await this.prisma.payment.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });

      // Manifest-only props pass through to mapped output
      const metaOverrides = extractMetadata(data, PAYMENT_METADATA_KEYS);
      return this.mapToManifestEntity({ ...row, ...metaOverrides });
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.payment.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.payment.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      amount: r.amount ?? 0,
      currency: (r.currency as string) ?? "USD",
      status: (r.status as string) ?? "PENDING",
      methodType: (r.methodType as string) ?? "CREDIT_CARD",
      invoiceId: (r.invoiceId as string) ?? "",
      eventId: (r.eventId as string) ?? "",
      clientId: (r.clientId as string) ?? "",
      gatewayTransactionId: (r.gatewayTransactionId as string) ?? null,
      gatewayPaymentMethodId: (r.gatewayPaymentMethodId as string) ?? null,
      processor: (r.processor as string) ?? null,
      processedAt: r.processedAt ?? null,
      completedAt: r.completedAt ?? null,
      refundedAt: r.refundedAt ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
      // Manifest-only props (passed through)
      processorResponseCode: (r.processorResponseCode as string) ?? null,
      processorResponseMessage: (r.processorResponseMessage as string) ?? null,
      chargebackAt: (r.chargebackAt as string) ?? null,
      fraudStatus: (r.fraudStatus as string) ?? "NOT_CHECKED",
      fraudScore: r.fraudScore ?? null,
      fraudReasons: r.fraudReasons ?? null,
      reviewedAt: (r.reviewedAt as string) ?? null,
      reviewedBy: (r.reviewedBy as string) ?? null,
      description: (r.description as string) ?? null,
      externalReference: (r.externalReference as string) ?? null,
      metadata: r.metadata ?? {},
    };
  }
}
