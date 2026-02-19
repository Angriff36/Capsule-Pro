/**
 * Public Proposal Response API
 *
 * POST /api/public/proposals/[token]/respond - Accept or reject a proposal (no auth required)
 *
 * This endpoint allows clients to respond to proposals without authentication.
 */

import { database } from "@repo/database";
import { NextResponse } from "next/server";

type Params = Promise<{ token: string }>;

interface RespondRequest {
  action: "accept" | "reject";
  responderName: string;
  responderEmail: string;
  notes?: string;
}

/**
 * POST /api/public/proposals/[token]/respond
 * Accept or reject a proposal
 */
export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: "Invalid proposal link" },
        { status: 400 }
      );
    }

    const body: RespondRequest = await request.json();
    const { action, responderName, responderEmail, notes } = body;

    if (!(action && ["accept", "reject"].includes(action))) {
      return NextResponse.json(
        { message: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    if (!(responderName && responderEmail)) {
      return NextResponse.json(
        { message: "Responder name and email are required" },
        { status: 400 }
      );
    }

    // Find proposal by public token
    const proposal = await database.proposal.findFirst({
      where: {
        publicToken: token,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        status: true,
        validUntil: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found or link has expired" },
        { status: 404 }
      );
    }

    // Check if proposal has expired
    if (proposal.validUntil && new Date(proposal.validUntil) < new Date()) {
      return NextResponse.json(
        { message: "This proposal has expired", expired: true },
        { status: 410 }
      );
    }

    // Check if proposal can be responded to
    if (proposal.status === "accepted") {
      return NextResponse.json(
        { message: "This proposal has already been accepted" },
        { status: 400 }
      );
    }

    if (proposal.status === "rejected") {
      return NextResponse.json(
        { message: "This proposal has already been rejected" },
        { status: 400 }
      );
    }

    if (proposal.status === "expired" || proposal.status === "canceled") {
      return NextResponse.json(
        { message: `This proposal has been ${proposal.status}` },
        { status: 400 }
      );
    }

    // Update proposal status
    const now = new Date();
    const updateData =
      action === "accept"
        ? { status: "accepted", acceptedAt: now }
        : { status: "rejected", rejectedAt: now };

    const updatedProposal = await database.proposal.update({
      where: {
        tenantId: proposal.tenantId,
        id: proposal.id,
      },
      data: updateData,
    });

    // Create audit log entry
    await database.$executeRaw`
      INSERT INTO platform.audit_log (
        id, tenant_id, entity_type, entity_id, action, performed_by, old_values, new_values, created_at
      ) VALUES (
        gen_random_uuid(),
        ${proposal.tenantId},
        'proposal',
        ${proposal.id},
        ${action === "accept" ? "proposal_accepted" : "proposal_rejected"},
        ${responderEmail},
        ${JSON.stringify({ status: proposal.status })},
        ${JSON.stringify({
          status: action === "accept" ? "accepted" : "rejected",
          responderName,
          responderEmail,
          notes: notes || null,
        })},
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message:
        action === "accept"
          ? "Proposal accepted successfully"
          : "Proposal rejected successfully",
      proposal: {
        id: updatedProposal.id,
        status: updatedProposal.status,
        acceptedAt: updatedProposal.acceptedAt,
        rejectedAt: updatedProposal.rejectedAt,
      },
    });
  } catch (error) {
    console.error("Error responding to public proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
