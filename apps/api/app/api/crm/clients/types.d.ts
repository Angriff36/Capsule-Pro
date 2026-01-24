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
export type Client = {
  tenantId: string;
  id: string;
  clientType: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  defaultPaymentTerms: number | null;
  taxExempt: boolean;
  taxId: string | null;
  notes: string | null;
  tags: string[];
  source: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
/**
 * Client contact record
 */
export type ClientContact = {
  tenantId: string;
  id: string;
  clientId: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  phoneMobile: string | null;
  isPrimary: boolean;
  isBillingContact: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
/**
 * Client preference record
 */
export type ClientPreference = {
  tenantId: string;
  id: string;
  clientId: string;
  preferenceType: string;
  preferenceKey: string;
  preferenceValue: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
/**
 * Client interaction (communication log) record
 */
export type ClientInteraction = {
  tenantId: string;
  id: string;
  clientId: string | null;
  leadId: string | null;
  employeeId: string;
  interactionType: string;
  interactionDate: Date;
  subject: string | null;
  description: string | null;
  followUpDate: Date | null;
  followUpCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  correlation_id: string | null;
};
/**
 * Client with related data for detail view
 */
export type ClientWithDetails = Client & {
  contacts: ClientContact[];
  preferences: ClientPreference[];
  interactionCount: number;
  eventCount: number;
  totalRevenue: {
    total: string;
  } | null;
};
/**
 * Create client request body
 */
export type CreateClientRequest = {
  clientType?: ClientType;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  countryCode?: string;
  defaultPaymentTerms?: number;
  taxExempt?: boolean;
  taxId?: string;
  notes?: string;
  tags?: string[];
  source?: string;
  assignedTo?: string;
};
/**
 * Update client request body (all fields optional)
 */
export type UpdateClientRequest = Partial<CreateClientRequest>;
/**
 * Create client contact request body
 */
export type CreateClientContactRequest = {
  first_name: string;
  last_name: string;
  title?: string;
  email?: string;
  phone?: string;
  phoneMobile?: string;
  isPrimary?: boolean;
  isBillingContact?: boolean;
  notes?: string;
};
/**
 * Create client interaction request body
 */
export type CreateClientInteractionRequest = {
  interactionType: string;
  subject?: string;
  description?: string;
  followUpDate?: string;
};
/**
 * Update client interaction request body (all fields optional)
 */
export type UpdateClientInteractionRequest = Partial<{
  interactionType: string;
  subject: string;
  description: string;
  followUpDate: string;
  followUpCompleted: boolean;
}>;
/**
 * Client list filters
 */
export type ClientListFilters = {
  search?: string;
  tags?: string[];
  assignedTo?: string;
  clientType?: ClientType;
  source?: string;
};
/**
 * Pagination parameters
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
};
/**
 * Paginated response
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
//# sourceMappingURL=types.d.ts.map
