import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { ContractPDF } from "@repo/pdf";
import { getTenantIdForOrg } from "@/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  id: string;
}>;

/**
 * GET /api/events/contracts/[id]/pdf
 *
 * Generate a PDF export of a contract.
 *
 * Query parameters:
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: contractId } = await params;
    const { orgId, userId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Fetch contract with all related data
    const contract = await database.eventContract.findFirst({
      where: {
        id: contractId,
        tenantId,
        deletedAt: null,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            venue: {
              select: {
                name: true,
              },
            },
          },
        },
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        signatures: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            signedAt: "asc",
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Fetch user info for metadata
    const user = await database.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
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
        title: contract.title,
        status: contract.status,
        notes: contract.notes || undefined,
        expiresAt: contract.expiresAt || undefined,
        createdAt: contract.createdAt,
      },
      event: {
        id: contract.event.id,
        name: contract.event.title,
        date: contract.event.eventDate,
        venue: contract.event.venue?.name || undefined,
      },
      client: contract.client
        ? {
            name: contract.client.name,
            email: contract.client.email || undefined,
            phone: contract.client.phone || undefined,
            address: contract.client.address || undefined,
          }
        : undefined,
      signatures: contract.signatures.map((sig) => ({
        id: sig.id,
        signerName: sig.signerName,
        signerEmail: sig.signerEmail,
        signedAt: sig.signedAt,
      })),
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

    // @ts-ignore - React-PDF renderer needs proper types
    const pdfComponent = <ContractPDF data={pdfData} />;

    if (shouldDownload) {
      // Return as downloadable file
      const { pdf } = await import("@react-pdf/renderer");
      const doc = await pdf(pdfComponent);
      const blob = await doc.toBlob();

      return new NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="contract-${contract.title.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
        },
      });
    } else {
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

      return NextResponse.json({
        dataUrl: `data:application/pdf;base64,${base64}`,
        filename: `contract-${contract.title.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      });
    }
  } catch (error) {
    console.error("Failed to generate Contract PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
