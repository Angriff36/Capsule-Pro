import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database, type PrismaClient } from "@repo/database";
import { wasteInventory } from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface WasteRequestBody {
  inventoryItemId: string;
  quantity: number;
  reasonId: number;
  unitId?: number;
  locationId?: string;
  eventId?: string;
  loggedBy?: string;
  unitCost?: number;
  notes?: string;
}

interface WasteValidationResult {
  success: true;
  wasteReason: { id: number; name: string };
  inventoryItem: {
    id: string;
    name: string;
    unitCost: number | null;
    quantityOnHand: number | null;
    category: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  quantity: number;
  unitCost: number;
  totalCost: number;
  employeeId?: string;
}

interface WasteValidationError {
  success: false;
  error: string;
  status: number;
  response: NextResponse;
}

async function validateWasteRequest(
  tenantId: string,
  body: WasteRequestBody,
  clerkId?: string
): Promise<WasteValidationResult | WasteValidationError> {
  // Get current user for progress tracking
  let employeeId: string | undefined;
  if (clerkId) {
    const user = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });
    employeeId = user?.id;
  }

  // Validate required fields per spec
  if (!(body.inventoryItemId && body.quantity && body.reasonId)) {
    return {
      success: false,
      error: "Missing required fields",
      status: 400,
      response: NextResponse.json(
        {
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
      ),
    };
  }

  // Validate quantity > 0
  const quantity = Number(body.quantity);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return {
      success: false,
      error: "Quantity must be a positive number",
      status: 400,
      response: NextResponse.json(
        { message: "Quantity must be a positive number" },
        { status: 400 }
      ),
    };
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
    return {
      success: false,
      error: "Invalid waste reason",
      status: 400,
      response: NextResponse.json(
        { message: "Invalid waste reason" },
        { status: 400 }
      ),
    };
  }

  // Validate inventory item exists and get current stock levels
  const inventoryItem = await database.inventoryItem.findFirst({
    where: {
      AND: [{ tenantId }, { id: body.inventoryItemId }, { deletedAt: null }],
    },
    select: {
      id: true,
      name: true,
      unitCost: true,
      quantityOnHand: true,
      category: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!inventoryItem) {
    return {
      success: false,
      error: "Inventory item not found",
      status: 404,
      response: NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      ),
    };
  }

  // Get unit cost from inventory item if not provided
  let unitCost = body.unitCost;
  if (!unitCost) {
    unitCost = Number(inventoryItem.unitCost ?? 0);
  }

  // Calculate total cost
  const totalCost = quantity * Number(unitCost);

  return {
    success: true,
    wasteReason: { id: wasteReason.id, name: wasteReason.name },
    inventoryItem: {
      id: inventoryItem.id,
      name: inventoryItem.name,
      unitCost: Number(inventoryItem.unitCost),
      quantityOnHand: Number(inventoryItem.quantityOnHand),
      category: inventoryItem.category,
      createdAt: inventoryItem.createdAt,
      updatedAt: inventoryItem.updatedAt,
    },
    quantity,
    unitCost: Number(unitCost),
    totalCost,
    employeeId,
  };
}

async function executeWasteTransaction(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >,
  tenantId: string,
  body: WasteRequestBody,
  validation: WasteValidationResult
) {
  const {
    wasteReason,
    inventoryItem,
    quantity,
    unitCost,
    totalCost,
    employeeId,
  } = validation;

  // Step 1: Execute Manifest waste command to validate constraints
  const manifestResult = await validateAndExecuteWasteCommand(
    tenantId,
    inventoryItem,
    quantity,
    wasteReason.name,
    employeeId || body.loggedBy || ""
  );

  // Step 2: Create the waste entry record
  const wasteEntry = await tx.wasteEntry.create({
    data: {
      tenantId,
      inventoryItemId: body.inventoryItemId,
      reasonId: wasteReason.id,
      quantity,
      unitId: body.unitId ? Number.parseInt(body.unitId.toString(), 10) : null,
      locationId: body.locationId,
      eventId: body.eventId,
      loggedBy: (body.loggedBy || employeeId) ?? "",
      unitCost,
      totalCost,
      notes: body.notes,
    },
  });

  // Step 3: Decrement inventory stock levels
  const { newQuantityOnHand } = await updateInventoryStockLevels(
    tx,
    tenantId,
    inventoryItem.id,
    Number(inventoryItem.quantityOnHand ?? 0),
    quantity
  );

  // Step 4: Create inventory transaction record
  await createInventoryTransactionRecord(
    tx,
    tenantId,
    inventoryItem.id,
    wasteEntry.id,
    quantity,
    Number(inventoryItem.quantityOnHand ?? 0),
    newQuantityOnHand,
    unitCost,
    totalCost,
    wasteReason,
    body,
    employeeId
  );

  // Step 5: Emit outbox events
  await emitWasteOutboxEvents(
    tx,
    tenantId,
    wasteEntry.id,
    inventoryItem.id,
    inventoryItem.name,
    quantity,
    wasteReason.name,
    totalCost,
    manifestResult.emittedEvents
  );

  return {
    wasteEntry,
    newQuantityOnHand,
    manifestResult,
  };
}

async function validateAndExecuteWasteCommand(
  tenantId: string,
  inventoryItem: WasteValidationResult["inventoryItem"],
  quantity: number,
  reason: string,
  userId: string
) {
  const { createInventoryRuntime } = await import("@repo/manifest-adapters");

  const runtime = await createInventoryRuntime({
    tenantId,
    userId,
    userRole: undefined,
    storeProvider: undefined,
  });

  await runtime.createInstance("InventoryItem", {
    id: inventoryItem.id,
    tenantId,
    name: inventoryItem.name,
    itemType: "ingredient",
    category: inventoryItem.category || "",
    baseUnit: "each",
    quantityOnHand: Number(inventoryItem.quantityOnHand ?? 0),
    quantityReserved: 0,
    parLevel: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
    costPerUnit: Number(inventoryItem.unitCost ?? 0),
    supplierId: "",
    locationId: "",
    allergens: "",
    isActive: true,
    lastCountedAt: 0,
    createdAt: inventoryItem.createdAt.getTime(),
    updatedAt: inventoryItem.updatedAt.getTime(),
  });

  const manifestResult = await wasteInventory(
    runtime,
    inventoryItem.id,
    quantity,
    reason,
    "",
    userId
  );

  const blockingConstraints = manifestResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block"
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    throw new Error(
      `Cannot record waste due to constraint violations: ${blockingConstraints.map((c) => c.message).join(", ")}`
    );
  }

  return manifestResult;
}

async function updateInventoryStockLevels(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >,
  tenantId: string,
  inventoryItemId: string,
  currentQuantityOnHand: number,
  quantity: number
) {
  const newQuantityOnHand = currentQuantityOnHand - quantity;

  await tx.inventoryItem.update({
    where: {
      tenantId_id: { tenantId, id: inventoryItemId },
    },
    data: {
      quantityOnHand: newQuantityOnHand,
      updatedAt: new Date(),
    },
  });

  return { newQuantityOnHand };
}

async function createInventoryTransactionRecord(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >,
  tenantId: string,
  inventoryItemId: string,
  wasteEntryId: string,
  quantity: number,
  _quantityBefore: number,
  _quantityAfter: number,
  unitCost: number,
  totalCost: number,
  wasteReason: { id: number; name: string },
  body: WasteRequestBody,
  employeeId?: string
) {
  await tx.inventoryTransaction.create({
    data: {
      tenantId,
      itemId: inventoryItemId,
      transactionType: "waste",
      quantity: -quantity,
      unit_cost: unitCost,
      total_cost: -totalCost,
      reason: `Waste: ${wasteReason.name}`,
      referenceType: "WasteEntry",
      referenceId: wasteEntryId,
      transaction_date: new Date(),
      employee_id: employeeId || body.loggedBy || null,
      notes: body.notes ?? "",
    },
  });
}

async function emitWasteOutboxEvents(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
  >,
  tenantId: string,
  wasteEntryId: string,
  inventoryItemId: string,
  inventoryItemName: string,
  quantity: number,
  reason: string,
  totalCost: number,
  emittedEvents?: unknown[]
) {
  await tx.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "WasteEntry",
      aggregateId: wasteEntryId,
      eventType: "kitchen.waste.entry.created",
      payload: {
        wasteEntryId,
        inventoryItemId,
        inventoryItemName,
        quantity,
        reason,
        totalCost,
      } as Prisma.InputJsonValue,
      status: "pending",
    },
  });

  if (emittedEvents && emittedEvents.length > 0) {
    for (const event of emittedEvents as Array<{
      name: string;
      payload: unknown;
    }>) {
      const payload =
        typeof event.payload === "object" && event.payload !== null
          ? {
              ...(event.payload as Record<string, unknown>),
              wasteEntryId,
              transactionId: wasteEntryId,
            }
          : { wasteEntryId, transactionId: wasteEntryId };

      await tx.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: "InventoryItem",
          aggregateId: inventoryItemId,
          eventType: event.name,
          payload: payload as Prisma.InputJsonValue,
          status: "pending",
        },
      });
    }
  }
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
      inventoryItem: {
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
 * Create a new waste entry
 *
 * This endpoint integrates with the Manifest waste command to:
 * 1. Create the waste entry record (existing behavior)
 * 2. Execute Manifest waste command to validate constraints and emit events
 * 3. Decrement inventory stock levels
 * 4. Create inventory transaction record
 * 5. Emit outbox events for real-time updates
 *
 * All operations are performed within a single Prisma transaction for atomicity.
 */
export async function POST(request: Request) {
  const { orgId, userId: clerkId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = (await request.json()) as WasteRequestBody;

  // Validate request
  const validation = await validateWasteRequest(tenantId, body, clerkId);

  if (!validation.success) {
    return validation.response;
  }

  try {
    // Execute all operations within a single transaction for atomicity
    // biome-ignore lint/suspicious/useAwait: Prisma $transaction requires inner async function, the await is on the wrapper
    const result = await database.$transaction(async (tx) => {
      return executeWasteTransaction(tx, tenantId, body, validation);
    });

    return NextResponse.json(
      {
        entry: result.wasteEntry,
        inventory: {
          itemId: validation.inventoryItem.id,
          itemName: validation.inventoryItem.name,
          quantityOnHand: result.newQuantityOnHand,
        },
        constraintOutcomes: result.manifestResult.constraintOutcomes,
        emittedEvents: result.manifestResult.emittedEvents,
      },
      { status: 201 }
    );
  } catch (error) {
    Sentry.captureException(error);

    // Check if this is a constraint violation
    if (
      error instanceof Error &&
      error.message.includes("constraint violations")
    ) {
      return NextResponse.json(
        {
          message: "Cannot record waste due to constraint violations",
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Failed to create waste entry",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
