/**
 * Proposal API Types
 */
import type { Proposal } from "@repo/database";
type ProposalLineItem = {
  id: string;
  tenant_id: string;
  proposal_id: string;
  sort_order: number;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};
export type CreateProposalRequest = {
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
  status?: "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
  validUntil?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  lineItems?: CreateLineItemRequest[];
};
export type UpdateProposalRequest = Partial<CreateProposalRequest> & {
  id: string;
};
export type CreateLineItemRequest = {
  sortOrder?: number;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number | null;
  notes?: string | null;
};
export type ProposalFilters = {
  search?: string;
  status?: string;
  clientId?: string;
  leadId?: string;
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
};
export type SendProposalRequest = {
  recipientEmail?: string;
  message?: string;
};
export type ProposalListItem = {
  id: string;
  proposalNumber: string;
  title: string;
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  lead?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  status: string;
  eventDate: Date | null;
  guestCount: number | null;
  total: number | null;
  validUntil: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
};
export type ProposalDetail = Proposal & {
  lineItems: ProposalLineItem[];
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  lead?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  event?: {
    id: string;
    name: string;
  } | null;
};
//# sourceMappingURL=types.d.ts.map
