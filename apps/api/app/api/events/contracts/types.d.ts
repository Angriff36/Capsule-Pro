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
export type EventContract = {
  tenantId: string;
  id: string;
  eventId: string;
  clientId: string;
  contractNumber: string | null;
  title: string;
  status: ContractStatus;
  documentUrl: string | null;
  documentType: DocumentType | null;
  notes: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
/**
 * ContractSignature type from database
 */
export type ContractSignature = {
  tenantId: string;
  id: string;
  contractId: string;
  signedAt: Date;
  signatureData: string;
  signerName: string;
  signerEmail: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
/**
 * Create contract request body
 */
export type CreateContractRequest = {
  eventId: string;
  clientId: string;
  contractNumber?: string;
  title?: string;
  documentUrl?: string;
  documentType?: DocumentType;
  notes?: string;
  expiresAt?: string;
};
/**
 * Update contract request body (all fields optional)
 */
export type UpdateContractRequest = Partial<CreateContractRequest> & {
  status?: ContractStatus;
};
/**
 * Contract status update request body
 */
export type ContractStatusUpdate = {
  status: ContractStatus;
  notes?: string;
};
/**
 * Create signature request body
 */
export type CreateSignatureRequest = {
  signatureData: string;
  signerName: string;
  signerEmail?: string;
  ipAddress?: string;
};
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
export type ContractListItem = {
  id: string;
  contractNumber: string | null;
  title: string;
  status: ContractStatus;
  clientId: string;
  clientName: string;
  eventName: string | null;
  eventDate: Date | null;
  documentType: DocumentType | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  signatureCount: number;
};
/**
 * Contract list response with pagination
 */
export type ContractListResponse = {
  data: ContractListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
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
export type SignatureListResponse = {
  data: SignatureResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
/**
 * Contract filters
 */
export type ContractFilters = {
  search?: string;
  status?: ContractStatus;
  clientId?: string;
  eventId?: string;
  documentType?: DocumentType;
  dateFrom?: string;
  dateTo?: string;
  expiresFrom?: string;
  expiresTo?: string;
  signed?: boolean;
};
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
export type SortParams = {
  sortBy: ContractSortOptions;
  direction: SortDirection;
};
/**
 * Paginated contract list parameters
 */
export type ContractListParams = {
  filters?: ContractFilters;
  sort?: SortParams;
  page?: number;
  limit?: number;
};
/**
 * Paginated signature list parameters
 */
export type SignatureListParams = {
  contractId?: string;
  signerEmail?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};
/**
 * Contract statistics
 */
export type ContractStats = {
  total: number;
  byStatus: Record<ContractStatus, number>;
  signed: number;
  pending: number;
  expired: number;
  upcomingExpirations: number;
};
//# sourceMappingURL=types.d.ts.map
