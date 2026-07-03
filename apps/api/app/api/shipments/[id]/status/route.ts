/**
 * Shipment Status API Endpoint
 *
 * POST   /api/shipments/[id]/status  - Update shipment status via Manifest runtime
 *
 * Maps status transitions to Manifest commands:
 *   scheduled    -> startPreparing
 *   preparing    -> ship
 *   in_transit   -> markDelivered
 *   draft        -> schedule (if transitioning to scheduled)
 *   cancelled    -> cancel
 *
 * Inventory side effects (reservation on prepare, receipt on deliver, reversal
 * on cancel) are governed via Manifest runtime — InventoryTransaction.create and
 * InventoryItem.adjust commands.
 */

import { auth } from "@repo/auth/server";
import type { Shipment } from "@repo/database";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";
import { runManifestCommand } from "@/lib/manifest/execute-command";

/**
 * Transaction types for inventory transactions
 * When a shipment is delivered, items are added to stock via "purchase" transaction
 * When a shipment is being prepared for delivery, items are reserved via "transfer" transaction
 */
const TRANSACTION_TYPE_PURCHASE = "purchase";
const TRANSACTION_TYPE_TRANSFER = "transfer";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["preparing", "cancelled"],
  preparing: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

/** Maps a target status to the Manifest command name. */
const STATUS_TO_COMMAND: Record<string, string> = {
  scheduled: "schedule",
  preparing: "startPreparing",
  in_transit: "ship",
  delivered: "markDelivered",
  cancelled: "cancel",
};

interface ShipmentStatusRequestBody {
  actual_delivery_date?: string | null;
  delivered_by?: string | null;
  received_by?: string | null;
  shipped_date?: string | null;
  signature?: string | null;
  status: string;
}

interface ShipmentItem {
  expiration_date: Date | null;
  id: string;
  item_id: string;
  lot_number: string | null;
  quantity_damaged: number;
  quantity_received: number;
  quantity_shipped: number;
  unit_cost: number;
}

// ========== Helper Functions ==========

/**
 * Validates that the requested status transition is allowed
 */
function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): void {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new InvariantError(
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }
}

/**
 * Validates delivery confirmation requirements
 */
function validateDeliveryConfirmation(
  status: string,
  body: ShipmentStatusRequestBody
): void {
  if (status === "delivered") {
    if (!body.actual_delivery_date) {
      throw new InvariantError(
        "actual_delivery_date is required when marking as delivered"
      );
    }
    if (!body.delivered_by) {
      throw new InvariantError(
        "delivered_by is required when marking as delivered"
      );
    }
  }
}

/**
 * Authenticates the request and retrieves tenant ID
 */
async function authenticateAndGetTenant(
  orgId: string | undefined
): Promise<{ tenantId: string } | NextResponse> {
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
  }

  return { tenantId };
}

/**
 * Fetches an existing shipment by ID (read — bypasses Manifest per §10)
 */
async function fetchExistingShipment(
  tenantId: string,
  shipmentId: string
): Promise<Shipment | NextResponse> {
  const existing = await database.shipment.findFirst({
    where: { tenantId, id: shipmentId, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Shipment not found" },
      { status: 404 }
    );
  }

  return existing;
}

/**
 * Maps a Shipment Prisma model to the API response format
 */
function mapShipmentToResponse(shipment: Shipment) {
  return {
    id: shipment.id,
    tenant_id: shipment.tenantId,
    shipment_number: shipment.shipmentNumber,
    status: shipment.status,
    event_id: shipment.eventId,
    supplier_id: shipment.supplierId,
    location_id: shipment.locationId,
    scheduled_date: shipment.scheduledDate,
    shipped_date: shipment.shippedDate,
    estimated_delivery_date: shipment.estimatedDeliveryDate,
    actual_delivery_date: shipment.actualDeliveryDate,
    total_items: shipment.totalItems,
    shipping_cost: shipment.shippingCost ? Number(shipment.shippingCost) : null,
    total_value: shipment.totalValue ? Number(shipment.totalValue) : null,
    tracking_number: shipment.trackingNumber,
    carrier: shipment.carrier,
    shipping_method: shipment.shippingMethod,
    delivered_by: shipment.deliveredBy,
    received_by: shipment.receivedBy,
    signature: shipment.signatureText,
    notes: shipment.notes,
    internal_notes: shipment.internalNotes,
    reference: shipment.reference,
    created_at: shipment.createdAt,
    updated_at: shipment.updatedAt,
    deleted_at: shipment.deletedAt,
  };
}

/**
 * Fetches shipment items for inventory processing (read — bypasses Manifest per §10)
 */
async function fetchShipmentItems(
  tenantId: string,
  shipmentId: string
): Promise<ShipmentItem[]> {
  return await database.$queryRaw<ShipmentItem[]>`
    SELECT si.id,
           si.item_id,
           si.quantity_shipped,
           si.quantity_received,
           si.quantity_damaged,
           si.unit_cost,
           si.lot_number,
           si.expiration_date
    FROM "tenant_inventory"."shipment_items" AS si
    WHERE si.tenant_id = ${tenantId}::uuid
      AND si.shipment_id = ${shipmentId}::uuid
      AND si.deleted_at IS NULL
  `;
}

/**
 * Creates an inventory transaction for a received shipment item (governed via Manifest runtime)
 */
async function createInventoryTransaction(
  tenantId: string,
  shipmentId: string,
  item: ShipmentItem,
  goodQuantity: number,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  await runManifestCommand({
    entity: "InventoryTransaction",
    command: "create",
    body: {
      tenantId,
      itemId: item.item_id,
      transactionType: TRANSACTION_TYPE_PURCHASE,
      quantity: goodQuantity,
      unitCost: item.unit_cost ?? 0,
      referenceType: "shipment",
      referenceId: shipmentId,
      reason: "shipment_receipt",
      notes:
        `Received from shipment ${shipmentNumber}` +
        (item.lot_number ? ` (Lot: ${item.lot_number})` : "") +
        (item.expiration_date
          ? ` (Expires: ${item.expiration_date.toISOString().split("T")[0]})`
          : ""),
      employeeId: userId ?? "",
      storageLocationId: locationId ?? "",
    },
    user: userContext,
  });
}

/**
 * Updates inventory item quantity on hand (governed via Manifest adjust command)
 */
async function updateInventoryQuantity(
  tenantId: string,
  itemId: string,
  goodQuantity: number,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  await runManifestCommand({
    entity: "InventoryItem",
    command: "adjust",
    body: {
      id: itemId,
      tenantId,
      quantity: goodQuantity,
      reason: "shipment_receipt",
      userId: userContext.id,
    },
    user: userContext,
  });
}

/**
 * Creates an inventory reservation transaction for an outgoing shipment item (governed via Manifest runtime)
 */
async function createReservationTransaction(
  tenantId: string,
  shipmentId: string,
  item: ShipmentItem,
  quantity: number,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  await runManifestCommand({
    entity: "InventoryTransaction",
    command: "create",
    body: {
      tenantId,
      itemId: item.item_id,
      transactionType: TRANSACTION_TYPE_TRANSFER,
      quantity: -quantity,
      unitCost: item.unit_cost ?? 0,
      referenceType: "shipment",
      referenceId: shipmentId,
      reason: "shipment_preparation",
      notes:
        `Reserved for outgoing shipment ${shipmentNumber}` +
        (item.lot_number ? ` (Lot: ${item.lot_number})` : ""),
      employeeId: userId ?? "",
      storageLocationId: locationId ?? "",
    },
    user: userContext,
  });
}

/**
 * Reduces inventory item quantity on hand for outgoing shipments (governed via Manifest adjust command)
 */
async function reduceInventoryQuantity(
  tenantId: string,
  itemId: string,
  quantity: number,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  await runManifestCommand({
    entity: "InventoryItem",
    command: "adjust",
    body: {
      id: itemId,
      tenantId,
      quantity: -quantity,
      reason: "shipment_preparation",
      userId: userContext.id,
    },
    user: userContext,
  });
}

/**
 * Validates that sufficient stock exists for all items in an outgoing shipment.
 * Throws InvariantError with details of any items that are insufficient.
 * Must be called BEFORE the status update to prevent the transition on failure.
 */
async function validateStockAvailability(
  tenantId: string,
  shipmentId: string
): Promise<void> {
  const shipmentItems = await fetchShipmentItems(tenantId, shipmentId);

  if (shipmentItems.length === 0) {
    return;
  }

  const itemIds = shipmentItems.map((item) => item.item_id);

  const stockLevels = await database.$queryRaw<
    Array<{
      id: string;
      name: string;
      item_number: string;
      quantity_on_hand: number;
    }>
  >`
    SELECT i.id, i.name, i.item_number, i.quantity_on_hand
    FROM "tenant_inventory"."inventory_items" i
    WHERE i.tenant_id = ${tenantId}::uuid
      AND i.id = ANY(${itemIds}::uuid[])
      AND i.deleted_at IS NULL
  `;

  const stockMap = new Map(stockLevels.map((s) => [s.id, s]));
  const insufficientItems: Array<{
    name: string;
    itemNumber: string;
    available: number;
    needed: number;
  }> = [];

  for (const item of shipmentItems) {
    const stock = stockMap.get(item.item_id);
    const available = stock ? Number(stock.quantity_on_hand) : 0;
    const needed = Number(item.quantity_shipped);

    if (needed > available) {
      insufficientItems.push({
        name: stock?.name ?? item.item_id,
        itemNumber: stock?.item_number ?? "unknown",
        available,
        needed,
      });
    }
  }

  if (insufficientItems.length > 0) {
    const details = insufficientItems
      .map(
        (i) =>
          `${i.name} (${i.itemNumber}): ${i.available} available, ${i.needed} needed`
      )
      .join("; ");
    throw new InvariantError(
      `Insufficient stock for shipment preparation: ${details}`
    );
  }
}

/**
 * Processes inventory reservation when a shipment enters "preparing" status
 * This is for OUTGOING shipments (to events) - items are removed from inventory
 */
async function processPreparationInventory(
  tenantId: string,
  shipmentId: string,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  const shipmentItems = await fetchShipmentItems(tenantId, shipmentId);

  for (const item of shipmentItems) {
    const quantityToReserve = Number(item.quantity_shipped);

    if (quantityToReserve <= 0) {
      continue;
    }

    await createReservationTransaction(
      tenantId,
      shipmentId,
      item,
      quantityToReserve,
      shipmentNumber,
      locationId,
      userId,
      userContext
    );

    await reduceInventoryQuantity(
      tenantId,
      item.item_id,
      quantityToReserve,
      userContext
    );
  }
}

/**
 * Creates a reversal transaction when a shipment is cancelled during preparation (governed via Manifest runtime)
 */
async function createReversalTransaction(
  tenantId: string,
  shipmentId: string,
  item: ShipmentItem,
  quantity: number,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  await runManifestCommand({
    entity: "InventoryTransaction",
    command: "create",
    body: {
      tenantId,
      itemId: item.item_id,
      transactionType: TRANSACTION_TYPE_TRANSFER,
      quantity,
      unitCost: item.unit_cost ?? 0,
      referenceType: "shipment",
      referenceId: shipmentId,
      reason: "shipment_cancellation",
      notes: `Reversal: Cancelled shipment ${shipmentNumber}`,
      employeeId: userId ?? "",
      storageLocationId: locationId ?? "",
    },
    user: userContext,
  });
}

/**
 * Processes inventory reversal when a shipment is cancelled during preparation
 * This returns the reserved items back to inventory
 */
async function processCancellationInventory(
  tenantId: string,
  shipmentId: string,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  const shipmentItems = await fetchShipmentItems(tenantId, shipmentId);

  for (const item of shipmentItems) {
    const quantityToRestore = Number(item.quantity_shipped);

    if (quantityToRestore <= 0) {
      continue;
    }

    await createReversalTransaction(
      tenantId,
      shipmentId,
      item,
      quantityToRestore,
      shipmentNumber,
      locationId,
      userId,
      userContext
    );

    await updateInventoryQuantity(
      tenantId,
      item.item_id,
      quantityToRestore,
      userContext
    );
  }
}

/**
 * Processes inventory updates when a shipment is delivered
 */
async function processDeliveryInventory(
  tenantId: string,
  shipmentId: string,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  const shipmentItems = await fetchShipmentItems(tenantId, shipmentId);

  for (const item of shipmentItems) {
    const receivedQuantity =
      Number(item.quantity_received) > 0
        ? Number(item.quantity_received)
        : Number(item.quantity_shipped);

    const damagedQuantity = Number(item.quantity_damaged) || 0;
    const goodQuantity = receivedQuantity - damagedQuantity;

    if (goodQuantity <= 0) {
      continue;
    }

    await createInventoryTransaction(
      tenantId,
      shipmentId,
      item,
      goodQuantity,
      shipmentNumber,
      locationId,
      userId,
      userContext
    );

    await updateInventoryQuantity(
      tenantId,
      item.item_id,
      goodQuantity,
      userContext
    );
  }
}

/**
 * Handles inventory updates for delivered shipments
 */
async function handleInventoryOnDelivery(
  updated: Shipment,
  previousStatus: string,
  tenantId: string,
  shipmentId: string,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  if (updated.status !== "delivered" || previousStatus === "delivered") {
    return;
  }

  try {
    await processDeliveryInventory(
      tenantId,
      shipmentId,
      updated.shipmentNumber,
      updated.locationId,
      updated.deliveredBy ?? updated.receivedBy ?? null,
      userContext
    );
  } catch (inventoryError) {
    log.error("Failed to update inventory for delivered shipment", {
      error: inventoryError,
    });
    // Continue with the response even if inventory update fails
  }
}

/**
 * Handles inventory reservation for shipments entering "preparing" status
 * Only applies to OUTGOING shipments (those with an event_id set)
 */
async function handleInventoryOnPreparation(
  updated: Shipment,
  previousStatus: string,
  tenantId: string,
  shipmentId: string,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  // Only process when entering "preparing" status
  if (updated.status !== "preparing" || previousStatus === "preparing") {
    return;
  }

  // Only process OUTGOING shipments (to events)
  if (!updated.eventId) {
    return;
  }

  try {
    await processPreparationInventory(
      tenantId,
      shipmentId,
      updated.shipmentNumber,
      updated.locationId,
      userId,
      userContext
    );
  } catch (inventoryError) {
    log.error("Failed to reserve inventory for preparing shipment", {
      error: inventoryError,
    });
    // Continue with the response even if inventory update fails
  }
}

/**
 * Handles inventory reversal for shipments cancelled during preparation
 * Only applies to OUTGOING shipments that were in "preparing" status
 */
async function handleInventoryOnCancellation(
  updated: Shipment,
  previousStatus: string,
  tenantId: string,
  shipmentId: string,
  userId: string | null,
  userContext: { id: string; tenantId: string; role: string }
): Promise<void> {
  // Only process when entering "cancelled" status
  if (updated.status !== "cancelled") {
    return;
  }

  // Only process if was in preparing or scheduled status (had reserved inventory)
  if (previousStatus !== "preparing" && previousStatus !== "scheduled") {
    return;
  }

  // Only process OUTGOING shipments (to events)
  if (!updated.eventId) {
    return;
  }

  try {
    await processCancellationInventory(
      tenantId,
      shipmentId,
      updated.shipmentNumber,
      updated.locationId,
      userId,
      userContext
    );
  } catch (inventoryError) {
    log.error("Failed to reverse inventory for cancelled shipment", {
      error: inventoryError,
    });
    // Continue with the response even if inventory update fails
  }
}

/**
 * Builds the Manifest command body for a given status transition.
 * Each command has different parameters per the shipment-rules.manifest spec.
 */
function buildCommandBody(
  command: string,
  shipmentId: string,
  tenantId: string,
  userId: string,
  body: ShipmentStatusRequestBody
): Record<string, unknown> {
  const base = { id: shipmentId, tenantId };

  switch (command) {
    case "schedule":
      return {
        ...base,
        userId,
        scheduledDate: new Date(body.shipped_date ?? Date.now()).getTime(),
      };
    case "startPreparing":
      return { ...base, userId };
    case "ship":
      return {
        ...base,
        userId,
        trackingNumber: body.shipped_date ?? "",
      };
    case "markDelivered":
      return {
        ...base,
        userId,
        receivedBy: body.received_by ?? "",
        signatureData: body.signature ?? "",
      };
    case "cancel":
      return {
        ...base,
        userId,
        reason: body.signature ?? "",
      };
    default:
      return base;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate and get tenant
    const { orgId } = await auth();
    const authResult = await authenticateAndGetTenant(orgId ?? undefined);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { tenantId } = authResult;

    // Resolve current user for Manifest runtime
    const user = await resolveCurrentUser(request);

    // Parse request
    const { id } = await params;
    const body = (await request.json()) as ShipmentStatusRequestBody;

    if (!body.status) {
      throw new InvariantError("status is required");
    }

    // Determine which Manifest command handles this transition
    const command = STATUS_TO_COMMAND[body.status];
    if (!command) {
      throw new InvariantError(
        `Unsupported target status: ${body.status}. No Manifest command maps to this status.`
      );
    }

    // Fetch existing shipment (read — bypasses Manifest per §10)
    const existingResult = await fetchExistingShipment(tenantId, id);
    if (existingResult instanceof NextResponse) {
      return existingResult;
    }
    const existing = existingResult;

    // Validate status transition (pre-validation before Manifest guards)
    validateStatusTransition(existing.status, body.status);
    validateDeliveryConfirmation(body.status, body);

    // Validate stock availability before preparation (outgoing shipments only)
    if (body.status === "preparing" && existing.eventId) {
      await validateStockAvailability(tenantId, id);
    }

    // Build command body and execute via Manifest runtime
    const commandBody = buildCommandBody(command, id, tenantId, user.id, body);

    const manifestResult = await runManifestCommand({
      entity: "Shipment",
      command,
      body: commandBody,
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    // If Manifest returned an error, forward it to the client.
    // runManifestCommand already returns a Response with appropriate status.
    if (!(manifestResult instanceof Response) || manifestResult.status >= 400) {
      // Try to extract the Manifest error message for better UX on guard failures
      if (manifestResult instanceof Response) {
        return manifestResult;
      }
    }

    // Re-fetch the updated shipment to return the same response shape
    const updated = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Shipment not found after update" },
        { status: 404 }
      );
    }

    // Handle inventory updates on delivery
    const userContext = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };
    await handleInventoryOnDelivery(
      updated,
      existing.status,
      tenantId,
      id,
      userContext
    );

    // Handle inventory reservation on preparation (outgoing shipments)
    await handleInventoryOnPreparation(
      updated,
      existing.status,
      tenantId,
      id,
      user.id,
      userContext
    );

    // Handle inventory reversal on cancellation
    await handleInventoryOnCancellation(
      updated,
      existing.status,
      tenantId,
      id,
      user.id,
      userContext
    );

    // Fire-and-forget webhook dispatch for shipment status change
    dispatchWebhooks({
      tenantId,
      entityType: "Shipment",
      entityId: id,
      action: "updated",
      data: {
        ...mapShipmentToResponse(updated),
        previousStatus: existing.status,
      },
    }).catch(() => {});

    return NextResponse.json(mapShipmentToResponse(updated));
  } catch (error) {
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Failed to update shipment status", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
