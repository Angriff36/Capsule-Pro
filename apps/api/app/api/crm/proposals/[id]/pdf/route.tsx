import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { ProposalPDF } from "@repo/pdf";
import { getTenantIdForOrg } from "@/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  id: string;
}>;

/**
 * GET /api/crm/proposals/[id]/pdf
 *
 * Generate a PDF export of a proposal.
 *
 * Query parameters:
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id: proposalId } = await params;
    const { orgId, userId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Fetch proposal with all related data
    const proposal = await database.proposal.findFirst({
      where: {
        id: proposalId,
        tenantId,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        lead: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        event: {
          select: {
            name: true,
            eventDate: true,
            guestCount: true,
            venue: {
              select: {
                name: true,
              },
            },
          },
        },
        lineItems: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
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

    // Prepare PDF data
    const pdfData = {
      proposal: {
        id: proposal.id,
        proposalNumber: proposal.proposalNumber,
        status: proposal.status,
        validUntil: proposal.validUntil,
        subtotal: Number(proposal.subtotal),
        taxAmount: Number(proposal.taxAmount),
        total: Number(proposal.total),
        notes: proposal.notes || undefined,
        createdAt: proposal.createdAt,
      },
      client: proposal.client
        ? {
            name: proposal.client.name,
            email: proposal.client.email || undefined,
            phone: proposal.client.phone || undefined,
            address: proposal.client.address || undefined,
          }
        : undefined,
      lead: proposal.lead
        ? {
            name: proposal.lead.name,
            email: proposal.lead.email || undefined,
            phone: proposal.lead.phone || undefined,
          }
        : undefined,
      event: proposal.event
        ? {
            name: proposal.event.name,
            date: proposal.event.eventDate,
            guestCount: proposal.event.guestCount,
            venue: proposal.event.venue?.name || undefined,
          }
        : undefined,
      lineItems: proposal.lineItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        category: item.category || undefined,
      })),
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
    const pdfComponent = <ProposalPDF data={pdfData} />;

    if (shouldDownload) {
      // Return as downloadable file
      const { pdf } = await import("@react-pdf/renderer");
      const doc = await pdf(pdfComponent);
      const blob = await doc.toBlob();

      return new NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="proposal-${proposal.proposalNumber}.pdf"`,
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
        filename: `proposal-${proposal.proposalNumber}.pdf`,
      });
    }
  } catch (error) {
    console.error("Failed to generate Proposal PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
