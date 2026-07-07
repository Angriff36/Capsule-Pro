"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";
import { importEventFromCsvText, importEventFromPdf } from "./importer";
import { createEventSchema, updateEventSchema } from "./validation";

type CreateEventData = z.infer<typeof createEventSchema>;
type UpdateEventData = z.infer<typeof updateEventSchema>;
type WritableEventData = CreateEventData | UpdateEventData;

export type CreateEventState = { error?: string } | null;

export type SaveDraftState = {
  error?: string;
  eventDate?: string;
  eventId?: string;
} | null;

export interface EventDraftSnapshot {
  accessibilityOptions: string[];
  assignedTo: string | null;
  budget: number;
  eventDate: string | null;
  eventFormat: string | null;
  eventId: string;
  eventNumber: string | null;
  eventType: string;
  featuredMediaUrl: string | null;
  guestCount: number;
  notes: string | null;
  status: string;
  tags: string[];
  ticketPrice: number;
  ticketTier: string | null;
  title: string;
  venueAddress: string | null;
  venueName: string | null;
}

const NEEDS_TAG = "needs:";
const IMPORT_FALLBACK_NAME = "event-import";

const text = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const nullableText = (
  formData: FormData,
  key: string
): string | null | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const csv = (formData: FormData, key: string): string[] =>
  (text(formData, key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const required = (value: string | null | undefined, label: string): string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
};

// Noon UTC keeps @db.Date values from drifting across day boundaries.
const dateOnly = (yyyyMmDd: string): Date => new Date(`${yyyyMmDd}T12:00:00Z`);

// Inverse of dateOnly: render a stored Date back to the yyyy-mm-dd an HTML date
// input consumes, reading local components to avoid timezone drift.
const formatDateInput = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const validationError = (error: z.ZodError): string =>
  `Validation failed: ${z.prettifyError(error)}`;

const readEventFields = (formData: FormData) => ({
  title: text(formData, "title"),
  eventType: text(formData, "eventType"),
  eventDate: text(formData, "eventDate"),
  guestCount: text(formData, "guestCount"),
  status: text(formData, "status"),
  venueName: nullableText(formData, "venueName"),
  venueAddress: nullableText(formData, "venueAddress"),
  notes: nullableText(formData, "notes"),
  budget: text(formData, "budget"),
  ticketPrice: text(formData, "ticketPrice"),
  ticketTier: nullableText(formData, "ticketTier"),
  eventFormat: nullableText(formData, "eventFormat"),
  accessibilityOptions: csv(formData, "accessibilityOptions"),
  featuredMediaUrl: nullableText(formData, "featuredMediaUrl"),
  tags: csv(formData, "tags"),
});

const readCreateEvent = (formData: FormData) => ({
  ...readEventFields(formData),
  templateId: nullableText(formData, "templateId") ?? null,
});

const readUpdateEvent = (formData: FormData) => ({
  eventId: text(formData, "eventId"),
  ...readEventFields(formData),
  clientId: nullableText(formData, "clientId"),
  eventNumber: nullableText(formData, "eventNumber"),
});

const eventData = (data: WritableEventData, eventDate: Date) => ({
  title: data.title,
  eventType: data.eventType,
  eventDate,
  guestCount: data.guestCount,
  status: data.status,
  budget: data.budget ?? null,
  ticketPrice: data.ticketPrice ?? null,
  ticketTier: data.ticketTier,
  eventFormat: data.eventFormat,
  accessibilityOptions: data.accessibilityOptions,
  featuredMediaUrl: data.featuredMediaUrl ?? null,
  venueName: data.venueName,
  venueAddress: data.venueAddress,
  notes: data.notes,
});

const revalidateEvent = (eventId?: string, clientId?: string | null): void => {
  revalidatePath("/events");

  if (eventId) {
    revalidatePath(`/events/${eventId}`);
  }

  if (clientId) {
    revalidatePath(`/crm/clients/${clientId}`);
  }
};

const hasMenuItems = async (
  tenantId: string,
  eventId: string
): Promise<boolean> => {
  const [row] = await database.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
    `
  );

  return (row?.count ?? 0) > 0;
};

const missingEventFields = async ({
  tenantId,
  eventId,
  clientId,
  eventType,
  eventDate,
  guestCount,
  venueName,
}: {
  tenantId: string;
  eventId: string;
  clientId?: string | null;
  eventType: string;
  eventDate: Date;
  guestCount: number;
  venueName?: string | null;
}): Promise<string[]> => {
  const missing = [
    !clientId?.trim() && "client",
    !eventType.trim() && "eventType",
    Number.isNaN(eventDate.getTime()) && "eventDate",
    (!guestCount || guestCount <= 0) && "headcount",
    !venueName?.trim() && "venueName",
    !(await hasMenuItems(tenantId, eventId)) && "menuItems",
  ];

  return missing.filter(Boolean) as string[];
};

const mergeNeedsTags = (tags: string[], missingFields: string[]): string[] => [
  ...new Set([
    ...tags.filter((tag) => !tag.startsWith(NEEDS_TAG)),
    ...missingFields.map((field) => `${NEEDS_TAG}${field}`),
  ]),
];

const getImportFile = (formData: FormData): File => {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Import file is required.");
  }

  return file;
};

const isPdf = (file: File): boolean =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const softDeleteEvent = async (
  user: { id: string; tenantId: string; role: string },
  eventId: string
): Promise<void> => {
  const result = await runManifestCommand({
    entity: "Event",
    command: "softDelete",
    body: { id: eventId },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete event");
  }
};

/**
 * Create a new event.
 *
 * useActionState-compatible: validation errors come back as state instead of
 * crashing the route.
 */
export const createEvent = async (
  _prevState: CreateEventState,
  formData: FormData
): Promise<CreateEventState> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const rawData = readCreateEvent(formData);
  const parsed = createEventSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: validationError(parsed.error) };
  }

  let createdId: string;

  try {
    const ed = eventData(parsed.data, dateOnly(parsed.data.eventDate));
    const createResult = await runManifestCommand({
      entity: "Event",
      command: "create",
      body: {
        clientId: "",
        // Empty → GenericPrismaStore allocates EVT-YYYY-#### inside Event.create txn
        eventNumber: "",
        title: ed.title ?? "",
        eventType: ed.eventType ?? "",
        // Epoch ms: the Manifest datetime contract (ISO strings rejected by pre-coercion runtimes)
        eventDate: ed.eventDate.getTime(),
        guestCount: ed.guestCount ?? 1,
        venueName: ed.venueName ?? "",
        venueAddress: ed.venueAddress ?? "",
        notes: ed.notes ?? "",
        tags: parsed.data.tags ?? [],
        status: ed.status ?? "",
        budget: ed.budget ?? 0,
        ticketPrice: ed.ticketPrice ?? 0,
        ticketTier: ed.ticketTier ?? "",
        eventFormat: ed.eventFormat ?? "",
        accessibilityOptions: ed.accessibilityOptions ?? [],
        featuredMediaUrl: ed.featuredMediaUrl ?? "",
        templateId: rawData.templateId ?? "",
      },
      user: { id: user.id, tenantId, role: user.role },
    });

    if (!createResult.ok) {
      console.error("[createEvent] Manifest error:", createResult.message);
      return {
        error:
          createResult.message || "Failed to create event. Please try again.",
      };
    }

    const created = createResult.result as { id?: string } | null;
    createdId = created?.id ?? "";
    if (!createdId) {
      return { error: "Failed to create event. Please try again." };
    }
  } catch (error) {
    console.error("[createEvent] Database error:", error);
    return { error: "Failed to create event. Please try again." };
  }

  // BattleBoard auto-create is handled by the EventCreated reaction in
  // manifest/source/reactions.manifest (synchronous in the same API turn).

  revalidateEvent(createdId);
  redirect(`/events/${createdId}`);
};

/**
 * Partial event data captured by a single wizard step. Every field is optional
 * because each step only owns a slice of the Event; the save action merges the
 * slice onto the existing draft (or seeds a fresh one) before issuing the
 * governed command.
 */
export interface DraftEventInput {
  accessibilityOptions?: string[];
  budget?: number;
  eventDate?: string; // yyyy-mm-dd (HTML date input)
  eventFormat?: string;
  eventType?: string;
  featuredMediaUrl?: string;
  guestCount?: number;
  notes?: string;
  tags?: string[];
  ticketPrice?: number;
  ticketTier?: string;
  title?: string;
  venueAddress?: string;
  venueName?: string;
}

interface SaveDraftInput {
  data: DraftEventInput;
  eventId?: string;
}

const epochFor = (
  eventDate?: string | null,
  existing?: Date | null
): number => {
  if (eventDate) {
    return dateOnly(eventDate).getTime();
  }
  if (existing) {
    return new Date(existing).getTime();
  }
  return Date.now();
};

/**
 * Auto-save a wizard step as a governed Draft command.
 *
 * First completion (no `eventId`) issues `Event.create` with status "draft";
 * every later step issues `Event.update`, merging the step slice onto the
 * existing draft so the IR `update` contract (full-field) is satisfied. Never
 * redirects — the wizard stays mounted and advances to the next step.
 */
/** Body for seeding a fresh draft from the first completed step. */
const buildCreateBody = (data: DraftEventInput): Record<string, unknown> => ({
  accessibilityOptions: data.accessibilityOptions ?? [],
  budget: data.budget ?? 0,
  clientId: "",
  // Empty → GenericPrismaStore allocates EVT-YYYY-#### inside Event.create txn
  eventDate: epochFor(data.eventDate),
  eventFormat: data.eventFormat ?? "",
  eventNumber: "",
  eventType: data.eventType ?? "",
  featuredMediaUrl: data.featuredMediaUrl ?? "",
  guestCount: data.guestCount ?? 1,
  notes: data.notes ?? "",
  status: "draft",
  tags: data.tags ?? [],
  ticketPrice: data.ticketPrice ?? 0,
  ticketTier: data.ticketTier ?? "",
  title: data.title ?? "",
  venueAddress: data.venueAddress ?? "",
  venueName: data.venueName ?? "",
});

export const saveEventDraft = async (
  input: SaveDraftInput
): Promise<SaveDraftState> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const data = input.data;

  // CREATE — seed a fresh draft from the first completed step.
  if (!input.eventId) {
    const createResult = await runManifestCommand({
      body: buildCreateBody(data),
      command: "create",
      entity: "Event",
      user: { id: user.id, tenantId, role: user.role },
    });

    if (!createResult.ok) {
      console.error("[saveEventDraft] create failed:", createResult.message);
      return { error: createResult.message || "Failed to save draft." };
    }

    const created = createResult.result as { id?: string } | null;
    const eventId = created?.id ?? "";
    if (!eventId) {
      return { error: "Failed to save draft." };
    }
    revalidateEvent(eventId);
    return { eventId, eventDate: data.eventDate };
  }

  // UPDATE — read existing draft, overlay this step's slice, issue full-field
  // update with status held at "draft".
  const existing = await database.event.findFirst({
    where: { tenantId, id: input.eventId, deletedAt: null },
  });
  if (!existing) {
    return { error: "Draft not found. It may have been deleted." };
  }

  const result = await runManifestCommand({
    body: buildUpdateBody(existing, data, "draft", input.eventId),
    command: "update",
    entity: "Event",
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    console.error("[saveEventDraft] update failed:", result.message);
    return { error: result.message || "Failed to save draft." };
  }

  revalidateEvent(input.eventId);
  return { eventId: input.eventId, eventDate: data.eventDate };
};

/**
 * Load an in-progress draft for resume. Read-only (constitution §3 read path).
 * Returns the raw Event fields the wizard needs to rehydrate its state.
 */
export const loadEventDraft = async (
  eventId: string
): Promise<EventDraftSnapshot | null> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const existing = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
  });
  if (!existing) {
    return null;
  }

  // Only drafts are resumable. A confirmed/cancelled event under a stale
  // ?eventId= or localStorage pointer should drop the user onto a fresh
  // wizard instead of reopening the confirmed event for re-finalize.
  if ((existing.status ?? "draft") !== "draft") {
    return null;
  }

  return {
    accessibilityOptions: (existing.accessibilityOptions as string[]) ?? [],
    assignedTo: existing.assignedTo ?? null,
    budget: existing.budget ? Number(existing.budget) : 0,
    eventDate: existing.eventDate ? formatDateInput(existing.eventDate) : null,
    eventFormat: existing.eventFormat ?? null,
    eventId: existing.id,
    eventType: existing.eventType ?? "",
    eventNumber: existing.eventNumber ?? null,
    featuredMediaUrl: existing.featuredMediaUrl ?? null,
    guestCount: existing.guestCount ?? 0,
    notes: existing.notes ?? null,
    status: existing.status ?? "draft",
    tags: (existing.tags as string[]) ?? [],
    ticketPrice: existing.ticketPrice ? Number(existing.ticketPrice) : 0,
    ticketTier: existing.ticketTier ?? null,
    title: existing.title ?? "",
    venueAddress: existing.venueAddress ?? null,
    venueName: existing.venueName ?? null,
  };
};

type EventRow = NonNullable<
  Awaited<ReturnType<typeof database.event.findFirst>>
>;

/** Coerce a Decimal-like field to a plain number for the runtime command body. */
const numberOrZero = (
  value: { toFixed?: (n: number) => string } | null | undefined
): number =>
  value && typeof value === "object" && "toFixed" in value ? Number(value) : 0;

/**
 * Build the full-field `Event.update` body from a persisted row + an optional
 * step slice. Used by both the wizard auto-save (status "draft") and the
 * finalize step (status "confirmed"). Extracted so each action stays below the
 * cognitive-complexity ceiling while honouring the IR `update` contract.
 */
const buildUpdateBody = (
  existing: EventRow,
  data: DraftEventInput | null,
  status: "draft" | "confirmed",
  eventId: string
): Record<string, unknown> => ({
  accessibilityOptions:
    data?.accessibilityOptions ??
    (existing.accessibilityOptions as string[]) ??
    [],
  budget: data?.budget ?? numberOrZero(existing.budget),
  clientId: existing.clientId ?? "",
  eventDate: epochFor(data?.eventDate, existing.eventDate),
  eventFormat: data?.eventFormat ?? existing.eventFormat ?? "",
  eventNumber: existing.eventNumber ?? "",
  eventType: data?.eventType ?? existing.eventType ?? "",
  featuredMediaUrl: data?.featuredMediaUrl ?? existing.featuredMediaUrl ?? "",
  guestCount: data?.guestCount ?? existing.guestCount ?? 1,
  id: eventId,
  notes: data?.notes ?? existing.notes ?? "",
  status,
  tags: data?.tags ?? (existing.tags as string[]) ?? [],
  ticketPrice: data?.ticketPrice ?? numberOrZero(existing.ticketPrice),
  ticketTier: data?.ticketTier ?? existing.ticketTier ?? "",
  title: data?.title ?? existing.title ?? "",
  venueAddress: data?.venueAddress ?? existing.venueAddress ?? "",
  venueName: data?.venueName ?? existing.venueName ?? "",
});

/**
 * Finalize the wizard: flip the draft to "confirmed" via the governed `update`
 * command, then redirect to the event detail page. The transition
 * draft → confirmed is permitted by Event's IR state machine.
 */
export const finalizeEventFromWizard = async (
  eventId: string
): Promise<SaveDraftState> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const existing = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
  });
  if (!existing) {
    return { error: "Draft not found. It may have been deleted." };
  }

  const result = await runManifestCommand({
    body: buildUpdateBody(existing, null, "confirmed", eventId),
    command: "update",
    entity: "Event",
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    console.error("[finalizeEventFromWizard] failed:", result.message);
    return { error: result.message || "Failed to confirm event." };
  }

  revalidateEvent(eventId, existing.clientId ?? null);
  redirect(`/events/${eventId}`);
};

export const updateEvent = async (formData: FormData): Promise<void> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const parsed = updateEventSchema.safeParse(readUpdateEvent(formData));

  if (!parsed.success) {
    throw new Error(validationError(parsed.error));
  }

  const data = parsed.data;
  const eventDate = dateOnly(data.eventDate);
  const tags = mergeNeedsTags(
    data.tags,
    await missingEventFields({
      tenantId,
      eventId: data.eventId,
      clientId: data.clientId,
      eventType: data.eventType,
      eventDate,
      guestCount: data.guestCount,
      venueName: data.venueName,
    })
  );

  // Read existing event for eventNumber (IR update requires it)
  const existing = await database.event.findFirst({
    where: { tenantId, id: data.eventId, deletedAt: null },
  });

  const ed = eventData(data, eventDate);
  const result = await runManifestCommand({
    entity: "Event",
    command: "update",
    body: {
      id: data.eventId,
      clientId: data.clientId ?? "",
      eventNumber: data.eventNumber ?? existing?.eventNumber ?? "",
      title: ed.title ?? "",
      eventType: ed.eventType ?? "",
      // Epoch ms: the Manifest datetime contract (ISO strings rejected by pre-coercion runtimes)
      eventDate: ed.eventDate.getTime(),
      guestCount: ed.guestCount ?? 0,
      venueName: ed.venueName ?? "",
      venueAddress: ed.venueAddress ?? "",
      notes: ed.notes ?? "",
      tags: tags ?? [],
      status: ed.status ?? "",
      budget: ed.budget ?? 0,
      ticketPrice: ed.ticketPrice ?? 0,
      ticketTier: ed.ticketTier ?? "",
      eventFormat: ed.eventFormat ?? "",
      accessibilityOptions: ed.accessibilityOptions ?? [],
      featuredMediaUrl: ed.featuredMediaUrl ?? "",
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update event");
  }

  // Battle boards linked to this event are re-synced by the
  // event-updated-board-sync runtime middleware (fires on EventUpdated) — no
  // imperative post-update sync needed here.
  revalidateEvent(data.eventId, data.clientId);
  redirect(`/events/${data.eventId}`);
};

export const assignClientToEvent = async (
  eventId: string,
  clientId: string
): Promise<void> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const safeEventId = required(eventId, "Event id");
  const safeClientId = required(clientId, "Client id");

  // Read existing event to preserve required fields through the update command
  const existing = await database.event.findFirst({
    where: { tenantId, id: safeEventId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("Event not found");
  }

  const result = await runManifestCommand({
    entity: "Event",
    command: "update",
    body: {
      id: safeEventId,
      clientId: safeClientId,
      eventNumber: existing.eventNumber ?? "",
      title: existing.title ?? "",
      eventType: existing.eventType ?? "",
      // Epoch ms: the Manifest datetime contract (ISO strings rejected by pre-coercion runtimes)
      eventDate: existing.eventDate ? existing.eventDate.getTime() : "",
      guestCount: existing.guestCount ?? 0,
      venueName: existing.venueName ?? "",
      venueAddress: existing.venueAddress ?? "",
      notes: existing.notes ?? "",
      tags: (existing.tags as string[]) ?? [],
      status: existing.status ?? "",
      budget: existing.budget ? Number(existing.budget) : 0,
      ticketPrice: existing.ticketPrice ? Number(existing.ticketPrice) : 0,
      ticketTier: existing.ticketTier ?? "",
      eventFormat: existing.eventFormat ?? "",
      accessibilityOptions: (existing.accessibilityOptions as string[]) ?? [],
      featuredMediaUrl: existing.featuredMediaUrl ?? "",
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to assign client to event");
  }

  revalidateEvent(safeEventId, safeClientId);
};

export const deleteEvent = async (formData: FormData): Promise<void> => {
  const user = await requireCurrentUser();
  await softDeleteEvent(user, required(text(formData, "eventId"), "Event id"));

  revalidatePath("/events");
  redirect("/events");
};

/** Soft-delete an event by id. Call from client with confirmation. */
export async function deleteEventById(eventId: string): Promise<void> {
  const user = await requireCurrentUser();
  await softDeleteEvent(user, required(eventId, "Event id"));

  revalidatePath("/events");
  redirect("/events");
}

export const importEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  const file = getImportFile(formData);
  const fileName = file.name || IMPORT_FALLBACK_NAME;
  const content = Buffer.from(await file.arrayBuffer());

  const eventId = isPdf(file)
    ? await importEventFromPdf({ tenantId, fileName, content })
    : await importEventFromCsvText({
        tenantId,
        fileName,
        content: content.toString("utf-8"),
      });

  revalidateEvent(eventId);
  redirect(`/events/${eventId}`);
};

export const attachEventImport = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  const eventId = required(text(formData, "eventId"), "Event id");
  const file = getImportFile(formData);
  const fileName = file.name || IMPORT_FALLBACK_NAME;
  const content = Buffer.from(await file.arrayBuffer());

  await database.eventImport.create({
    data: {
      tenantId,
      id: randomUUID(),
      eventId,
      fileName,
      mimeType: file.type || "application/octet-stream",
      fileSize: content.byteLength,
      content,
    },
  });

  revalidateEvent(eventId);
  redirect(`/events/${eventId}`);
};
