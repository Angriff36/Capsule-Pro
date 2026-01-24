import type { Proposal } from "@repo/database";
export interface ProposalFilters {
  search?: string;
  status?: string;
  clientId?: string;
  leadId?: string;
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
}
export interface CreateProposalInput {
  clientId?: string | null;
  leadId?: string | null;
  eventId?: string | null;
  title: string;
  eventDate?: string | null;
  eventType?: string | null;
  guestCount?: number | null;
  venueName?: string | null;
  venueAddress?: string | null;
  subtotal?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  discountAmount?: number | null;
  total?: number | null;
  status?:
    | "draft"
    | "sent"
    | "viewed"
    | "accepted"
    | "rejected"
    | "expired"
    | null;
  validUntil?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  lineItems?: CreateLineItemInput[];
}
export interface CreateLineItemInput {
  sortOrder?: number;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number | null;
  notes?: string | null;
}
export interface SendProposalInput {
  recipientEmail?: string;
  message?: string;
}
/**
 * Get list of proposals with filters and pagination
 */
export declare function getProposals(
  filters?: ProposalFilters,
  page?: number,
  limit?: number
): Promise<{
  data: Proposal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;
/**
 * Get proposal by ID with full details
 */
export declare function getProposalById(id: string): Promise<{
  id: string;
  title: string;
  status: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  notes: string | null;
  clientId: string | null;
  leadId: string | null;
  eventType: string | null;
  eventDate: Date | null;
  eventId: string | null;
  guestCount: number | null;
  venueName: string | null;
  venueAddress: string | null;
  proposalNumber: string;
  subtotal: import("@prisma/client/runtime/client").Decimal;
  taxRate: import("@prisma/client/runtime/client").Decimal;
  taxAmount: import("@prisma/client/runtime/client").Decimal;
  discountAmount: import("@prisma/client/runtime/client").Decimal;
  total: import("@prisma/client/runtime/client").Decimal;
  validUntil: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  termsAndConditions: string | null;
} | null>;
/**
 * Create a new proposal
 */
export declare function createProposal(input: CreateProposalInput): Promise<{
  id: string;
  title: string;
  status: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  notes: string | null;
  clientId: string | null;
  leadId: string | null;
  eventType: string | null;
  eventDate: Date | null;
  eventId: string | null;
  guestCount: number | null;
  venueName: string | null;
  venueAddress: string | null;
  proposalNumber: string;
  subtotal: import("@prisma/client/runtime/client").Decimal;
  taxRate: import("@prisma/client/runtime/client").Decimal;
  taxAmount: import("@prisma/client/runtime/client").Decimal;
  discountAmount: import("@prisma/client/runtime/client").Decimal;
  total: import("@prisma/client/runtime/client").Decimal;
  validUntil: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  termsAndConditions: string | null;
}>;
/**
 * Update a proposal
 */
export declare function updateProposal(
  id: string,
  input: Partial<CreateProposalInput>
): Promise<{
  id: string;
  title: string;
  status: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  notes: string | null;
  clientId: string | null;
  leadId: string | null;
  eventType: string | null;
  eventDate: Date | null;
  eventId: string | null;
  guestCount: number | null;
  venueName: string | null;
  venueAddress: string | null;
  proposalNumber: string;
  subtotal: import("@prisma/client/runtime/client").Decimal;
  taxRate: import("@prisma/client/runtime/client").Decimal;
  taxAmount: import("@prisma/client/runtime/client").Decimal;
  discountAmount: import("@prisma/client/runtime/client").Decimal;
  total: import("@prisma/client/runtime/client").Decimal;
  validUntil: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  termsAndConditions: string | null;
}>;
/**
 * Delete a proposal (soft delete)
 */
export declare function deleteProposal(id: string): Promise<{
  success: boolean;
}>;
/**
 * Send a proposal to the client
 */
export declare function sendProposal(
  id: string,
  input?: SendProposalInput
): Promise<{
  success: boolean;
  proposal: {
    id: string;
    title: string;
    status: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    notes: string | null;
    clientId: string | null;
    leadId: string | null;
    eventType: string | null;
    eventDate: Date | null;
    eventId: string | null;
    guestCount: number | null;
    venueName: string | null;
    venueAddress: string | null;
    proposalNumber: string;
    subtotal: import("@prisma/client/runtime/client").Decimal;
    taxRate: import("@prisma/client/runtime/client").Decimal;
    taxAmount: import("@prisma/client/runtime/client").Decimal;
    discountAmount: import("@prisma/client/runtime/client").Decimal;
    total: import("@prisma/client/runtime/client").Decimal;
    validUntil: Date | null;
    sentAt: Date | null;
    viewedAt: Date | null;
    acceptedAt: Date | null;
    rejectedAt: Date | null;
    termsAndConditions: string | null;
  };
  sentTo: string | undefined;
}>;
/**
 * Get proposal count by status
 */
export declare function getProposalStats(): Promise<{
  total: number;
  draft: number;
  sent: number;
  viewed: number;
  accepted: number;
  rejected: number;
}>;
//# sourceMappingURL=actions.d.ts.map
