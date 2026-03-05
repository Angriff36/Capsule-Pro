/**
 * Payment Methods API Types
 *
 * Shared types for payment method management operations
 */

/**
 * Payment method status options
 */
export type PaymentMethodStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "INVALID"
  | "FRAUDULENT";

/**
 * Payment method type options
 */
export type PaymentMethodType =
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "ACH"
  | "CHECK"
  | "CASH"
  | "WIRE_TRANSFER"
  | "DIGITAL_WALLET";

/**
 * Card network options
 */
export type CardNetwork =
  | "VISA"
  | "MASTERCARD"
  | "AMEX"
  | "DISCOVER"
  | "DINERS_CLUB"
  | "JCB";

/**
 * Payment method type from database
 */
export interface PaymentMethod {
  tenantId: string;
  id: string;
  clientId: string;
  externalMethodId: string | null;
  type: PaymentMethodType;
  cardLastFour: string | null;
  cardNetwork: CardNetwork | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  cardHolderName: string | null;
  bankAccountLastFour: string | null;
  bankAccountType: string | null;
  bankRoutingNumber: string | null;
  walletProvider: string | null;
  walletEmail: string | null;
  status: PaymentMethodStatus;
  isDefault: boolean;
  fraudFlagged: boolean;
  verifiedAt: Date | null;
  verificationMethod: string | null;
  nickname: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

/**
 * Create payment method request body
 */
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

/**
 * Update payment method request body
 */
export type UpdatePaymentMethodRequest = Partial<CreatePaymentMethodRequest>;

/**
 * Payment method list item
 */
export interface PaymentMethodListItem {
  id: string;
  clientId: string;
  clientName: string;
  type: PaymentMethodType;
  displayInfo: string;
  status: PaymentMethodStatus;
  isDefault: boolean;
  fraudFlagged: boolean;
  isExpired: boolean;
  isUsable: boolean;
  createdAt: Date;
}

/**
 * Payment method list response with pagination
 */
export interface PaymentMethodListResponse {
  data: PaymentMethodListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Payment method response with related data
 */
export type PaymentMethodResponse = PaymentMethod & {
  client?: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  displayInfo?: string;
  isExpired?: boolean;
  isUsable?: boolean;
};

/**
 * Payment method filters
 */
export interface PaymentMethodFilters {
  clientId?: string;
  type?: PaymentMethodType;
  status?: PaymentMethodStatus;
  isDefault?: boolean;
  fraudFlagged?: boolean;
  search?: string;
}

/**
 * Tokenization response from payment gateway
 */
export interface TokenizationResponse {
  success: boolean;
  token: string;
  lastFour: string;
  network?: CardNetwork;
  expiryMonth?: number;
  expiryYear?: number;
  cardHolder?: string;
  errorMessage?: string;
}

/**
 * Verification request
 */
export interface VerifyPaymentMethodRequest {
  method: "micro_deposit" | "instant_verification" | "manual";
}
