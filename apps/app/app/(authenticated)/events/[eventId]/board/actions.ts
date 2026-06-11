"use server";

import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  parseDraftEnvelope,
  writeDraftEnvelope,
  type DraftEnvelope,
} from "./draft-metadata";
import {
  computeStaffImpact,
  type StaffImpact,
  type StaffDraftInput,
} from "./impact";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventBoardData {
  event: {
    id: string;
    title: string;
    eventType: string;
    eventDate: string;
    guestCount: number;
    venueName: string;
  };
  boardId: string | null;
  committedCounts: {
    staff: number;
    menu: number;
    vehicles: number;
    equipment: number;
    battleboard: number;
  };
  draftCards: Array<{ cardId: string; envelope: DraftEnvelope; title: string }>;
  committedStaff: Array<{
    staffMemberId: string;
    name: string;
    role: string;
    avatarUrl: string | null;
  }>;
}

export interface PaletteStaff {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  hourlyRate: string | null;
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
  if (existing) return { boardId: existing.id };

  // Fetch event title for the board name
  const event = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    select: { title: true },
  });
  if (!event) throw new Error("Event not found");

  const result = await runManifestCommand({
    entity: "CommandBoard",
    command: "create",
    body: {
      name: `${event.title} — Event Board`,
      description: "Per-event command board (event tree)",
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

  const createdId = (result.result as { id?: string } | null)?.id;
  if (createdId) return { boardId: createdId };

  // Fallback: re-query (handles race where another request created it first)
  const fallback = await database.commandBoard.findFirst({
    where: { tenantId, eventId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (fallback) return { boardId: fallback.id };

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

  // --- Event core ---
  const event = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    select: {
      id: true,
      title: true,
      eventType: true,
      eventDate: true,
      guestCount: true,
      venueName: true,
    },
  });
  if (!event) throw new Error("Event not found");

  // --- Committed staff count + roster (same query, reuse results) ---
  const committedStaffRows = await database.eventStaff.findMany({
    where: {
      tenantId,
      eventId,
      status: { in: COMMITTED_STAFF_STATUSES },
      deletedAt: null,
    },
    select: { staffMemberId: true, role: true },
  });

  const staffIds = committedStaffRows.map((r) => r.staffMemberId);
  const staffUsers =
    staffIds.length > 0
      ? await database.user.findMany({
          where: { tenantId, id: { in: staffIds } },
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        })
      : [];

  const staffUserMap = new Map(staffUsers.map((u) => [u.id, u]));

  const committedStaff = committedStaffRows.map((row) => {
    const u = staffUserMap.get(row.staffMemberId);
    return {
      staffMemberId: row.staffMemberId,
      name: u ? `${u.firstName} ${u.lastName}`.trim() : row.staffMemberId,
      role: row.role ?? "",
      avatarUrl: u?.avatarUrl ?? null,
    };
  });

  // --- Menu count (EventDish) ---
  const menuCount = await database.eventDish.count({
    where: { tenantId, eventId, deletedAt: null },
  });

  // --- BattleBoard count ---
  const battleboardCount = await database.battleBoard.count({
    where: { tenantId, eventId, deletedAt: null },
  });

  // --- Board id ---
  const board = await database.commandBoard.findFirst({
    where: { tenantId, eventId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const boardId = board?.id ?? null;

  // --- Draft cards ---
  const draftCards: EventBoardData["draftCards"] = [];
  if (boardId) {
    const cards = await database.commandBoardCard.findMany({
      where: { tenantId, boardId, deletedAt: null },
      select: { id: true, title: true, metadata: true },
    });
    for (const card of cards) {
      const envelope = parseDraftEnvelope(card.metadata);
      if (envelope) {
        draftCards.push({ cardId: card.id, envelope, title: card.title });
      }
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
      menu: menuCount,
      vehicles: 0, // TODO: vehicle entity in a later plan
      equipment: 0, // TODO: equipment entity in a later plan
      battleboard: battleboardCount,
    },
    draftCards,
    committedStaff,
  };
}

// ---------------------------------------------------------------------------
// 3. getStaffPalette
// ---------------------------------------------------------------------------

export async function getStaffPalette(): Promise<PaletteStaff[]> {
  const user = await requireCurrentUser();
  const { tenantId } = user;

  const users = await database.user.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    orderBy: { firstName: "asc" },
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
    hourlyRate: u.hourlyRate != null ? u.hourlyRate.toFixed(2) : null,
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
    return { success: false, error: result.message || "Failed to create draft card" };
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
    return { success: false, error: result.message || "Failed to remove draft card" };
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
    select: { staffMemberId: true, shiftStart: true, shiftEnd: true, eventId: true },
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

  const busyIntervals: Record<string, Array<{ start: string; end: string; label: string }>> = {};
  for (const a of otherAssignments) {
    if (!a.shiftStart || !a.shiftEnd) continue;
    if (!busyIntervals[a.staffMemberId]) busyIntervals[a.staffMemberId] = [];
    busyIntervals[a.staffMemberId].push({
      start: a.shiftStart.toISOString(),
      end: a.shiftEnd.toISOString(),
      label: eventTitleMap.get(a.eventId) ?? "another event",
    });
  }

  return computeStaffImpact({ drafts, rates, busyIntervals });
}

// ---------------------------------------------------------------------------
// 7. commitEventBoard — NOT implemented (Task 6)
// ---------------------------------------------------------------------------
