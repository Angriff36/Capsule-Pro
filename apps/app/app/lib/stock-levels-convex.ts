import {
  inventoryStockAdjust,
  inventoryStockCreate,
  listInventoryItems,
  listInventoryStocks,
  listInventoryTransactions,
  listStorageLocations,
} from "@/app/lib/manifest-client.generated";
import type {
  InventoryItem,
  InventoryStock,
  InventoryTransaction,
  StorageLocation as GeneratedStorageLocation,
} from "@/app/lib/manifest-types.generated";
import type {
  AdjustmentReason,
  CreateAdjustmentRequest,
  CreateAdjustmentResponse,
  InventoryTransaction as UiTransaction,
  LocationListResponse,
  StockLevelFilters,
  StockLevelListResponse,
  StockLevelWithStatus,
  StockReorderStatus,
  TransactionFilters,
  TransactionListResponse,
  TransactionType,
} from "@/app/lib/stock-levels";

const MANIFEST_TX_TO_UI: Record<string, TransactionType> = {
  receipt: "purchase",
  issue: "usage",
  adjustment: "adjustment",
  transfer: "transfer",
  waste: "waste",
  return: "return",
};

};

function activeRows<T extends { deletedAt?: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => !row.deletedAt);
}

function computeReorderStatus(
  quantity: number,
  reorderLevel: number
): StockReorderStatus {
  if (quantity <= reorderLevel) {
    return "below_par";
  }
  if (quantity <= reorderLevel * 1.1) {
    return "at_par";
  }
  return "above_par";
}

function computeParStatus(
  quantity: number,
  parLevel: number | null | undefined
): StockLevelWithStatus["parStatus"] {
  if (parLevel == null || parLevel <= 0) {
    return "no_par_set";
  }
  if (quantity < parLevel) {
    return "below_par";
  }
  if (quantity <= parLevel * 1.05) {
    return "at_par";
  }
  return "above_par";
}

function mapStockRow(
  stock: InventoryStock,
  item: InventoryItem,
  location: GeneratedStorageLocation | undefined
): StockLevelWithStatus {
  const quantity = stock.quantityOnHand ?? 0;
  const reorderLevel = item.reorder_level ?? 0;
  const parLevel = item.parLevel ?? null;
  const unitCost = item.unitCost ?? 0;

  return {
    id: stock.id,
    tenantId: stock.tenantId,
    inventoryItemId: stock.itemId,
    storageLocationId: stock.storageLocationId || null,
    quantityOnHand: quantity,
    reorderLevel,
    parLevel,
    reorderStatus: computeReorderStatus(quantity, reorderLevel),
    parStatus: computeParStatus(quantity, parLevel),
    stockOutRisk: quantity <= 0 || quantity <= reorderLevel,
    totalValue: quantity * unitCost,
    lastCountedAt: stock.lastCountedAt ? new Date(stock.lastCountedAt) : null,
    createdAt: new Date(stock.createdAt),
    updatedAt: new Date(stock.updatedAt),
    item: {
      id: item.id,
      itemNumber: item.item_number,
      name: item.name,
      category: item.category,
      unitCost,
      unit: item.unitOfMeasure ?? null,
    },
    storageLocation: location
      ? { id: location.id, name: location.name }
      : null,
  };
}

function applyStockFilters(
  rows: StockLevelWithStatus[],
  filters: StockLevelFilters
): StockLevelWithStatus[] {
  let result = rows;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (row) =>
        row.item.name.toLowerCase().includes(q) ||
        row.item.itemNumber.toLowerCase().includes(q)
    );
  }
  if (filters.category) {
    result = result.filter((row) => row.item.category === filters.category);
  }
  if (filters.locationId) {
    result = result.filter(
      (row) => row.storageLocationId === filters.locationId
    );
  }
  if (filters.reorderStatus) {
    result = result.filter(
      (row) => row.reorderStatus === filters.reorderStatus
    );
  }
  if (filters.lowStock) {
    result = result.filter((row) => row.reorderStatus === "below_par");
  }
  if (filters.outOfStock) {
    result = result.filter((row) => row.quantityOnHand <= 0);
  }

  return result;
}

async function loadStockContext() {
  const [stocksResult, itemsResult, locationsResult] = await Promise.all([
    listInventoryStocks(),
    listInventoryItems(),
    listStorageLocations(),
  ]);

  const itemsById = new Map(
    activeRows(itemsResult.data).map((item) => [item.id, item])
  );
  const locationsById = new Map(
    activeRows(locationsResult.data).map((loc) => [loc.id, loc])
  );

  return { stocks: stocksResult.data, itemsById, locationsById };
}

export async function listStockLevelsFromConvex(
  filters: StockLevelFilters = {}
): Promise<StockLevelListResponse> {
  const { stocks, itemsById, locationsById } = await loadStockContext();

  const rows = stocks
    .map((stock) => {
      const item = itemsById.get(stock.itemId);
      if (!item) {
        return null;
      }
      return mapStockRow(
        stock,
        item,
        locationsById.get(stock.storageLocationId)
      );
    })
    .filter((row): row is StockLevelWithStatus => row != null);

  const filtered = applyStockFilters(rows, filters);
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary: {
      totalItems: filtered.length,
      totalValue: filtered.reduce((sum, row) => sum + row.totalValue, 0),
      belowParCount: filtered.filter((row) => row.parStatus === "below_par")
        .length,
      outOfStockCount: filtered.filter((row) => row.quantityOnHand <= 0)
        .length,
    },
  };
}

async function findStockRecord(
  itemId: string,
  storageLocationId: string | null
): Promise<InventoryStock | undefined> {
  const { data } = await listInventoryStocks();
  return data.find(
    (stock) =>
      stock.itemId === itemId &&
      stock.storageLocationId === (storageLocationId ?? "")
  );
}

export async function createAdjustmentFromConvex(
  request: CreateAdjustmentRequest
): Promise<CreateAdjustmentResponse> {
  const locationId = request.storageLocationId ?? "";
  let stock = await findStockRecord(
    request.inventoryItemId,
    request.storageLocationId
  );

  if (!stock) {
    stock = await inventoryStockCreate({
      itemId: request.inventoryItemId,
      storageLocationId: locationId,
      quantityOnHand: 0,
      unitId: 0,
    });
  }

  if (!stock) {
    throw new Error("Failed to resolve inventory stock record");
  }

  const previousQuantity = stock.quantityOnHand ?? 0;
  const delta =
    request.adjustmentType === "increase"
      ? request.quantity
      : -request.quantity;

  const adjusted = await inventoryStockAdjust({
    id: stock.id,
    delta,
    reason: request.reason,
  });

  if (!adjusted) {
    throw new Error("Failed to create adjustment");
  }

  const { itemsById, locationsById } = await loadStockContext();
  const item = itemsById.get(adjusted.itemId);
  if (!item) {
    throw new Error("Failed to load inventory item after adjustment");
  }

  const stockLevel = mapStockRow(
    adjusted,
    item,
    locationsById.get(adjusted.storageLocationId)
  );
  const newQuantity = adjusted.quantityOnHand ?? 0;

  return {
    success: true,
    message: "Stock adjusted",
    adjustment: {
      id: adjusted.id,
      previousQuantity,
      newQuantity,
      adjustmentAmount: Math.abs(delta),
      transactionId: adjusted.id,
    },
    stockLevel,
  };
}

function mapTransactionRow(
  tx: InventoryTransaction,
  item: InventoryItem | undefined,
  location: GeneratedStorageLocation | undefined
): UiTransaction {
  const uiType =
    MANIFEST_TX_TO_UI[tx.transactionType] ?? ("adjustment" as TransactionType);

  return {
    id: tx.id,
    tenantId: tx.tenantId,
    inventoryItemId: tx.itemId,
    transactionType: uiType,
    quantity: tx.quantity ?? 0,
    unitCost: tx.unitCost ?? null,
    totalCost: tx.totalCost ?? null,
    referenceId: tx.referenceId || null,
    referenceType: tx.referenceType || null,
    notes: tx.notes ?? null,
    reason: (tx.reason as AdjustmentReason | null) || null,
    performedBy: tx.employeeId || null,
    performedByUser: null,
    storageLocationId: tx.storageLocationId || null,
    storageLocation: location
      ? { id: location.id, name: location.name }
      : null,
    createdAt: new Date(tx.createdAt),
    item: item
      ? {
          id: item.id,
          itemNumber: item.item_number,
          name: item.name,
          category: item.category,
        }
      : null,
  };
}

export async function listTransactionsFromConvex(
  filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
  const [txResult, itemsResult, locationsResult] = await Promise.all([
    listInventoryTransactions(),
    listInventoryItems(),
    listStorageLocations(),
  ]);

  const itemsById = new Map(
    activeRows(itemsResult.data).map((item) => [item.id, item])
  );
  const locationsById = new Map(
    activeRows(locationsResult.data).map((loc) => [loc.id, loc])
  );

  let rows = txResult.data.map((tx) =>
    mapTransactionRow(
      tx,
      itemsById.get(tx.itemId),
      tx.storageLocationId
        ? locationsById.get(tx.storageLocationId)
        : undefined
    )
  );

  if (filters.inventoryItemId) {
    rows = rows.filter((row) => row.inventoryItemId === filters.inventoryItemId);
  }
  if (filters.transactionType) {
    rows = rows.filter(
      (row) => row.transactionType === filters.transactionType
    );
  }
  if (filters.locationId) {
    rows = rows.filter((row) => row.storageLocationId === filters.locationId);
  }
  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    rows = rows.filter((row) => row.createdAt.getTime() >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    rows = rows.filter((row) => row.createdAt.getTime() <= end);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const total = rows.length;
  const start = (page - 1) * limit;

  return {
    data: rows.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function listLocationsFromConvex(): Promise<LocationListResponse> {
  const { data } = await listStorageLocations();
  return {
    data: activeRows(data).map((loc) => ({
      id: loc.id,
      tenantId: loc.tenantId,
      name: loc.name,
      locationType: loc.storageType,
      address: null,
      isActive: loc.isActive ?? true,
      createdAt: new Date(loc.createdAt),
      updatedAt: new Date(loc.updatedAt),
    })),
  };
}
