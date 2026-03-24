/**
 * Payment Method Validation Helpers
 *
 * NOTE: The Prisma PaymentMethod model has been simplified to:
 * - tenantId, id, clientId, type, cardLastFour, cardNetwork, isDefault
 * - createdAt, updatedAt, deletedAt
 *
 * Many fields referenced in this file (cardExpiryMonth, cardExpiryYear, status, fraudFlagged, etc.)
 * do not exist in the current schema. These are preserved for potential future use but will
 * need schema updates to function.
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
      PAYMENT_METHOD_TYPES.includes(filters.type as string),
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
    PAYMENT_METHOD_TYPES.includes(type),
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
        CARD_NETWORKS.includes(data.cardNetwork as string),
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
    return `Bank Account`;
  }

  if (type === "DIGITAL_WALLET") {
    return `Digital Wallet`;
  }

  if (type === "CHECK") {
    return `Check`;
  }

  if (type === "CASH") {
    return `Cash`;
  }

  return type;
}

// Simplified helper - always returns true since we don't have expiry/status fields
export function isCardExpired(): boolean {
  return false;
}

// Simplified helper - always returns true since we don't have status fields
export function isPaymentMethodUsable(): boolean {
  return true;
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
