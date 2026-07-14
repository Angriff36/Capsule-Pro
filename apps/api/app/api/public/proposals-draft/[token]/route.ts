/**
 * Public Proposal Draft API Endpoints
 *
 * GET    /api/public/proposals-draft/[token] - Get public proposal by magic token
 * POST   /api/public/proposals-draft/[token] - Respond to proposal (approve/request changes)
 *
 * Unauthenticated magic-token surface. Governed ProposalDraft transitions
 * (recordView / approve / requestChanges) execute via Manifest runtime using
 * the tenant's admin user as the system actor (same pattern as
 * app/api/public/proposals/[token]/respond). ProposalAction rows are a
 * documented bypass (public response audit trail — see
 * manifest/governance/bypasses.json).
 */

import { database } from "@repo/database";
import type { ManifestUserContext } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

type Params = Promise<{ token: string }>;

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
 * GET /api/public/proposals-draft/[token]
 * Get proposal draft by magic token (no auth required)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: "Invalid proposal link" },
        { status: 400 }
      );
    }

    // Read path (constitution §10): magicToken is globally unique; all
    // follow-up operations are scoped by the row's tenantId.
    // Narrow projection: the public GET response + the conditional recordView
    // write consume only these fields. Dropping the rest removes the heavy
    // `htmlContent` @db.Text blob (rendered proposal HTML) + ~13 unused columns
    // per cold public link open. `select` is a column projection → byte-identical.
    const proposal = await database.proposalDraft.findFirst({
      where: {
        magicToken: token,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        version: true,
        clientName: true,
        eventSummary: true,
        menuSections: true,
        servicePlan: true,
        pricingBreakdown: true,
        timeline: true,
        upgradeOptions: true,
        visionSummary: true,
        notes: true,
        nextSteps: true,
        createdAt: true,
        magicTokenExpiresAt: true,
        viewedAt: true,
        tenantId: true,
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
      return NextResponse.json(
        { message: "This proposal link has expired", expired: true },
        { status: 410 }
      );
    }

    // Governed write: record the first view via Manifest runtime
    // (sent -> viewed transition). Non-fatal — the proposal is still served.
    if (
      !proposal.viewedAt &&
      (proposal.status === "sent" || proposal.status === "viewed")
    ) {
      const actor = await buildSystemUserContext(proposal.tenantId);
      const viewResponse = await runCommand({
        entity: "ProposalDraft",
        command: "recordView",
        body: { id: proposal.id, tenantId: proposal.tenantId },
        user: { id: actor.id, tenantId: actor.tenantId, role: actor.role },
      });
      if (!viewResponse.ok) {
        log.error(
          "ProposalDraft.recordView failed for public view:",
          await viewResponse.text()
        );
      }
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
 * POST /api/public/proposals-draft/[token]
 * Allow client to respond to proposal (approve/request changes)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { message: "Invalid proposal link" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, responderName, responderEmail, notes } = body as {
      action?: "approve" | "request_changes";
      responderName?: string;
      responderEmail?: string;
      notes?: string;
    };

    if (!(action && ["approve", "request_changes"].includes(action))) {
      return NextResponse.json(
        { message: "Invalid action. Must be 'approve' or 'request_changes'" },
        { status: 400 }
      );
    }

    if (action === "request_changes" && !notes) {
      // ProposalDraft.requestChanges requires a non-empty clientMessage
      return NextResponse.json(
        { message: "Please describe the changes you would like" },
        { status: 400 }
      );
    }

    // Read path: find proposal by magic token.
    // Existence guard + status/expiry pre-validation only — select the 4 fields
    // the handler reads, dropping the heavy `htmlContent`/`visionSummary`
    // @db.Text blobs + all JSON payloads + ~20 unused columns per public respond.
    const proposal = await database.proposalDraft.findFirst({
      where: {
        magicToken: token,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        magicTokenExpiresAt: true,
        tenantId: true,
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
      return NextResponse.json(
        { message: "This proposal has expired" },
        { status: 410 }
      );
    }

    // Pre-validation; the Manifest guards enforce the same transitions.
    if (proposal.status === "approved") {
      return NextResponse.json(
        { message: "This proposal has already been approved" },
        { status: 400 }
      );
    }

    // Governed write: approve / requestChanges via Manifest runtime with the
    // tenant's system actor (no Clerk identity on this public surface).
    const actor = await buildSystemUserContext(proposal.tenantId);
    const commandResponse = await runCommand({
      entity: "ProposalDraft",
      command: action === "approve" ? "approve" : "requestChanges",
      body: {
        id: proposal.id,
        tenantId: proposal.tenantId,
        clientMessage: notes ?? "",
      },
      user: { id: actor.id, tenantId: actor.tenantId, role: actor.role },
    });

    if (!commandResponse.ok) {
      log.error(
        "Failed to record public proposal response via Manifest:",
        await commandResponse.text()
      );
      return NextResponse.json(
        { message: "Unable to record your response to this proposal" },
        { status: commandResponse.status >= 500 ? 500 : 409 }
      );
    }

    // Documented bypass: ProposalAction has no manifest entity (yet). The
    // audit-trail row is written only inside this parent flow, tenant-scoped
    // via the proposal row. See manifest/governance/bypasses.json.
    const now = new Date();
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
          : "Thank you for your feedback. We'll be in touch soon.",
      proposalStatus: action === "approve" ? "approved" : "change_requested",
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
