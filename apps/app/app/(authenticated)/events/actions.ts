"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenantId } from "../../lib/tenant";
import { importEventFromCsvText, importEventFromPdf } from "./importer";
import { createEventSchema, updateEventSchema } from "./validation";

type CreateEventData = z.infer<typeof createEventSchema>;
type UpdateEventData = z.infer<typeof updateEventSchema>;
type WritableEventData = CreateEventData | UpdateEventData;

export type CreateEventState = { error?: string } | null;

const NEEDS_TAG = "needs:";
const IMPORT_FALLBACK_NAME = "event-import";

const text = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") return;

  const trimmed = value.trim();
  return trimmed || undefined;
};

const nullableText = (
  formData: FormData,
  key: string
): string | null | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") return;

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

const nextEventNumber = async (
  tx: Prisma.TransactionClient,
  tenantId: string
): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `EVT-${year}`;
  const lockKey = `${tenantId}:${prefix}`;

  // Event numbers are human-facing; do not let two simultaneous creates race.
  await tx.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`
  );

  const count = await tx.event.count({
    where: {
      tenantId,
      eventNumber: { startsWith: prefix },
      deletedAt: null,
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
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
  tenantId: string,
  eventId: string
): Promise<void> => {
  await database.event.updateMany({
    where: { tenantId, id: eventId },
    data: { deletedAt: new Date() },
  });
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
  const tenantId = await requireTenantId();
  const rawData = readCreateEvent(formData);
  const parsed = createEventSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: validationError(parsed.error) };
  }

  let createdId: string;

  try {
    const created = await database.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          tenantId,
          eventNumber: await nextEventNumber(tx, tenantId),
          ...eventData(parsed.data, dateOnly(parsed.data.eventDate)),
          tags: parsed.data.tags,
          templateId: rawData.templateId,
        },
      });

      await tx.battleBoard.create({
        data: {
          tenantId,
          eventId: event.id,
          board_name: `${event.title} - Battle Board`,
          board_type: "event-specific",
          boardData: {},
        },
      });

      return event;
    });

    createdId = created.id;
  } catch (error) {
    console.error("[createEvent] Database error:", error);
    return { error: "Failed to create event. Please try again." };
  }

  revalidateEvent(createdId);
  redirect(`/events/${createdId}`);
};

export const updateEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
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

  await database.event.updateMany({
    where: { tenantId, id: data.eventId },
    data: {
      ...(data.eventNumber !== undefined && { eventNumber: data.eventNumber }),
      ...eventData(data, eventDate),
      clientId: data.clientId,
      tags,
    },
  });

  revalidateEvent(data.eventId, data.clientId);
  redirect(`/events/${data.eventId}`);
};

export const assignClientToEvent = async (
  eventId: string,
  clientId: string
): Promise<void> => {
  const tenantId = await requireTenantId();
  const safeEventId = required(eventId, "Event id");
  const safeClientId = required(clientId, "Client id");

  await database.event.updateMany({
    where: { tenantId, id: safeEventId },
    data: { clientId: safeClientId },
  });

  revalidateEvent(safeEventId, safeClientId);
};

export const deleteEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  await softDeleteEvent(
    tenantId,
    required(text(formData, "eventId"), "Event id")
  );

  revalidatePath("/events");
  redirect("/events");
};

/** Soft-delete an event by id. Call from client with confirmation. */
export async function deleteEventById(eventId: string): Promise<void> {
  const tenantId = await requireTenantId();
  await softDeleteEvent(tenantId, required(eventId, "Event id"));

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

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.event_imports (
        tenant_id,
        id,
        event_id,
        file_name,
        mime_type,
        file_size,
        content
      )
      VALUES (
        ${tenantId},
        ${randomUUID()},
        ${eventId},
        ${fileName},
        ${file.type || "application/octet-stream"},
        ${content.byteLength},
        ${content}
      )
    `
  );

  revalidateEvent(eventId);
  redirect(`/events/${eventId}`);
};
