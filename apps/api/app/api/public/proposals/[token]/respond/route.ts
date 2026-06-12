/**
 * Public Proposal Response API
 *
 * POST /api/public/proposals/[token]/respond - Accept or reject a proposal (no auth required)
 *
 * This endpoint allows clients to respond to proposals without authentication.
 * Governed writes execute via Manifest runtime (accept/reject commands).
 * Pre-validation (reads) bypass runtime per constitution §10.
 */

import { database } from "@repo/database";
import type { ManifestUserContext } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { runManifestCommand } from "@/lib/manifest/execute-command";

type Params = Promise<{ token: string }>;

interface RespondRequest {
  action: "accept" | "reject";
  notes?: string;
  responderEmail: string;
  responderName: string;
}

/**
 * Build a synthetic system-user context for public (unauthenticated) operations.
 * Uses the tenant's admin user to satisfy Manifest's RBAC requirements.
 */
async function buildSystemUserContext(
  tenantId: string
): Promise<ManifestUserContext> {
  const adminUser = await database.user.findFirst({
    where: { tenantId, role: { in: ["owner", "admin"] }, deletedAt: null },
    select: { id: true, role: true },
  });

  return {
    id: adminUser?.id ?? "system",
    tenantId,
    role: adminUser?.role ?? "admin",
  };
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

    // Find proposal by public token (read path, constitution §10)
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

    // Build synthetic user context for public response (system user from tenant)
    const systemUser = await buildSystemUserContext(proposal.tenantId);

    // Governed write: execute accept or reject via Manifest runtime
    const commandBody =
      action === "accept"
        ? {
            id: proposal.id,
            tenantId: proposal.tenantId,
            userId: responderEmail,
          }
        : {
            id: proposal.id,
            tenantId: proposal.tenantId,
            reason: notes ?? "",
            userId: responderEmail,
          };

    const result = await runManifestCommand({
      entity: "Proposal",
      command: action,
      body: commandBody,
      user: systemUser,
    });

    if (!result.ok) {
      log.error(
        "Failed to respond to proposal via Manifest:",
        await result.text()
      );
      return NextResponse.json(
        { message: "Failed to respond to proposal" },
        { status: 500 }
      );
    }

    // Read back updated proposal for response (read path, constitution §10)
    const updatedProposal = await database.proposal.findFirst({
      where: {
        tenantId: proposal.tenantId,
        id: proposal.id,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        acceptedAt: true,
        rejectedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "accept"
          ? "Proposal accepted successfully"
          : "Proposal rejected successfully",
      proposal: {
        id: updatedProposal?.id ?? proposal.id,
        status:
          updatedProposal?.status ??
          (action === "accept" ? "accepted" : "rejected"),
        acceptedAt: updatedProposal?.acceptedAt ?? null,
        rejectedAt: updatedProposal?.rejectedAt ?? null,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error responding to public proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
