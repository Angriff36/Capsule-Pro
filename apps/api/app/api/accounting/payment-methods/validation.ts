/**
 * Payment Method Validation Helpers
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

export type PaymentMethodStatus = (typeof PAYMENT_METHOD_STATUSES)[number];
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];
export type CardNetwork = (typeof CARD_NETWORKS)[number];

export interface PaymentMethodFilters {
  clientId?: string;
  type?: PaymentMethodType;
  status?: PaymentMethodStatus;
  isDefault?: boolean;
  fraudFlagged?: boolean;
  search?: string;
}

export interface CreatePaymentMethodRequest {
  clientId: string;
  type: PaymentMethodType;
  externalMethodId: string;
  cardLastFour?: string;
  cardNetwork?: CardNetwork;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardHolderName?: string;
  bankAccountLastFour?: string;
  bankAccountType?: string;
  walletProvider?: string;
  walletEmail?: string;
  nickname?: string;
  metadata?: Record<string, unknown>;
  isDefault?: boolean;
}

export function parsePaymentMethodFilters(
  searchParams: URLSearchParams
): PaymentMethodFilters {
  const filters: PaymentMethodFilters = {
    clientId: searchParams.get("clientId") || undefined,
    type: searchParams.get("type") as PaymentMethodType | undefined,
    status: searchParams.get("status") as PaymentMethodStatus | undefined,
    isDefault: searchParams.get("isDefault") === "true",
    fraudFlagged: searchParams.get("fraudFlagged") === "true",
    search: searchParams.get("search") || undefined,
  };

  // Validate type if provided
  if (filters.type) {
    invariant(
      PAYMENT_METHOD_TYPES.includes(filters.type),
      `Invalid payment method type: ${filters.type}`
    );
  }

  // Validate status if provided
  if (filters.status) {
    invariant(
      PAYMENT_METHOD_STATUSES.includes(filters.status),
      `Invalid payment method status: ${filters.status}`
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
    PAYMENT_METHOD_TYPES.includes(type as PaymentMethodType),
    `Invalid payment method type: ${type}`
  );

  // External method ID (token) is required
  invariant(
    typeof data.externalMethodId === "string" &&
      data.externalMethodId.trim().length > 0,
    "externalMethodId is required and must be a non-empty string"
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
        CARD_NETWORKS.includes(data.cardNetwork as CardNetwork),
        `Invalid card network: ${data.cardNetwork}`
      );
    }

    if (data.cardExpiryMonth !== undefined && data.cardExpiryMonth !== null) {
      invariant(
        typeof data.cardExpiryMonth === "number" &&
          data.cardExpiryMonth >= 1 &&
          data.cardExpiryMonth <= 12,
        "cardExpiryMonth must be between 1 and 12"
      );
    }

    if (data.cardExpiryYear !== undefined && data.cardExpiryYear !== null) {
      invariant(
        typeof data.cardExpiryYear === "number" &&
          data.cardExpiryYear >= new Date().getFullYear(),
        "cardExpiryYear must be current year or future"
      );
    }

    if (data.cardHolderName !== undefined && data.cardHolderName !== null) {
      invariant(
        typeof data.cardHolderName === "string" &&
          data.cardHolderName.trim().length > 0,
        "cardHolderName must be a non-empty string"
      );
    }
  }

  // Validate ACH/bank-specific fields
  if (type === "ACH" || type === "WIRE_TRANSFER") {
    if (
      data.bankAccountLastFour !== undefined &&
      data.bankAccountLastFour !== null
    ) {
      invariant(
        typeof data.bankAccountLastFour === "string",
        "bankAccountLastFour must be a string"
      );
    }

    if (data.bankAccountType !== undefined && data.bankAccountType !== null) {
      invariant(
        typeof data.bankAccountType === "string",
        "bankAccountType must be a string"
      );
    }
  }

  // Validate digital wallet fields
  if (type === "DIGITAL_WALLET") {
    if (data.walletProvider !== undefined && data.walletProvider !== null) {
      invariant(
        typeof data.walletProvider === "string",
        "walletProvider must be a string"
      );
    }

    if (data.walletEmail !== undefined && data.walletEmail !== null) {
      invariant(
        typeof data.walletEmail === "string" && data.walletEmail.includes("@"),
        "walletEmail must be a valid email address"
      );
    }
  }

  // Validate optional nickname
  if (data.nickname !== undefined && data.nickname !== null) {
    invariant(
      typeof data.nickname === "string",
      "nickname must be a string if provided"
    );
  }

  // Validate optional metadata
  if (data.metadata !== undefined && data.metadata !== null) {
    invariant(
      typeof data.metadata === "object",
      "metadata must be an object if provided"
    );
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

export function isCardExpired(
  expiryMonth: number | null,
  expiryYear: number | null
): boolean {
  if (!(expiryMonth && expiryYear)) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    expiryYear < currentYear ||
    (expiryYear === currentYear && expiryMonth < currentMonth)
  );
}

export function getDisplayInfo(paymentMethod: {
  type: PaymentMethodType;
  cardLastFour: string | null;
  cardNetwork: CardNetwork | null;
  bankAccountLastFour: string | null;
  walletProvider: string | null;
  walletEmail: string | null;
}): string {
  const {
    type,
    cardLastFour,
    cardNetwork,
    bankAccountLastFour,
    walletProvider,
    walletEmail,
  } = paymentMethod;

  if (type === "CREDIT_CARD" || type === "DEBIT_CARD") {
    return `${cardNetwork || "Card"} •••• ${cardLastFour || "****"}`;
  }

  if (type === "ACH" || type === "WIRE_TRANSFER") {
    return `Bank •••• ${bankAccountLastFour || "****"}`;
  }

  if (type === "DIGITAL_WALLET") {
    return `${walletProvider || "Wallet"} (${walletEmail || "•••@•••.com"})`;
  }

  return type;
}

export function isPaymentMethodUsable(paymentMethod: {
  status: PaymentMethodStatus;
  fraudFlagged: boolean;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  type: PaymentMethodType;
}): boolean {
  if (paymentMethod.status !== "ACTIVE" || paymentMethod.fraudFlagged) {
    return false;
  }

  if (
    paymentMethod.type === "CREDIT_CARD" ||
    paymentMethod.type === "DEBIT_CARD"
  ) {
    return !isCardExpired(
      paymentMethod.cardExpiryMonth,
      paymentMethod.cardExpiryYear
    );
  }

  return true;
}
