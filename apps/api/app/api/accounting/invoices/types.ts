/**
 * Invoices API Types
 *
 * Shared types for invoice management operations
 */

/**
 * Invoice status options
 */
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "OVERDUE"
  | "PARTIALLY_PAID"
  | "PAID"
  | "VOID"
  | "WRITE_OFF";

/**
 * Invoice type options
 */
export type InvoiceType =
  | "DEPOSIT"
  | "FINAL_PAYMENT"
  | "PROGRESS"
  | "MISC"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  amount: number;
  description: string;
  id: string;
  quantity: number;
  taxRate: number;
  unitPrice: number;
}

/**
 * Invoice type from database
 */
export interface Invoice {
  amountDue: number;
  amountPaid: number;
  clientId: string;
  createdAt: Date;
  deletedAt: Date | null;
  depositPaid: number | null;
  depositPercentage: number | null;
  depositRequired: number | null;
  discountAmount: number;
  dueDate: Date;
  eventId: string;
  id: string;
  internalNotes: string | null;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  issuedAt: Date;
  lastReminderAt: Date | null;
  lineItems: unknown;
  metadata: unknown;
  notes: string | null;
  overdueSince: Date | null;
  paidAt: Date | null;
  paymentTerms: number;
  reminderCount: number;
  sentAt: Date | null;
  status: InvoiceStatus;
  subtotal: number;
  taxAmount: number;
  tenantId: string;
  total: number;
  updatedAt: Date;
  viewedAt: Date | null;
}

/**
 * Create invoice request body
 */
export interface CreateInvoiceRequest {
  clientId: string;
  depositPercentage?: number;
  dueDate?: string; // ISO date string
  eventId: string;
  internalNotes?: string;
  invoiceType?: InvoiceType;
  lineItems?: InvoiceLineItem[];
  metadata?: Record<string, unknown>;
  notes?: string;
  paymentTerms?: number;
}

/**
 * Update invoice request body
 */
export type UpdateInvoiceRequest = Partial<CreateInvoiceRequest> & {
  status?: InvoiceStatus;
};

/**
 * Send invoice request body
 */
export interface SendInvoiceRequest {
  clientContactId?: string;
  message?: string;
}

/**
 * Apply payment request body
 */
export interface ApplyPaymentRequest {
  amount: number;
  paymentId: string;
}

/**
 * Record refund request body
 */
export interface RecordRefundRequest {
  paymentId: string;
  refundAmount: number;
}

/**
 * Invoice list item with minimal data for listing
 */
export interface InvoiceListItem {
  amountDue: number;
  amountPaid: number;
  clientId: string;
  clientName: string;
  createdAt: Date;
  dueDate: Date;
  eventId: string;
  eventName: string | null;
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  paidAt: Date | null;
  status: InvoiceStatus;
  total: number;
}

/**
 * Invoice list response with pagination
 */
export interface InvoiceListResponse {
  data: InvoiceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Invoice response with related data
 */
export type InvoiceResponse = Invoice & {
  client?: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    defaultPaymentTerms: number | null;
  } | null;
  event?: {
    id: string;
    title: string;
    eventDate: Date | null;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    status: string;
    processedAt: Date;
  }>;
};

/**
 * Invoice filters
 */
export interface InvoiceFilters {
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  dueFrom?: string;
  dueTo?: string;
  eventId?: string;
  invoiceType?: InvoiceType;
  isPaidInFull?: boolean;
  overdue?: boolean;
  search?: string;
  status?: InvoiceStatus;
}

/**
 * Invoice sort options
 */
export type InvoiceSortOptions =
  | "createdAt"
  | "updatedAt"
  | "issuedAt"
  | "dueDate"
  | "invoiceNumber"
  | "total"
  | "status";

/**
 * Sort parameters
 */
export interface SortParams {
  direction: "asc" | "desc";
  sortBy: InvoiceSortOptions;
}

/**
 * Paginated invoice list parameters
 */
export interface InvoiceListParams {
  filters?: InvoiceFilters;
  limit?: number;
  page?: number;
  sort?: SortParams;
}

/**
 * Invoice statistics
 */
export interface InvoiceStats {
  byStatus: Record<InvoiceStatus, number>;
  byType: Record<InvoiceType, number>;
  collectedAmount: number;
  overdueAmount: number;
  pendingAmount: number;
  total: number;
  totalAmount: number;
  writeOffAmount: number;
}

/**
 * Invoice reminder configuration
 */
export interface InvoiceReminderConfig {
  daysAfterDue: number[];
  daysBeforeDue: number[];
  enabled: boolean;
  templateId?: string;
}

/**
 * Invoice aging report
 */
export interface InvoiceAgingReport {
  current: number; // 0-30 days
  days31to60: number;
  days61to90: number;
  days91plus: number;
  total: number;
}
