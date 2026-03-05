/**
 * Payment Validation Helpers
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

export const FRAUD_STATUSES = [
  "NOT_CHECKED",
  "PASSED",
  "FAILED",
  "REVIEW_NEEDED",
  "MANUAL_REVIEW",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];
export type FraudStatus = (typeof FRAUD_STATUSES)[number];

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus;
  methodType?: PaymentMethodType;
  fraudStatus?: FraudStatus;
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
  description?: string;
  metadata?: Record<string, unknown>;
}

export function parsePaymentFilters(
  searchParams: URLSearchParams
): PaymentFilters {
  const filters: PaymentFilters = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") as PaymentStatus | undefined,
    methodType: searchParams.get("methodType") as PaymentMethodType | undefined,
    fraudStatus: searchParams.get("fraudStatus") as FraudStatus | undefined,
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

  // Validate fraudStatus if provided
  if (filters.fraudStatus) {
    invariant(
      FRAUD_STATUSES.includes(filters.fraudStatus),
      `Invalid fraud status: ${filters.fraudStatus}`
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

  // Validate optional description
  if (data.description !== undefined && data.description !== null) {
    invariant(
      typeof data.description === "string",
      "description must be a string if provided"
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

export function validateFraudStatusUpdate(body: unknown): void {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Status is required
  invariant(typeof data.status === "string", "status is required");

  const status = data.status as string;
  invariant(
    FRAUD_STATUSES.includes(status as FraudStatus),
    `Invalid fraud status: ${status}`
  );

  // Score is required
  invariant(
    typeof data.score === "number" && data.score >= 0 && data.score <= 100,
    "score is required and must be between 0 and 100"
  );

  // Reasons must be an array
  invariant(
    Array.isArray(data.reasons),
    "reasons is required and must be an array"
  );
}

export function validateFraudReview(body: unknown): void {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Approved is required
  invariant(
    typeof data.approved === "boolean",
    "approved is required and must be a boolean"
  );

  // Notes are optional but must be a string if provided
  if (data.notes !== undefined && data.notes !== null) {
    invariant(
      typeof data.notes === "string",
      "notes must be a string if provided"
    );
  }
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
