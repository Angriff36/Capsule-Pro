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
  bankAccountLastFour: string | null;
  bankAccountType: string | null;
  bankRoutingNumber: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  cardHolderName: string | null;
  cardLastFour: string | null;
  cardNetwork: CardNetwork | null;
  clientId: string;
  createdAt: Date;
  expiresAt: Date | null;
  externalMethodId: string | null;
  fraudFlagged: boolean;
  id: string;
  isDefault: boolean;
  nickname: string | null;
  status: PaymentMethodStatus;
  tenantId: string;
  type: PaymentMethodType;
  updatedAt: Date;
  verificationMethod: string | null;
  verifiedAt: Date | null;
  walletEmail: string | null;
  walletProvider: string | null;
}

/**
 * Create payment method request body
 */
export interface CreatePaymentMethodRequest {
  bankAccountLastFour?: string;
  bankAccountType?: string;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardHolderName?: string;
  cardLastFour?: string;
  cardNetwork?: CardNetwork;
  clientId: string;
  externalMethodId: string;
  isDefault?: boolean;
  nickname?: string;
  type: PaymentMethodType;
  walletEmail?: string;
  walletProvider?: string;
}

/**
 * Update payment method request body
 */
export type UpdatePaymentMethodRequest = Partial<CreatePaymentMethodRequest>;

/**
 * Payment method list item
 */
export interface PaymentMethodListItem {
  clientId: string;
  clientName: string;
  createdAt: Date;
  displayInfo: string;
  fraudFlagged: boolean;
  id: string;
  isDefault: boolean;
  isExpired: boolean;
  isUsable: boolean;
  status: PaymentMethodStatus;
  type: PaymentMethodType;
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
  fraudFlagged?: boolean;
  isDefault?: boolean;
  search?: string;
  status?: PaymentMethodStatus;
  type?: PaymentMethodType;
}

/**
 * Tokenization response from payment gateway
 */
export interface TokenizationResponse {
  cardHolder?: string;
  errorMessage?: string;
  expiryMonth?: number;
  expiryYear?: number;
  lastFour: string;
  network?: CardNetwork;
  success: boolean;
  token: string;
}

/**
 * Verification request
 */
export interface VerifyPaymentMethodRequest {
  method: "micro_deposit" | "instant_verification" | "manual";
}
