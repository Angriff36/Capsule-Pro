/**
 * Invoice Validation Helpers
 */

import { invariant } from "@/app/lib/invariant";

export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
  "WRITE_OFF",
] as const;

export const INVOICE_TYPES = [
  "DEPOSIT",
  "FINAL_PAYMENT",
  "PROGRESS",
  "MISC",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type InvoiceType = (typeof INVOICE_TYPES)[number];

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  clientId?: string;
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
  isPaidInFull?: boolean;
}

export interface CreateInvoiceRequest {
  eventId: string;
  clientId: string;
  invoiceType?: InvoiceType;
  paymentTerms?: number;
  dueDate?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  notes?: string;
  internalNotes?: string;
  depositPercentage?: number;
  metadata?: Record<string, unknown>;
}

export function parseInvoiceFilters(
  searchParams: URLSearchParams
): InvoiceFilters {
  const filters: InvoiceFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") as InvoiceStatus | undefined,
    invoiceType: searchParams.get("invoiceType") as InvoiceType | undefined,
    clientId: searchParams.get("clientId") || undefined,
    eventId: searchParams.get("eventId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    dueFrom: searchParams.get("dueFrom") || undefined,
    dueTo: searchParams.get("dueTo") || undefined,
    overdue: searchParams.get("overdue") === "true",
    isPaidInFull: searchParams.get("isPaidInFull") === "true",
  };

  // Validate status if provided
  if (filters.status) {
    invariant(
      INVOICE_STATUSES.includes(filters.status),
      `Invalid status: ${filters.status}`
    );
  }

  // Validate invoiceType if provided
  if (filters.invoiceType) {
    invariant(
      INVOICE_TYPES.includes(filters.invoiceType),
      `Invalid invoice type: ${filters.invoiceType}`
    );
  }

  return filters;
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") || "50"))
  );

  return { page, limit };
}

export function validateCreateInvoiceRequest(
  body: unknown
): asserts body is CreateInvoiceRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Event ID is required
  invariant(
    typeof data.eventId === "string" && data.eventId.trim().length > 0,
    "eventId is required and must be a non-empty string"
  );

  // Client ID is required
  invariant(
    typeof data.clientId === "string" && data.clientId.trim().length > 0,
    "clientId is required and must be a non-empty string"
  );

  // Validate optional invoice type
  if (data.invoiceType !== undefined && data.invoiceType !== null) {
    invariant(
      typeof data.invoiceType === "string",
      "invoiceType must be a string"
    );
    invariant(
      INVOICE_TYPES.includes(data.invoiceType as InvoiceType),
      `Invalid invoice type: ${data.invoiceType}`
    );
  }

  // Validate optional payment terms
  if (data.paymentTerms !== undefined && data.paymentTerms !== null) {
    invariant(
      typeof data.paymentTerms === "number" && data.paymentTerms > 0,
      "paymentTerms must be a positive number"
    );
  }

  // Validate optional due date
  if (data.dueDate !== undefined && data.dueDate !== null) {
    const dueDate =
      data.dueDate instanceof Date
        ? data.dueDate
        : new Date(data.dueDate as string);
    invariant(
      dueDate instanceof Date && !Number.isNaN(dueDate.getTime()),
      "dueDate must be a valid date"
    );
  }

  // Validate optional deposit percentage
  if (data.depositPercentage !== undefined && data.depositPercentage !== null) {
    invariant(
      typeof data.depositPercentage === "number" &&
        data.depositPercentage > 0 &&
        data.depositPercentage <= 100,
      "depositPercentage must be between 0 and 100"
    );
  }

  // Validate optional line items
  if (data.lineItems !== undefined && data.lineItems !== null) {
    invariant(Array.isArray(data.lineItems), "lineItems must be an array");
    for (const item of data.lineItems as Array<unknown>) {
      invariant(
        item && typeof item === "object",
        "Each line item must be an object"
      );
      const lineItem = item as Record<string, unknown>;
      invariant(
        typeof lineItem.description === "string" &&
          lineItem.description.trim().length > 0,
        "lineItem description is required"
      );
      invariant(
        typeof lineItem.quantity === "number" && lineItem.quantity > 0,
        "lineItem quantity must be a positive number"
      );
      invariant(
        typeof lineItem.unitPrice === "number" && lineItem.unitPrice >= 0,
        "lineItem unitPrice must be a non-negative number"
      );
      invariant(
        typeof lineItem.taxRate === "number" && lineItem.taxRate >= 0,
        "lineItem taxRate must be a non-negative number"
      );
    }
  }

  // Validate optional notes
  if (data.notes !== undefined && data.notes !== null) {
    invariant(
      typeof data.notes === "string",
      "notes must be a string if provided"
    );
  }

  // Validate optional metadata
  if (data.metadata !== undefined && data.metadata !== null) {
    invariant(
      typeof data.metadata === "object",
      "metadata must be an object if provided"
    );
  }
}

export function validateUpdateInvoiceRequest(
  body: unknown
): asserts body is CreateInvoiceRequest & { id?: string } {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // ID is required for updates
  if (data.id !== undefined && data.id !== null) {
    invariant(
      typeof data.id === "string" && data.id.trim().length > 0,
      "id must be a non-empty string if provided"
    );
  }

  // Reuse create validation for other fields
  validateCreateInvoiceRequest(data);
}

export function generateInvoiceNumber(_tenantId: string): string {
  // Generate an invoice number in the format: INV-YYYYMMDD-XXXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `INV-${dateStr}-${randomPart}`;
}

export function validateInvoiceAccess(
  invoice: { tenantId: string; status: InvoiceStatus },
  tenantId: string,
  requiredStatus?: InvoiceStatus[]
): void {
  invariant(
    invoice.tenantId === tenantId,
    "Access denied: Invoice does not belong to this tenant"
  );

  if (requiredStatus && requiredStatus.length > 0) {
    invariant(
      requiredStatus.includes(invoice.status),
      `Invoice must be in one of these statuses: ${requiredStatus.join(", ")}`
    );
  }
}

export function validateInvoiceBusinessRules(
  invoice: { status: InvoiceStatus; amountPaid: number; amountDue: number },
  operation: "send" | "void" | "writeOff" | "applyPayment"
): void {
  switch (operation) {
    case "send":
      invariant(invoice.status === "DRAFT", "Can only send draft invoices");
      invariant(
        invoice.amountDue > 0,
        "Cannot send invoices with zero balance"
      );
      break;

    case "void":
      invariant(
        invoice.status === "DRAFT" ||
          invoice.status === "SENT" ||
          invoice.status === "VIEWED" ||
          invoice.status === "OVERDUE",
        "Cannot void invoices that are paid or partially paid"
      );
      invariant(invoice.amountPaid === 0, "Cannot void invoices with payments");
      break;

    case "writeOff":
      invariant(
        invoice.status === "OVERDUE" || invoice.status === "PARTIALLY_PAID",
        "Can only write off overdue or partially paid invoices"
      );
      break;

    case "applyPayment":
      invariant(
        invoice.status === "SENT" ||
          invoice.status === "VIEWED" ||
          invoice.status === "OVERDUE" ||
          invoice.status === "PARTIALLY_PAID",
        "Cannot apply payment to invoice in current status"
      );
      break;

    default:
      invariant(false, `Unknown invoice operation: ${operation}`);
  }
}

export function calculateInvoiceTotals(
  lineItems: Array<{
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>,
  discountAmount = 0
): {
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of lineItems) {
    const lineTotal = item.quantity * item.unitPrice;
    subtotal += lineTotal;
    taxAmount += lineTotal * (item.taxRate / 100);
  }

  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function isInvoiceOverdue(
  status: InvoiceStatus,
  dueDate: Date
): boolean {
  const validStatuses: InvoiceStatus[] = ["SENT", "VIEWED", "PARTIALLY_PAID"];
  return validStatuses.includes(status) && new Date(dueDate) < new Date();
}

export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Type definitions for API responses
export interface InvoiceResponse {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  clientId: string;
  eventId: string;
  subtotal: Decimal;
  taxAmount: Decimal;
  discountAmount: Decimal;
  total: Decimal;
  amountPaid: Decimal;
  amountDue: Decimal;
  paymentTerms: number;
  dueDate: Date;
  issuedAt: Date;
  depositPercentage: Decimal | null;
  depositRequired: Decimal | null;
  depositPaid: Decimal | null;
  notes: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }> | null;
  metadata: Record<string, unknown>;
  sentAt: Date | null;
  viewedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InvoiceListResponse {
  data: InvoiceResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Decimal type alias for compatibility
type Decimal = string | number | { toString(): string };
