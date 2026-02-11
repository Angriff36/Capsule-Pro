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

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch shipment data
    const shipment = (await fetchShipmentData(tenantId, id)) as unknown as {
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

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // Build the from address - using supplier or location
    let fromAddress: string | undefined;
    if (shipment.supplier) {
      const parts = [
        shipment.supplier.contact_person,
        shipment.supplier.email,
        shipment.supplier.phone,
      ].filter(Boolean);
      fromAddress = parts.join(" | ");
    } else if (shipment.location) {
      const parts = [
        shipment.location.addressLine1,
        shipment.location.addressLine2,
        shipment.location.city,
        shipment.location.stateProvince,
        shipment.location.postalCode,
      ].filter(Boolean);
      fromAddress = parts.join(", ");
    }

    // Build the to address - using event venue or location
    let toAddress: string | undefined;
    if (shipment.event) {
      toAddress = shipment.event.venueAddress || undefined;
    } else if (shipment.location) {
      const parts = [
        shipment.location.addressLine1,
        shipment.location.addressLine2,
        shipment.location.city,
        shipment.location.stateProvince,
        shipment.location.postalCode,
      ].filter(Boolean);
      toAddress = parts.join(", ");
    }

    // Calculate total value
    const totalValue =
      shipment.items.reduce(
        (sum: number, item) => sum + Number(item.totalCost || 0),
        0
      ) + Number(shipment.shippingCost || 0);

    // Fetch user info for metadata
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

    const generatedBy = user
      ? user.email || `${user.firstName} ${user.lastName}`
      : userId;

    // Create PDF data
    const pdfData = {
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
      fromLocation: shipment.supplier
        ? {
            name: shipment.supplier.name,
            address: fromAddress,
          }
        : shipment.location
          ? {
              name: shipment.location.name,
              address: fromAddress,
            }
          : undefined,
      toLocation: shipment.event
        ? {
            name: shipment.event.venueName || shipment.event.title,
            address: toAddress,
          }
        : shipment.location
          ? {
              name: shipment.location.name,
              address: toAddress,
            }
          : undefined,
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

    // Create PDF component
    const pdfComponent = (
      <PackingListPDF data={pdfData} />
    ) as React.ReactElement<DocumentProps>;

    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "true";

    if (shouldDownload) {
      // Return as downloadable file
      const { pdf } = await import("@react-pdf/renderer");
      const doc = await pdf(pdfComponent);
      const blob = await doc.toBlob();

      const sanitizedNumber = shipment.shipmentNumber.replace(
        /[^a-z0-9]+/gi,
        "-"
      );

      return new NextResponse(blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="packing-list-${sanitizedNumber}.pdf"`,
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
    for (const byte of uint8Array) {
      binary += String.fromCharCode(byte);
    }
    const base64 = btoa(binary);

    const sanitizedNumber = shipment.shipmentNumber.replace(
      /[^a-z0-9]+/gi,
      "-"
    );

    return NextResponse.json({
      dataUrl: `data:application/pdf;base64,${base64}`,
      filename: `packing-list-${sanitizedNumber}.pdf`,
    });
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
