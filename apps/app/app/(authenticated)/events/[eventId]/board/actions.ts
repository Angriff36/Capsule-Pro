"use server";

import { database } from "@repo/database";
import { apiPostJsonServer } from "@/app/lib/api-server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import {
  type DraftEnvelope,
  parseDraftEnvelope,
  writeDraftEnvelope,
} from "./draft-metadata";
import {
  computeStaffImpact,
  type StaffDraftInput,
  type StaffImpact,
} from "./impact";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventBoardData {
  /** Battle boards already linked to this event (real editor lives at /events/battle-boards/[id]). */
  battleBoards: Array<{ id: string; name: string }>;
  boardId: string | null;
  committedCounts: {
    staff: number;
    menu: number;
    vehicles: number;
    equipment: number;
    battleboard: number;
  };
  committedDishes: Array<{
    eventDishId: string;
    dishId: string;
    name: string;
    course: string;
    quantityServings: number;
  }>;
  committedStaff: Array<{
    id: string;
    staffMemberId: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  }>;
  draftCards: Array<{ cardId: string; envelope: DraftEnvelope; title: string }>;
  event: {
    id: string;
    title: string;
    eventType: string;
    eventDate: string;
    guestCount: number;
    venueName: string;
  };
}

export interface PaletteStaff {
  avatarUrl: string | null;
  hourlyRate: string | null;
  id: string;
  name: string;
  role: string;
}

export interface PaletteDish {
  category: string;
  id: string;
  name: string;
  pricePerPerson: string | null;
}

const COMMITTED_STAFF_STATUSES = ["assigned", "confirmed", "checked_in"];

// ---------------------------------------------------------------------------
// 1. getOrCreateEventBoard
// ---------------------------------------------------------------------------

export async function getOrCreateEventBoard(
  eventId: string
): Promise<{ boardId: string }> {
  const user = await requireCurrentUser();
  const { tenantId } = user;

  // Oldest board wins for duplicate-race resolution
  const existing = await database.commandBoard.findFirst({
    where: { tenantId, eventId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) {
    return { boardId: existing.id };
  }

  // Fetch event title for the board name
  const event = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    select: { title: true },
  });
  if (!event) {
    throw new Error("Event not found");
  }

  const result = await runManifestCommand({
    entity: "CommandBoard",
    command: "create",
    body: {
      name: `${event.title} — Event Board`,
      description: "Per-event Event-tree board",
      eventId,
      isTemplate: false,
      tags: ["event-board"],
      autoPopulate: false,
      scope: "{}",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create event board");
  }

  // Convergence: a concurrent creator (e.g. StrictMode double-fire) may have
  // inserted another board between our findFirst and create. Re-query with
  // the same oldest-wins ordering so every racer returns the SAME board; the
  // loser's row stays orphaned but unused.
  const winner = await database.commandBoard.findFirst({
    where: { tenantId, eventId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (winner) {
    return { boardId: winner.id };
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  if (createdId) {
    return { boardId: createdId };
  }

  throw new Error("CommandBoard.create did not return an id");
}

// ---------------------------------------------------------------------------
// 2. getEventBoardData
// ---------------------------------------------------------------------------

export async function getEventBoardData(
  eventId: string
): Promise<EventBoardData> {
  const user = await requireCurrentUser();
  const { tenantId } = user;

  // --- Batch 1: all queries independent of each other ---
  const [
    event,
    committedStaffRows,
    eventDishRows,
    vehicleRouteCount,
    battleBoardRows,
    board,
  ] = await Promise.all([
    database.event.findFirst({
      where: { tenantId, id: eventId, deletedAt: null },
      select: {
        id: true,
        title: true,
        eventType: true,
        eventDate: true,
        guestCount: true,
        venueName: true,
      },
    }),
    database.eventStaff.findMany({
      where: {
        tenantId,
        eventId,
        status: { in: COMMITTED_STAFF_STATUSES },
        deletedAt: null,
      },
      select: { id: true, staffMemberId: true, role: true },
    }),
    database.eventDish.findMany({
      where: { tenantId, eventId, deletedAt: null },
      select: { id: true, dishId: true, course: true, quantityServings: true },
    }),
    database.deliveryRoute.count({
      where: { tenantId, eventId, deletedAt: null },
    }),
    // NOTE: the column is snake_case `board_name` (no @map on this legacy field).
    database.battleBoard.findMany({
      where: { tenantId, eventId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, board_name: true },
    }),
    database.commandBoard.findFirst({
      where: { tenantId, eventId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  if (!event) {
    throw new Error("Event not found");
  }

  const boardId = board?.id ?? null;
  const staffIds = committedStaffRows.map((r) => r.staffMemberId);
  const dishIds = [...new Set(eventDishRows.map((r) => r.dishId))];

  // --- Batch 2: queries that depend on batch 1 results ---
  const [staffUsers, dishRows, cardRows] = await Promise.all([
    staffIds.length > 0
      ? database.user.findMany({
          where: { tenantId, id: { in: staffIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        })
      : Promise.resolve([]),
    dishIds.length > 0
      ? database.dish.findMany({
          where: { tenantId, id: { in: dishIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    boardId
      ? database.commandBoardCard.findMany({
          where: { tenantId, boardId, deletedAt: null },
          select: { id: true, title: true, metadata: true },
        })
      : Promise.resolve([]),
  ]);

  // --- Assemble committed staff ---
  const staffUserMap = new Map(staffUsers.map((u) => [u.id, u]));
  const committedStaff = committedStaffRows.map((row) => {
    const u = staffUserMap.get(row.staffMemberId);
    return {
      id: row.id,
      staffMemberId: row.staffMemberId,
      name: u ? `${u.firstName} ${u.lastName}`.trim() : row.staffMemberId,
      role: row.role ?? "",
      avatarUrl: u?.avatarUrl ?? null,
    };
  });

  // --- Assemble committed menu ---
  const dishNameMap = new Map(dishRows.map((d) => [d.id, d.name]));
  const committedDishes = eventDishRows.map((row) => ({
    eventDishId: row.id,
    dishId: row.dishId,
    name: dishNameMap.get(row.dishId) ?? "Unknown dish",
    course: row.course ?? "",
    quantityServings: row.quantityServings,
  }));

  const battleBoards = battleBoardRows.map((b) => ({
    id: b.id,
    name: b.board_name,
  }));

  // --- Draft cards ---
  const draftCards: EventBoardData["draftCards"] = [];
  for (const card of cardRows) {
    const envelope = parseDraftEnvelope(card.metadata);
    if (envelope) {
      draftCards.push({ cardId: card.id, envelope, title: card.title });
    }
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      eventType: event.eventType,
      eventDate: event.eventDate.toISOString(),
      guestCount: event.guestCount,
      venueName: event.venueName ?? "",
    },
    boardId,
    committedCounts: {
      staff: committedStaffRows.length,
      menu: committedDishes.length,
      vehicles: vehicleRouteCount,
      equipment: 0, // no event↔equipment data model exists yet (see leaf copy)
      battleboard: battleBoards.length,
    },
    draftCards,
    committedStaff,
    committedDishes,
    battleBoards,
  };
}

// ---------------------------------------------------------------------------
// 3. getStaffPalette
// ---------------------------------------------------------------------------

export async function getStaffPalette(): Promise<PaletteStaff[]> {
  const user = await requireCurrentUser();
  const { tenantId } = user;

  // TODO: replace with server-side search once user counts grow past 200
  const users = await database.user.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    orderBy: { firstName: "asc" },
    take: 200,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      hourlyRate: true,
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    hourlyRate: u.hourlyRate == null ? null : u.hourlyRate.toFixed(2),
  }));
}

// ---------------------------------------------------------------------------
// 3b. getDishPalette
// ---------------------------------------------------------------------------

export async function getDishPalette(): Promise<PaletteDish[]> {
  const user = await requireCurrentUser();
  const { tenantId } = user;

  // TODO: replace with server-side search once dish counts grow past 200
  const dishes = await database.dish.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true, category: true, pricePerPerson: true },
  });

  return dishes.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category ?? "",
    pricePerPerson:
      d.pricePerPerson == null ? null : d.pricePerPerson.toFixed(2),
  }));
}

// ---------------------------------------------------------------------------
// 4. createStaffDraftCard
// ---------------------------------------------------------------------------

export async function createStaffDraftCard(input: {
  boardId: string;
  staff: { id: string; name: string };
  shiftStart: string;
  shiftEnd: string;
  role: string;
}): Promise<{ success: true } | { success: false; error?: string }> {
  const user = await requireCurrentUser();

  // Duplicate guard: if this staff member already has a live assign-staff
  // card on the board (draft or committed), reuse it instead of creating a
  // second one. A "failed" card may be re-drafted.
  const existingCards = await database.commandBoardCard.findMany({
    where: {
      tenantId: user.tenantId,
      boardId: input.boardId,
      cardType: "entity",
      deletedAt: null,
    },
    select: { metadata: true },
  });
  for (const card of existingCards) {
    const existing = parseDraftEnvelope(card.metadata);
    if (
      existing &&
      existing.draftAction.kind === "assign-staff" &&
      existing.draftAction.entityId === input.staff.id &&
      existing.draftState !== "failed"
    ) {
      return { success: true };
    }
  }

  const envelope: DraftEnvelope = {
    draftAction: {
      kind: "assign-staff",
      entityType: "User",
      entityId: input.staff.id,
      params: {
        role: input.role,
        shiftStart: input.shiftStart,
        shiftEnd: input.shiftEnd,
      },
    },
    draftState: "draft",
    committedRecordId: null,
  };

  const result = await runManifestCommand({
    entity: "CommandBoardCard",
    command: "create",
    body: {
      boardId: input.boardId,
      title: input.staff.name,
      content: "",
      cardType: "entity",
      status: "pending",
      positionX: 0,
      positionY: 0,
      width: 200,
      height: 150,
      color: "#6366f1",
      metadata: writeDraftEnvelope("{}", envelope),
      groupId: "",
      entityId: input.staff.id,
      entityType: "User",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.message || "Failed to create draft card",
    };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// 4b. createDishDraftCard
// ---------------------------------------------------------------------------

export async function createDishDraftCard(input: {
  boardId: string;
  dish: { id: string; name: string };
  quantityServings: number;
  course: string;
  specialInstructions: string;
}): Promise<{ success: true } | { success: false; error?: string }> {
  const user = await requireCurrentUser();

  const envelope: DraftEnvelope = {
    draftAction: {
      kind: "add-dish",
      entityType: "Dish",
      entityId: input.dish.id,
      params: {
        quantityServings: String(input.quantityServings),
        course: input.course,
        specialInstructions: input.specialInstructions,
      },
    },
    draftState: "draft",
    committedRecordId: null,
  };

  const result = await runManifestCommand({
    entity: "CommandBoardCard",
    command: "create",
    body: {
      boardId: input.boardId,
      title: input.dish.name,
      content: "",
      cardType: "entity",
      status: "pending",
      positionX: 0,
      positionY: 0,
      width: 200,
      height: 150,
      color: "#ec4899",
      metadata: writeDraftEnvelope("{}", envelope),
      groupId: "",
      entityId: input.dish.id,
      entityType: "Dish",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.message || "Failed to create draft card",
    };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. removeDraftCard
// ---------------------------------------------------------------------------

export async function removeDraftCard(
  cardId: string
): Promise<{ success: true } | { success: false; error?: string }> {
  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "CommandBoardCard",
    command: "remove",
    instanceId: cardId,
    body: {
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.message || "Failed to remove draft card",
    };
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. getDraftImpact
// ---------------------------------------------------------------------------

export async function getDraftImpact(
  eventId: string,
  boardId: string
): Promise<StaffImpact> {
  const user = await requireCurrentUser();
  const { tenantId } = user;

  // Read draft cards and extract assign-staff envelopes
  const cards = await database.commandBoardCard.findMany({
    where: { tenantId, boardId, deletedAt: null },
    select: { id: true, metadata: true },
  });

  const drafts: StaffDraftInput[] = [];
  for (const card of cards) {
    const envelope = parseDraftEnvelope(card.metadata);
    if (
      envelope?.draftState === "draft" &&
      envelope.draftAction.kind === "assign-staff"
    ) {
      drafts.push({
        cardId: card.id,
        staffMemberId: envelope.draftAction.entityId,
        shiftStart: envelope.draftAction.params.shiftStart ?? "",
        shiftEnd: envelope.draftAction.params.shiftEnd ?? "",
      });
    }
  }

  if (drafts.length === 0) {
    return computeStaffImpact({ drafts: [], rates: {}, busyIntervals: {} });
  }

  const staffIds = [...new Set(drafts.map((d) => d.staffMemberId))];

  // --- Hourly rates ---
  const staffUsers = await database.user.findMany({
    where: { tenantId, id: { in: staffIds } },
    select: { id: true, hourlyRate: true },
  });
  const rates: Record<string, string> = {};
  for (const u of staffUsers) {
    if (u.hourlyRate != null) {
      rates[u.id] = u.hourlyRate.toFixed(2);
    }
  }

  // --- Busy intervals from other events ---
  const otherAssignments = await database.eventStaff.findMany({
    where: {
      tenantId,
      staffMemberId: { in: staffIds },
      eventId: { not: eventId },
      status: { in: COMMITTED_STAFF_STATUSES },
      deletedAt: null,
      shiftStart: { not: null },
      shiftEnd: { not: null },
    },
    select: {
      staffMemberId: true,
      shiftStart: true,
      shiftEnd: true,
      eventId: true,
    },
  });

  // Batch-fetch labels for the other events
  const otherEventIds = [...new Set(otherAssignments.map((a) => a.eventId))];
  const otherEvents =
    otherEventIds.length > 0
      ? await database.event.findMany({
          where: { tenantId, id: { in: otherEventIds } },
          select: { id: true, title: true },
        })
      : [];
  const eventTitleMap = new Map(otherEvents.map((e) => [e.id, e.title]));

  const busyIntervals: Record<
    string,
    Array<{ start: string; end: string; label: string }>
  > = {};
  for (const a of otherAssignments) {
    if (!(a.shiftStart && a.shiftEnd)) {
      continue;
    }
    const intervals = (busyIntervals[a.staffMemberId] ??= []);
    intervals.push({
      start: a.shiftStart.toISOString(),
      end: a.shiftEnd.toISOString(),
      label: eventTitleMap.get(a.eventId) ?? "another event",
    });
  }

  return computeStaffImpact({ drafts, rates, busyIntervals });
}

// ---------------------------------------------------------------------------
// 7. commitEventBoard
// ---------------------------------------------------------------------------

/** Mirrors CommitResult from apps/api lib/event-board/commit-event-board-drafts.ts. */
export type CommitResponse =
  | {
      success: true;
      committedCount: number;
      /** Assign-staff drafts skipped because the staff member was already assigned. */
      skippedDuplicates?: Array<{
        cardId: string;
        existingRecordId: string | null;
        staffMemberId: string;
      }>;
    }
  | { success: false; error: string; failedCardId?: string };

export async function commitEventBoard(
  boardId: string,
  eventId: string
): Promise<CommitResponse> {
  // Auth context travels via forwarded session cookies (apiPostJsonServer);
  // apps/api re-resolves the acting user itself.
  await requireCurrentUser();

  let response: Response;
  try {
    response = await apiPostJsonServer(`/api/command-board/${boardId}/commit`, {
      eventId,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Commit API unreachable",
    };
  }

  const payload = (await response.json().catch(() => null)) as
    | CommitResponse
    | { error?: string }
    | null;

  if (payload && "success" in payload && typeof payload.success === "boolean") {
    return payload as CommitResponse;
  }

  if (!response.ok) {
    return {
      success: false,
      error:
        (payload && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : undefined) ?? `Commit failed (${response.status})`,
    };
  }

  return { success: false, error: "Malformed commit response" };
}
