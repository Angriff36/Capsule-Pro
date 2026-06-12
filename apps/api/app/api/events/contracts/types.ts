/**
 * Event Contracts API Types
 *
 * Shared types for event contract management operations
 */

/**
 * Contract status options
 */
export type ContractStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "rejected"
  | "expired";

/**
 * Document type options
 */
export type DocumentType = "pdf" | "docx" | "txt" | "other";

/**
 * EventContract type from database
 */
export interface EventContract {
  clientId: string;
  contractNumber: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  documentType: DocumentType | null;
  documentUrl: string | null;
  eventId: string;
  expiresAt: Date | null;
  id: string;
  notes: string | null;
  status: ContractStatus;
  tenantId: string;
  title: string;
  updatedAt: Date;
}

/**
 * ContractSignature type from database
 */
export interface ContractSignature {
  contractId: string;
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
  ipAddress: string | null;
  signatureData: string;
  signedAt: Date;
  signerEmail: string | null;
  signerName: string;
  tenantId: string;
  updatedAt: Date;
}

/**
 * Create contract request body
 */
export interface CreateContractRequest {
  clientId: string;
  contractNumber?: string;
  documentType?: DocumentType;
  documentUrl?: string;
  eventId: string;
  expiresAt?: string; // ISO date string
  notes?: string;
  title?: string;
}

/**
 * Update contract request body (all fields optional)
 */
export type UpdateContractRequest = Partial<CreateContractRequest> & {
  status?: ContractStatus;
};

/**
 * Contract status update request body
 */
export interface ContractStatusUpdate {
  notes?: string;
  status: ContractStatus;
}

/**
 * Create signature request body
 */
export interface CreateSignatureRequest {
  ipAddress?: string;
  signatureData: string;
  signerEmail?: string;
  signerName: string;
}

/**
 * Event contract with related data for detail view
 */
export type ContractResponse = EventContract & {
  event?: {
    id: string;
    name: string;
    eventDate: Date | null;
  } | null;
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  signatures: ContractSignature[];
  signatureCount: number;
};

/**
 * Contract list item with minimal data for listing
 */
export interface ContractListItem {
  clientId: string;
  clientName: string;
  contractNumber: string | null;
  createdAt: Date;
  documentType: DocumentType | null;
  eventDate: Date | null;
  eventName: string | null;
  expiresAt: Date | null;
  id: string;
  signatureCount: number;
  status: ContractStatus;
  title: string;
  updatedAt: Date;
}

/**
 * Contract list response with pagination
 */
export interface ContractListResponse {
  data: ContractListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Signature response with contract details
 */
export type SignatureResponse = ContractSignature & {
  contractId: string;
  contractTitle: string;
};

/**
 * Signature list response with pagination
 */
export interface SignatureListResponse {
  data: SignatureResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Contract filters
 */
export interface ContractFilters {
  clientId?: string; // Filter by client
  dateFrom?: string; // Filter by created date from (ISO string)
  dateTo?: string; // Filter by created date to (ISO string)
  documentType?: DocumentType; // Filter by document type
  eventId?: string; // Filter by event
  expiresFrom?: string; // Filter by expiration date from (ISO string)
  expiresTo?: string; // Filter by expiration date to (ISO string);
  search?: string; // Search by contract number, title, client name, event name
  signed?: boolean; // Filter by signature status
  status?: ContractStatus; // Filter by status
}

/**
 * Contract sort options
 */
export type ContractSortOptions =
  | "createdAt"
  | "updatedAt"
  | "expiresAt"
  | "contractNumber"
  | "title"
  | "status"
  | "signatureCount";

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort parameters
 */
export interface SortParams {
  direction: SortDirection;
  sortBy: ContractSortOptions;
}

/**
 * Paginated contract list parameters
 */
export interface ContractListParams {
  filters?: ContractFilters;
  limit?: number;
  page?: number;
  sort?: SortParams;
}

/**
 * Paginated signature list parameters
 */
export interface SignatureListParams {
  contractId?: string; // Filter by specific contract
  dateFrom?: string; // Filter by signed date from (ISO string)
  dateTo?: string; // Filter by signed date to (ISO string)
  limit?: number;
  page?: number;
  signerEmail?: string; // Filter by signer email
}

/**
 * Contract statistics
 */
export interface ContractStats {
  byStatus: Record<ContractStatus, number>;
  expired: number;
  pending: number;
  signed: number;
  total: number;
  upcomingExpirations: number; // Contracts expiring in next 30 days
}
