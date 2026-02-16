"use server";

/**
 * Proposal CRUD Server Actions
 *
 * Server actions for proposal management operations
 */

import { auth } from "@repo/auth/server";
import type { Prisma, Proposal } from "@repo/database";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

// Types matching the API
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

// Type for proposal update data - matches Prisma.ProposalUpdateInput
type ProposalUpdateData = Prisma.ProposalUncheckedUpdateInput;

/**
 * Get list of proposals with filters and pagination
 */
export async function getProposals(
  filters: ProposalFilters = {},
  page = 1,
  limit = 50
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const whereClause: Record<string, unknown> = {
    AND: [{ tenantId }, { deletedAt: null }],
  };

  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    (whereClause.AND as Record<string, unknown>[]).push({
      OR: [
        { title: { contains: searchLower, mode: "insensitive" } },
        { proposalNumber: { contains: searchLower, mode: "insensitive" } },
        { venueName: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }

  // Add status filter
  if (filters.status) {
    (whereClause.AND as Record<string, unknown>[]).push({
      status: filters.status,
    });
  }

  // Add client filter
  if (filters.clientId) {
    (whereClause.AND as Record<string, unknown>[]).push({
      clientId: filters.clientId,
    });
  }

  // Add lead filter
  if (filters.leadId) {
    (whereClause.AND as Record<string, unknown>[]).push({
      leadId: filters.leadId,
    });
  }

  // Add event filter
  if (filters.eventId) {
    (whereClause.AND as Record<string, unknown>[]).push({
      eventId: filters.eventId,
    });
  }

  // Add date range filters
  if (filters.dateFrom) {
    (whereClause.AND as Record<string, unknown>[]).push({
      eventDate: { gte: new Date(filters.dateFrom) },
    });
  }

  if (filters.dateTo) {
    (whereClause.AND as Record<string, unknown>[]).push({
      eventDate: { lte: new Date(filters.dateTo) },
    });
  }

  const offset = (page - 1) * limit;

  const proposals = await database.proposal.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });

  const totalCount = await database.proposal.count({
    where: whereClause,
  });

  return {
    data: proposals as Proposal[],
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}

/**
 * Get proposal by ID with full details
 */
export async function getProposalById(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Proposal ID is required");

  const proposal = await database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(proposal, "Proposal not found");

  return proposal;
}

/**
 * Create a new proposal
 */
export async function createProposal(input: CreateProposalInput) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  // Validate input
  invariant(input.title?.trim(), "Title is required");
  invariant(
    input.clientId || input.leadId || input.eventId,
    "At least one of clientId, leadId, or eventId must be provided"
  );

  // Generate proposal number
  const year = new Date().getFullYear();
  const count = await database.proposal.count({
    where: {
      AND: [
        { tenantId },
        { proposalNumber: { startsWith: `PROP-${year}` } },
        { deletedAt: null },
      ],
    },
  });
  const proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, "0")}`;

  // Calculate totals if line items provided
  let calculatedSubtotal = input.subtotal ?? 0;
  let calculatedTax = input.taxAmount ?? 0;
  let calculatedTotal = input.total ?? 0;

  if (input.lineItems && input.lineItems.length > 0) {
    calculatedSubtotal = input.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxRate = input.taxRate ?? 0;
    calculatedTax = calculatedSubtotal * (taxRate / 100);
    const discount = input.discountAmount ?? 0;
    calculatedTotal = calculatedSubtotal + calculatedTax - discount;
  }

  const proposal = await database.proposal.create({
    data: {
      tenantId,
      proposalNumber,
      clientId: input.clientId,
      leadId: input.leadId,
      eventId: input.eventId,
      title: input.title.trim(),
      eventDate: input.eventDate ? new Date(input.eventDate) : null,
      eventType: input.eventType?.trim() || null,
      guestCount: input.guestCount ?? null,
      venueName: input.venueName?.trim() || null,
      venueAddress: input.venueAddress?.trim() || null,
      subtotal: calculatedSubtotal,
      taxRate: input.taxRate ?? 0,
      taxAmount: calculatedTax,
      discountAmount: input.discountAmount ?? 0,
      total: calculatedTotal,
      status: input.status ?? "draft",
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      notes: input.notes?.trim() || null,
      termsAndConditions: input.termsAndConditions?.trim() || null,
    },
  });

  revalidatePath("/crm/proposals");

  return proposal;
}

/**
 * Update a proposal
 */
export async function updateProposal(
  id: string,
  input: Partial<CreateProposalInput>
) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Proposal ID is required");

  // Check if proposal exists
  const existingProposal = await database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingProposal, "Proposal not found");

  // Calculate totals if line items provided
  let calculatedSubtotal = input.subtotal ?? existingProposal.subtotal;
  let calculatedTax = input.taxAmount ?? existingProposal.taxAmount;
  let calculatedTotal = input.total ?? existingProposal.total;

  if (input.lineItems && input.lineItems.length > 0) {
    calculatedSubtotal = input.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxRateValue = input.taxRate ?? existingProposal.taxRate;
    const taxRate =
      typeof taxRateValue === "number"
        ? taxRateValue
        : (taxRateValue?.toNumber() ?? 0);
    calculatedTax = calculatedSubtotal * (taxRate / 100);
    const discountValue =
      input.discountAmount ?? existingProposal.discountAmount;
    const discount =
      typeof discountValue === "number"
        ? discountValue
        : (discountValue?.toNumber() ?? 0);
    calculatedTotal = calculatedSubtotal + calculatedTax - discount;
  }

  const data: ProposalUpdateData = {};

  if (input.title !== undefined) {
    data.title = input.title?.trim();
  }
  if (input.clientId !== undefined && input.clientId !== null) {
    data.clientId = input.clientId;
  }
  if (input.leadId !== undefined && input.leadId !== null) {
    data.leadId = input.leadId;
  }
  if (input.eventId !== undefined && input.eventId !== null) {
    data.eventId = input.eventId;
  }
  if (input.eventDate !== undefined) {
    data.eventDate = input.eventDate ? new Date(input.eventDate) : null;
  }
  if (input.eventType !== undefined) {
    data.eventType = input.eventType?.trim() || null;
  }
  if (input.guestCount !== undefined) {
    data.guestCount = input.guestCount ?? null;
  }
  if (input.venueName !== undefined) {
    data.venueName = input.venueName?.trim() || null;
  }
  if (input.venueAddress !== undefined) {
    data.venueAddress = input.venueAddress?.trim() || null;
  }
  if (input.subtotal !== undefined) {
    data.subtotal =
      typeof calculatedSubtotal === "number"
        ? calculatedSubtotal
        : calculatedSubtotal.toNumber();
  }
  if (input.taxRate !== undefined) {
    data.taxRate = input.taxRate ?? 0;
  }
  if (input.taxAmount !== undefined) {
    data.taxAmount =
      typeof calculatedTax === "number"
        ? calculatedTax
        : calculatedTax.toNumber();
  }
  if (input.discountAmount !== undefined) {
    data.discountAmount = input.discountAmount ?? 0;
  }
  if (input.total !== undefined) {
    data.total =
      typeof calculatedTotal === "number"
        ? calculatedTotal
        : calculatedTotal.toNumber();
  }
  if (input.status !== undefined && input.status !== null) {
    data.status = input.status;
  }
  if (input.validUntil !== undefined) {
    data.validUntil = input.validUntil ? new Date(input.validUntil) : null;
  }
  if (input.notes !== undefined) {
    data.notes = input.notes?.trim() || null;
  }
  if (input.termsAndConditions !== undefined) {
    data.termsAndConditions = input.termsAndConditions?.trim() || null;
  }

  const proposal = await database.proposal.update({
    where: { tenantId_id: { tenantId, id } },
    data,
  });

  revalidatePath("/crm/proposals");
  revalidatePath(`/crm/proposals/${id}`);

  return proposal;
}

/**
 * Delete a proposal (soft delete)
 */
export async function deleteProposal(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Proposal ID is required");

  const existingProposal = await database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingProposal, "Proposal not found");

  await database.proposal.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/crm/proposals");

  return { success: true };
}

/**
 * Send a proposal to the client
 */
export async function sendProposal(id: string, input: SendProposalInput = {}) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Proposal ID is required");

  const existingProposal = await database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  invariant(existingProposal, "Proposal not found");

  const recipientEmail = input.recipientEmail?.trim();

  invariant(recipientEmail, "Recipient email is required");

  // Update proposal status
  const proposal = await database.proposal.update({
    where: { tenantId_id: { tenantId, id } },
    data: {
      status: "sent",
      sentAt: new Date(),
    },
  });

  revalidatePath("/crm/proposals");
  revalidatePath(`/crm/proposals/${id}`);

  // TODO: Send email with proposal PDF
  console.log(`Proposal ${id} would be sent to ${recipientEmail}`);

  return {
    success: true,
    proposal,
    sentTo: recipientEmail,
  };
}

/**
 * Get proposal count by status
 */
export async function getProposalStats() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const [
    totalCount,
    draftCount,
    sentCount,
    viewedCount,
    acceptedCount,
    rejectedCount,
  ] = await Promise.all([
    database.proposal.count({
      where: { AND: [{ tenantId }, { deletedAt: null }] },
    }),
    database.proposal.count({
      where: { AND: [{ tenantId }, { status: "draft" }, { deletedAt: null }] },
    }),
    database.proposal.count({
      where: { AND: [{ tenantId }, { status: "sent" }, { deletedAt: null }] },
    }),
    database.proposal.count({
      where: { AND: [{ tenantId }, { status: "viewed" }, { deletedAt: null }] },
    }),
    database.proposal.count({
      where: {
        AND: [{ tenantId }, { status: "accepted" }, { deletedAt: null }],
      },
    }),
    database.proposal.count({
      where: {
        AND: [{ tenantId }, { status: "rejected" }, { deletedAt: null }],
      },
    }),
  ]);

  return {
    total: totalCount,
    draft: draftCount,
    sent: sentCount,
    viewed: viewedCount,
    accepted: acceptedCount,
    rejected: rejectedCount,
  };
}
