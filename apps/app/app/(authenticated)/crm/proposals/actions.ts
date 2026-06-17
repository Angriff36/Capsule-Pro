"use server";
import type { Proposal } from "@/app/lib/manifest-types.generated";
import { listClients, listEvents, listProposalTemplates, listProposals } from "@/app/lib/manifest-client.generated";

/**
 * Proposal CRUD Server Actions
 *
 * Server actions for proposal management operations
 */

import { auth } from "@repo/auth/server";
import { ProposalTemplate, resend } from "@repo/email";
import { revalidatePath } from "next/cache";
import { serializeDecimals } from "@/app/lib/decimal";
import { invariant } from "@/app/lib/invariant";
import { getTenantId, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

const DEFAULT_APP_URL = "https://app.capsule.pro";
const DEFAULT_FROM_ADDRESS = "noreply@capsule.pro";

// Types matching the API
export interface ProposalFilters {
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  eventId?: string;
  leadId?: string;
  search?: string;
  status?: string;
}

export interface CreateProposalInput {
  clientId?: string | null;
  discountAmount?: number | null;
  eventDate?: string | null;
  eventId?: string | null;
  eventType?: string | null;
  guestCount?: number | null;
  leadId?: string | null;
  lineItems?: CreateLineItemInput[];
  notes?: string | null;
  status?:
    | "draft"
    | "sent"
    | "viewed"
    | "accepted"
    | "rejected"
    | "expired"
    | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  taxRate?: number | null;
  templateId?: string | null;
  termsAndConditions?: string | null;
  title: string;
  total?: number | null;
  validUntil?: string | null;
  venueAddress?: string | null;
  venueName?: string | null;
}

export interface CreateLineItemInput {
  description: string;
  itemType: string;
  notes?: string | null;
  quantity: number;
  sortOrder?: number;
  total?: number | null;
  unitPrice: number;
}

export interface SendProposalInput {
  message?: string;
  recipientEmail?: string;
}

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

  const proposals = (await listProposals()).data;

  const totalCount = (await listProposals()).data.length;

  const serializedProposals = proposals.map(serializeDecimals);

  return {
    data: serializedProposals as Proposal[],
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

  const proposal = (await listProposals()).data[0] ?? null;

  invariant(proposal, "Proposal not found");

  // Serialize Decimal fields for client component compatibility
  return serializeDecimals(proposal);
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

  // Fetch template if provided and apply defaults
  let templateDefaults: {
    taxRate?: number;
    termsAndConditions?: string;
    notes?: string;
    lineItems?: CreateLineItemInput[];
  } = {};

  if (input.templateId) {
    const template = (await listProposalTemplates()).data[0] ?? null;

    if (template) {
      const templateLineItems = template.defaultLineItems as Array<{
        sortOrder?: number;
        itemType: string;
        category: string;
        description: string;
        quantity: number;
        unitOfMeasure?: string;
        unitPrice: number;
        notes?: string;
      }>;

      templateDefaults = {
        taxRate: template.defaultTaxRate?.toNumber() ?? undefined,
        termsAndConditions: template.defaultTerms ?? undefined,
        notes: template.defaultNotes ?? undefined,
        lineItems: templateLineItems.map((item) => ({
          sortOrder: item.sortOrder ?? 0,
          itemType: item.itemType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        })),
      };
    }
  }

  // Apply template defaults where input values are not provided
  const effectiveTaxRate = input.taxRate ?? templateDefaults.taxRate ?? 0;
  const effectiveTerms =
    input.termsAndConditions ?? templateDefaults.termsAndConditions;
  const effectiveNotes = input.notes ?? templateDefaults.notes;
  const effectiveLineItems =
    input.lineItems ?? templateDefaults.lineItems ?? [];

  // Generate proposal number
  const year = new Date().getFullYear();
  const count = (await listProposals()).data.length;
  const proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, "0")}`;

  // Calculate totals if line items provided
  let calculatedSubtotal = input.subtotal ?? 0;
  let calculatedTax = input.taxAmount ?? 0;
  let calculatedTotal = input.total ?? 0;

  if (effectiveLineItems && effectiveLineItems.length > 0) {
    calculatedSubtotal = effectiveLineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    calculatedTax = calculatedSubtotal * (effectiveTaxRate / 100);
    const discount = input.discountAmount ?? 0;
    calculatedTotal = calculatedSubtotal + calculatedTax - discount;
  }

  // Governed write: Proposal.create via Manifest runtime (constitution §9).
  // createInstance seeds all body fields, so fields not in explicit command
  // params (clientId, templateId, subtotal, etc.) are carried through.
  const user = await requireCurrentUser();

  const createResult = await runManifestCommand({
    entity: "Proposal",
    command: "create",
    body: {
      proposalNumber,
      leadId: input.leadId ?? "",
      eventId: input.eventId ?? "",
      title: input.title.trim(),
      guestCount: input.guestCount ?? 0,
      taxRate: effectiveTaxRate,
      validUntil: input.validUntil ? new Date(input.validUntil).getTime() : 0,
      notes: effectiveNotes?.trim() || "",
      termsAndConditions: effectiveTerms?.trim() || "",
      // Extra fields seeded via createInstance (not explicit create params):
      clientId: input.clientId ?? "",
      templateId: input.templateId ?? "",
      eventDate: input.eventDate ? new Date(input.eventDate).getTime() : 0,
      eventType: input.eventType?.trim() || "",
      venueName: input.venueName?.trim() || "",
      venueAddress: input.venueAddress?.trim() || "",
      subtotal: calculatedSubtotal,
      taxAmount: calculatedTax,
      discountAmount: input.discountAmount ?? 0,
      total: calculatedTotal,
      status: input.status ?? "draft",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!createResult.ok) {
    throw new Error(createResult.message || "Failed to create proposal");
  }

  const proposalId = (createResult.result as { id?: string } | null)?.id;
  invariant(proposalId, "Proposal.create did not return an id");

  // Governed writes: create line items individually via ProposalLineItem.create.
  // Manifest does not support cross-entity transactions; errors are non-fatal.
  if (effectiveLineItems && effectiveLineItems.length > 0) {
    for (let index = 0; index < effectiveLineItems.length; index++) {
      const item = effectiveLineItems[index];
      try {
        await runManifestCommand({
          entity: "ProposalLineItem",
          command: "create",
          body: {
            proposalId,
            itemType: item.itemType,
            category: "general",
            description: item.description,
            quantity: item.quantity,
            unitOfMeasure: "",
            unitPrice: item.unitPrice,
            sortOrder: item.sortOrder ?? index,
            notes: item.notes ?? "",
          },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
        });
      } catch (lineItemError) {
        console.error(
          `Failed to create line item ${index} for proposal ${proposalId}:`,
          lineItemError
        );
      }
    }
  }

  // Read back the persisted proposal to return the full row shape.
  const proposal = (await listProposals()).data[0] ?? null;
  invariant(proposal, "Created proposal could not be loaded");

  revalidatePath("/crm/proposals");

  return serializeDecimals(proposal);
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
  const existingProposal = (await listProposals()).data[0] ?? null;

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

  // Governed write: Proposal.update via Manifest runtime (constitution §9).
  // The Manifest update command mutates the full field set, so we merge partial
  // input over existing values (undefined → keep current, same as Venue pattern).
  const user = await requireCurrentUser();

  const updateResult = await runManifestCommand({
    entity: "Proposal",
    command: "update",
    body: {
      id,
      title:
        (input.title === undefined
          ? existingProposal.title
          : input.title?.trim()) ?? "",
      eventDate:
        input.eventDate === undefined
          ? existingProposal.eventDate
            ? existingProposal.eventDate.getTime()
            : 0
          : input.eventDate
            ? new Date(input.eventDate).getTime()
            : 0,
      eventType:
        input.eventType === undefined
          ? (existingProposal.eventType ?? "")
          : input.eventType?.trim() || "",
      guestCount: input.guestCount ?? existingProposal.guestCount ?? 0,
      venueName:
        input.venueName === undefined
          ? (existingProposal.venueName ?? "")
          : input.venueName?.trim() || "",
      venueAddress:
        input.venueAddress === undefined
          ? (existingProposal.venueAddress ?? "")
          : input.venueAddress?.trim() || "",
      subtotal:
        typeof calculatedSubtotal === "number"
          ? calculatedSubtotal
          : calculatedSubtotal.toNumber(),
      taxRate:
        input.taxRate ??
        (typeof existingProposal.taxRate === "number"
          ? existingProposal.taxRate
          : (existingProposal.taxRate?.toNumber() ?? 0)),
      taxAmount:
        typeof calculatedTax === "number"
          ? calculatedTax
          : calculatedTax.toNumber(),
      discountAmount: (() => {
        const d = input.discountAmount ?? existingProposal.discountAmount;
        return typeof d === "number"
          ? d
          : ((d as { toNumber(): number }).toNumber() ?? 0);
      })(),
      total:
        typeof calculatedTotal === "number"
          ? calculatedTotal
          : (calculatedTotal as { toNumber(): number }).toNumber(),
      validUntil:
        input.validUntil === undefined
          ? existingProposal.validUntil
            ? existingProposal.validUntil.getTime()
            : 0
          : input.validUntil
            ? new Date(input.validUntil).getTime()
            : 0,
      notes:
        input.notes === undefined
          ? (existingProposal.notes ?? "")
          : input.notes?.trim() || "",
      termsAndConditions:
        input.termsAndConditions === undefined
          ? (existingProposal.termsAndConditions ?? "")
          : input.termsAndConditions?.trim() || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!updateResult.ok) {
    throw new Error(updateResult.message || "Failed to update proposal");
  }

  // Read back the persisted proposal to preserve the return shape.
  const proposal = (await listProposals()).data[0] ?? null;
  invariant(proposal, "Updated proposal could not be loaded");

  revalidatePath("/crm/proposals");
  revalidatePath(`/crm/proposals/${id}`);

  return serializeDecimals(proposal);
}

/**
 * Delete a proposal (soft delete)
 */
export async function deleteProposal(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Proposal ID is required");

  const existingProposal = (await listProposals()).data[0] ?? null;

  invariant(existingProposal, "Proposal not found");

  // Governed write: Proposal.remove via Manifest runtime (constitution §9).
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "Proposal",
    command: "remove",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete proposal");
  }

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

  const existingProposal = (await listProposals()).data[0] ?? null;

  invariant(existingProposal, "Proposal not found");

  const recipientEmail = input.recipientEmail?.trim();

  invariant(recipientEmail, "Recipient email is required");

  // Governed writes: Proposal.send transitions status to "sent" + sets sentAt,
  // then Proposal.generatePublicLink creates the publicToken for sharing.
  const user = await requireCurrentUser();

  const sendResult = await runManifestCommand({
    entity: "Proposal",
    command: "send",
    body: { id, userId: user.id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!sendResult.ok) {
    throw new Error(sendResult.message || "Failed to send proposal");
  }

  // Generate public link after sending
  let publicToken = "";
  const linkResult = await runManifestCommand({
    entity: "Proposal",
    command: "generatePublicLink",
    body: { id, userId: user.id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (linkResult.ok && linkResult.result) {
    publicToken =
      (linkResult.result as { publicToken?: string } | null)?.publicToken ?? "";
  }

  // Read back the persisted proposal to preserve return shape.
  const proposal = (await listProposals()).data[0] ?? null;
  invariant(proposal, "Sent proposal could not be loaded");

  revalidatePath("/crm/proposals");
  revalidatePath(`/crm/proposals/${id}`);

  // Get client name for email personalization
  let recipientName = "Valued Client";
  if (existingProposal.clientId) {
    const client = (await listClients()).data.find(
      (entry) => entry.id === existingProposal.clientId
    );
    if (client) {
      recipientName = client.first_name || client.company_name || recipientName;
    }
  }

  // Build public proposal URL (no auth required)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL;
  const proposalUrl = `${appUrl}/view/proposal/${publicToken}`;

  // Format total amount
  const totalAmount =
    existingProposal.total === null
      ? undefined
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(existingProposal.total));

  // Send email using Resend
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM ?? DEFAULT_FROM_ADDRESS,
      to: recipientEmail,
      subject: `Proposal: ${existingProposal.title}`,
      react: ProposalTemplate({
        recipientName,
        proposalTitle: existingProposal.title,
        proposalUrl,
        message: input.message,
        totalAmount,
      }),
    });
  } catch (emailError) {
    console.error("Failed to send proposal email:", emailError);
    // Continue with the response even if email fails
  }

  return {
    success: true,
    proposal: serializeDecimals(proposal),
    sentTo: recipientEmail,
    publicUrl: proposalUrl,
  };
}

/**
 * Get or generate a public link for a proposal
 * If the proposal already has a publicToken, returns the existing link
 * Otherwise, generates a new token and returns the new link
 */
export async function getProposalPublicLink(id: string) {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();
  invariant(id, "Proposal ID is required");

  const existingProposal = (await listProposals()).data[0] ?? null;

  invariant(existingProposal, "Proposal not found");

  let publicToken = existingProposal.publicToken;

  // Governed write: generate a new token via Manifest if one doesn't exist.
  if (!publicToken) {
    const user = await requireCurrentUser();
    const linkResult = await runManifestCommand({
      entity: "Proposal",
      command: "generatePublicLink",
      body: { id, userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!linkResult.ok) {
      throw new Error(linkResult.message || "Failed to generate public link");
    }

    publicToken =
      (linkResult.result as { publicToken?: string } | null)?.publicToken ?? "";

    // Re-read to get the persisted token if the result didn't include it.
    if (!publicToken) {
      const refreshed = (await listProposals()).data[0] ?? null;
      publicToken = refreshed?.publicToken ?? "";
    }
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL}/view/proposal/${publicToken}`;

  return {
    success: true,
    publicUrl,
    publicToken,
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
    (await listProposals()).data.length,
    (await listProposals()).data.length,
    (await listProposals()).data.length,
    (await listProposals()).data.length,
    (await listProposals()).data.length,
    (await listProposals()).data.length,
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

/**
 * Get events for dropdown selection (used in proposal forms)
 */
export async function getEventsForDropdown() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantId();

  const events = (await listEvents()).data;

  return events;
}
