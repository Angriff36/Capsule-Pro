/**
 * Client CRUD API Types
 *
 * Shared types for client management operations
 */

/**
 * Client type (company or individual)
 */
export type ClientType = "company" | "individual";

/**
 * Client status
 */
export type ClientStatus = "active" | "inactive" | "prospect";

/**
 * Full client record from database
 */
export interface Client {
  addressLine1: string | null;
  addressLine2: string | null;
  assignedTo: string | null;
  city: string | null;
  clientType: string;
  company_name: string | null;
  countryCode: string | null;
  createdAt: Date;
  defaultPaymentTerms: number | null;
  deletedAt: Date | null;
  email: string | null;
  first_name: string | null;
  id: string;
  last_name: string | null;
  notes: string | null;
  phone: string | null;
  postalCode: string | null;
  source: string | null;
  stateProvince: string | null;
  tags: string[];
  taxExempt: boolean;
  taxId: string | null;
  tenantId: string;
  updatedAt: Date;
  website: string | null;
}

/**
 * Client contact record
 */
export interface ClientContact {
  clientId: string;
  createdAt: Date;
  deletedAt: Date | null;
  email: string | null;
  first_name: string;
  id: string;
  isBillingContact: boolean;
  isPrimary: boolean;
  last_name: string;
  notes: string | null;
  phone: string | null;
  phoneMobile: string | null;
  tenantId: string;
  title: string | null;
  updatedAt: Date;
}

/**
 * Client preference record
 */
export interface ClientPreference {
  clientId: string;
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
  notes: string | null;
  preferenceKey: string;
  preferenceType: string;
  preferenceValue: unknown;
  tenantId: string;
  updatedAt: Date;
}

/**
 * Client interaction (communication log) record
 */
export interface ClientInteraction {
  clientId: string | null;
  correlation_id: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  description: string | null;
  employeeId: string;
  followUpCompleted: boolean;
  followUpDate: Date | null;
  id: string;
  interactionDate: Date;
  interactionType: string;
  leadId: string | null;
  subject: string | null;
  tenantId: string;
  updatedAt: Date;
}

/**
 * Client with related data for detail view
 */
export type ClientWithDetails = Client & {
  contacts: ClientContact[];
  preferences: ClientPreference[];
  interactionCount: number;
  eventCount: number;
  totalRevenue: { total: string } | null;
};

/**
 * Create client request body
 */
export interface CreateClientRequest {
  addressLine1?: string;
  addressLine2?: string;
  assignedTo?: string;
  city?: string;
  clientType?: ClientType;
  company_name?: string;
  countryCode?: string;
  defaultPaymentTerms?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  phone?: string;
  postalCode?: string;
  source?: string;
  stateProvince?: string;
  tags?: string[];
  taxExempt?: boolean;
  taxId?: string;
  website?: string;
}

/**
 * Update client request body (all fields optional)
 */
export type UpdateClientRequest = Partial<CreateClientRequest>;

/**
 * Create client contact request body
 */
export interface CreateClientContactRequest {
  email?: string;
  first_name: string;
  isBillingContact?: boolean;
  isPrimary?: boolean;
  last_name: string;
  notes?: string;
  phone?: string;
  phoneMobile?: string;
  title?: string;
}

/**
 * Create client interaction request body
 */
export interface CreateClientInteractionRequest {
  description?: string;
  followUpDate?: string; // ISO date string
  interactionType: string;
  subject?: string;
}

/**
 * Update client interaction request body (all fields optional)
 */
export type UpdateClientInteractionRequest = Partial<{
  interactionType: string;
  subject: string;
  description: string;
  followUpDate: string; // ISO date string
  followUpCompleted: boolean;
}>;

/**
 * Client list filters
 */
export interface ClientListFilters {
  assignedTo?: string; // Filter by assigned employee
  clientType?: ClientType; // Filter by client type
  search?: string; // Search by name, company, email
  source?: string; // Filter by source
  tags?: string[]; // Filter by tags
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  page?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
