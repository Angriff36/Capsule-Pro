/**
 * Prep-list to inventory-demand middleware.
 *
 * Runs inside the Manifest runtime lifecycle after `PrepListFinalized` is
 * emitted. It derives ingredient demand from persisted PrepListItem rows,
 * dispatches governed InventoryItem.reserve commands, and CONSOLIDATES the
 * demand into a single open PurchaseRequisition DRAFT per tenant/supplier:
 * finalizing ten prep lists in a week grows ONE draft order (quantities
 * merged per item) instead of creating ten requisitions. The draft is never
 * submitted by the system — a manager reviews and submits it.
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn)
 * instead of silently returning, so "no US Foods supplier configured" or
 * "0 of 12 ingredients matched the catalog" is visible in logs and tests.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

interface RunCommandOptions {
  entityName?: string;
  instanceId?: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface PrepDemandDiagnostic {
  stage: string;
  reason: string;
  prepListId?: string;
  tenantId?: string;
  requisitionId?: string;
  detail?: Record<string, unknown>;
}

export interface PrepInventoryDemandMiddlewareOptions {
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Optional system actor used in inventory reservation payloads. */
  systemUserId?: string;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: PrepDemandDiagnostic) => void;
}

interface EventPayload {
  prepListId?: unknown;
  tenantId?: unknown;
  eventId?: unknown;
}

interface PrepListItemLike {
  id?: unknown;
  tenantId?: unknown;
  prepListId?: unknown;
  ingredientId?: unknown;
  ingredientName?: unknown;
  scaledQuantity?: unknown;
  scaledUnit?: unknown;
}

interface PrepListLike {
  id?: unknown;
  tenantId?: unknown;
  eventId?: unknown;
  name?: unknown;
}

interface InventoryItemLike {
  id?: unknown;
  tenantId?: unknown;
  item_number?: unknown;
  name?: unknown;
  unitOfMeasure?: unknown;
  unitCost?: unknown;
  supplierId?: unknown;
}

interface InventorySupplierLike {
  id?: unknown;
  tenantId?: unknown;
  name?: unknown;
  supplierNumber?: unknown;
  isActive?: unknown;
  qualificationStatus?: unknown;
  tags?: unknown;
}

interface VendorCatalogLike {
  id?: unknown;
  tenantId?: unknown;
  supplierId?: unknown;
  itemNumber?: unknown;
  itemName?: unknown;
  baseUnitCost?: unknown;
  currency?: unknown;
  unitOfMeasure?: unknown;
  leadTimeDays?: unknown;
  minimumOrderQuantity?: unknown;
  orderMultiple?: unknown;
  isActive?: unknown;
  supplierSku?: unknown;
  tags?: unknown;
  deletedAt?: unknown;
}

interface RequisitionLike {
  id?: unknown;
  tenantId?: unknown;
  itemCategory?: unknown;
  status?: unknown;
  justification?: unknown;
  notes?: unknown;
  deletedAt?: unknown;
  createdAt?: unknown;
}

interface RequisitionItemLike {
  id?: unknown;
  tenantId?: unknown;
  requisitionId?: unknown;
  itemId?: unknown;
  itemName?: unknown;
  quantityRequested?: unknown;
  estimatedUnitCost?: unknown;
  estimatedTotalCost?: unknown;
  suggestedVendorId?: unknown;
  suggestedVendorName?: unknown;
  specifications?: unknown;
  notes?: unknown;
  deletedAt?: unknown;
}

interface ProcurementLine {
  itemId: string;
  itemName: string;
  quantity: number;
  unitName: string;
  unitCost: number;
  totalCost: number;
  supplierId: string;
  supplierName: string;
  catalog: VendorCatalogLike | undefined;
}

/** Marker recorded in the consolidated draft's notes per ingested prep list. */
function prepMarker(prepListId: string): string {
  return `[prep:${prepListId}]`;
}

const defaultDiagnostic = (diag: PrepDemandDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[prep-demand:${diag.stage}] ${diag.reason}`, {
    prepListId: diag.prepListId,
    tenantId: diag.tenantId,
    requisitionId: diag.requisitionId,
    ...diag.detail,
  });
};

/**
 * Create middleware that derives inventory reservations + a consolidated
 * draft requisition when a prep list is finalized. Store/provider based so
 * tests and production use the same Manifest runtime boundary.
 */
export function createPrepInventoryDemandMiddleware(
  options: PrepInventoryDemandMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    systemUserId = "system:prep-demand",
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const finalizedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PrepListFinalized" &&
          ctx.entityName === "PrepList" &&
          ctx.command.name === "finalize"
      );

      for (const event of finalizedEvents) {
        const payload = event.payload as EventPayload;
        const prepListId =
          asNonEmptyString(payload.prepListId) ??
          asNonEmptyString(ctx.instanceId) ??
          asNonEmptyString(event.subject?.id);
        if (!prepListId) {
          onDiagnostic({
            stage: "resolve",
            reason: "PrepListFinalized carried no resolvable prepListId",
          });
          continue;
        }

        const prepListStore = storeProvider("PrepList");
        if (!prepListStore) {
          onDiagnostic({
            stage: "stores",
            reason: "PrepList store unavailable",
            prepListId,
          });
          continue;
        }
        const prepList = (await prepListStore.getById(prepListId)) as
          | PrepListLike
          | undefined;
        const tenantId =
          asNonEmptyString(payload.tenantId) ??
          asNonEmptyString(prepList?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        const eventId =
          asNonEmptyString(payload.eventId) ?? asNonEmptyString(prepList?.eventId);

        if (!tenantId || !eventId) {
          onDiagnostic({
            stage: "resolve",
            reason: `missing ${!tenantId ? "tenantId" : "eventId"} for finalized prep list`,
            prepListId,
            tenantId,
          });
          continue;
        }

        const requisitionStore = storeProvider("PurchaseRequisition");
        // Idempotency check FIRST — before inventory reserves — so re-finalizing
        // an already-ingested prep list neither double-reserves nor double-orders.
        if (requisitionStore) {
          const alreadyIngested = await findIngestedRequisition(
            requisitionStore,
            tenantId,
            prepListId
          );
          if (alreadyIngested) {
            onDiagnostic({
              stage: "dedupe",
              reason:
                "prep list demand already ingested into a requisition — skipping reserve + order merge",
              prepListId,
              tenantId,
              requisitionId: asNonEmptyString(alreadyIngested.id),
            });
            continue;
          }
        }

        const prepListItemStore = storeProvider("PrepListItem");
        if (!prepListItemStore) {
          onDiagnostic({
            stage: "stores",
            reason: "PrepListItem store unavailable",
            prepListId,
            tenantId,
          });
          continue;
        }
        const prepItems = await prepListItemStore.getAll();
        const sourceItems = prepItems
          .map((item) => item as PrepListItemLike)
          .filter(
            (item) =>
              asNonEmptyString(item.tenantId) === tenantId &&
              asNonEmptyString(item.prepListId) === prepListId
          );
        if (sourceItems.length === 0) {
          onDiagnostic({
            stage: "demand",
            reason: "finalized prep list has no PrepListItem rows — nothing to reserve or order",
            prepListId,
            tenantId,
          });
          continue;
        }

        for (const item of sourceItems) {
          const inventoryItemId = asNonEmptyString(item.ingredientId);
          const quantity = asPositiveNumber(item.scaledQuantity);
          if (!inventoryItemId || quantity === undefined) {
            onDiagnostic({
              stage: "reserve",
              reason: "prep item skipped: missing ingredientId or non-positive scaledQuantity",
              prepListId,
              tenantId,
              detail: {
                prepItemId: asNonEmptyString(item.id),
                ingredientName: asNonEmptyString(item.ingredientName),
              },
            });
            continue;
          }

          const reserveResult = await dispatchCommand(
            "reserve",
            {
              quantity,
              eventId,
              userId: systemUserId,
            },
            {
              entityName: "InventoryItem",
              instanceId: inventoryItemId,
              correlationId:
                asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
                asNonEmptyString(event.subject?.id) ??
                prepListId,
              causationId: event.name,
              idempotencyKey: `prep-demand:${tenantId}:${prepListId}:reserve:${inventoryItemId}`,
            }
          );

          if (reserveResult.emittedEvents) {
            ctx.emittedEvents.push(...reserveResult.emittedEvents);
          }
        }

        const procurementEvents = await consolidateUsFoodsDraft({
          ctx,
          prepListId,
          prepList,
          tenantId,
          eventId,
          sourceItems,
          storeProvider,
          dispatchCommand,
          systemUserId,
          onDiagnostic,
        });
        ctx.emittedEvents.push(...procurementEvents);
      }

      return {};
    },
  };
}

/** A requisition already containing this prep list's demand (any status). */
async function findIngestedRequisition(
  requisitionStore: Store,
  tenantId: string,
  prepListId: string
): Promise<RequisitionLike | undefined> {
  const marker = prepMarker(prepListId);
  return (await requisitionStore.getAll())
    .map((row) => row as RequisitionLike)
    .find(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.itemCategory) === "prep-list-demand" &&
        (String(row.notes ?? "").includes(marker) ||
          // Back-compat: pre-consolidation requisitions tracked the prep list
          // id inside the justification string.
          String(row.justification ?? "").includes(prepListId))
    );
}

async function consolidateUsFoodsDraft(options: {
  ctx: MiddlewareContext;
  prepListId: string;
  prepList: PrepListLike | undefined;
  tenantId: string;
  eventId: string;
  sourceItems: PrepListItemLike[];
  storeProvider: (entityName: string) => Store | undefined;
  dispatchCommand: DispatchCommand;
  systemUserId: string;
  onDiagnostic: (diag: PrepDemandDiagnostic) => void;
}): Promise<NonNullable<CommandResult["emittedEvents"]>> {
  const {
    ctx,
    prepListId,
    prepList,
    tenantId,
    eventId,
    sourceItems,
    storeProvider,
    dispatchCommand,
    systemUserId,
    onDiagnostic,
  } = options;

  const requisitionStore = storeProvider("PurchaseRequisition");
  const requisitionItemStore = storeProvider("PurchaseRequisitionItem");
  const supplierStore = storeProvider("InventorySupplier");
  const catalogStore = storeProvider("VendorCatalog");
  const inventoryStore = storeProvider("InventoryItem");

  if (
    !requisitionStore ||
    !requisitionItemStore ||
    !supplierStore ||
    !catalogStore ||
    !inventoryStore
  ) {
    onDiagnostic({
      stage: "stores",
      reason: "procurement stores unavailable — demand not ordered",
      prepListId,
      tenantId,
      detail: {
        missing: [
          !requisitionStore && "PurchaseRequisition",
          !requisitionItemStore && "PurchaseRequisitionItem",
          !supplierStore && "InventorySupplier",
          !catalogStore && "VendorCatalog",
          !inventoryStore && "InventoryItem",
        ].filter(Boolean),
      },
    });
    return [];
  }

  const suppliers = (await supplierStore.getAll()).map(
    (item) => item as InventorySupplierLike
  );
  const usFoodsSupplier = suppliers.find(
    (supplier) =>
      asNonEmptyString(supplier.tenantId) === tenantId &&
      isActiveSupplier(supplier) &&
      isUsFoodsSupplier(supplier)
  );
  const supplierId = asNonEmptyString(usFoodsSupplier?.id);
  const supplierName = asNonEmptyString(usFoodsSupplier?.name) ?? "US Foods";
  if (!supplierId) {
    onDiagnostic({
      stage: "supplier",
      reason:
        "no active US Foods supplier configured for tenant — demand not ordered (create an InventorySupplier whose name/number/tags match 'usfoods')",
      prepListId,
      tenantId,
    });
    return [];
  }

  const catalogEntries = (await catalogStore.getAll())
    .map((item) => item as VendorCatalogLike)
    .filter(
      (item) =>
        asNonEmptyString(item.tenantId) === tenantId &&
        asNonEmptyString(item.supplierId) === supplierId &&
        item.deletedAt == null &&
        item.isActive !== false
    );

  const procurementLines: ProcurementLine[] = [];
  let skippedLines = 0;
  for (const item of sourceItems) {
    const inventoryItemId = asNonEmptyString(item.ingredientId);
    const quantity = asPositiveNumber(item.scaledQuantity);
    if (!inventoryItemId || quantity === undefined) {
      continue; // already reported in the reserve loop
    }

    const inventoryItem = (await inventoryStore.getById(
      inventoryItemId
    )) as InventoryItemLike | undefined;
    if (asNonEmptyString(inventoryItem?.tenantId) !== tenantId) {
      skippedLines += 1;
      onDiagnostic({
        stage: "match",
        reason: "ingredient has no tenant inventory item — line skipped",
        prepListId,
        tenantId,
        detail: { ingredientId: inventoryItemId, ingredientName: item.ingredientName },
      });
      continue;
    }

    const catalog = findCatalogEntry(catalogEntries, inventoryItem, item);
    const inventorySupplierId = asNonEmptyString(inventoryItem?.supplierId);
    if (!catalog && inventorySupplierId !== supplierId) {
      skippedLines += 1;
      onDiagnostic({
        stage: "match",
        reason:
          "ingredient matched no US Foods catalog entry and is not supplier-mapped — line skipped",
        prepListId,
        tenantId,
        detail: { ingredientId: inventoryItemId, ingredientName: item.ingredientName },
      });
      continue;
    }

    const unitCost =
      asNonNegativeNumber(catalog?.baseUnitCost) ??
      asNonNegativeNumber(inventoryItem?.unitCost) ??
      0;
    const adjustedQuantity = applyOrderMinimums(quantity, catalog);
    const itemName =
      asNonEmptyString(catalog?.itemName) ??
      asNonEmptyString(inventoryItem?.name) ??
      asNonEmptyString(item.ingredientName) ??
      inventoryItemId;
    const unitName =
      asNonEmptyString(catalog?.unitOfMeasure) ??
      asNonEmptyString(item.scaledUnit) ??
      asNonEmptyString(inventoryItem?.unitOfMeasure) ??
      "each";

    procurementLines.push({
      itemId: inventoryItemId,
      itemName,
      quantity: adjustedQuantity,
      unitName,
      unitCost,
      totalCost: roundMoney(adjustedQuantity * unitCost),
      supplierId,
      supplierName,
      catalog,
    });
  }

  if (procurementLines.length === 0) {
    onDiagnostic({
      stage: "match",
      reason: `0 of ${sourceItems.length} prep items matched US Foods catalog/supplier data — no order lines produced`,
      prepListId,
      tenantId,
    });
    return [];
  }

  const emittedEvents: NonNullable<CommandResult["emittedEvents"]> = [];
  const commonOptions = {
    correlationId:
      asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
      prepListId,
    causationId: "PrepListFinalized",
  };

  // ---------------------------------------------------------------------
  // Find the open consolidated DRAFT for this tenant, or create one. The
  // draft accumulates demand from every finalized prep list until a manager
  // submits it — the system never submits.
  // ---------------------------------------------------------------------
  const openDraft = (await requisitionStore.getAll())
    .map((row) => row as RequisitionLike)
    .filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.itemCategory) === "prep-list-demand" &&
        asNonEmptyString(row.status) === "draft" &&
        row.deletedAt == null
    )
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")))[0];

  let requisitionId = asNonEmptyString(openDraft?.id);
  let existingNotes = String(openDraft?.notes ?? "");
  let createdNew = false;

  if (!requisitionId) {
    requisitionId = randomUUID();
    createdNew = true;
    existingNotes = "";
    const createResult = await dispatchCommand(
      "create",
      {
        id: requisitionId,
        tenantId,
        requisitionNumber: `PREP-DRAFT-${requisitionId.slice(0, 8).toUpperCase()}`,
        locationId: eventId,
        department: "kitchen",
        requestedBy: systemUserId,
        requiredBy: Date.now() + 2 * 24 * 60 * 60 * 1000,
        justification: `Consolidated prep-list demand draft for ${supplierName}. Source prep lists are tracked in notes.`,
        priority: "normal",
        itemCategory: "prep-list-demand",
      },
      {
        entityName: "PurchaseRequisition",
        ...commonOptions,
        idempotencyKey: `prep-demand:${tenantId}:${prepListId}:requisition`,
      }
    );
    collectEvents(emittedEvents, createResult);
    if (!createResult.success) {
      onDiagnostic({
        stage: "order",
        reason: `PurchaseRequisition.create failed: ${createResult.error ?? "unknown"}`,
        prepListId,
        tenantId,
        requisitionId,
      });
      return emittedEvents;
    }
  }

  // ---------------------------------------------------------------------
  // Merge demand lines: existing item for the same inventory item gets its
  // quantity increased; unseen items are created.
  // ---------------------------------------------------------------------
  const existingItems = (await requisitionItemStore.getAll())
    .map((row) => row as RequisitionItemLike)
    .filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.requisitionId) === requisitionId &&
        row.deletedAt == null
    );
  const existingByItemId = new Map<string, RequisitionItemLike>();
  for (const row of existingItems) {
    const itemId = asNonEmptyString(row.itemId);
    if (itemId && !existingByItemId.has(itemId)) {
      existingByItemId.set(itemId, row);
    }
  }

  /** itemId -> final (quantity, unitCost) after this merge, for totals. */
  const finalLines = new Map<string, { quantity: number; unitCost: number }>();
  for (const row of existingItems) {
    const itemId = asNonEmptyString(row.itemId);
    if (!itemId) continue;
    finalLines.set(itemId, {
      quantity: asNonNegativeNumber(row.quantityRequested) ?? 0,
      unitCost: asNonNegativeNumber(row.estimatedUnitCost) ?? 0,
    });
  }

  let mergedCount = 0;
  let createdCount = 0;
  for (const line of procurementLines) {
    const existing = existingByItemId.get(line.itemId);
    if (existing) {
      const existingQty = asNonNegativeNumber(existing.quantityRequested) ?? 0;
      const mergedQty = Math.round((existingQty + line.quantity) * 1000) / 1000;
      const itemResult = await dispatchCommand(
        "update",
        {
          quantityRequested: mergedQty,
          // Latest catalog cost wins for the whole line.
          estimatedUnitCost: line.unitCost,
          suggestedVendorId: line.supplierId,
          suggestedVendorName: line.supplierName,
          specifications:
            asNonEmptyString(existing.specifications) ??
            asNonEmptyString(line.catalog?.supplierSku) ??
            asNonEmptyString(line.catalog?.itemNumber) ??
            "",
          notes: `${String(existing.notes ?? "")} | +${line.quantity} ${line.unitName} from prep ${prepListId.slice(0, 8)}`.trim(),
        },
        {
          entityName: "PurchaseRequisitionItem",
          instanceId: asNonEmptyString(existing.id),
          ...commonOptions,
          idempotencyKey: `prep-demand:${tenantId}:${prepListId}:merge:${line.itemId}`,
        }
      );
      collectEvents(emittedEvents, itemResult);
      if (!itemResult.success) {
        onDiagnostic({
          stage: "order",
          reason: `PurchaseRequisitionItem.update failed for ${line.itemId}: ${itemResult.error ?? "unknown"}`,
          prepListId,
          tenantId,
          requisitionId,
        });
        return emittedEvents;
      }
      finalLines.set(line.itemId, { quantity: mergedQty, unitCost: line.unitCost });
      mergedCount += 1;
    } else {
      const itemResult = await dispatchCommand(
        "create",
        {
          id: randomUUID(),
          tenantId,
          requisitionId,
          itemId: line.itemId,
          itemName: line.itemName,
          quantityRequested: line.quantity,
          unitId: 0,
          estimatedUnitCost: line.unitCost,
          suggestedVendorId: line.supplierId,
          suggestedVendorName: line.supplierName,
          specifications:
            asNonEmptyString(line.catalog?.supplierSku) ??
            asNonEmptyString(line.catalog?.itemNumber) ??
            "",
          notes: `Source: ${supplierName}${line.catalog ? ` catalog ${asNonEmptyString(line.catalog.id) ?? ""}` : " supplier mapping"}; unit: ${line.unitName}; prep ${prepListId.slice(0, 8)}`,
        },
        {
          entityName: "PurchaseRequisitionItem",
          ...commonOptions,
          idempotencyKey: `prep-demand:${tenantId}:${prepListId}:item:${line.itemId}`,
        }
      );
      collectEvents(emittedEvents, itemResult);
      if (!itemResult.success) {
        onDiagnostic({
          stage: "order",
          reason: `PurchaseRequisitionItem.create failed for ${line.itemId}: ${itemResult.error ?? "unknown"}`,
          prepListId,
          tenantId,
          requisitionId,
        });
        return emittedEvents;
      }
      finalLines.set(line.itemId, { quantity: line.quantity, unitCost: line.unitCost });
      createdCount += 1;
    }
  }

  // ---------------------------------------------------------------------
  // Refresh draft totals + record the ingested prep list marker. Status
  // stays "draft": completeDraftFromPrepDemand only updates counts/totals.
  // ---------------------------------------------------------------------
  const subtotal = roundMoney(
    [...finalLines.values()].reduce(
      (sum, line) => sum + roundMoney(line.quantity * line.unitCost),
      0
    )
  );
  const prepListName = asNonEmptyString(prepList?.name) ?? "Prep List";
  const completeResult = await dispatchCommand(
    "completeDraftFromPrepDemand",
    {
      itemCount: finalLines.size,
      subtotal,
      estimatedTax: 0,
      estimatedShipping: 0,
      estimatedTotal: subtotal,
      notes: `${existingNotes ? `${existingNotes} ` : ""}${prepMarker(prepListId)} ${prepListName} (event ${eventId})`.trim(),
    },
    {
      entityName: "PurchaseRequisition",
      instanceId: requisitionId,
      ...commonOptions,
      idempotencyKey: `prep-demand:${tenantId}:${prepListId}:complete`,
    }
  );
  collectEvents(emittedEvents, completeResult);
  if (!completeResult.success) {
    onDiagnostic({
      stage: "order",
      reason: `PurchaseRequisition.completeDraftFromPrepDemand failed: ${completeResult.error ?? "unknown"}`,
      prepListId,
      tenantId,
      requisitionId,
    });
    return emittedEvents;
  }

  onDiagnostic({
    stage: "done",
    reason: `demand consolidated into ${createdNew ? "new" : "existing"} draft (${createdCount} new line(s), ${mergedCount} merged, ${skippedLines} skipped); draft awaits manager review — NOT submitted`,
    prepListId,
    tenantId,
    requisitionId,
    detail: { subtotal, itemCount: finalLines.size },
  });

  return emittedEvents;
}

function collectEvents(
  target: NonNullable<CommandResult["emittedEvents"]>,
  result: CommandResult
): void {
  if (result.emittedEvents) {
    target.push(...result.emittedEvents);
  }
}

function isActiveSupplier(supplier: InventorySupplierLike): boolean {
  return (
    supplier.isActive !== false &&
    asNonEmptyString(supplier.qualificationStatus) !== "suspended" &&
    asNonEmptyString(supplier.qualificationStatus) !== "blacklisted"
  );
}

function isUsFoodsSupplier(supplier: InventorySupplierLike): boolean {
  const values = [
    asNonEmptyString(supplier.name),
    asNonEmptyString(supplier.supplierNumber),
    asTagString(supplier.tags),
  ];
  return values.some((value) => normalizeVendorName(value).includes("usfoods"));
}

function findCatalogEntry(
  entries: VendorCatalogLike[],
  inventoryItem: InventoryItemLike | undefined,
  prepItem: PrepListItemLike
): VendorCatalogLike | undefined {
  const inventoryNumber = normalizeSku(asNonEmptyString(inventoryItem?.item_number));
  const inventoryName = normalizeName(asNonEmptyString(inventoryItem?.name));
  const prepName = normalizeName(asNonEmptyString(prepItem.ingredientName));

  return entries.find((entry) => {
    const catalogNumber = normalizeSku(asNonEmptyString(entry.itemNumber));
    const catalogSku = normalizeSku(asNonEmptyString(entry.supplierSku));
    const catalogName = normalizeName(asNonEmptyString(entry.itemName));
    return (
      (!!inventoryNumber &&
        (catalogNumber === inventoryNumber || catalogSku === inventoryNumber)) ||
      (!!inventoryName && catalogName === inventoryName) ||
      (!!prepName && catalogName === prepName)
    );
  });
}

function applyOrderMinimums(
  requestedQuantity: number,
  catalog: VendorCatalogLike | undefined
): number {
  const minimum = asNonNegativeNumber(catalog?.minimumOrderQuantity) ?? 0;
  const multiple = asNonNegativeNumber(catalog?.orderMultiple) ?? 0;
  let quantity = Math.max(requestedQuantity, minimum || requestedQuantity);
  if (multiple > 0) {
    quantity = Math.ceil(quantity / multiple) * multiple;
  }
  return Math.round(quantity * 1000) / 1000;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

function asNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}

function asTagString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  return asNonEmptyString(value);
}

function normalizeVendorName(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSku(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
