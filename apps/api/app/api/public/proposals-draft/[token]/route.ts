/**
 * Public Proposal Draft API Endpoints
 *
 * GET    /api/public/proposals-draft/[token]     - Get public proposal by magic token
 * POST   /api/public/proposals-draft/[token]/respond - Respond to proposal (approve/request changes)
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Params = Promise<{ token: string }>;

/**
 * GET /api/public/proposals-draft/[token]
 * Get proposal draft by magic token (no auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ message: "Invalid proposal link" }, { status: 400 });
    }

    // Find proposal by magic token
    const proposal = await database.proposalDraft.findFirst({
      where: {
        magicToken: token,
        deletedAt: null,
      },
      include: {
        draft: {
          include: {
            session: {
              select: {
                id: true,
                startedAt: true,
                endedAt: true,
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ message: "Proposal not found or link has expired" }, { status: 404 });
    }

    // Check if proposal has expired
    if (proposal.magicTokenExpiresAt && new Date(proposal.magicTokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { message: "This proposal link has expired", expired: true },
        { status: 410 }
      );
    }

    // Update viewedAt timestamp if this is the first view
    if (!proposal.viewedAt) {
      await database.proposalDraft.update({
        where: {
          tenantId_id: {
            tenantId: proposal.tenantId,
            id: proposal.id,
          },
        },
        data: {
          viewedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      proposal: {
        id: proposal.id,
        title: proposal.title,
        status: proposal.status,
        version: proposal.version,
        clientName: proposal.clientName,
        eventSummary: proposal.eventSummary,
        menuSections: proposal.menuSections,
        servicePlan: proposal.servicePlan,
        pricingBreakdown: proposal.pricingBreakdown,
        timeline: proposal.timeline,
        upgradeOptions: proposal.upgradeOptions,
        visionSummary: proposal.visionSummary,
        notes: proposal.notes,
        nextSteps: proposal.nextSteps,
        createdAt: proposal.createdAt,
        expiresAt: proposal.magicTokenExpiresAt,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching public proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/public/proposals-draft/[token]/respond
 * Allow client to respond to proposal (approve/request changes)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ message: "Invalid proposal link" }, { status: 400 });
    }

    const body = await request.json();
    const { action, responderName, responderEmail, notes } = body as {
      action?: "approve" | "request_changes";
      responderName?: string;
      responderEmail?: string;
      notes?: string;
    };

    if (!action || !["approve", "request_changes"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action. Must be 'approve' or 'request_changes'" },
        { status: 400 }
      );
    }

    // Find proposal
    const proposal = await database.proposalDraft.findFirst({
      where: {
        magicToken: token,
        deletedAt: null,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found or link has expired" },
        { status: 404 }
      );
    }

    // Check if proposal has expired
    if (
      proposal.magicTokenExpiresAt &&
      new Date(proposal.magicTokenExpiresAt) < new Date()
    ) {
      return NextResponse.json({ message: "This proposal has expired" }, { status: 410 });
    }

    // Check if proposal can be responded to
    if (proposal.status === "approved") {
      return NextResponse.json(
        { message: "This proposal has already been approved" },
        { status: 400 }
      );
    }

    // Update proposal status
    const now = new Date();
    const updateData =
      action === "approve"
        ? { status: "approved" as const, respondedAt: now }
        : { status: "change_requested" as const, respondedAt: now };

    const updatedProposal = await database.proposalDraft.update({
      where: {
        tenantId_id: {
          tenantId: proposal.tenantId,
          id: proposal.id,
        },
      },
      data: updateData,
    });

    // Record action
    await database.proposalAction.create({
      data: {
        proposalId: proposal.id,
        tenantId: proposal.tenantId,
        action: action === "approve" ? "approved" : "change_requested",
        message: notes || null,
        metadata: {
          responderName: responderName || null,
          responderEmail: responderEmail || null,
        },
        createdAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "Thank you for approving this proposal!"
          : "Thank you for your feedback. We'll be in in touch soon.",
      proposalStatus: updatedProposal.status,
    });
  } catch (error) {
    captureException(error);
    log.error("Error responding to proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
