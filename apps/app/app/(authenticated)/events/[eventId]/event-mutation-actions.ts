"use server";

import { database, Prisma } from "@repo/database";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { type EventStatus, eventStatuses } from "../constants";

/**
 * Re-exports of helpers from actions.ts that are needed by mutation actions
 * but aren't exported. We inline the ones we need to avoid large refactors.
 */
const getString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getOptionalString = (
  formData: FormData,
  key: string
): string | null | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getNumber = (formData: FormData, key: string): number | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const getNumberOrNull = (
  formData: FormData,
  key: string
): number | null | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const numberValue = Number(trimmed);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const getDate = (formData: FormData, key: string): Date | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const dateValue = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
};

const getStatus = (formData: FormData): EventStatus =>
  (getString(formData, "status") as EventStatus) ?? "confirmed";

const getTags = (formData: FormData): string[] =>
  (getString(formData, "tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const getList = (formData: FormData, key: string): string[] =>
  (getString(formData, key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

// ============================================================================
// Mutation Actions (no redirect, no revalidatePath — TanStack Query handles refresh)
// ============================================================================

/**
 * Update an event's data without redirecting.
 * Used by TanStack Query's useMutation so the client can invalidate the query
 * cache instead of doing a full page navigation.
 */
export async function updateEventForMutation(
  formData: FormData
): Promise<void> {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const eventId = getString(formData, "eventId");
  const eventDate = getDate(formData, "eventDate");
  const title = getString(formData, "title");
  const eventType = getString(formData, "eventType");
  const guestCount = getNumber(formData, "guestCount");

  if (!eventId) {
    throw new Error("Event id is required.");
  }
  if (!eventDate) {
    throw new Error("Event date is required.");
  }
  if (!title) {
    throw new Error("Event title is required.");
  }
  if (!eventType) {
    throw new Error("Event type is required.");
  }
  if (!guestCount || guestCount < 1) {
    throw new Error("Guest count must be at least 1.");
  }

  const status = getStatus(formData);

  if (!eventStatuses.includes(status)) {
    throw new Error("Invalid status.");
  }

  // Compute missing fields but don't use revalidatePath — TanStack Query handles UI refresh
  const venueName = getOptionalString(formData, "venueName");

  // We compute missing fields here inline since the helper needs database access
  const MISSING_FIELD_TAG_PREFIX = "needs:";
  const buildMissingFieldTags = (fields: string[]) =>
    fields.map((field) => `${MISSING_FIELD_TAG_PREFIX}${field}`);

  const missing: string[] = [];
  if (!title.trim()) {
    missing.push("client");
  }
  if (!eventType.trim()) {
    missing.push("eventType");
  }
  if (!eventDate) {
    missing.push("eventDate");
  }
  if (!guestCount || guestCount <= 0) {
    missing.push("headcount");
  }
  if (!venueName?.trim()) {
    missing.push("venueName");
  }

  // Check menu items — read query per constitution §10
  const [menuRow] = await database.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
    `
  );

  if (!menuRow?.count) {
    missing.push("menuItems");
  }

  const tagSet = new Set(
    getTags(formData).filter((tag) => !tag.startsWith(MISSING_FIELD_TAG_PREFIX))
  );
  for (const tag of buildMissingFieldTags(missing)) {
    tagSet.add(tag);
  }
  const tags = Array.from(tagSet);

  // The Event.update command requires clientId and eventNumber params (guards
  // check != null). The form may not always send these, so read the existing
  // event and use its values as fallbacks.
  const existing = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    select: { clientId: true, eventNumber: true },
  });

  if (!existing) {
    throw new Error("Event not found.");
  }

  const clientId =
    getOptionalString(formData, "clientId") ?? existing.clientId ?? "";
  const eventNumberInput =
    getOptionalString(formData, "eventNumber") ?? existing.eventNumber ?? "";

  // Governed write via Manifest (constitution §9)
  const result = await runManifestCommand({
    entity: "Event",
    command: "update",
    instanceId: eventId,
    body: {
      clientId,
      eventNumber: eventNumberInput,
      title,
      eventType,
      eventDate: eventDate.toISOString(),
      guestCount,
      venueName: getOptionalString(formData, "venueName") ?? "",
      venueAddress: getOptionalString(formData, "venueAddress") ?? "",
      notes: getOptionalString(formData, "notes") ?? "",
      tags,
      status,
      budget: getNumberOrNull(formData, "budget") ?? 0,
      ticketPrice: getNumberOrNull(formData, "ticketPrice") ?? 0,
      ticketTier: getOptionalString(formData, "ticketTier") ?? "",
      eventFormat: getOptionalString(formData, "eventFormat") ?? "",
      accessibilityOptions: getList(formData, "accessibilityOptions"),
      featuredMediaUrl: getOptionalString(formData, "featuredMediaUrl") ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message ?? "Failed to update event.");
  }

  // Battle boards linked to this event are re-synced by the
  // event-updated-board-sync runtime middleware (fires on EventUpdated) — no
  // imperative post-update sync needed here.
  // No revalidatePath, no redirect — TanStack Query handles the refetch
}
