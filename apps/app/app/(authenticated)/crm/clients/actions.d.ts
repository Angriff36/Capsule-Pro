import type { Client, ClientInteraction } from "@repo/database";
export interface ClientFilters {
  search?: string;
  tags?: string[];
  assignedTo?: string;
  clientType?: "company" | "individual";
  source?: string;
}
export interface CreateClientInput {
  clientType?: "company" | "individual";
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
}
export interface CreateClientContactInput {
  first_name: string;
  last_name: string;
  title?: string;
  email?: string;
  phone?: string;
  phoneMobile?: string;
  isPrimary?: boolean;
  isBillingContact?: boolean;
  notes?: string;
}
export interface CreateClientInteractionInput {
  interactionType: string;
  subject?: string;
  description?: string;
  followUpDate?: string;
}
/**
 * Get list of clients with filters and pagination
 */
export declare function getClients(
  filters?: ClientFilters,
  page?: number,
  limit?: number
): Promise<{
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;
/**
 * Get client count (for stats)
 */
export declare function getClientCount(): Promise<number>;
/**
 * Get client by ID with full details
 */
export declare function getClientById(id: string): Promise<{
  contacts: {
    id: string;
    title: string | null;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    clientId: string;
    phoneMobile: string | null;
    isPrimary: boolean;
    isBillingContact: boolean;
  }[];
  preferences: {
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    notes: string | null;
    clientId: string;
    preferenceType: string;
    preferenceKey: string;
    preferenceValue: import("@prisma/client/runtime/client").JsonValue;
  }[];
  interactionCount: number;
  eventCount: number;
  totalRevenue: {
    total: string;
  } | null;
  id?: string | undefined;
  tenantId?: string | undefined;
  tags?: string[] | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
  deletedAt?: Date | null | undefined;
  clientType?: string | undefined;
  company_name?: string | null | undefined;
  first_name?: string | null | undefined;
  last_name?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  website?: string | null | undefined;
  addressLine1?: string | null | undefined;
  addressLine2?: string | null | undefined;
  city?: string | null | undefined;
  stateProvince?: string | null | undefined;
  postalCode?: string | null | undefined;
  countryCode?: string | null | undefined;
  defaultPaymentTerms?: number | null | undefined;
  taxExempt?: boolean | undefined;
  taxId?: string | null | undefined;
  notes?: string | null | undefined;
  source?: string | null | undefined;
  assignedTo?: string | null | undefined;
}>;
/**
 * Create a new client
 */
export declare function createClient(input: CreateClientInput): Promise<{
  id: string;
  tenantId: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
  source: string | null;
  assignedTo: string | null;
}>;
/**
 * Update a client
 */
export declare function updateClient(
  id: string,
  input: Partial<CreateClientInput>
): Promise<{
  id: string;
  tenantId: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
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
  source: string | null;
  assignedTo: string | null;
}>;
/**
 * Delete a client (soft delete)
 */
export declare function deleteClient(id: string): Promise<{
  success: boolean;
}>;
/**
 * Get client contacts
 */
export declare function getClientContacts(clientId: string): Promise<
  {
    id: string;
    title: string | null;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    clientId: string;
    phoneMobile: string | null;
    isPrimary: boolean;
    isBillingContact: boolean;
  }[]
>;
/**
 * Create a client contact
 */
export declare function createClientContact(
  clientId: string,
  input: CreateClientContactInput
): Promise<{
  id: string;
  title: string | null;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  clientId: string;
  phoneMobile: string | null;
  isPrimary: boolean;
  isBillingContact: boolean;
}>;
/**
 * Get client interactions
 */
export declare function getClientInteractions(
  clientId: string,
  limit?: number,
  offset?: number
): Promise<{
  data: ClientInteraction[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}>;
/**
 * Create a client interaction
 */
export declare function createClientInteraction(
  clientId: string,
  input: CreateClientInteractionInput
): Promise<{
  id: string;
  description: string | null;
  employeeId: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  clientId: string | null;
  leadId: string | null;
  interactionType: string;
  interactionDate: Date;
  subject: string | null;
  followUpDate: Date | null;
  followUpCompleted: boolean;
  correlation_id: string | null;
}>;
export interface UpdateClientInteractionInput {
  interactionType?: string;
  subject?: string;
  description?: string;
  followUpDate?: string;
  followUpCompleted?: boolean;
}
/**
 * Update a client interaction
 */
export declare function updateClientInteraction(
  clientId: string,
  interactionId: string,
  input: UpdateClientInteractionInput
): Promise<{
  id: string;
  description: string | null;
  employeeId: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  clientId: string | null;
  leadId: string | null;
  interactionType: string;
  interactionDate: Date;
  subject: string | null;
  followUpDate: Date | null;
  followUpCompleted: boolean;
  correlation_id: string | null;
}>;
/**
 * Delete a client interaction (soft delete)
 */
export declare function deleteClientInteraction(
  clientId: string,
  interactionId: string
): Promise<{
  success: boolean;
}>;
/**
 * Get client event history
 */
export declare function getClientEventHistory(
  clientId: string,
  limit?: number,
  offset?: number
): Promise<{
  data: {
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    eventId: string | null;
    customer_id: string;
    orderNumber: string;
    order_status: string;
    order_date: Date;
    delivery_date: Date;
    delivery_time: string;
    subtotal_amount: import("@prisma/client/runtime/client").Decimal;
    tax_amount: import("@prisma/client/runtime/client").Decimal;
    discount_amount: import("@prisma/client/runtime/client").Decimal;
    service_charge_amount: import("@prisma/client/runtime/client").Decimal;
    totalAmount: import("@prisma/client/runtime/client").Decimal;
    deposit_required: boolean;
    deposit_amount: import("@prisma/client/runtime/client").Decimal | null;
    deposit_paid: boolean;
    deposit_paid_at: Date | null;
    venue_name: string | null;
    venue_address: string | null;
    venue_city: string | null;
    venue_state: string | null;
    venue_zip: string | null;
    venue_contact_name: string | null;
    venue_contact_phone: string | null;
    guest_count: number;
    special_instructions: string | null;
    dietary_restrictions: string | null;
    staff_required: number | null;
    staff_assigned: number | null;
  }[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}>;
//# sourceMappingURL=actions.d.ts.map
