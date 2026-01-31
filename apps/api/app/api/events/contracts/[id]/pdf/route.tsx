import type { DocumentProps } from "@react-pdf/renderer";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { ContractPDF } from "@repo/pdf";
import { type NextRequest, NextResponse } from "next/server";
import type React from "react";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  id: string;
}>;

type AuthContext = {
  orgId: string;
  userId: string;
  tenantId: string;
};

type Venue = {
  name: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
};

type EventData = {
  id: string;
  title: string;
  eventNumber: string | null;
  eventDate: Date | null;
  eventType: string | null;
  guestCount: number | null;
  venue: Venue | null;
  location: Venue | null;
  venueName: string | null;
  venueAddress: string | null;
};

type ClientData = {
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
};

type Signature = {
  id: string;
  signerName: string | null;
  signerEmail: string | null;
  signedAt: Date | null;
  signatureData: string | null;
};

type Contract = {
  id: string;
  contractNumber: string | null;
  title: string;
  status: string;
  notes: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  event: EventData | null;
  client: ClientData | null;
  signatures: Signature[];
};

type UserData = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

async function getAuthContext(
  orgId: string | null,
  userId: string | null,
  orgIdParam: string
): Promise<AuthContext> {
  if (!(orgId && userId)) {
    throw new Error("Unauthorized");
  }
  const tenantId = await getTenantIdForOrg(orgIdParam);
  return { orgId, userId, tenantId };
}

async function fetchContract(contractId: string, tenantId: string) {
  const contract = await database.eventContract.findFirst({
    where: {
      id: contractId,
      tenantId,
      deletedAt: null,
    },
    include: {
      event: {
        include: {
          location: true,
          venue: true,
        },
      },
      client: true,
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
    throw new Error("Contract not found");
  }

  return contract;
}

async function fetchUser(tenantId: string, userId: string) {
  const user = await database.user.findFirst({
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
    throw new Error("User not found");
  }

  return user;
}

function getDefaultTerms(): string[] {
  return [
    "This contract is binding upon signature by both parties.",
    "All payments are due according to the payment schedule outlined in the proposal.",
    "Cancellation policy: 50% refund if cancelled 30+ days before event, 25% refund if cancelled 14-29 days before event, no refund if cancelled less than 14 days before event.",
    "Client agrees to indemnify and hold harmless the catering company from any claims, damages, or losses arising from Client's negligence or intentional misconduct.",
    "The catering company reserves the right to substitute menu items of equal or greater value if necessary.",
    "Final guest count must be confirmed 7 days prior to the event.",
    "Any changes to the event date, time, or location must be approved in writing by both parties.",
  ];
}

function convertToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  for (const byte of uint8Array) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function prepareContractData(contract: Contract) {
  return {
    id: contract.id,
    contractNumber: contract.contractNumber || undefined,
    title: contract.title,
    status: contract.status,
    notes: contract.notes || undefined,
    expiresAt: contract.expiresAt || undefined,
    createdAt: contract.createdAt,
  };
}

function prepareEventData(event: EventData | null) {
  if (!event) {
    return undefined;
  }

  const venueName =
    event.venue?.name ||
    event.location?.name ||
    event.venueName ||
    "Not specified";

  const hasVenueOrLocation = event.venue || event.location;
  const venueAddress = hasVenueOrLocation
    ? {
        addressLine1: event.venue?.addressLine1 || event.location?.addressLine1,
        addressLine2: event.venue?.addressLine2 || event.location?.addressLine2,
        city: event.venue?.city || event.location?.city,
        stateProvince:
          event.venue?.stateProvince || event.location?.stateProvince,
        postalCode: event.venue?.postalCode || event.location?.postalCode,
        countryCode: event.venue?.countryCode || event.location?.countryCode,
      }
    : event.venueAddress || undefined;

  return {
    id: event.id,
    title: event.title,
    eventNumber: event.eventNumber,
    eventDate: event.eventDate,
    eventType: event.eventType,
    guestCount: event.guestCount,
    venueName,
    venueAddress,
  };
}

function prepareClientData(client: ClientData | null) {
  if (!client) {
    return undefined;
  }

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

function prepareSignatureData(signature: Signature) {
  return {
    id: signature.id,
    signerName: signature.signerName,
    signerEmail: signature.signerEmail,
    signedAt: signature.signedAt,
    signatureData: signature.signatureData,
  };
}

function preparePdfData(
  contract: Contract,
  user: UserData,
  defaultTerms: string[]
) {
  return {
    contract: prepareContractData(contract),
    event: prepareEventData(contract.event),
    client: prepareClientData(contract.client),
    signatures: contract.signatures.map(prepareSignatureData),
    terms: defaultTerms,
    metadata: {
      generatedAt: new Date(),
      generatedBy: user.email || `${user.firstName} ${user.lastName}`,
      version: "1.0.0",
    },
  };
}

async function generatePdfBlob(
  pdfComponent: React.ReactElement<DocumentProps>
): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await pdf(pdfComponent);
  return await doc.toBlob();
}

async function generateBase64Pdf(
  pdfComponent: React.ReactElement<DocumentProps>
): Promise<string> {
  const blob = await generatePdfBlob(pdfComponent);
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  return convertToBase64(uint8Array);
}

function generateContractFilename(contractTitle: string): string {
  return `contract-${contractTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`;
}

async function handlePdfDownload(
  pdfComponent: React.ReactElement<DocumentProps>,
  contractTitle: string
): Promise<NextResponse> {
  const blob = await generatePdfBlob(pdfComponent);
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${generateContractFilename(contractTitle)}"`,
    },
  });
}

async function handlePdfBase64(
  pdfComponent: React.ReactElement<DocumentProps>,
  contractTitle: string
): Promise<NextResponse> {
  const base64 = await generateBase64Pdf(pdfComponent);
  return NextResponse.json({
    dataUrl: `data:application/pdf;base64,${base64}`,
    filename: generateContractFilename(contractTitle),
  });
}

function handlePdfError(error: unknown): NextResponse {
  console.error("Failed to generate Contract PDF:", error);

  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "Contract not found") {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    if (error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  return NextResponse.json(
    {
      error: "Failed to generate PDF",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}

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

    const authContext = await getAuthContext(
      orgId ?? null,
      userId ?? null,
      orgId ?? ""
    );

    const contract = await fetchContract(contractId, authContext.tenantId);
    const user = await fetchUser(authContext.tenantId, authContext.userId);
    const defaultTerms = getDefaultTerms();

    const pdfData = preparePdfData(contract, user, defaultTerms);

    // @ts-expect-error - React-PDF renderer needs proper types
    const pdfComponent = <ContractPDF data={pdfData} />;

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";

    if (shouldDownload) {
      return await handlePdfDownload(pdfComponent, contract.title);
    }

    return await handlePdfBase64(pdfComponent, contract.title);
  } catch (error) {
    return handlePdfError(error);
  }
}
