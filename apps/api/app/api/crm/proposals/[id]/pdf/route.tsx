import type { DocumentProps } from "@react-pdf/renderer";
import { auth } from "@repo/auth/server";
import { database, type PrismaClient } from "@repo/database";
import { ProposalPDF } from "@repo/pdf";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  id: string;
}>;

interface ClientSelect {
  id: true;
  company_name: true;
  first_name: true;
  last_name: true;
  email: true;
  phone: true;
  addressLine1: true;
  addressLine2: true;
  city: true;
  stateProvince: true;
  postalCode: true;
  countryCode: true;
}

interface LeadSelect {
  id: true;
  companyName: true;
  contactName: true;
  contactEmail: true;
  contactPhone: true;
  eventType: true;
  eventDate: true;
  estimatedGuests: true;
  estimatedValue: true;
}

/**
 * Fetch proposal with all related data
 */
function fetchProposal(
  database: PrismaClient,
  proposalId: string,
  tenantId: string
) {
  return database.proposal.findFirst({
    where: {
      id: proposalId,
      tenantId,
      deletedAt: null,
    },
    include: {
      client: {
        select: {
          id: true,
          company_name: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          stateProvince: true,
          postalCode: true,
          countryCode: true,
        } as ClientSelect,
      },
      lead: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          eventType: true,
          eventDate: true,
          estimatedGuests: true,
          estimatedValue: true,
        } as LeadSelect,
      },
      event: {
        include: {
          location: true,
          venue: true,
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
}

/**
 * Fetch user info for metadata
 */
function fetchUser(
  database: PrismaClient,
  tenantId: string,
  authUserId: string
) {
  return database.user.findFirst({
    where: {
      tenantId,
      authUserId,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

interface ProposalClient {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
}

interface ProposalLead {
  id: string;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  eventType: string | null;
  eventDate: Date | null;
  estimatedGuests: number | null;
  estimatedValue: unknown;
}

interface ProposalEvent {
  id: string;
  title: string;
  eventNumber: string | number | null;
  eventDate: Date | null;
  eventType: string | null;
  guestCount: number | null;
  venue: {
    name: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string | null;
  } | null;
  location: {
    name: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string | null;
  } | null;
  venueName: string | null;
  venueAddress: string | null;
  status: string;
}

interface ProposalUser {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

/**
 * Transform client data for PDF
 */
function transformClientData(client: ProposalClient) {
  return {
    id: client.id,
    companyName: client.company_name,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phone: client.phone,
    address: {
      addressLine1: client.addressLine1,
      addressLine2: client.addressLine2,
      city: client.city,
      stateProvince: client.stateProvince,
      postalCode: client.postalCode,
      countryCode: client.countryCode,
    },
  };
}

/**
 * Transform lead data for PDF
 */
function transformLeadData(lead: ProposalLead) {
  return {
    id: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactPhone: lead.contactPhone,
    eventType: lead.eventType,
    eventDate: lead.eventDate,
    estimatedGuests: lead.estimatedGuests,
    estimatedValue: lead.estimatedValue
      ? Number(lead.estimatedValue)
      : undefined,
  };
}

/**
 * Transform event data for PDF
 */
function transformEventData(event: ProposalEvent) {
  return {
    id: event.id,
    title: event.title,
    eventNumber: event.eventNumber,
    eventDate: event.eventDate,
    eventType: event.eventType,
    guestCount: event.guestCount,
    venueName:
      event.venue?.name ||
      event.location?.name ||
      event.venueName ||
      "Not specified",
    venueAddress:
      event.venue || event.location
        ? {
            addressLine1:
              event.venue?.addressLine1 || event.location?.addressLine1,
            addressLine2:
              event.venue?.addressLine2 || event.location?.addressLine2,
            city: event.venue?.city || event.location?.city,
            stateProvince:
              event.venue?.stateProvince || event.location?.stateProvince,
            postalCode: event.venue?.postalCode || event.location?.postalCode,
            countryCode:
              event.venue?.countryCode || event.location?.countryCode,
          }
        : event.venueAddress || undefined,
    status: event.status,
  };
}

/**
 * Transform proposal data for PDF
 */
function transformProposalData(
  proposal: NonNullable<Awaited<ReturnType<typeof fetchProposal>>>,
  user: ProposalUser
) {
  return {
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
    client: proposal.client ? transformClientData(proposal.client) : undefined,
    lead: proposal.lead ? transformLeadData(proposal.lead) : undefined,
    event: proposal.event ? transformEventData(proposal.event) : undefined,
    lineItems: proposal.lineItems.map((item) => ({
      id: item.id,
      category: item.category,
      description: item.description,
      quantity: Number(item.quantity),
      unitOfMeasure: item.unitOfMeasure,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      sortOrder: item.sortOrder,
    })),
    metadata: {
      generatedAt: new Date(),
      generatedBy: user.email || `${user.firstName} ${user.lastName}`,
      version: "1.0.0",
    },
  };
}

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

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const proposal = await fetchProposal(database, proposalId, tenantId);

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    const user = await fetchUser(database, tenantId, userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pdfData = transformProposalData(proposal, user);

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";

    // @ts-expect-error - React-PDF renderer needs proper types
    const pdfComponent = <ProposalPDF data={pdfData} />;

    if (shouldDownload) {
      return generateDownloadResponse(pdfComponent, proposal.proposalNumber);
    }

    return generateBase64Response(pdfComponent, proposal.proposalNumber);
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

/**
 * Generate downloadable PDF response
 */
async function generateDownloadResponse(
  pdfComponent: React.ReactElement<DocumentProps>,
  proposalNumber: string
) {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await pdf(pdfComponent);
  const blob = await doc.toBlob();

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${proposalNumber}.pdf"`,
    },
  });
}

/**
 * Generate base64 PDF response
 */
async function generateBase64Response(
  pdfComponent: React.ReactElement<DocumentProps>,
  proposalNumber: string
) {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await pdf(pdfComponent);
  const blob = await doc.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  let binary = "";
  for (const byte of uint8Array) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);

  return NextResponse.json({
    dataUrl: `data:application/pdf;base64,${base64}`,
    filename: `proposal-${proposalNumber}.pdf`,
  });
}
