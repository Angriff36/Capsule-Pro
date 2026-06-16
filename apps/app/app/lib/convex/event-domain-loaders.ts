import "server-only";

import type { EventDishSummary, RelatedEventSummary } from "@/app/(authenticated)/events/[eventId]/event-details-types";
import {
  activeTenantRows,
  convexDocId,
  msToDate,
  parseDecimalString,
  serverListEntity,
  type ConvexDoc,
} from "./server-reads";

function eventScopedRows(rows: ConvexDoc[], eventId: string): ConvexDoc[] {
  return activeTenantRows(rows).filter((r) => String(r.eventId) === eventId);
}

export async function countEventStaff(_tenantId: string, eventId: string) {
  return eventScopedRows(await serverListEntity("EventStaff"), eventId).length;
}

export async function eventHasContract(_tenantId: string, eventId: string) {
  return (
    eventScopedRows(await serverListEntity("EventContract"), eventId).length > 0
  );
}

export async function eventHasBudget(_tenantId: string, eventId: string) {
  return (
    eventScopedRows(await serverListEntity("EventBudget"), eventId).length > 0
  );
}

export async function loadRelatedEvents(
  _tenantId: string,
  eventId: string
): Promise<RelatedEventSummary[]> {
  const docs = activeTenantRows(await serverListEntity("Event")).filter(
    (e) => convexDocId(e) !== eventId
  );

  return docs
    .map((doc) => ({
      id: convexDocId(doc),
      title: String(doc.title ?? ""),
      eventType: String(doc.eventType ?? ""),
      eventDate: msToDate(doc.eventDate) ?? new Date(0),
      guestCount: Number(doc.guestCount ?? 0),
      status: String(doc.status ?? ""),
      venueName: (doc.venueName as string | null) ?? null,
      venueAddress: (doc.venueAddress as string | null) ?? null,
      ticketPrice: doc.ticketPrice ? parseDecimalString(doc.ticketPrice) : null,
      ticketTier: (doc.ticketTier as string | null) ?? null,
      eventFormat: (doc.eventFormat as string | null) ?? null,
      accessibilityOptions: Array.isArray(doc.accessibilityOptions)
        ? (doc.accessibilityOptions as string[])
        : [],
      featuredMediaUrl: (doc.featuredMediaUrl as string | null) ?? null,
      tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    }))
    .sort(
      (a, b) =>
        a.eventDate.getTime() - b.eventDate.getTime() ||
        b.id.localeCompare(a.id)
    )
    .slice(0, 50);
}

export async function loadEventDishesSummary(
  _tenantId: string,
  eventId: string
): Promise<EventDishSummary[]> {
  const [linksRaw, dishesRaw, recipesRaw] = await Promise.all([
    serverListEntity("EventDish"),
    serverListEntity("Dish"),
    serverListEntity("Recipe"),
  ]);

  const dishById = new Map(
    activeTenantRows(dishesRaw).map((d) => [convexDocId(d), d])
  );
  const recipeById = new Map(
    activeTenantRows(recipesRaw).map((r) => [convexDocId(r), r])
  );

  return eventScopedRows(linksRaw, eventId)
    .map((link) => {
      const dish = dishById.get(String(link.dishId));
      const recipe = dish?.recipeId
        ? recipeById.get(String(dish.recipeId))
        : undefined;

      return {
        linkId: convexDocId(link),
        dishId: String(link.dishId),
        name: String(dish?.name ?? ""),
        category: (dish?.category as string | null) ?? null,
        recipeId: dish?.recipeId ? String(dish.recipeId) : null,
        recipeName: recipe ? String(recipe.name ?? "") : null,
        course: (link.course as string | null) ?? null,
        quantityServings: Number(link.quantityServings ?? 0),
        dietaryTags: Array.isArray(dish?.dietaryTags)
          ? (dish.dietaryTags as string[])
          : [],
        presentationImageUrl:
          (dish?.presentationImageUrl as string | null) ?? null,
        pricePerPerson: dish?.pricePerPerson
          ? parseDecimalString(dish.pricePerPerson)
          : null,
        costPerPerson: dish?.costPerPerson
          ? parseDecimalString(dish.costPerPerson)
          : null,
      };
    })
    .sort(
      (a, b) =>
        (a.course ?? "").localeCompare(b.course ?? "") ||
        a.name.localeCompare(b.name)
    );
}

export async function loadPrepTasksForEvent(_tenantId: string, eventId: string) {
  return eventScopedRows(await serverListEntity("PrepTask"), eventId)
    .map((task) => ({
      id: convexDocId(task),
      name: String(task.name ?? ""),
      status: String(task.status ?? ""),
      quantityTotal: parseDecimalString(task.quantityTotal),
      servingsTotal:
        task.servingsTotal != null ? Number(task.servingsTotal) : null,
      dueByDate: task.dueByDate ?? null,
      isEventFinish: task.isEventFinish ?? false,
    }))
    .sort((a, b) => {
      const da = a.dueByDate != null ? Number(a.dueByDate) : Number.MAX_SAFE_INTEGER;
      const db = b.dueByDate != null ? Number(b.dueByDate) : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
}

export async function loadEventPrepLists(_tenantId: string, eventId: string) {
  return eventScopedRows(await serverListEntity("PrepList"), eventId)
    .map((prepList) => ({
      id: convexDocId(prepList),
      name: String(prepList.name ?? ""),
      status: String(prepList.status ?? ""),
      totalItems: Number(prepList.totalItems ?? 0),
      batchMultiplier: parseDecimalString(prepList.batchMultiplier),
      generatedAt: msToDate(prepList.generatedAt) ?? new Date(0),
      finalizedAt: msToDate(prepList.finalizedAt),
      isActive: prepList.isActive !== false,
    }))
    .sort(
      (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime()
    );
}

export async function loadRelatedGuestCounts(
  _tenantId: string,
  eventIds: string[]
) {
  if (eventIds.length === 0) {
    return new Map<string, number>();
  }

  const idSet = new Set(eventIds);
  const counts = new Map<string, number>(eventIds.map((id) => [id, 0]));

  for (const guest of activeTenantRows(await serverListEntity("EventGuest"))) {
    const eventId = String(guest.eventId ?? "");
    if (idSet.has(eventId)) {
      counts.set(eventId, (counts.get(eventId) ?? 0) + 1);
    }
  }

  return counts;
}
