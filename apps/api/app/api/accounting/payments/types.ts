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
  tenantId: string;
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  methodType: PaymentMethodType;
  invoiceId: string;
  eventId: string;
  clientId: string | null;
  gatewayTransactionId: string | null;
  gatewayPaymentMethodId: string | null;
  processor: string | null;
  processorResponseCode: string | null;
  processorResponseMessage: string | null;
  processedAt: Date;
  completedAt: Date | null;
  refundedAt: Date | null;
  chargebackAt: Date | null;
  fraudStatus: FraudStatus;
  fraudScore: number | null;
  fraudReasons: string[];
  reviewedAt: Date | null;
  reviewedBy: string | null;
  description: string | null;
  externalReference: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Create payment request body
 */
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

/**
 * Process payment request body
 */
export interface ProcessPaymentRequest {
  gatewayResponse: {
    code: string;
    message: string;
    transactionId: string;
  };
  completedAt?: string; // ISO date string
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
  status: FraudStatus;
  score: number;
  reasons: string[];
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
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  methodType: PaymentMethodType;
  invoiceId: string;
  eventId: string;
  clientName: string | null;
  eventName: string | null;
  processedAt: Date;
  completedAt: Date | null;
  fraudStatus: FraudStatus;
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
  sortBy: PaymentSortOptions;
  direction: "asc" | "desc";
}

/**
 * Paginated payment list parameters
 */
export interface PaymentListParams {
  filters?: PaymentFilters;
  sort?: SortParams;
  page?: number;
  limit?: number;
}

/**
 * Payment statistics
 */
export interface PaymentStats {
  total: number;
  byStatus: Record<PaymentStatus, number>;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  refundAmount: number;
  fraudFlagged: number;
}

/**
 * Payment method details for storage
 */
export interface PaymentMethodDetails {
  type: PaymentMethodType;
  cardLastFour?: string;
  cardNetwork?: CardNetwork;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardHolderName?: string;
  bankAccountLastFour?: string;
  bankAccountType?: string;
  walletProvider?: string;
  walletEmail?: string;
}
