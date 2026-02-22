/**
 * Generate Shipment from Event
 *
 * POST /api/events/[eventId]/shipments/generate
 *
 * Generates a shipment with packing list from an event's prep lists.
 * Maps prep list ingredients to inventory items and validates stock availability.
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface InventoryRequirement {
  inventoryItemId: string;
  inventoryItemName: string;
  itemNumber: string;
  unitOfMeasure: string;
  unitCost: number;
  quantityOnHand: number;
  requiredQuantity: number;
  hasStock: boolean;
}

interface GenerateShipmentRequest {
  locationId?: string;
  scheduledDate?: string;
  notes?: string;
  validateStock?: boolean;
}

interface GenerateShipmentResponse {
  shipment: {
    id: string;
    shipmentNumber: string;
    status: string;
  };
  items: Array<{
    id: string;
    itemName: string;
    quantityShipped: number;
    unitOfMeasure: string;
    hasStock: boolean;
  }>;
  warnings: string[];
  stockIssues: Array<{
    itemName: string;
    required: number;
    available: number;
  }>;
}

/**
 * Fetches prep list items for an event and aggregates inventory requirements
 */
async function getEventInventoryRequirements(
  tenantId: string,
  eventId: string
): Promise<InventoryRequirement[]> {
  // Query prep list items and match to inventory items by ingredient name
  const prepItems = await database.$queryRaw<
    {
      ingredient_name: string;
      total_quantity: number;
      unit: string;
    }[]
  >(
    Prisma.sql`
      SELECT
        pli.ingredient_name,
        SUM(pli.scaled_quantity) as total_quantity,
        pli.scaled_unit as unit
      FROM tenant_kitchen.prep_list_items pli
      JOIN tenant_kitchen.prep_lists pl ON pl.id = pli.prep_list_id AND pl.tenant_id = pli.tenant_id
      WHERE pli.tenant_id = ${tenantId}
        AND pl.event_id = ${eventId}
        AND pli.deleted_at IS NULL
        AND pl.deleted_at IS NULL
      GROUP BY pli.ingredient_name, pli.scaled_unit
      ORDER BY pli.ingredient_name
    `
  );

  if (prepItems.length === 0) {
    return [];
  }

  // Get ingredient names to match with inventory
  const ingredientNames = prepItems.map((item) => item.ingredient_name);

  // Find matching inventory items
  const inventoryItems = await database.inventoryItem.findMany({
    where: {
      tenantId,
      name: { in: ingredientNames },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      item_number: true,
      unitOfMeasure: true,
      unitCost: true,
      quantityOnHand: true,
    },
  });

  // Create a map for quick lookup
  const inventoryMap = new Map(inventoryItems.map((item) => [item.name, item]));

  // Build requirements with inventory matching
  const requirements: InventoryRequirement[] = [];
  for (const item of prepItems) {
    const inventoryItem = inventoryMap.get(item.ingredient_name);
    if (inventoryItem) {
      const requiredQty = Number(item.total_quantity);
      const onHand = Number(inventoryItem.quantityOnHand);
      requirements.push({
        inventoryItemId: inventoryItem.id,
        inventoryItemName: inventoryItem.name,
        itemNumber: inventoryItem.item_number,
        unitOfMeasure: inventoryItem.unitOfMeasure,
        unitCost: Number(inventoryItem.unitCost),
        quantityOnHand: onHand,
        requiredQuantity: requiredQty,
        hasStock: onHand >= requiredQty,
      });
    }
  }

  return requirements;
}

/**
 * Generates a unique shipment number
 */
async function generateShipmentNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SHP-${year}-`;

  const lastShipment = await database.shipment.findFirst({
    where: {
      tenantId,
      shipmentNumber: { startsWith: prefix },
    },
    orderBy: { shipmentNumber: "desc" },
    select: { shipmentNumber: true },
  });

  let nextNumber = 1;
  if (lastShipment) {
    const lastNumber = Number.parseInt(
      lastShipment.shipmentNumber.replace(prefix, ""),
      10
    );
    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { eventId } = await params;

    // Verify event exists
    const event = await database.event.findFirst({
      where: { tenantId, id: eventId, deletedAt: null },
      select: { id: true, title: true, eventDate: true, locationId: true },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Parse request body
    const body: GenerateShipmentRequest = await request
      .json()
      .catch(() => ({}));
    const { locationId, scheduledDate, notes, validateStock = true } = body;

    // Get inventory requirements from prep lists
    const requirements = await getEventInventoryRequirements(tenantId, eventId);

    if (requirements.length === 0) {
      return NextResponse.json(
        {
          message:
            "No inventory requirements found for this event. Ensure prep lists are generated.",
        },
        { status: 400 }
      );
    }

    // Check for stock issues
    const stockIssues = requirements
      .filter((req) => !req.hasStock)
      .map((req) => ({
        itemName: req.inventoryItemName,
        required: req.requiredQuantity,
        available: req.quantityOnHand,
      }));

    // If validation is enabled and there are stock issues, return error
    if (validateStock && stockIssues.length > 0) {
      return NextResponse.json(
        {
          message: "Insufficient stock for some items",
          stockIssues,
        },
        { status: 400 }
      );
    }

    // Generate shipment number
    const shipmentNumber = await generateShipmentNumber(tenantId);

    // Determine location (use provided location or event's location)
    const shipToLocationId = locationId || event.locationId;

    // Create shipment with items
    const shipment = await database.shipment.create({
      data: {
        tenantId,
        shipmentNumber,
        status: "draft",
        eventId: event.id,
        locationId: shipToLocationId,
        scheduledDate: scheduledDate
          ? new Date(scheduledDate)
          : event.eventDate,
        notes: notes || `Packing list generated from event: ${event.title}`,
        totalItems: requirements.length,
        totalValue: requirements.reduce(
          (sum, req) => sum + req.requiredQuantity * req.unitCost,
          0
        ),
      },
    });

    // Create shipment items
    const _shipmentItems = await database.shipmentItem.createMany({
      data: requirements.map((req) => ({
        tenantId,
        shipmentId: shipment.id,
        itemId: req.inventoryItemId,
        quantityShipped: req.requiredQuantity,
        quantityReceived: 0,
        quantityDamaged: 0,
        unitCost: req.unitCost,
        totalCost: req.requiredQuantity * req.unitCost,
        condition: "good",
      })),
    });

    // Build warnings
    const warnings: string[] = [];
    if (stockIssues.length > 0) {
      warnings.push(
        `${stockIssues.length} item(s) have insufficient stock. Shipment created in draft status.`
      );
    }

    const unmatchedCount = requirements.filter(
      (r) => !r.inventoryItemId
    ).length;
    if (unmatchedCount > 0) {
      warnings.push(
        `${unmatchedCount} ingredient(s) could not be matched to inventory items.`
      );
    }

    const response: GenerateShipmentResponse = {
      shipment: {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        status: shipment.status,
      },
      items: requirements.map((req) => ({
        id: req.inventoryItemId,
        itemName: req.inventoryItemName,
        quantityShipped: req.requiredQuantity,
        unitOfMeasure: req.unitOfMeasure,
        hasStock: req.hasStock,
      })),
      warnings,
      stockIssues: validateStock ? [] : stockIssues,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to generate shipment from event:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[eventId]/shipments/generate/preview
 *
 * Preview what items would be included in a generated shipment
 * without actually creating it.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { eventId } = await params;

    // Verify event exists
    const event = await database.event.findFirst({
      where: { tenantId, id: eventId, deletedAt: null },
      select: { id: true, title: true },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Get inventory requirements from prep lists
    const requirements = await getEventInventoryRequirements(tenantId, eventId);

    // Check for existing shipments for this event
    const existingShipments = await database.shipment.count({
      where: {
        tenantId,
        eventId: event.id,
        deletedAt: null,
      },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.title,
      },
      requirements: requirements.map((req) => ({
        inventoryItemId: req.inventoryItemId,
        itemName: req.inventoryItemName,
        itemNumber: req.itemNumber,
        unitOfMeasure: req.unitOfMeasure,
        unitCost: req.unitCost,
        requiredQuantity: req.requiredQuantity,
        quantityOnHand: req.quantityOnHand,
        hasStock: req.hasStock,
      })),
      summary: {
        totalItems: requirements.length,
        itemsWithStock: requirements.filter((r) => r.hasStock).length,
        itemsWithoutStock: requirements.filter((r) => !r.hasStock).length,
        estimatedValue: requirements.reduce(
          (sum, req) => sum + req.requiredQuantity * req.unitCost,
          0
        ),
      },
      existingShipments,
    });
  } catch (error) {
    console.error("Failed to preview shipment generation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
