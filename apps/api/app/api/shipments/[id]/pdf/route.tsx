/**
 * @module ShipmentPDF
 * @intent Generate packing list PDF for shipments
 * @responsibility Generate packing list PDF for a single shipment
 * @domain Warehouse
 * @tags shipments, pdf, packing-list
 * @canonical true
 */

import type { DocumentProps } from "@react-pdf/renderer";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { PackingListPDF } from "@repo/pdf";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

type RouteParams = Promise<{
  id: string;
}>;

// Helper function to fetch shipment data with full relations
async function fetchShipmentData(tenantId: string, shipmentId: string) {
  const shipment = await database.shipment.findFirst({
    where: {
      tenantId,
      id: shipmentId,
      deletedAt: null,
    },
    include: {
      items: {
        where: { deletedAt: null },
        include: {
          item: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
          venueName: true,
          venueAddress: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
          contact_person: true,
          email: true,
          phone: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          stateProvince: true,
          postalCode: true,
        },
      },
    },
  });

  return shipment;
}

type ShipmentData = {
  id: string;
  shipmentNumber: string;
  status: string;
  scheduledDate: Date | null;
  shippedDate: Date | null;
  estimatedDeliveryDate: Date | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippingMethod: string | null;
  shippingCost: number | null;
  notes: string | null;
  items: Array<{
    id: string;
    quantityShipped: bigint | number;
    quantityReceived: bigint | number | null;
    totalCost: bigint | number;
    unitId: string | null;
    unitCost: number | null;
    condition: string | null;
    conditionNotes: string | null;
    lotNumber: string | null;
    expirationDate: Date | null;
    item: {
      name: string;
      item_number: string | null;
    } | null;
  }>;
  event: {
    title: string;
    venueName: string | null;
    venueAddress: string | null;
  } | null;
  supplier: {
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  location: {
    name: string;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
  } | null;
};

function buildLocationAddress(
  parts: Array<string | null>,
  separator: string
): string | undefined {
  const filteredParts = parts.filter(Boolean);
  return filteredParts.length > 0 ? filteredParts.join(separator) : undefined;
}

function buildFromAddress(shipment: ShipmentData): string | undefined {
  if (shipment.supplier) {
    return buildLocationAddress(
      [
        shipment.supplier.contact_person,
        shipment.supplier.email,
        shipment.supplier.phone,
      ],
      " | "
    );
  }
  if (shipment.location) {
    return buildLocationAddress(
      [
        shipment.location.addressLine1,
        shipment.location.addressLine2,
        shipment.location.city,
        shipment.location.stateProvince,
        shipment.location.postalCode,
      ],
      ", "
    );
  }
  return undefined;
}

function buildToAddress(shipment: ShipmentData): string | undefined {
  if (shipment.event) {
    return shipment.event.venueAddress || undefined;
  }
  if (shipment.location) {
    return buildLocationAddress(
      [
        shipment.location.addressLine1,
        shipment.location.addressLine2,
        shipment.location.city,
        shipment.location.stateProvince,
        shipment.location.postalCode,
      ],
      ", "
    );
  }
  return undefined;
}

function calculateTotalValue(shipment: ShipmentData): number {
  const itemsTotal = shipment.items.reduce(
    (sum: number, item) => sum + Number(item.totalCost || 0),
    0
  );
  return itemsTotal + Number(shipment.shippingCost || 0);
}

async function getGeneratedBy(
  tenantId: string,
  userId: string | null
): Promise<string> {
  if (!userId) {
    return "Unknown User";
  }

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

  return user ? user.email || `${user.firstName} ${user.lastName}` : userId;
}

function buildFromLocation(
  shipment: ShipmentData,
  fromAddress: string | undefined
) {
  if (shipment.supplier) {
    return {
      name: shipment.supplier.name,
      address: fromAddress,
    };
  }
  if (shipment.location) {
    return {
      name: shipment.location.name,
      address: fromAddress,
    };
  }
  return undefined;
}

function buildToLocation(
  shipment: ShipmentData,
  toAddress: string | undefined
) {
  if (shipment.event) {
    return {
      name: shipment.event.venueName || shipment.event.title,
      address: toAddress,
    };
  }
  if (shipment.location) {
    return {
      name: shipment.location.name,
      address: toAddress,
    };
  }
  return undefined;
}

function buildPdfData(shipment: ShipmentData, generatedBy: string) {
  const fromAddress = buildFromAddress(shipment);
  const toAddress = buildToAddress(shipment);
  const totalValue = calculateTotalValue(shipment);

  return {
    shipment: {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status,
      scheduledDate: shipment.scheduledDate || new Date(),
      shippedDate: shipment.shippedDate || undefined,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate || undefined,
      carrier: shipment.carrier || undefined,
      trackingNumber: shipment.trackingNumber || undefined,
      shippingMethod: shipment.shippingMethod || undefined,
      notes: shipment.notes || undefined,
    },
    fromLocation: buildFromLocation(shipment, fromAddress),
    toLocation: buildToLocation(shipment, toAddress),
    items: shipment.items.map((item) => ({
      id: item.id,
      itemName: item.item?.name || "Unknown Item",
      itemNumber: item.item?.item_number || undefined,
      quantityShipped: Number(item.quantityShipped),
      quantityReceived: item.quantityReceived
        ? Number(item.quantityReceived)
        : undefined,
      unit: item.unitId || undefined,
      unitCost: item.unitCost || undefined,
      totalCost: Number(item.totalCost),
      condition: item.condition || undefined,
      lotNumber: item.lotNumber || undefined,
      expirationDate: item.expirationDate || undefined,
      notes: item.conditionNotes || undefined,
    })),
    summary: {
      totalItems: shipment.items.length,
      totalValue,
      weightTotal: undefined,
    },
    metadata: {
      generatedAt: new Date(),
      generatedBy,
      version: "1.0.0",
    },
  };
}

function sanitizeShipmentNumber(shipmentNumber: string): string {
  return shipmentNumber.replace(/[^a-z0-9]+/gi, "-");
}

async function convertToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  for (const byte of uint8Array) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function generatePdfBlob(
  pdfComponent: React.ReactElement<DocumentProps>
): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  const doc = await pdf(pdfComponent);
  return doc.toBlob();
}

async function respondWithDownload(
  pdfComponent: React.ReactElement<DocumentProps>,
  shipmentNumber: string
): Promise<NextResponse> {
  const blob = await generatePdfBlob(pdfComponent);
  const sanitizedNumber = sanitizeShipmentNumber(shipmentNumber);

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="packing-list-${sanitizedNumber}.pdf"`,
    },
  });
}

async function respondWithBase64(
  pdfComponent: React.ReactElement<DocumentProps>,
  shipmentNumber: string
): Promise<NextResponse> {
  const blob = await generatePdfBlob(pdfComponent);
  const base64 = await convertToBase64(blob);
  const sanitizedNumber = sanitizeShipmentNumber(shipmentNumber);

  return NextResponse.json({
    dataUrl: `data:application/pdf;base64,${base64}`,
    filename: `packing-list-${sanitizedNumber}.pdf`,
  });
}

async function validateRequestAndGetTenantId(
  orgId: string | null | undefined,
  userId: string | null
): Promise<{ tenantId: string } | NextResponse> {
  if (!(orgId && userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return { tenantId };
}

/**
 * GET /api/shipments/[id]/pdf
 *
 * Generate a packing list PDF for a shipment.
 *
 * Query parameters:
 * - download: boolean - If true, returns as downloadable file; otherwise as base64
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { id } = await params;
    const { orgId, userId } = await auth();

    const validationResult = await validateRequestAndGetTenantId(orgId, userId);
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }
    const { tenantId } = validationResult;

    const shipment = (await fetchShipmentData(
      tenantId,
      id
    )) as unknown as ShipmentData;

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    const generatedBy = await getGeneratedBy(tenantId, userId);
    const pdfData = buildPdfData(shipment, generatedBy);
    const pdfComponent = (
      <PackingListPDF data={pdfData} />
    ) as React.ReactElement<DocumentProps>;

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";

    if (shouldDownload) {
      return respondWithDownload(pdfComponent, shipment.shipmentNumber);
    }

    return respondWithBase64(pdfComponent, shipment.shipmentNumber);
  } catch (error) {
    console.error("Failed to generate Packing List PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
