/**
 * Proposal API Types
 */

import type { Proposal } from "@repo/database";

// Line item type from proposal_line_items table
interface ProposalLineItem {
  created_at: Date;
  deleted_at: Date | null;
  description: string;
  id: string;
  item_type: string;
  notes: string | null;
  proposal_id: string;
  quantity: number;
  sort_order: number;
  tenant_id: string;
  total: number;
  unit_price: number;
  updated_at: Date;
}

export interface CreateProposalRequest {
  clientId?: string | null;
  discountAmount?: number | null;
  eventDate?: string | null;
  eventId?: string | null;
  eventType?: string | null;
  guestCount?: number | null;
  leadId?: string | null;
  lineItems?: CreateLineItemRequest[];
  notes?: string | null;
  status?: "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
  subtotal?: number | null;
  taxAmount?: number | null;
  taxRate?: number | null;
  termsAndConditions?: string | null;
  title: string;
  total?: number | null;
  validUntil?: string | null;
  venueAddress?: string | null;
  venueName?: string | null;
}

export type UpdateProposalRequest = Partial<CreateProposalRequest> & {
  id: string;
};

export interface CreateLineItemRequest {
  category?: string | null;
  description: string;
  itemType: string;
  notes?: string | null;
  quantity: number;
  sortOrder?: number;
  total?: number | null;
  unitPrice: number;
}

export interface ProposalFilters {
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  eventId?: string;
  leadId?: string;
  search?: string;
  status?: string;
}

export interface SendProposalRequest {
  message?: string;
  recipientEmail?: string;
}

export interface ProposalListItem {
  acceptedAt: Date | null;
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  createdAt: Date;
  eventDate: Date | null;
  guestCount: number | null;
  id: string;
  lead?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  proposalNumber: string;
  sentAt: Date | null;
  status: string;
  title: string;
  total: number | null;
  validUntil: Date | null;
  viewedAt: Date | null;
}

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
