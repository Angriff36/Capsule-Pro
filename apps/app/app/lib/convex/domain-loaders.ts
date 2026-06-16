import "server-only";

import { mapConvexInventoryItemToUi } from "@/app/lib/inventory-convex-mapper";
import {
  mapConvexEventListRow,
  mapConvexKitchenTask,
} from "./domain-mappers";
import {
  activeTenantRows,
  convexDocId,
  serverGetEntity,
  serverListEntity,
  type ConvexDoc,
} from "./server-reads";

export async function loadEventsListPageData() {
  const docs = activeTenantRows(await serverListEntity("Event"));
  const events = docs
    .map(mapConvexEventListRow)
    .sort(
      (a, b) =>
        b.eventDate.getTime() - a.eventDate.getTime() ||
        b.createdAt.getTime() - a.createdAt.getTime()
    );
  return events;
}

export async function loadKitchenProductionBoard() {
  const [tasksRaw, claimsRaw, usersRaw] = await Promise.all([
    serverListEntity("KitchenTask"),
    serverListEntity("KitchenTaskClaim"),
    serverListEntity("User"),
  ]);

  const users = activeTenantRows(usersRaw);
  const userById = new Map(users.map((u) => [convexDocId(u), u]));

  const tasks = tasksRaw
    .map((task) =>
      mapConvexKitchenTask(task, claimsRaw as ConvexDoc[], userById)
    )
    .sort((a, b) => {
      const pa = a.priority ?? 999;
      const pb = b.priority ?? 999;
      if (pa !== pb) {
        return pa - pb;
      }
      const da = a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });

  return { tasks, dbUser: null as null };
}

export async function loadInventoryItemDetail(itemId: string) {
  const doc = await serverGetEntity("InventoryItem", itemId);
  if (!doc || doc.deletedAt != null) {
    return null;
  }

  const item = mapConvexInventoryItemToUi(doc);
  let supplierName: string | null = null;
  if (item.supplier_id) {
    const supplier = await serverGetEntity("InventorySupplier", item.supplier_id);
    supplierName = supplier ? String(supplier.name ?? "") : null;
  }

  return { item, supplierName };
}

export async function loadInventoryItemsForClient() {
  return activeTenantRows(await serverListEntity("InventoryItem")).map(
    mapConvexInventoryItemToUi
  );
}

export async function loadInventorySuppliersForClient() {
  return activeTenantRows(await serverListEntity("InventorySupplier")).map(
    (s) => ({
      id: convexDocId(s),
      name: String(s.name ?? ""),
      supplier_number: String(s.supplier_number ?? s.supplierNumber ?? ""),
    })
  );
}

export async function loadEventRecord(tenantId: string, eventId: string) {
  const doc = await serverGetEntity("Event", eventId);
  if (!doc || doc.deletedAt != null || String(doc.tenantId) !== tenantId) {
    return null;
  }
  return doc;
}

export async function countEventGuests(tenantId: string, eventId: string) {
  const guests = activeTenantRows(await serverListEntity("EventGuest"));
  return guests.filter(
    (g) => String(g.tenantId) === tenantId && String(g.eventId) === eventId
  ).length;
}
