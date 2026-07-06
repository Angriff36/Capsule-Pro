import type { DocumentProps } from "@react-pdf/renderer";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { ContractPDF, type ContractPDFData } from "@repo/pdf";
import { type NextRequest, NextResponse } from "next/server";
import type React from "react";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  id: string;
}>;

interface AuthContext {
  orgId: string;
  tenantId: string;
  userId: string;
}

interface Venue {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  countryCode: string | null;
  name: string | null;
  postalCode: string | null;
  stateProvince: string | null;
}

interface FacilityLocation {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  country: string | null;
  name: string | null;
  postalCode: string | null;
  state: string | null;
}

interface EventData {
  eventDate: Date | null;
  eventNumber: string | null;
  eventType: string | null;
  guestCount: number | null;
  id: string;
  location: FacilityLocation | null;
  title: string;
  venue: Venue | null;
  venueAddress: string | null;
  venueName: string | null;
}

interface ClientData {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  companyName: string | null;
  countryCode: string | null;
  email: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  phone: string | null;
  postalCode: string | null;
  stateProvince: string | null;
}

interface Signature {
  id: string;
  signatureData: string | null;
  signedAt: Date | null;
  signerEmail: string | null;
  signerName: string | null;
}

interface Contract {
  client: ClientData | null;
  contractNumber: string | null;
  contractSignatures: Signature[];
  createdAt: Date;
  event: EventData | null;
  expiresAt: Date | null;
  id: string;
  notes: string | null;
  status: string;
  title: string;
}

interface UserData {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

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
      contractSignatures: {
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

// The template consumes ContractPDFData (flat strings). Passing structured
// address objects here crashes @react-pdf when it tries to render them as
// text children, so everything is flattened to strings before rendering.

function formatAddress(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(", ");
}

function prepareContractData(contract: Contract): ContractPDFData["contract"] {
  return {
    id: contract.id,
    title: contract.title,
    status: contract.status,
    notes: contract.notes || undefined,
    expiresAt: contract.expiresAt || undefined,
    createdAt: contract.createdAt,
  };
}

function prepareEventData(
  event: EventData | null,
  fallbackDate: Date
): ContractPDFData["event"] {
  if (!event) {
    return { id: "", name: "Not specified", date: fallbackDate };
  }

  const venueName =
    event.venue?.name || event.location?.name || event.venueName || "";
  const venueAddress =
    formatAddress([
      event.venue?.addressLine1 ?? event.location?.addressLine1,
      event.venue?.addressLine2 ?? event.location?.addressLine2,
      event.venue?.city ?? event.location?.city,
      event.venue?.stateProvince ?? event.location?.state,
      event.venue?.postalCode ?? event.location?.postalCode,
    ]) ||
    event.venueAddress ||
    "";
  const venue = [venueName, venueAddress].filter(Boolean).join(" — ");

  return {
    id: event.id,
    name: event.title,
    date: event.eventDate ?? fallbackDate,
    venue: venue || undefined,
  };
}

function prepareClientData(
  client: ClientData | null
): ContractPDFData["client"] {
  if (!client) {
    return;
  }

  const personName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ");

  return {
    name: client.companyName || personName || "Client",
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    address:
      formatAddress([
        client.addressLine1,
        client.addressLine2,
        client.city,
        client.stateProvince,
        client.postalCode,
      ]) || undefined,
  };
}

function preparePdfData(
  contract: Contract,
  user: UserData,
  defaultTerms: string[]
): ContractPDFData {
  return {
    contract: prepareContractData(contract),
    event: prepareEventData(contract.event, contract.createdAt),
    client: prepareClientData(contract.client),
    // The template renders "Signed: <date>" per row — only signed rows belong.
    signatures: contract.contractSignatures
      .filter((signature) => signature.signedAt !== null)
      .map((signature) => ({
        id: signature.id,
        signerName: signature.signerName ?? "Unknown signer",
        signerEmail: signature.signerEmail ?? "",
        signedAt: signature.signedAt as Date,
      })),
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
  log.error("Failed to generate Contract PDF:", error);

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

    const pdfComponent = (
      <ContractPDF data={pdfData} />
    ) as React.ReactElement<DocumentProps>;

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
