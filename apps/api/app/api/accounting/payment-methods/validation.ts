/**
 * Payment Method Validation Helpers
 *
 * Available schema fields (see model PaymentMethod in schema.prisma):
 * - tenantId, id, clientId, type, cardLastFour, cardNetwork, isDefault, status
 * - createdAt, updatedAt, deletedAt
 *
 * `status` is a free-text column with expected values:
 *   ACTIVE | VERIFIED | FLAGGED | EXPIRED
 *
 * Card expiry month/year fields (cardExpiryMonth, cardExpiryYear) do NOT exist
 * in the schema. Date-based expiry detection is not possible without a migration
 * to add those columns.
 */

import { invariant } from "@/app/lib/invariant";

export const PAYMENT_METHOD_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "INVALID",
  "FRAUDULENT",
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

export const CARD_NETWORKS = [
  "VISA",
  "MASTERCARD",
  "AMEX",
  "DISCOVER",
  "DINERS_CLUB",
  "JCB",
] as const;

// Simplified type definitions - use string types for flexibility
export type PaymentMethodStatus = string;
export type PaymentMethodType = string;
export type CardNetwork = string;

export interface PaymentMethodFilters {
  clientId?: string;
  type?: string;
  isDefault?: boolean;
  search?: string;
}

export interface CreatePaymentMethodRequest {
  clientId: string;
  type: string;
  cardLastFour?: string;
  cardNetwork?: string;
  isDefault?: boolean;
}

export function parsePaymentMethodFilters(
  searchParams: URLSearchParams
): PaymentMethodFilters {
  const filters: PaymentMethodFilters = {
    clientId: searchParams.get("clientId") || undefined,
    type: searchParams.get("type") || undefined,
    isDefault: searchParams.get("isDefault") === "true",
    search: searchParams.get("search") || undefined,
  };

  // Validate type if provided
  if (filters.type) {
    invariant(
      (PAYMENT_METHOD_TYPES as readonly string[]).includes(filters.type),
      `Invalid payment method type: ${filters.type}`
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

export function validateCreatePaymentMethodRequest(
  body: unknown
): asserts body is CreatePaymentMethodRequest {
  invariant(
    body && typeof body === "object",
    "Request body must be a valid object"
  );

  const data = body as Record<string, unknown>;

  // Client ID is required
  invariant(
    typeof data.clientId === "string" && data.clientId.trim().length > 0,
    "clientId is required and must be a non-empty string"
  );

  // Type is required
  invariant(typeof data.type === "string", "type is required");

  const type = data.type as string;
  invariant(
    (PAYMENT_METHOD_TYPES as readonly string[]).includes(type),
    `Invalid payment method type: ${type}`
  );

  // Validate card-specific fields
  if (type === "CREDIT_CARD" || type === "DEBIT_CARD") {
    if (data.cardLastFour !== undefined && data.cardLastFour !== null) {
      invariant(
        typeof data.cardLastFour === "string" && data.cardLastFour.length === 4,
        "cardLastFour must be a 4-character string"
      );
    }

    if (data.cardNetwork !== undefined && data.cardNetwork !== null) {
      invariant(
        typeof data.cardNetwork === "string",
        "cardNetwork must be a string"
      );
      invariant(
        (CARD_NETWORKS as readonly string[]).includes(
          data.cardNetwork as string
        ),
        `Invalid card network: ${data.cardNetwork}`
      );
    }
  }

  // Validate optional isDefault
  if (data.isDefault !== undefined && data.isDefault !== null) {
    invariant(
      typeof data.isDefault === "boolean",
      "isDefault must be a boolean"
    );
  }
}

export function validatePaymentMethodAccess(
  paymentMethod: { tenantId: string; clientId: string },
  tenantId: string
): void {
  invariant(
    paymentMethod.tenantId === tenantId,
    "Access denied: Payment method does not belong to this tenant"
  );
}

export function getDisplayInfo(paymentMethod: {
  type: string;
  cardLastFour: string | null;
  cardNetwork: string | null;
}): string {
  const { type, cardLastFour, cardNetwork } = paymentMethod;

  if (type === "CREDIT_CARD" || type === "DEBIT_CARD") {
    return `${cardNetwork || "Card"} •••• ${cardLastFour || "****"}`;
  }

  if (type === "ACH" || type === "WIRE_TRANSFER") {
    return "Bank Account";
  }

  if (type === "DIGITAL_WALLET") {
    return "Digital Wallet";
  }

  if (type === "CHECK") {
    return "Check";
  }

  if (type === "CASH") {
    return "Cash";
  }

  return type;
}

/**
 * Check whether a payment method has been marked as expired via its status field.
 *
 * This checks the `status` column only — it cannot perform date-based expiry
 * detection because the schema has no `cardExpiryMonth` / `cardExpiryYear`
 * columns. A migration adding those fields would enable automatic expiry
 * detection based on the current date.
 *
 * TODO: Add `cardExpiryMonth Int?` and `cardExpiryYear Int?` to the
 * PaymentMethod model to support date-based expiry detection.
 */
export function isCardExpired(paymentMethod: { status: string }): boolean {
  return paymentMethod.status === "EXPIRED";
}

/**
 * Determine whether a payment method is usable for new transactions.
 *
 * Returns `false` if the method is EXPIRED or FLAGGED for fraud.
 * Returns `true` for ACTIVE and VERIFIED statuses (and any unrecognized
 * status value, to avoid blocking legitimate use after future status additions).
 */
export function isPaymentMethodUsable(paymentMethod: {
  status: string;
}): boolean {
  const unusableStatuses: ReadonlySet<string> = new Set(["EXPIRED", "FLAGGED"]);

  return !unusableStatuses.has(paymentMethod.status);
}

// Type definitions for API responses
export interface PaymentMethodResponse {
  id: string;
  tenantId: string;
  clientId: string;
  type: string;
  cardLastFour: string | null;
  cardNetwork: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  displayInfo: string;
}

export interface PaymentMethodListResponse {
  data: PaymentMethodResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
