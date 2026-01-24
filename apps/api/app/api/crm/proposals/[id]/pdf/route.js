Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const pdf_1 = require("@repo/pdf");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
exports.runtime = "nodejs";
/**
 * GET /api/crm/proposals/[id]/pdf
 *
 * Generate a PDF export of a proposal.
 *
 * Query parameters:
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
async function GET(request, { params }) {
  try {
    const { id: proposalId } = await params;
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Fetch proposal
    // TODO: Add client, lead, event, lineItems relations to Prisma schema
    const proposal = await database_1.database.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId,
        deletedAt: null,
      },
    });
    if (!proposal) {
      return server_2.NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }
    // Fetch user info for metadata
    const user = await database_1.database.user.findFirst({
      where: {
        tenantId,
        authUserId: userId,
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!user) {
      return server_2.NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    // Prepare PDF data
    const pdfData = {
      proposal: {
        id: proposal.id,
        proposalNumber: proposal.proposalNumber,
        title: proposal.title,
        status: proposal.status,
        validUntil: proposal.validUntil,
        subtotal: Number(proposal.subtotal),
        taxAmount: Number(proposal.taxAmount),
        total: Number(proposal.total),
        notes: proposal.notes || undefined,
        createdAt: proposal.createdAt,
        eventDate: proposal.eventDate,
        eventType: proposal.eventType,
        guestCount: proposal.guestCount,
        venueName: proposal.venueName,
        venueAddress: proposal.venueAddress,
      },
      client: undefined, // TODO: Fetch client data separately when relation is added
      lead: undefined, // TODO: Fetch lead data separately when relation is added
      event: undefined, // TODO: Fetch event data separately when relation is added
      lineItems: [], // TODO: Fetch line items separately when relation is added
      metadata: {
        generatedAt: new Date(),
        generatedBy: user.email || `${user.firstName} ${user.lastName}`,
        version: "1.0.0",
      },
    };
    // Check if should return as download or base64
    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";
    // @ts-expect-error - React-PDF renderer needs proper types
    const pdfComponent = <pdf_1.ProposalPDF data={pdfData} />;
    if (shouldDownload) {
      // Return as downloadable file
      const { pdf } = await import("@react-pdf/renderer");
      const doc = await pdf(pdfComponent);
      const blob = await doc.toBlob();
      return new server_2.NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="proposal-${proposal.proposalNumber}.pdf"`,
        },
      });
    }
    // Return as base64 for client-side handling
    const { pdf } = await import("@react-pdf/renderer");
    const doc = await pdf(pdfComponent);
    const blob = await doc.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    return server_2.NextResponse.json({
      dataUrl: `data:application/pdf;base64,${base64}`,
      filename: `proposal-${proposal.proposalNumber}.pdf`,
    });
  } catch (error) {
    console.error("Failed to generate Proposal PDF:", error);
    return server_2.NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
