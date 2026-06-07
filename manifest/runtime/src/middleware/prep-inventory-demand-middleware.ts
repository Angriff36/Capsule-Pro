/**
 * Prep-list to inventory-demand middleware.
 *
 * Runs inside the Manifest runtime lifecycle after `PrepListFinalized` is
 * emitted. It derives ingredient demand from persisted PrepListItem rows and
 * dispatches governed InventoryItem.reserve and PurchaseRequisition commands.
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

export interface PrepInventoryDemandMiddlewareOptions {
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Optional system actor used in inventory reservation payloads. */
  systemUserId?: string;
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

/**
 * Create middleware that derives inventory reservations when a prep list is
 * finalized. This is intentionally store/provider based so tests and
 * production use the same Manifest runtime boundary.
 */
export function createPrepInventoryDemandMiddleware(
  options: PrepInventoryDemandMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, systemUserId = "system:prep-demand" } =
    options;

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
          continue;
        }

        const prepListStore = storeProvider("PrepList");
        if (!prepListStore) {
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

        if (!prepListId || !tenantId || !eventId) {
          continue;
        }

        const prepListItemStore = storeProvider("PrepListItem");
        if (!prepListItemStore) {
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

        for (const item of sourceItems) {
          const inventoryItemId = asNonEmptyString(item.ingredientId);
          const quantity = asPositiveNumber(item.scaledQuantity);
          if (!inventoryItemId || quantity === undefined) {
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
            }
          );

          if (reserveResult.emittedEvents) {
            ctx.emittedEvents.push(...reserveResult.emittedEvents);
          }
        }

        const procurementEvents = await createUsFoodsRequisition({
          ctx,
          prepListId,
          prepList,
          tenantId,
          eventId,
          sourceItems,
          storeProvider,
          dispatchCommand,
          systemUserId,
        });
        ctx.emittedEvents.push(...procurementEvents);
      }

      return {};
    },
  };
}

async function createUsFoodsRequisition(options: {
  ctx: MiddlewareContext;
  prepListId: string;
  prepList: PrepListLike | undefined;
  tenantId: string;
  eventId: string;
  sourceItems: PrepListItemLike[];
  storeProvider: (entityName: string) => Store | undefined;
  dispatchCommand: DispatchCommand;
  systemUserId: string;
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
    return [];
  }

  const existingRequisition = (await requisitionStore.getAll()).find(
    (item) => {
      const row = item as {
        tenantId?: unknown;
        itemCategory?: unknown;
        justification?: unknown;
      };
      return (
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.itemCategory) === "prep-list-demand" &&
        String(row.justification ?? "").includes(prepListId)
      );
    }
  );
  if (existingRequisition) {
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
  for (const item of sourceItems) {
    const inventoryItemId = asNonEmptyString(item.ingredientId);
    const quantity = asPositiveNumber(item.scaledQuantity);
    if (!inventoryItemId || quantity === undefined) {
      continue;
    }

    const inventoryItem = (await inventoryStore.getById(
      inventoryItemId
    )) as InventoryItemLike | undefined;
    if (asNonEmptyString(inventoryItem?.tenantId) !== tenantId) {
      continue;
    }

    const catalog = findCatalogEntry(catalogEntries, inventoryItem, item);
    const inventorySupplierId = asNonEmptyString(inventoryItem?.supplierId);
    if (!catalog && inventorySupplierId !== supplierId) {
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
    return [];
  }

  const subtotal = roundMoney(
    procurementLines.reduce((sum, line) => sum + line.totalCost, 0)
  );
  const requisitionId = randomUUID();
  const requisitionNumber = `PREP-${prepListId.slice(0, 8).toUpperCase()}`;
  const emittedEvents: NonNullable<CommandResult["emittedEvents"]> = [];
  const commonOptions = {
    correlationId:
      asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
      prepListId,
    causationId: "PrepListFinalized",
  };

  const createResult = await dispatchCommand(
    "create",
    {
      id: requisitionId,
      tenantId,
      requisitionNumber,
      locationId: eventId,
      department: "kitchen",
      requestedBy: systemUserId,
      requiredBy: Date.now() + 2 * 24 * 60 * 60 * 1000,
      justification: `Auto-generated from prep list ${prepListId} (${asNonEmptyString(prepList?.name) ?? "Prep List"}) using ${supplierName} catalog/source data.`,
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
    return emittedEvents;
  }

  for (const line of procurementLines) {
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
        notes: `Source: US Foods${line.catalog ? ` catalog ${asNonEmptyString(line.catalog.id) ?? ""}` : " supplier mapping"}; unit: ${line.unitName}`,
      },
      {
        entityName: "PurchaseRequisitionItem",
        ...commonOptions,
        idempotencyKey: `prep-demand:${tenantId}:${prepListId}:item:${line.itemId}`,
      }
    );
    collectEvents(emittedEvents, itemResult);
    if (!itemResult.success) {
      return emittedEvents;
    }
  }

  const completeResult = await dispatchCommand(
    "completeDraftFromPrepDemand",
    {
      itemCount: procurementLines.length,
      subtotal,
      estimatedTax: 0,
      estimatedShipping: 0,
      estimatedTotal: subtotal,
      notes: `Ready for ${supplierName}. Source prep list: ${prepListId}. Event: ${eventId}.`,
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
    return emittedEvents;
  }

  const submitResult = await dispatchCommand(
    "submit",
    { userId: systemUserId },
    {
      entityName: "PurchaseRequisition",
      instanceId: requisitionId,
      ...commonOptions,
      idempotencyKey: `prep-demand:${tenantId}:${prepListId}:submit`,
    }
  );
  collectEvents(emittedEvents, submitResult);

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
