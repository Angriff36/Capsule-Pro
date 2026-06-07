"use server";

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "@/app/lib/tenant";

interface GenerateProposalResult {
  success: boolean;
  proposalId?: string;
  proposalNumber?: string;
  error?: string;
}

export async function generateProposalFromEvent(
  eventId: string
): Promise<GenerateProposalResult> {
  try {
    const user = await requireCurrentUser();
    const tenantId = user.tenantId;

    // Fetch event with client relation (read — direct Prisma per constitution §10)
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
    const eventDishLinks = await database.eventDish.findMany({
      where: { eventId, tenantId, deletedAt: null },
    });

    // Fetch dish details for line items
    const dishIds = eventDishLinks.map((ed) => ed.dishId);
    const dishes =
      dishIds.length > 0
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

    // Compute validUntil: 30 days from now (epoch ms for Manifest datetime)
    const validUntil = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).getTime();

    // Governed write: Proposal.create via Manifest runtime (constitution §3/§9).
    // Extra body fields (clientId, eventDate, eventType, venueName, venueAddress)
    // are entity properties passed through prepareCreateData merge but not command
    // params — they land on the instance as-is.
    const result = await runManifestCommand({
      entity: "Proposal",
      command: "create",
      body: {
        proposalNumber,
        leadId: "",
        eventId,
        title: `Proposal: ${event.title}`,
        guestCount: event.guestCount ?? 0,
        taxRate: 0,
        validUntil,
        notes: `Auto-generated from event: ${event.title}`,
        termsAndConditions: "",
        // Entity properties (not command params, but passed through seed)
        clientId: event.clientId ?? "",
        eventDate: event.eventDate ? new Date(event.eventDate).getTime() : null,
        eventType: event.eventType ?? "",
        venueName: event.venueName ?? "",
        venueAddress: event.venueAddress ?? "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      log.error("Proposal.create governed command failed", {
        eventId,
        kind: result.kind,
        message: result.message,
      });
      return {
        success: false,
        error: result.message || "Failed to create proposal",
      };
    }

    const proposalId = (result.result as { id: string }).id;

    // Create line items via governed ProposalLineItem.create commands.
    // The IR has no createMany — iterate per line item.
    const lineItems = eventDishLinks.map((link, index) => {
      const dish = dishById.get(link.dishId);
      return {
        itemType: "dish",
        category: link.course ?? "main",
        description: dish?.name ?? "Unknown dish",
        quantity: link.quantityServings ?? 1,
        unitOfMeasure: "servings",
        unitPrice: 0,
        sortOrder: index,
        notes: "",
      };
    });

    if (lineItems.length > 0) {
      const lineResults = await Promise.all(
        lineItems.map((item) =>
          runManifestCommand({
            entity: "ProposalLineItem",
            command: "create",
            body: {
              proposalId,
              ...item,
            },
            user: { id: user.id, tenantId: user.tenantId, role: user.role },
          })
        )
      );

      const failedLine = lineResults.find((r) => !r.ok);
      if (failedLine && !failedLine.ok) {
        log.error("ProposalLineItem.create governed command failed", {
          proposalId,
          kind: failedLine.kind,
          message: failedLine.message,
        });
        // Proposal was created but line items partially failed — return success
        // with the proposal ID so the caller can still use it.
      }
    }

    log.info("Proposal generated from event", {
      eventId,
      proposalId,
    });

    return {
      success: true,
      proposalId,
      proposalNumber,
    };
  } catch (error) {
    log.error("Failed to generate proposal from event", { error, eventId });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate proposal",
    };
  }
}
