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
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

/**
 * Invoice type from database
 */
export interface Invoice {
  tenantId: string;
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  clientId: string;
  eventId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentTerms: number;
  dueDate: Date;
  paidAt: Date | null;
  depositPercentage: number | null;
  depositRequired: number | null;
  depositPaid: number | null;
  issuedAt: Date;
  sentAt: Date | null;
  viewedAt: Date | null;
  overdueSince: Date | null;
  reminderCount: number;
  lastReminderAt: Date | null;
  quickBooksId: string | null;
  goodshuffleId: string | null;
  externalSyncStatus: string | null;
  notes: string | null;
  internalNotes: string | null;
  lineItems: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Create invoice request body
 */
export interface CreateInvoiceRequest {
  eventId: string;
  clientId: string;
  invoiceType?: InvoiceType;
  paymentTerms?: number;
  dueDate?: string; // ISO date string
  lineItems?: InvoiceLineItem[];
  notes?: string;
  internalNotes?: string;
  depositPercentage?: number;
  metadata?: Record<string, unknown>;
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
  paymentId: string;
  amount: number;
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
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  clientId: string;
  clientName: string;
  eventId: string;
  eventName: string | null;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: Date;
  paidAt: Date | null;
  createdAt: Date;
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
  search?: string;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  clientId?: string;
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
  isPaidInFull?: boolean;
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
  sortBy: InvoiceSortOptions;
  direction: "asc" | "desc";
}

/**
 * Paginated invoice list parameters
 */
export interface InvoiceListParams {
  filters?: InvoiceFilters;
  sort?: SortParams;
  page?: number;
  limit?: number;
}

/**
 * Invoice statistics
 */
export interface InvoiceStats {
  total: number;
  byStatus: Record<InvoiceStatus, number>;
  byType: Record<InvoiceType, number>;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  writeOffAmount: number;
}

/**
 * Invoice reminder configuration
 */
export interface InvoiceReminderConfig {
  enabled: boolean;
  daysBeforeDue: number[];
  daysAfterDue: number[];
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
