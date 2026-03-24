/**
 * Payment Validation Helpers
 *
 * NOTE: The Prisma Payment model has been simplified to:
 * - tenantId, id, amount, currency, status, methodType, invoiceId, eventId, clientId
 * - gatewayTransactionId, gatewayPaymentMethodId, processor
 * - processedAt, completedAt, refundedAt
 * - createdAt, updatedAt, deletedAt
 */

import { invariant } from "@/app/lib/invariant";

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "CHARGEBACK",
  "VOID",
] as const;

export const PAYMENT_METHOD_TYPES = [
  "CREDIT_CARD",
  "DEBIT_CARD",
  "ACH",
  "CHECK",
  "CASH",
  "WIRE_TRANSFER",
  "DIGITAL_WALLET",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus;
  methodType?: PaymentMethodType;
  invoiceId?: string;
  eventId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
}

export interface CreatePaymentRequest {
  invoiceId: string;
  eventId: string;
  amount: number;
  currency?: string;
  methodType: PaymentMethodType;
  paymentMethodId?: string;
  processor?: string;
}

export function parsePaymentFilters(
  searchParams: URLSearchParams
): PaymentFilters {
  const filters: PaymentFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") as PaymentStatus | undefined,
    methodType: searchParams.get("methodType") as PaymentMethodType | undefined,
    invoiceId: searchParams.get("invoiceId") || undefined,
    eventId: searchParams.get("eventId") || undefined,
    clientId: searchParams.get("clientId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    amountFrom: searchParams.get("amountFrom")
      ? Number(searchParams.get("amountFrom"))
      : undefined,
    amountTo: searchParams.get("amountTo")
      ? Number(searchParams.get("amountTo"))
      : undefined,
  };

  // Validate status if provided
  if (filters.status) {
    invariant(
      PAYMENT_STATUSES.includes(filters.status),
      `Invalid status: ${filters.status}`
    );
  }

  // Validate methodType if provided
  if (filters.methodType) {
    invariant(
      PAYMENT_METHOD_TYPES.includes(filters.methodType),
      `Invalid method type: ${filters.methodType}`
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

export function validateCreatePaymentRequest(
  body: unknown
): asserts body is CreatePaymentRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Invoice ID is required
  invariant(
    typeof data.invoiceId === "string" && data.invoiceId.trim().length > 0,
    "invoiceId is required and must be a non-empty string"
  );

  // Event ID is required
  invariant(
    typeof data.eventId === "string" && data.eventId.trim().length > 0,
    "eventId is required and must be a non-empty string"
  );

  // Amount is required and must be positive
  invariant(
    typeof data.amount === "number" && data.amount > 0,
    "amount is required and must be a positive number"
  );

  // Validate method type
  invariant(typeof data.methodType === "string", "methodType is required");

  const methodType = data.methodType as string;
  invariant(
    PAYMENT_METHOD_TYPES.includes(methodType as PaymentMethodType),
    `Invalid method type: ${methodType}`
  );

  // Validate optional currency
  if (data.currency !== undefined && data.currency !== null) {
    invariant(
      typeof data.currency === "string" && data.currency.length === 3,
      "currency must be a valid 3-letter currency code"
    );
  }

  // Validate optional processor
  if (data.processor !== undefined && data.processor !== null) {
    invariant(
      typeof data.processor === "string",
      "processor must be a string if provided"
    );
  }
}

export function validateRefundRequest(body: unknown): void {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Amount is required and must be positive
  invariant(
    typeof data.amount === "number" && data.amount > 0,
    "amount is required and must be a positive number"
  );

  // Reason is required
  invariant(
    typeof data.reason === "string" && data.reason.trim().length > 0,
    "reason is required and must be a non-empty string"
  );
}

export function generatePaymentNumber(_tenantId: string): string {
  // Generate a payment reference number in the format: PAY-YYYYMMDD-XXXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `PAY-${dateStr}-${randomPart}`;
}

export function validatePaymentAccess(
  payment: { tenantId: string; status: PaymentStatus },
  tenantId: string,
  requiredStatus?: PaymentStatus[]
): void {
  invariant(
    payment.tenantId === tenantId,
    "Access denied: Payment does not belong to this tenant"
  );

  if (requiredStatus && requiredStatus.length > 0) {
    invariant(
      requiredStatus.includes(payment.status),
      `Payment must be in one of these statuses: ${requiredStatus.join(", ")}`
    );
  }
}

export function validatePaymentBusinessRules(
  payment: { status: PaymentStatus; amount: number; refundedAt: Date | null },
  operation: "refund" | "chargeback" | "process"
): void {
  switch (operation) {
    case "refund":
      invariant(
        payment.status === "COMPLETED",
        "Can only refund completed payments"
      );
      invariant(
        payment.refundedAt === null,
        "Payment has already been refunded"
      );
      break;

    case "chargeback":
      invariant(
        payment.status === "COMPLETED" ||
          payment.status === "PARTIALLY_REFUNDED",
        "Can only chargeback completed or partially refunded payments"
      );
      break;

    case "process":
      invariant(
        payment.status === "PENDING" || payment.status === "PROCESSING",
        "Can only process pending or processing payments"
      );
      break;

    default:
      invariant(false, `Unknown payment operation: ${operation}`);
  }
}

// Type definitions for API responses
export interface PaymentResponse {
  id: string;
  tenantId: string;
  amount: Decimal;
  currency: string;
  status: string;
  methodType: string;
  invoiceId: string;
  eventId: string;
  clientId: string | null;
  gatewayTransactionId: string | null;
  gatewayPaymentMethodId: string | null;
  processor: string | null;
  processedAt: Date;
  completedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PaymentListResponse {
  data: PaymentResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Decimal type alias for compatibility
type Decimal = string | number | { toString(): string };
