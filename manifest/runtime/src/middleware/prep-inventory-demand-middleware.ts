/**
 * Prep-list to inventory-demand middleware.
 *
 * Runs inside the Manifest runtime lifecycle after `PrepListFinalized` is
 * emitted. It derives ingredient demand from persisted PrepListItem rows,
 * dispatches governed InventoryItem.reserve commands, and CONSOLIDATES the
 * NET demand (gross demand minus free stock at reservation time) into one
 * open PurchaseRequisition DRAFT per (tenant, supplier) — grouped by each
 * item's own InventorySupplier, converted into the supplier catalog's
 * ordering unit via real core.unit_conversions (never guessed), and rounded
 * to catalog MOQ/orderMultiple pack rules. Lines that cannot be safely
 * ordered (no supplier mapping, no catalog entry, no unit-conversion path)
 * land on a separate per-tenant UNRESOLVED draft (sourceType
 * "prep_demand_unresolved") instead of being silently guessed or dropped.
 * Finalizing ten prep lists in a week grows the same per-supplier drafts
 * (quantities merged per item, prep-list provenance accumulated in
 * sourcePrepListIds) instead of creating ten requisitions. Drafts are never
 * submitted by the system — a manager reviews and submits.
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn)
 * instead of silently returning, so "no supplier mapped" or "0 of 12
 * ingredients matched a catalog" is visible in logs and tests.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import { resolveIngredientInventoryIds } from "./ingredient-inventory-resolution";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface PrepDemandDiagnostic {
  detail?: Record<string, unknown>;
  prepListId?: string;
  reason: string;
  requisitionId?: string;
  stage: string;
  tenantId?: string;
}

export interface PrepInventoryDemandMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: PrepDemandDiagnostic) => void;
  /**
   * Real unit-conversion lookup (core.unit_conversions), by unit CODE
   * (e.g. "lb" -> "case"). Returns the multiplier, or undefined when no
   * conversion path exists — the line then goes to the unresolved draft.
   * Identical units always convert with factor 1 without consulting this.
   * Default: no cross-unit conversions (only identical units resolve).
   */
  resolveUnitConversion?: (
    fromUnit: string,
    toUnit: string
  ) => Promise<number | undefined>;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Optional system actor used in inventory reservation payloads. */
  systemUserId?: string;
}

interface EventPayload {
  eventId?: unknown;
  prepListId?: unknown;
  tenantId?: unknown;
}

interface PrepListItemLike {
  id?: unknown;
  ingredientId?: unknown;
  ingredientName?: unknown;
  prepListId?: unknown;
  scaledQuantity?: unknown;
  scaledUnit?: unknown;
  tenantId?: unknown;
}

interface PrepListLike {
  eventId?: unknown;
  id?: unknown;
  name?: unknown;
  tenantId?: unknown;
}

interface InventoryItemLike {
  id?: unknown;
  item_number?: unknown;
  /** IR property name (live typed store) and legacy raw column name. */
  itemNumber?: unknown;
  name?: unknown;
  quantityOnHand?: unknown;
  quantityReserved?: unknown;
  supplierId?: unknown;
  tenantId?: unknown;
  unitCost?: unknown;
  unitOfMeasure?: unknown;
}

interface InventorySupplierLike {
  id?: unknown;
  isActive?: unknown;
  name?: unknown;
  qualificationStatus?: unknown;
  supplierNumber?: unknown;
  tags?: unknown;
  tenantId?: unknown;
}

interface VendorCatalogLike {
  baseUnitCost?: unknown;
  currency?: unknown;
  deletedAt?: unknown;
  id?: unknown;
  isActive?: unknown;
  itemName?: unknown;
  itemNumber?: unknown;
  leadTimeDays?: unknown;
  minimumOrderQuantity?: unknown;
  orderMultiple?: unknown;
  supplierId?: unknown;
  supplierSku?: unknown;
  tags?: unknown;
  tenantId?: unknown;
  unitOfMeasure?: unknown;
}

interface RequisitionLike {
  createdAt?: unknown;
  deletedAt?: unknown;
  id?: unknown;
  itemCategory?: unknown;
  justification?: unknown;
  notes?: unknown;
  sourceType?: unknown;
  status?: unknown;
  supplierId?: unknown;
  tenantId?: unknown;
}

interface RequisitionItemLike {
  deletedAt?: unknown;
  estimatedTotalCost?: unknown;
  estimatedUnitCost?: unknown;
  id?: unknown;
  itemId?: unknown;
  itemName?: unknown;
  notes?: unknown;
  quantityRequested?: unknown;
  requisitionId?: unknown;
  sourcePrepListIds?: unknown;
  specifications?: unknown;
  suggestedVendorId?: unknown;
  suggestedVendorName?: unknown;
  tenantId?: unknown;
}

/** A prep line that can be safely ordered from a specific supplier. */
interface ProcurementLine {
  catalog: VendorCatalogLike;
  itemId: string;
  itemName: string;
  /** Net quantity in the CATALOG's ordering unit, pack-rounded. */
  quantity: number;
  supplierId: string;
  supplierName: string;
  totalCost: number;
  unitCost: number;
  unitName: string;
}

/** A prep line that cannot be safely ordered — surfaced, never guessed. */
interface UnresolvedLine {
  itemId?: string;
  itemName: string;
  quantity: number;
  reason: string;
  unitCost: number;
  unitName: string;
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
    resolveUnitConversion = async () => undefined,
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
          asNonEmptyString(payload.eventId) ??
          asNonEmptyString(prepList?.eventId);

        if (!(tenantId && eventId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `missing ${tenantId ? "eventId" : "tenantId"} for finalized prep list`,
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
            reason:
              "finalized prep list has no PrepListItem rows — nothing to reserve or order",
            prepListId,
            tenantId,
          });
          continue;
        }

        // PrepListItem.ingredientId is a KITCHEN Ingredient id; the inventory
        // mapping lives on Ingredient.inventoryItemId. Resolve each distinct
        // ingredient to its inventory item (falling back to the raw id for
        // rows that already carry an InventoryItem id directly).
        const inventoryIdByIngredient = await resolveIngredientInventoryIds(
          storeProvider,
          tenantId,
          sourceItems
        );

        // Free stock per item, snapshotted BEFORE this list's reservation:
        // net purchase demand = max(0, demand - free-at-reservation-time).
        const inventoryStoreForSnapshot = storeProvider("InventoryItem");
        const freeBeforeReserve = new Map<string, number>();
        for (const item of sourceItems) {
          const ingredientId = asNonEmptyString(item.ingredientId);
          const quantity = asPositiveNumber(item.scaledQuantity);
          if (!ingredientId || quantity === undefined) {
            onDiagnostic({
              stage: "reserve",
              reason:
                "prep item skipped: missing ingredientId or non-positive scaledQuantity",
              prepListId,
              tenantId,
              detail: {
                prepItemId: asNonEmptyString(item.id),
                ingredientName: asNonEmptyString(item.ingredientName),
              },
            });
            continue;
          }
          const inventoryItemId = inventoryIdByIngredient.get(ingredientId);
          if (!inventoryItemId) {
            // No inventory mapping — nothing to reserve. The line is surfaced
            // on the UNRESOLVED draft by resolveDemandLines, not dropped.
            continue;
          }

          if (
            inventoryStoreForSnapshot &&
            !freeBeforeReserve.has(inventoryItemId)
          ) {
            const snapshot = (await inventoryStoreForSnapshot.getById(
              inventoryItemId
            )) as InventoryItemLike | undefined;
            if (snapshot && asNonEmptyString(snapshot.tenantId) === tenantId) {
              const onHand = asNonNegativeNumber(snapshot.quantityOnHand) ?? 0;
              const reserved =
                asNonNegativeNumber(snapshot.quantityReserved) ?? 0;
              freeBeforeReserve.set(
                inventoryItemId,
                Math.max(0, onHand - reserved)
              );
            }
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
                asNonEmptyString(
                  (ctx as { correlationId?: unknown }).correlationId
                ) ??
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

        const procurementEvents = await consolidateSupplierDrafts({
          ctx,
          prepListId,
          prepList,
          tenantId,
          eventId,
          sourceItems,
          inventoryIdByIngredient,
          freeBeforeReserve,
          storeProvider,
          dispatchCommand,
          systemUserId,
          onDiagnostic,
          resolveUnitConversion,
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

interface ConsolidateOptions {
  ctx: MiddlewareContext;
  dispatchCommand: DispatchCommand;
  eventId: string;
  freeBeforeReserve: Map<string, number>;
  /** PrepListItem.ingredientId -> tenant InventoryItem id (unmapped ids absent). */
  inventoryIdByIngredient: Map<string, string>;
  onDiagnostic: (diag: PrepDemandDiagnostic) => void;
  prepList: PrepListLike | undefined;
  prepListId: string;
  resolveUnitConversion: (
    fromUnit: string,
    toUnit: string
  ) => Promise<number | undefined>;
  sourceItems: PrepListItemLike[];
  storeProvider: (entityName: string) => Store | undefined;
  systemUserId: string;
  tenantId: string;
}

interface DemandResolution {
  coveredByStock: number;
  lines: ProcurementLine[];
  unresolved: UnresolvedLine[];
  unresolvedUnmapped: UnresolvedLine[];
}

async function consolidateSupplierDrafts(
  options: ConsolidateOptions
): Promise<NonNullable<CommandResult["emittedEvents"]>> {
  const { prepListId, tenantId, storeProvider, onDiagnostic } = options;

  const requisitionStore = storeProvider("PurchaseRequisition");
  const requisitionItemStore = storeProvider("PurchaseRequisitionItem");
  const supplierStore = storeProvider("InventorySupplier");
  const catalogStore = storeProvider("VendorCatalog");
  const inventoryStore = storeProvider("InventoryItem");

  if (
    !(
      requisitionStore &&
      requisitionItemStore &&
      supplierStore &&
      catalogStore &&
      inventoryStore
    )
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

  const suppliersById = new Map<string, InventorySupplierLike>();
  for (const raw of await supplierStore.getAll()) {
    const supplier = raw as InventorySupplierLike;
    const id = asNonEmptyString(supplier.id);
    if (
      id &&
      asNonEmptyString(supplier.tenantId) === tenantId &&
      isActiveSupplier(supplier)
    ) {
      suppliersById.set(id, supplier);
    }
  }

  const catalogsBySupplier = new Map<string, VendorCatalogLike[]>();
  for (const raw of await catalogStore.getAll()) {
    const entry = raw as VendorCatalogLike;
    const supplierId = asNonEmptyString(entry.supplierId);
    if (
      supplierId &&
      asNonEmptyString(entry.tenantId) === tenantId &&
      entry.deletedAt == null &&
      entry.isActive !== false
    ) {
      const bucket = catalogsBySupplier.get(supplierId) ?? [];
      bucket.push(entry);
      catalogsBySupplier.set(supplierId, bucket);
    }
  }

  const resolution = await resolveDemandLines({
    options,
    inventoryStore,
    suppliersById,
    catalogsBySupplier,
  });

  const totalActionable =
    resolution.lines.length +
    resolution.unresolved.length +
    resolution.unresolvedUnmapped.length;
  if (totalActionable === 0) {
    onDiagnostic({
      stage: "match",
      reason: `no purchase lines needed: ${resolution.coveredByStock} covered by stock, 0 unresolved of ${options.sourceItems.length} prep items`,
      prepListId,
      tenantId,
    });
    return [];
  }

  const emittedEvents: NonNullable<CommandResult["emittedEvents"]> = [];

  // One draft per supplier with resolved, pack-rounded lines.
  const bySupplier = new Map<string, ProcurementLine[]>();
  for (const line of resolution.lines) {
    const bucket = bySupplier.get(line.supplierId) ?? [];
    bucket.push(line);
    bySupplier.set(line.supplierId, bucket);
  }
  for (const [supplierId, lines] of bySupplier) {
    const supplierName =
      asNonEmptyString(suppliersById.get(supplierId)?.name) ?? supplierId;
    const events = await upsertSupplierDraft({
      options,
      requisitionStore,
      requisitionItemStore,
      supplierId,
      supplierName,
      sourceType: "prep_demand",
      requisitionPrefix: "PREP-DRAFT",
      justification: `Consolidated prep-list demand draft for ${supplierName}. Source prep lists are tracked in notes and per-line sourcePrepListIds.`,
      lines: lines.map((line) => ({
        itemId: line.itemId,
        itemName: line.itemName,
        quantity: line.quantity,
        unitCost: line.unitCost,
        unitName: line.unitName,
        specifications:
          asNonEmptyString(line.catalog.supplierSku) ??
          asNonEmptyString(line.catalog.itemNumber) ??
          "",
        suggestedVendorId: line.supplierId,
        suggestedVendorName: line.supplierName,
        lineNote: `unit: ${line.unitName}; catalog ${asNonEmptyString(line.catalog.id) ?? ""}`,
      })),
      extraNotes: [],
    });
    emittedEvents.push(...events);
  }

  // A single per-tenant UNRESOLVED draft for lines that cannot be safely
  // ordered — separated, never guessed. Ingredient lines without a tenant
  // inventory item cannot become requisition ITEM rows (itemId is required),
  // so they are recorded in the draft's notes instead.
  const unresolvedAll = [
    ...resolution.unresolved,
    ...resolution.unresolvedUnmapped,
  ];
  if (unresolvedAll.length > 0) {
    const events = await upsertSupplierDraft({
      options,
      requisitionStore,
      requisitionItemStore,
      supplierId: "",
      supplierName: "UNRESOLVED",
      sourceType: "prep_demand_unresolved",
      requisitionPrefix: "PREP-UNRESOLVED",
      justification:
        "Prep-list demand that could NOT be safely ordered (missing supplier mapping, catalog entry, or unit conversion). Resolve each line, then move it to a supplier draft — quantities here are NET demand in prep units, not pack-rounded.",
      lines: resolution.unresolved.map((line) => ({
        itemId: line.itemId as string,
        itemName: line.itemName,
        quantity: line.quantity,
        unitCost: line.unitCost,
        unitName: line.unitName,
        specifications: "",
        suggestedVendorId: "",
        suggestedVendorName: "",
        lineNote: `UNRESOLVED: ${line.reason}; qty in ${line.unitName}`,
      })),
      extraNotes: resolution.unresolvedUnmapped.map(
        (line) =>
          `[unmapped] ${line.itemName} (${line.quantity} ${line.unitName}): ${line.reason}`
      ),
    });
    emittedEvents.push(...events);
  }

  onDiagnostic({
    stage: "done",
    reason: `demand consolidated across ${bySupplier.size} supplier draft(s) + ${unresolvedAll.length > 0 ? 1 : 0} unresolved draft; ${resolution.lines.length} order line(s), ${unresolvedAll.length} unresolved, ${resolution.coveredByStock} covered by stock; drafts await manager review — NOT submitted`,
    prepListId,
    tenantId,
  });

  return emittedEvents;
}

/** Resolve every prep item into an orderable line, an unresolved line, or stock-covered. */
async function resolveDemandLines(args: {
  options: ConsolidateOptions;
  inventoryStore: Store;
  suppliersById: Map<string, InventorySupplierLike>;
  catalogsBySupplier: Map<string, VendorCatalogLike[]>;
}): Promise<DemandResolution> {
  const { options, inventoryStore, suppliersById, catalogsBySupplier } = args;
  const {
    prepListId,
    tenantId,
    sourceItems,
    inventoryIdByIngredient,
    freeBeforeReserve,
    onDiagnostic,
    resolveUnitConversion,
  } = options;

  const lines: ProcurementLine[] = [];
  const unresolved: UnresolvedLine[] = [];
  const unresolvedUnmapped: UnresolvedLine[] = [];
  let coveredByStock = 0;

  for (const item of sourceItems) {
    const ingredientId = asNonEmptyString(item.ingredientId);
    const quantity = asPositiveNumber(item.scaledQuantity);
    if (!ingredientId || quantity === undefined) {
      continue; // already reported in the reserve loop
    }
    const prepUnit = asNonEmptyString(item.scaledUnit) ?? "each";
    const prepName = asNonEmptyString(item.ingredientName) ?? ingredientId;

    const inventoryItemId = inventoryIdByIngredient.get(ingredientId);
    const inventoryItem = inventoryItemId
      ? ((await inventoryStore.getById(inventoryItemId)) as
          | InventoryItemLike
          | undefined)
      : undefined;
    if (
      !inventoryItemId ||
      asNonEmptyString(inventoryItem?.tenantId) !== tenantId
    ) {
      unresolvedUnmapped.push({
        itemName: prepName,
        quantity,
        unitName: prepUnit,
        unitCost: 0,
        reason: "ingredient has no tenant inventory item",
      });
      onDiagnostic({
        stage: "match",
        reason: "ingredient has no tenant inventory item — line UNRESOLVED",
        prepListId,
        tenantId,
        detail: { ingredientId, ingredientName: prepName },
      });
      continue;
    }

    const free = freeBeforeReserve.get(inventoryItemId) ?? 0;
    const netDemand = Math.max(0, round3(quantity - free));
    if (netDemand <= 0) {
      coveredByStock += 1;
      onDiagnostic({
        stage: "stock",
        reason: `demand fully covered by free stock (${free} on hand free ≥ ${quantity} needed) — nothing to purchase`,
        prepListId,
        tenantId,
        detail: { ingredientId: inventoryItemId, ingredientName: prepName },
      });
      continue;
    }

    const fallbackCost = asNonNegativeNumber(inventoryItem?.unitCost) ?? 0;
    const supplierId = asNonEmptyString(inventoryItem?.supplierId);
    const supplier = supplierId ? suppliersById.get(supplierId) : undefined;
    if (!(supplierId && supplier)) {
      unresolved.push({
        itemId: inventoryItemId,
        itemName: prepName,
        quantity: netDemand,
        unitName: prepUnit,
        unitCost: fallbackCost,
        reason: supplierId
          ? `supplier ${supplierId} is inactive/suspended/missing`
          : "inventory item has no supplier mapping",
      });
      continue;
    }
    const supplierName = asNonEmptyString(supplier.name) ?? supplierId;

    const catalog = findCatalogEntry(
      catalogsBySupplier.get(supplierId) ?? [],
      inventoryItem,
      item
    );
    if (!catalog) {
      unresolved.push({
        itemId: inventoryItemId,
        itemName: prepName,
        quantity: netDemand,
        unitName: prepUnit,
        unitCost: fallbackCost,
        reason: `no ${supplierName} catalog entry (SKU/pack info) matched`,
      });
      continue;
    }

    const catalogUnit = asNonEmptyString(catalog.unitOfMeasure) ?? "each";
    const factor = await unitFactor(
      prepUnit,
      catalogUnit,
      resolveUnitConversion
    );
    if (factor === undefined) {
      unresolved.push({
        itemId: inventoryItemId,
        itemName: prepName,
        quantity: netDemand,
        unitName: prepUnit,
        unitCost: fallbackCost,
        reason: `no unit conversion ${prepUnit} → ${catalogUnit} (${supplierName} orders in ${catalogUnit})`,
      });
      continue;
    }

    const convertedQty = round3(netDemand * factor);
    const packQty = applyOrderMinimums(convertedQty, catalog);
    const unitCost = asNonNegativeNumber(catalog.baseUnitCost) ?? fallbackCost;
    lines.push({
      itemId: inventoryItemId,
      itemName:
        asNonEmptyString(catalog.itemName) ??
        asNonEmptyString(inventoryItem?.name) ??
        prepName,
      quantity: packQty,
      unitName: catalogUnit,
      unitCost,
      totalCost: roundMoney(packQty * unitCost),
      supplierId,
      supplierName,
      catalog,
    });
  }

  return { lines, unresolved, unresolvedUnmapped, coveredByStock };
}

/** Exact-code identity converts 1:1; anything else must have a real conversion. */
async function unitFactor(
  fromUnit: string,
  toUnit: string,
  resolveUnitConversion: (
    fromUnit: string,
    toUnit: string
  ) => Promise<number | undefined>
): Promise<number | undefined> {
  const from = fromUnit.trim().toLowerCase();
  const to = toUnit.trim().toLowerCase();
  if (from === to) {
    return 1;
  }
  const factor = await resolveUnitConversion(from, to);
  return typeof factor === "number" && Number.isFinite(factor) && factor > 0
    ? factor
    : undefined;
}

interface DraftLineInput {
  itemId: string;
  itemName: string;
  lineNote: string;
  quantity: number;
  specifications: string;
  suggestedVendorId: string;
  suggestedVendorName: string;
  unitCost: number;
  unitName: string;
}

/**
 * Find-or-create the open draft for (tenant, supplierId|unresolved), merge the
 * given lines into it (accumulating sourcePrepListIds provenance), and refresh
 * totals + the ingested-prep-list marker.
 */
async function upsertSupplierDraft(args: {
  options: ConsolidateOptions;
  requisitionStore: Store;
  requisitionItemStore: Store;
  supplierId: string;
  supplierName: string;
  sourceType: string;
  requisitionPrefix: string;
  justification: string;
  lines: DraftLineInput[];
  extraNotes: string[];
}): Promise<NonNullable<CommandResult["emittedEvents"]>> {
  const {
    options,
    requisitionStore,
    requisitionItemStore,
    supplierId,
    supplierName,
    sourceType,
    requisitionPrefix,
    justification,
    lines,
    extraNotes,
  } = args;
  const {
    ctx,
    prepListId,
    prepList,
    tenantId,
    eventId,
    dispatchCommand,
    systemUserId,
    onDiagnostic,
  } = options;

  const emittedEvents: NonNullable<CommandResult["emittedEvents"]> = [];
  const commonOptions = {
    correlationId:
      asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
      prepListId,
    causationId: "PrepListFinalized",
  };

  const openDraft = (await requisitionStore.getAll())
    .map((row) => row as RequisitionLike)
    .filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.itemCategory) === "prep-list-demand" &&
        asNonEmptyString(row.status) === "draft" &&
        row.deletedAt == null &&
        (asNonEmptyString(row.supplierId) ?? "") === supplierId &&
        (asNonEmptyString(row.sourceType) ?? "prep_demand") === sourceType
    )
    .sort((a, b) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
    )[0];

  let requisitionId = asNonEmptyString(openDraft?.id);
  const existingNotes = String(openDraft?.notes ?? "");
  let createdNew = false;

  if (!requisitionId) {
    requisitionId = randomUUID();
    createdNew = true;
    const createResult = await dispatchCommand(
      "create",
      {
        id: requisitionId,
        tenantId,
        requisitionNumber: `${requisitionPrefix}-${requisitionId.slice(0, 8).toUpperCase()}`,
        locationId: eventId,
        department: "kitchen",
        // The finalizing user is the requester — also keeps the live
        // requested_by uuid column valid (a synthetic "system:*" string is
        // not a uuid).
        requestedBy:
          asNonEmptyString(
            (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
          ) ?? systemUserId,
        requiredBy: Date.now() + 2 * 24 * 60 * 60 * 1000,
        justification,
        priority: "normal",
        itemCategory: "prep-list-demand",
        sourceType,
        supplierId,
      },
      {
        entityName: "PurchaseRequisition",
        ...commonOptions,
        idempotencyKey: `prep-demand:${tenantId}:${prepListId}:requisition:${supplierId || "unresolved"}`,
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
    if (!itemId) {
      continue;
    }
    finalLines.set(itemId, {
      quantity: asNonNegativeNumber(row.quantityRequested) ?? 0,
      unitCost: asNonNegativeNumber(row.estimatedUnitCost) ?? 0,
    });
  }

  let mergedCount = 0;
  let createdCount = 0;
  for (const line of lines) {
    const existing = existingByItemId.get(line.itemId);
    const provenance = mergePrepListIds(
      existing?.sourcePrepListIds,
      prepListId
    );
    if (existing) {
      const existingQty = asNonNegativeNumber(existing.quantityRequested) ?? 0;
      const mergedQty = round3(existingQty + line.quantity);
      const itemResult = await dispatchCommand(
        "update",
        {
          quantityRequested: mergedQty,
          // Latest catalog cost wins for the whole line.
          estimatedUnitCost: line.unitCost,
          suggestedVendorId: line.suggestedVendorId,
          suggestedVendorName: line.suggestedVendorName,
          specifications:
            asNonEmptyString(existing.specifications) ?? line.specifications,
          notes:
            `${String(existing.notes ?? "")} | +${line.quantity} ${line.unitName} from prep ${prepListId.slice(0, 8)}`.trim(),
          sourcePrepListIds: provenance,
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
      finalLines.set(line.itemId, {
        quantity: mergedQty,
        unitCost: line.unitCost,
      });
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
          suggestedVendorId: line.suggestedVendorId,
          suggestedVendorName: line.suggestedVendorName,
          specifications: line.specifications,
          notes: `${line.lineNote}; prep ${prepListId.slice(0, 8)}`,
          sourcePrepListIds: provenance,
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
      finalLines.set(line.itemId, {
        quantity: line.quantity,
        unitCost: line.unitCost,
      });
      createdCount += 1;
    }
  }

  const subtotal = roundMoney(
    [...finalLines.values()].reduce(
      (sum, line) => sum + roundMoney(line.quantity * line.unitCost),
      0
    )
  );
  const prepListName = asNonEmptyString(prepList?.name) ?? "Prep List";
  const noteParts = [
    existingNotes,
    `${prepMarker(prepListId)} ${prepListName} (event ${eventId})`,
    ...extraNotes,
  ].filter(Boolean);
  const completeResult = await dispatchCommand(
    "completeDraftFromPrepDemand",
    {
      itemCount: finalLines.size,
      subtotal,
      estimatedTax: 0,
      estimatedShipping: 0,
      estimatedTotal: subtotal,
      notes: noteParts.join(" ").trim(),
    },
    {
      entityName: "PurchaseRequisition",
      instanceId: requisitionId,
      ...commonOptions,
      idempotencyKey: `prep-demand:${tenantId}:${prepListId}:complete:${supplierId || "unresolved"}`,
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
    stage: "order",
    reason: `${supplierName} draft ${createdNew ? "created" : "updated"} (${createdCount} new line(s), ${mergedCount} merged)`,
    prepListId,
    tenantId,
    requisitionId,
    detail: { subtotal, itemCount: finalLines.size, sourceType },
  });

  return emittedEvents;
}

/** Append the prep list id to an existing provenance array (deduplicated). */
function mergePrepListIds(existing: unknown, prepListId: string): string[] {
  const ids = Array.isArray(existing)
    ? existing.filter((value): value is string => typeof value === "string")
    : [];
  return ids.includes(prepListId) ? ids : [...ids, prepListId];
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
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

function findCatalogEntry(
  entries: VendorCatalogLike[],
  inventoryItem: InventoryItemLike | undefined,
  prepItem: PrepListItemLike
): VendorCatalogLike | undefined {
  const inventoryNumber = normalizeSku(
    asNonEmptyString(inventoryItem?.itemNumber) ??
      asNonEmptyString(inventoryItem?.item_number)
  );
  const inventoryName = normalizeName(asNonEmptyString(inventoryItem?.name));
  const prepName = normalizeName(asNonEmptyString(prepItem.ingredientName));

  return entries.find((entry) => {
    const catalogNumber = normalizeSku(asNonEmptyString(entry.itemNumber));
    const catalogSku = normalizeSku(asNonEmptyString(entry.supplierSku));
    const catalogName = normalizeName(asNonEmptyString(entry.itemName));
    return (
      (!!inventoryNumber &&
        (catalogNumber === inventoryNumber ||
          catalogSku === inventoryNumber)) ||
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

/**
 * Live Prisma stores surface numeric columns as Decimal objects (and raw
 * reads may surface numeric strings) — in-memory tests surface plain numbers.
 * Coerce all three, or every Decimal quantity silently drops.
 */
function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return;
}

function asPositiveNumber(value: unknown): number | undefined {
  const parsed = coerceFiniteNumber(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function asNonNegativeNumber(value: unknown): number | undefined {
  const parsed = coerceFiniteNumber(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
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
