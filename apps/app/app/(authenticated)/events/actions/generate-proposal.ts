"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface GenerateProposalResult {
  success: boolean;
  proposalId?: string;
  proposalNumber?: string;
  error?: string;
}

export async function generateProposalFromEvent(
  eventId: string,
): Promise<GenerateProposalResult> {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return { success: false, error: "No tenant" };
    }

    // Fetch event with client relation
    const event = await database.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventType: true,
        guestCount: true,
        venueName: true,
        venueAddress: true,
        clientId: true,
        client: {
          select: { id: true },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Fetch event-dish links
    const eventDishLinks = await database.event_dishes.findMany({
      where: { event_id: eventId, tenant_id: tenantId, deleted_at: null },
    });

    // Fetch dish details for line items
    const dishIds = eventDishLinks.map((ed) => ed.dish_id);
    const dishes = dishIds.length > 0
      ? await database.dish.findMany({
          where: { id: { in: dishIds }, tenantId, deletedAt: null },
          select: { id: true, name: true, description: true },
        })
      : [];
    const dishById = new Map(dishes.map((d) => [d.id, d]));

    // Generate proposal number
    const year = new Date().getFullYear();
    const lastProposal = await database.proposal.findFirst({
      where: { tenantId, proposalNumber: { startsWith: `PROP-${year}-` } },
      orderBy: { proposalNumber: "desc" },
      select: { proposalNumber: true },
    });

    const lastSeq = lastProposal?.proposalNumber
      ? Number.parseInt(lastProposal.proposalNumber.split("-").pop() ?? "0", 10)
      : 0;
    const proposalNumber = `PROP-${year}-${String(lastSeq + 1).padStart(4, "0")}`;

    // Build line items from dishes
    const lineItems = eventDishLinks.map((link, index) => {
      const dish = dishById.get(link.dish_id);
      return {
        itemType: "dish",
        category: link.course ?? "main",
        description: dish?.name ?? "Unknown dish",
        quantity: link.quantity_servings ?? 1,
        unitOfMeasure: "servings" as string | null,
        unitPrice: 0,
        total: 0,
        totalPrice: 0,
        sortOrder: index,
        tenantId,
      };
    });

    // Create the proposal
    const proposal = await database.proposal.create({
      data: {
        tenantId,
        proposalNumber,
        eventId,
        clientId: event.clientId,
        title: `Proposal: ${event.title}`,
        eventDate: event.eventDate,
        eventType: event.eventType,
        guestCount: event.guestCount,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        status: "draft",
        subtotal: 0,
        taxRate: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        notes: `Auto-generated from event: ${event.title}`,
      },
    });

    // Create line items if we have dishes
    if (lineItems.length > 0) {
      await database.proposalLineItem.createMany({
        data: lineItems.map((item) => ({
          ...item,
          proposalId: proposal.id,
        })),
      });
    }

    log.info("Proposal generated from event", { eventId, proposalId: proposal.id });

    return {
      success: true,
      proposalId: proposal.id,
      proposalNumber: proposal.proposalNumber,
    };
  } catch (error) {
    log.error("Failed to generate proposal from event", { error, eventId });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate proposal",
    };
  }
}
