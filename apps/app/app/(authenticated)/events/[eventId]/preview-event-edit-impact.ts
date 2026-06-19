"use server";

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  type AffectedEntity,
  type EventEditImpact,
  type EventFieldSnapshot,
  type ImpactCategory,
  affectedCategoriesFromChanges,
  assembleEventEditImpact,
  diffEventFields,
  emptyEventEditImpact,
} from "./event-edit-impact";

// ---------------------------------------------------------------------------
// FormData helpers — mirror event-mutation-actions.ts so the preview diff
// matches what the commit will actually send.
// ---------------------------------------------------------------------------

const getString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getNumber = (formData: FormData, key: string): number | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

// ---------------------------------------------------------------------------
// Downstream entity reads — each category is isolated so a schema/accessor
// drift in one area never blanks the whole preview (graceful degradation).
// ---------------------------------------------------------------------------

const MAX_PER_CATEGORY = 50;

async function readBattleBoards(
  tenantId: string,
  eventId: string
): Promise<AffectedEntity[]> {
  try {
    const boards = await database.battleBoard.findMany({
      where: { tenantId, eventId, deletedAt: null },
      select: { id: true, board_name: true, status: true },
      take: MAX_PER_CATEGORY,
    });
    return boards.map((b) => ({
      category: "battle_boards" as const,
      entityId: b.id,
      label: b.board_name || "Untitled board",
      subType: "Battle board",
      reason: `Snapshot re-syncs from this event · status ${b.status}`,
    }));
  } catch (error) {
    captureException(error);
    log.error("[previewEventEditImpact] battleBoard read failed:", error);
    return [];
  }
}

async function readStaffing(
  tenantId: string,
  eventId: string
): Promise<AffectedEntity[]> {
  try {
    const assignments = await database.eventStaff.findMany({
      where: { tenantId, eventId, deletedAt: null },
      select: {
        id: true,
        staffMemberId: true,
        role: true,
        status: true,
        shiftStart: true,
        shiftEnd: true,
      },
      take: MAX_PER_CATEGORY,
    });
    const staffIds = Array.from(
      new Set(assignments.map((a) => a.staffMemberId))
    );
    const staff =
      staffIds.length > 0
        ? await database.staffMember.findMany({
            where: { tenantId, id: { in: staffIds } },
            select: { id: true, displayName: true },
          })
        : [];
    const nameById = new Map(staff.map((s) => [s.id, s.displayName]));
    return assignments.map((a) => ({
      category: "staffing" as const,
      entityId: a.id,
      label: nameById.get(a.staffMemberId) || "Unnamed staff",
      subType: a.role ? `Staff · ${a.role}` : "Staff assignment",
      reason: `Shift follows event date · status ${a.status ?? "assigned"}`,
    }));
  } catch (error) {
    captureException(error);
    log.error("[previewEventEditImpact] staffing read failed:", error);
    return [];
  }
}

async function readKitchenPrep(
  tenantId: string,
  eventId: string
): Promise<AffectedEntity[]> {
  try {
    const [prepTasks, dishes] = await Promise.all([
      database.prepTask.findMany({
        where: { tenantId, eventId, deletedAt: null },
        select: { id: true, name: true, status: true, taskType: true },
        take: MAX_PER_CATEGORY,
      }),
      database.eventDish.findMany({
        where: { tenantId, eventId, deletedAt: null },
        select: {
          id: true,
          dishId: true,
          course: true,
          quantityServings: true,
        },
        take: MAX_PER_CATEGORY,
      }),
    ]);
    const entities: AffectedEntity[] = [];
    for (const task of prepTasks) {
      entities.push({
        category: "kitchen_prep",
        entityId: task.id,
        label: task.name || "Untitled prep task",
        subType: task.taskType ? `Prep · ${task.taskType}` : "Prep task",
        reason: `Timeline rescales · status ${task.status}`,
      });
    }
    for (const dish of dishes) {
      entities.push({
        category: "kitchen_prep",
        entityId: dish.id,
        label: dish.course ? `Dish · ${dish.course}` : "Event dish",
        subType: "Menu item",
        reason: `${dish.quantityServings} servings rescale with headcount`,
      });
    }
    return entities;
  } catch (error) {
    captureException(error);
    log.error("[previewEventEditImpact] kitchen prep read failed:", error);
    return [];
  }
}

async function readInventory(
  tenantId: string,
  eventId: string
): Promise<AffectedEntity[]> {
  // InventoryTransaction has no direct eventId; it links via
  // (referenceType, referenceId). Demand estimates also derive from the
  // event's dish/headcount data rather than committed pulls.
  try {
    const txns = await database.inventoryTransaction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        referenceId: eventId,
      },
      select: {
        id: true,
        itemId: true,
        transactionType: true,
        quantity: true,
        referenceType: true,
      },
      take: MAX_PER_CATEGORY,
    });
    const itemIds = Array.from(new Set(txns.map((t) => t.itemId)));
    const items =
      itemIds.length > 0
        ? await database.inventoryItem.findMany({
            where: { tenantId, id: { in: itemIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(items.map((i) => [i.id, i.name]));
    return txns.map((t) => ({
      category: "inventory" as const,
      entityId: t.id,
      label: nameById.get(t.itemId) || "Inventory item",
      subType: t.referenceType ? `Stock · ${t.referenceType}` : "Stock move",
      reason: `${t.transactionType} · qty ${t.quantity}`,
    }));
  } catch (error) {
    captureException(error);
    log.error("[previewEventEditImpact] inventory read failed:", error);
    return [];
  }
}

async function readInvoices(
  tenantId: string,
  eventId: string
): Promise<AffectedEntity[]> {
  try {
    const invoices = await database.invoice.findMany({
      where: { tenantId, eventId, deletedAt: null },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        dueDate: true,
      },
      take: MAX_PER_CATEGORY,
    });
    return invoices.map((inv) => ({
      category: "invoices" as const,
      entityId: inv.id,
      label: inv.invoiceNumber,
      subType: "Invoice",
      reason: `Billing follows event terms · status ${inv.status}`,
    }));
  } catch (error) {
    captureException(error);
    log.error("[previewEventEditImpact] invoices read failed:", error);
    return [];
  }
}

const DOWNSTREAM_READERS: Record<
  ImpactCategory,
  (tenantId: string, eventId: string) => Promise<AffectedEntity[]>
> = {
  battle_boards: readBattleBoards,
  staffing: readStaffing,
  kitchen_prep: readKitchenPrep,
  inventory: readInventory,
  invoices: readInvoices,
};

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Preview the downstream impact of an Event edit WITHOUT committing.
 *
 * Read-only: diffs the current event against the pending FormData, then reads
 * only the downstream categories the field changes actually touch. Returns a
 * display-ready {@link EventEditImpact} for the "What will change?" panel.
 *
 * The downstream read set mirrors the propagation fan-out encoded in
 * `manifest/runtime/src/middleware/event-updated-board-sync-middleware.ts`
 * (EventUpdated → BattleBoard.syncFromEvent) plus the broader cascades
 * touched by EventGuestCountUpdated / EventCancelled propagation
 * (kitchen prep rescale, staffing, invoice voids).
 *
 * Constitution §6/§10: reads bypass the runtime engine.
 */
export async function previewEventEditImpact(
  formData: FormData
): Promise<EventEditImpact> {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const eventId = getString(formData, "eventId");

  if (!eventId) {
    return emptyEventEditImpact("");
  }

  const existing = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    select: {
      title: true,
      eventDate: true,
      guestCount: true,
      clientId: true,
      venueName: true,
      venueAddress: true,
      status: true,
      eventType: true,
    },
  });

  if (!existing) {
    return emptyEventEditImpact(eventId);
  }

  const before: EventFieldSnapshot = {
    title: existing.title,
    eventDate: existing.eventDate,
    guestCount: existing.guestCount,
    clientId: existing.clientId,
    venueName: existing.venueName,
    venueAddress: existing.venueAddress,
    status: existing.status,
    eventType: existing.eventType,
  };

  const after: EventFieldSnapshot = {
    title: getString(formData, "title"),
    eventDate: getString(formData, "eventDate"),
    guestCount: getNumber(formData, "guestCount"),
    clientId: getString(formData, "clientId"),
    venueName: getString(formData, "venueName"),
    venueAddress: getString(formData, "venueAddress"),
    status: getString(formData, "status"),
    eventType: getString(formData, "eventType"),
  };

  const fieldChanges = diffEventFields(before, after);

  if (fieldChanges.length === 0) {
    return emptyEventEditImpact(eventId);
  }

  // Only read the downstream categories the change actually touches.
  const impacted = affectedCategoriesFromChanges(fieldChanges);
  const readResults = await Promise.all(
    [...impacted].map((category) =>
      DOWNSTREAM_READERS[category](tenantId, eventId)
    )
  );

  const affectedEntities = readResults.flat();

  return assembleEventEditImpact(eventId, fieldChanges, affectedEntities);
}
