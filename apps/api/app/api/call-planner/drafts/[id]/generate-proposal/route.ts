/**
 * AI Call Planner Proposal Generation API Endpoints
 *
 * POST /api/call-planner/drafts/[id]/generate-proposal - Generate proposal from draft
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { nanoid } from "nanoid";
import { generateProposalContent, type ProposalContent } from "../../../lib/proposal-generator";
import { Prisma } from "@repo/database";

type Params = Promise<{ id: string }>;

/**
 * POST /api/call-planner/drafts/[id]/generate-proposal
 * Generate a proposal from a draft
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    const { clientEmail, clientPhone, includePricing = true, includeUpgrades = true } = body as {
      clientEmail?: string;
      clientPhone?: string;
      includePricing?: boolean;
      includeUpgrades?: boolean;
    };

    // Get the draft with all details
    const draft = await database.eventPlanningDraft.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        extractedDetails: {
          select: {
            id: true,
            fieldName: true,
            rawValue: true,
            normalizedValue: true,
            confidence: true,
            status: true,
          },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ message: "Draft not found" }, { status: 404 });
    }

    // Generate proposal content
    const proposalContent = generateProposalContent(draft as any, {
      includePricing,
      includeUpgrades,
    });

    // Create magic token
    const magicToken = nanoid(32);

    // Create proposal draft
    const proposal = await database.proposalDraft.create({
      data: {
        tenantId,
        draftId: draft.id,
        userId,
        status: "draft",
        version: 1,
        title: `Proposal for ${draft.clientName || "Event"}${draft.eventType ? ` - ${draft.eventType.replace(/_/g, " ").toUpperCase()}` : ""}`,
        clientName: draft.clientName || "",
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        eventSummary: proposalContent.eventSummary as unknown as Prisma.InputJsonValue,
        menuSections: proposalContent.menuSections as unknown as Prisma.InputJsonValue,
        servicePlan: proposalContent.servicePlan as unknown as Prisma.InputJsonValue,
        pricingBreakdown: proposalContent.pricingBreakdown as unknown as Prisma.InputJsonValue,
        timeline: (proposalContent.timeline || null) as unknown as Prisma.InputJsonValue,
        upgradeOptions: (proposalContent.upgradeOptions || null) as unknown as Prisma.InputJsonValue,
        visionSummary: proposalContent.visionSummary || null,
        notes: proposalContent.notes || null,
        nextSteps: proposalContent.nextSteps || null,
        magicToken,
        magicTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Link proposal to draft
    await database.eventPlanningDraft.update({
      where: {
        tenantId_id: {
          tenantId,
          id: draft.id,
        },
      },
      data: {
        proposalId: proposal.id,
      },
    });

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        draftId: draft.id,
        title: proposal.title,
        magicToken: proposal.magicToken,
        status: proposal.status,
        expiresAt: proposal.magicTokenExpiresAt,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error generating proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
