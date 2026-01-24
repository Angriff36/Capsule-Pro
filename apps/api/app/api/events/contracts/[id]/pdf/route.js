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
 * GET /api/events/contracts/[id]/pdf
 *
 * Generate a PDF export of a contract.
 *
 * Query parameters:
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
async function GET(request, { params }) {
  try {
    const { id: contractId } = await params;
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Fetch contract
    // TODO: Add event, client, signatures relations to Prisma schema
    const contract = await database_1.database.eventContract.findFirst({
      where: {
        id: contractId,
        tenantId,
        deletedAt: null,
      },
    });
    if (!contract) {
      return server_2.NextResponse.json(
        { error: "Contract not found" },
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
    // Standard contract terms (can be customized per tenant in the future)
    const defaultTerms = [
      "This contract is binding upon signature by both parties.",
      "All payments are due according to the payment schedule outlined in the proposal.",
      "Cancellation policy: 50% refund if cancelled 30+ days before event, 25% refund if cancelled 14-29 days before event, no refund if cancelled less than 14 days before event.",
      "Client agrees to indemnify and hold harmless the catering company from any claims, damages, or losses arising from Client's negligence or intentional misconduct.",
      "The catering company reserves the right to substitute menu items of equal or greater value if necessary.",
      "Final guest count must be confirmed 7 days prior to the event.",
      "Any changes to the event date, time, or location must be approved in writing by both parties.",
    ];
    // Prepare PDF data
    const pdfData = {
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber || undefined,
        title: contract.title,
        status: contract.status,
        notes: contract.notes || undefined,
        expiresAt: contract.expiresAt || undefined,
        createdAt: contract.createdAt,
      },
      event: undefined, // TODO: Fetch from Event relation when added
      client: undefined, // TODO: Fetch from Client relation when added
      signatures: [], // TODO: Fetch from ContractSignature relation when added
      terms: defaultTerms,
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
    const pdfComponent = <pdf_1.ContractPDF data={pdfData} />;
    if (shouldDownload) {
      // Return as downloadable file
      const { pdf } = await import("@react-pdf/renderer");
      const doc = await pdf(pdfComponent);
      const blob = await doc.toBlob();
      return new server_2.NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="contract-${contract.title.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
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
      filename: `contract-${contract.title.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    });
  } catch (error) {
    console.error("Failed to generate Contract PDF:", error);
    return server_2.NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
