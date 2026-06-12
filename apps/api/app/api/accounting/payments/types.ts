/**
 * Payments API Types
 *
 * Shared types for payment processing operations
 */

/**
 * Payment status options
 */
export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGEBACK"
  | "VOID";

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
 * Fraud detection status
 */
export type FraudStatus =
  | "NOT_CHECKED"
  | "PASSED"
  | "FAILED"
  | "REVIEW_NEEDED"
  | "MANUAL_REVIEW";

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
 * Payment type from database
 */
export interface Payment {
  amount: number;
  chargebackAt: Date | null;
  clientId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  currency: string;
  deletedAt: Date | null;
  description: string | null;
  eventId: string;
  fraudReasons: string[];
  fraudScore: number | null;
  fraudStatus: FraudStatus;
  gatewayPaymentMethodId: string | null;
  gatewayTransactionId: string | null;
  id: string;
  invoiceId: string;
  methodType: PaymentMethodType;
  processedAt: Date;
  processor: string | null;
  refundedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  status: PaymentStatus;
  tenantId: string;
  updatedAt: Date;
}

/**
 * Create payment request body
 */
export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  description?: string;
  eventId: string;
  invoiceId: string;
  methodType: PaymentMethodType;
  paymentMethodId?: string;
}

/**
 * Process payment request body
 */
export interface ProcessPaymentRequest {
  completedAt?: string; // ISO date string
  gatewayResponse: {
    code: string;
    message: string;
    transactionId: string;
  };
}

/**
 * Refund payment request body
 */
export interface RefundPaymentRequest {
  amount: number;
  reason: string;
}

/**
 * Update fraud status request body
 */
export interface UpdateFraudStatusRequest {
  reasons: string[];
  score: number;
  status: FraudStatus;
}

/**
 * Fraud review request body
 */
export interface FraudReviewRequest {
  approved: boolean;
  notes?: string;
}

/**
 * Payment list item with minimal data for listing
 */
export interface PaymentListItem {
  amount: number;
  clientName: string | null;
  completedAt: Date | null;
  currency: string;
  eventId: string;
  eventName: string | null;
  fraudStatus: FraudStatus;
  id: string;
  invoiceId: string;
  methodType: PaymentMethodType;
  processedAt: Date;
  status: PaymentStatus;
}

/**
 * Payment list response with pagination
 */
export interface PaymentListResponse {
  data: PaymentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Payment response with related data
 */
export type PaymentResponse = Payment & {
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
  } | null;
  event?: {
    id: string;
    title: string;
    eventDate: Date | null;
  } | null;
  client?: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
};

/**
 * Payment filters
 */
export interface PaymentFilters {
  amountFrom?: number;
  amountTo?: number;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  eventId?: string;
  fraudStatus?: FraudStatus;
  invoiceId?: string;
  methodType?: PaymentMethodType;
  search?: string;
  status?: PaymentStatus;
}

/**
 * Payment sort options
 */
export type PaymentSortOptions =
  | "createdAt"
  | "updatedAt"
  | "processedAt"
  | "completedAt"
  | "amount"
  | "status";

/**
 * Sort parameters
 */
export interface SortParams {
  direction: "asc" | "desc";
  sortBy: PaymentSortOptions;
}

/**
 * Paginated payment list parameters
 */
export interface PaymentListParams {
  filters?: PaymentFilters;
  limit?: number;
  page?: number;
  sort?: SortParams;
}

/**
 * Payment statistics
 */
export interface PaymentStats {
  byStatus: Record<PaymentStatus, number>;
  collectedAmount: number;
  fraudFlagged: number;
  pendingAmount: number;
  refundAmount: number;
  total: number;
  totalAmount: number;
}

/**
 * Payment method details for storage
 */
export interface PaymentMethodDetails {
  bankAccountLastFour?: string;
  bankAccountType?: string;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardHolderName?: string;
  cardLastFour?: string;
  cardNetwork?: CardNetwork;
  type: PaymentMethodType;
  walletEmail?: string;
  walletProvider?: string;
}
