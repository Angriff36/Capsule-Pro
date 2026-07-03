import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface WasteRequestBody {
  eventId?: string;
  inventoryItemId: string;
  locationId?: string;
  loggedBy?: string;
  notes?: string;
  quantity: number;
  reasonId: number;
  unitCost?: number;
  unitId?: number;
}

/**
 * Pre-validate referential integrity before handing off to Manifest runtime.
 * The runtime enforces structural guards (required fields, positive numbers),
 * but DB-level existence checks for inventory item and waste reason happen here.
 */
async function validateWasteRequest(
  tenantId: string,
  body: WasteRequestBody
): Promise<NextResponse | null> {
  // Validate required fields
  if (!(body.inventoryItemId && body.quantity && body.reasonId)) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing required fields",
        errors: {
          ...(body.inventoryItemId
            ? {}
            : { inventoryItemId: "Item is required" }),
          ...(body.quantity ? {} : { quantity: "Quantity is required" }),
          ...(body.reasonId ? {} : { reasonId: "Reason is required" }),
        },
      },
      { status: 400 }
    );
  }

  // Validate quantity > 0
  const quantity = Number(body.quantity);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return NextResponse.json(
      { success: false, message: "Quantity must be a positive number" },
      { status: 400 }
    );
  }

  // Validate reason exists and is active
  const wasteReason = await database.wasteReason.findFirst({
    where: {
      AND: [
        { id: Number.parseInt(body.reasonId.toString(), 10) },
        { isActive: true },
      ],
    },
  });

  if (!wasteReason) {
    return NextResponse.json(
      { success: false, message: "Invalid waste reason" },
      { status: 400 }
    );
  }

  // Validate inventory item exists
  const inventoryItem = await database.inventoryItem.findFirst({
    where: {
      AND: [{ tenantId }, { id: body.inventoryItemId }, { deletedAt: null }],
    },
    select: { id: true },
  });

  if (!inventoryItem) {
    return NextResponse.json(
      { success: false, message: "Inventory item not found" },
      { status: 404 }
    );
  }

  return null; // validation passed
}

/**
 * GET /api/kitchen/waste/entries
 * List waste entries with optional filters
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  // Optional filters
  const reasonId = searchParams.get("reasonId");
  const locationId = searchParams.get("locationId");
  const eventId = searchParams.get("eventId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

  const entries = await database.wasteEntry.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        ...(reasonId ? [{ reasonId: Number.parseInt(reasonId, 10) }] : []),
        ...(locationId ? [{ locationId }] : []),
        ...(eventId ? [{ eventId }] : []),
        ...(startDate ? [{ loggedAt: { gte: new Date(startDate) } }] : []),
        ...(endDate ? [{ loggedAt: { lte: new Date(endDate) } }] : []),
      ],
    },
    include: {
      // Include related data
      item: {
        select: {
          id: true,
          name: true,
          item_number: true,
        },
      },
    },
    orderBy: { loggedAt: "desc" },
    take: limit,
    skip: offset,
  });

  // Get waste reasons for UI
  const wasteReasons = await database.wasteReason.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    entries,
    wasteReasons,
    pagination: {
      limit,
      offset,
      total: entries.length,
    },
  });
}

/**
 * POST /api/kitchen/waste/entries
 * Create a new waste entry via Manifest runtime.
 *
 * The runtime handles:
 * 1. Structural guards (required fields, positive numbers)
 * 2. WasteEntry record creation
 * 3. Outbox event emission (WasteEntryCreated)
 * 4. Reaction: InventoryItem.waste (stock decrement) via reactions.manifest
 *
 * Pre-validation (referential integrity) runs before the command to give
 * clear 400/404 errors for missing inventory items or inactive reasons.
 */
export async function POST(request: Request) {
  try {
    const user = await resolveCurrentUser(request);
    const body = (await request.json()) as WasteRequestBody;

    // Pre-validate referential integrity
    const validationError = await validateWasteRequest(user.tenantId, body);
    if (validationError) {
      return validationError;
    }

    // Resolve unitCost from inventory item if not provided
    let unitCost = body.unitCost;
    if (!unitCost) {
      const item = await database.inventoryItem.findFirst({
        where: {
          AND: [
            { tenantId: user.tenantId },
            { id: body.inventoryItemId },
            { deletedAt: null },
          ],
        },
        select: { unitCost: true },
      });
      unitCost = Number(item?.unitCost ?? 0);
    }

    return runManifestCommand({
      entity: "WasteEntry",
      command: "create",
      body: {
        inventoryItemId: body.inventoryItemId,
        reasonId: body.reasonId,
        quantity: Number(body.quantity),
        unitId: body.unitId ?? 0,
        locationId: body.locationId ?? "",
        eventId: body.eventId ?? "",
        loggedBy: body.loggedBy ?? user.id,
        unitCost: Number(unitCost),
        notes: body.notes ?? "",
        tenantId: user.tenantId,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create waste entry",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
