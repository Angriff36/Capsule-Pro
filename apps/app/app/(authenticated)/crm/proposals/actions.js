"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getProposals = getProposals;
exports.getProposalById = getProposalById;
exports.createProposal = createProposal;
exports.updateProposal = updateProposal;
exports.deleteProposal = deleteProposal;
exports.sendProposal = sendProposal;
exports.getProposalStats = getProposalStats;
/**
 * Proposal CRUD Server Actions
 *
 * Server actions for proposal management operations
 */
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const cache_1 = require("next/cache");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
/**
 * Get list of proposals with filters and pagination
 */
async function getProposals(filters = {}, page = 1, limit = 50) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  const whereClause = {
    AND: [{ tenantId }, { deletedAt: null }],
  };
  // Add search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    whereClause.AND.push({
      OR: [
        { title: { contains: searchLower, mode: "insensitive" } },
        { proposalNumber: { contains: searchLower, mode: "insensitive" } },
        { venueName: { contains: searchLower, mode: "insensitive" } },
      ],
    });
  }
  // Add status filter
  if (filters.status) {
    whereClause.AND.push({
      status: filters.status,
    });
  }
  // Add client filter
  if (filters.clientId) {
    whereClause.AND.push({
      clientId: filters.clientId,
    });
  }
  // Add lead filter
  if (filters.leadId) {
    whereClause.AND.push({
      leadId: filters.leadId,
    });
  }
  // Add event filter
  if (filters.eventId) {
    whereClause.AND.push({
      eventId: filters.eventId,
    });
  }
  // Add date range filters
  if (filters.dateFrom) {
    whereClause.AND.push({
      eventDate: { gte: new Date(filters.dateFrom) },
    });
  }
  if (filters.dateTo) {
    whereClause.AND.push({
      eventDate: { lte: new Date(filters.dateTo) },
    });
  }
  const offset = (page - 1) * limit;
  const proposals = await database_1.database.proposal.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    skip: offset,
  });
  const totalCount = await database_1.database.proposal.count({
    where: whereClause,
  });
  return {
    data: proposals,
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
async function getProposalById(id) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(id, "Proposal ID is required");
  const proposal = await database_1.database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(proposal, "Proposal not found");
  return proposal;
}
/**
 * Create a new proposal
 */
async function createProposal(input) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  // Validate input
  (0, invariant_1.invariant)(input.title?.trim(), "Title is required");
  (0, invariant_1.invariant)(
    input.clientId || input.leadId || input.eventId,
    "At least one of clientId, leadId, or eventId must be provided"
  );
  // Generate proposal number
  const year = new Date().getFullYear();
  const count = await database_1.database.proposal.count({
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
  const proposal = await database_1.database.proposal.create({
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
  (0, cache_1.revalidatePath)("/crm/proposals");
  return proposal;
}
/**
 * Update a proposal
 */
async function updateProposal(id, input) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(id, "Proposal ID is required");
  // Check if proposal exists
  const existingProposal = await database_1.database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(existingProposal, "Proposal not found");
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
  const proposal = await database_1.database.proposal.update({
    where: { tenantId_id: { tenantId, id } },
    data: {
      ...(input.title !== undefined && { title: input.title?.trim() }),
      ...(input.clientId !== undefined && { clientId: input.clientId }),
      ...(input.leadId !== undefined && { leadId: input.leadId }),
      ...(input.eventId !== undefined && { eventId: input.eventId }),
      ...(input.eventDate !== undefined && {
        eventDate: input.eventDate ? new Date(input.eventDate) : null,
      }),
      ...(input.eventType !== undefined && {
        eventType: input.eventType?.trim() || null,
      }),
      ...(input.guestCount !== undefined && {
        guestCount: input.guestCount ?? null,
      }),
      ...(input.venueName !== undefined && {
        venueName: input.venueName?.trim() || null,
      }),
      ...(input.venueAddress !== undefined && {
        venueAddress: input.venueAddress?.trim() || null,
      }),
      ...(input.subtotal !== undefined && { subtotal: calculatedSubtotal }),
      ...(input.taxRate !== undefined && { taxRate: input.taxRate ?? 0 }),
      ...(input.taxAmount !== undefined && { taxAmount: calculatedTax }),
      ...(input.discountAmount !== undefined && {
        discountAmount: input.discountAmount ?? 0,
      }),
      ...(input.total !== undefined && { total: calculatedTotal }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.validUntil !== undefined && {
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
      }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.termsAndConditions !== undefined && {
        termsAndConditions: input.termsAndConditions?.trim() || null,
      }),
    },
  });
  (0, cache_1.revalidatePath)("/crm/proposals");
  (0, cache_1.revalidatePath)(`/crm/proposals/${id}`);
  return proposal;
}
/**
 * Delete a proposal (soft delete)
 */
async function deleteProposal(id) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(id, "Proposal ID is required");
  const existingProposal = await database_1.database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(existingProposal, "Proposal not found");
  await database_1.database.proposal.update({
    where: {
      tenantId_id: { tenantId, id },
    },
    data: { deletedAt: new Date() },
  });
  (0, cache_1.revalidatePath)("/crm/proposals");
  return { success: true };
}
/**
 * Send a proposal to the client
 */
async function sendProposal(id, input = {}) {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  (0, invariant_1.invariant)(id, "Proposal ID is required");
  const existingProposal = await database_1.database.proposal.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  (0, invariant_1.invariant)(existingProposal, "Proposal not found");
  const recipientEmail = input.recipientEmail?.trim();
  (0, invariant_1.invariant)(recipientEmail, "Recipient email is required");
  // Update proposal status
  const proposal = await database_1.database.proposal.update({
    where: { tenantId_id: { tenantId, id } },
    data: {
      status: "sent",
      sentAt: new Date(),
    },
  });
  (0, cache_1.revalidatePath)("/crm/proposals");
  (0, cache_1.revalidatePath)(`/crm/proposals/${id}`);
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
async function getProposalStats() {
  const { orgId } = await (0, server_1.auth)();
  (0, invariant_1.invariant)(orgId, "Unauthorized");
  const tenantId = await (0, tenant_1.getTenantId)();
  const [
    totalCount,
    draftCount,
    sentCount,
    viewedCount,
    acceptedCount,
    rejectedCount,
  ] = await Promise.all([
    database_1.database.proposal.count({
      where: { AND: [{ tenantId }, { deletedAt: null }] },
    }),
    database_1.database.proposal.count({
      where: { AND: [{ tenantId }, { status: "draft" }, { deletedAt: null }] },
    }),
    database_1.database.proposal.count({
      where: { AND: [{ tenantId }, { status: "sent" }, { deletedAt: null }] },
    }),
    database_1.database.proposal.count({
      where: { AND: [{ tenantId }, { status: "viewed" }, { deletedAt: null }] },
    }),
    database_1.database.proposal.count({
      where: {
        AND: [{ tenantId }, { status: "accepted" }, { deletedAt: null }],
      },
    }),
    database_1.database.proposal.count({
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
