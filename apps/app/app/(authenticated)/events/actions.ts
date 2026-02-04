"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "../../lib/tenant";
import { type EventStatus, eventStatuses } from "./constants";
import { importEventFromCsvText, importEventFromPdf } from "./importer";
import { createEventSchema } from "./validation";

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

  const dateValue = new Date(`${value}T00:00:00`);
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

const MISSING_FIELD_TAG_PREFIX = "needs:";

const buildMissingFieldTags = (fields: string[]) =>
  fields.map((field) => `${MISSING_FIELD_TAG_PREFIX}${field}`);

const computeMissingEventFields = async ({
  tenantId,
  eventId,
  title,
  eventType,
  eventDate,
  guestCount,
  venueName,
}: {
  tenantId: string;
  eventId: string;
  title: string;
  eventType: string;
  eventDate: Date;
  guestCount: number;
  venueName?: string | null;
}): Promise<string[]> => {
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

  return missing;
};

const mergeTags = (tags: string[], missingFields: string[]) => {
  const tagSet = new Set(
    tags.filter((tag) => !tag.startsWith(MISSING_FIELD_TAG_PREFIX))
  );
  for (const tag of buildMissingFieldTags(missingFields)) {
    tagSet.add(tag);
  }
  return Array.from(tagSet);
};

export const createEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();

  const rawData = {
    title: getString(formData, "title"),
    eventType: getString(formData, "eventType"),
    eventDate: getString(formData, "eventDate"),
    guestCount: getString(formData, "guestCount"),
    status: getString(formData, "status"),
    venueName: getOptionalString(formData, "venueName"),
    venueAddress: getOptionalString(formData, "venueAddress"),
    notes: getOptionalString(formData, "notes"),
    budget: getString(formData, "budget"),
    ticketPrice: getString(formData, "ticketPrice"),
    ticketTier: getOptionalString(formData, "ticketTier"),
    eventFormat: getOptionalString(formData, "eventFormat"),
    accessibilityOptions: getList(formData, "accessibilityOptions"),
    featuredMediaUrl: getOptionalString(formData, "featuredMediaUrl"),
    tags: getTags(formData),
  };

  const parsed = createEventSchema.safeParse(rawData);

  if (!parsed.success) {
    const error = parsed.error as {
      issues?: Array<{ message: string }>;
      errors?: Array<{ message: string }>;
    };
    const issues = error.issues ?? error.errors ?? [];
    const errors = issues.map((e) => e.message).join(", ");
    throw new Error(`Validation failed: ${errors}`);
  }

  const data = parsed.data;

  const created = await database.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        tenantId,
        title: data.title,
        eventType: data.eventType,
        eventDate: new Date(`${data.eventDate}T00:00:00`),
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
        tags: data.tags,
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

  revalidatePath("/events");
  redirect(`/events/${created.id}`);
};

export const updateEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
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

  const missingFields = await computeMissingEventFields({
    tenantId,
    eventId,
    title,
    eventType,
    eventDate,
    guestCount,
    venueName: getOptionalString(formData, "venueName"),
  });
  const tags = mergeTags(getTags(formData), missingFields);

  await database.event.updateMany({
    where: {
      AND: [{ tenantId }, { id: eventId }],
    },
    data: {
      title,
      eventType,
      eventDate,
      guestCount,
      status,
      budget: getNumberOrNull(formData, "budget"),
      ticketPrice: getNumberOrNull(formData, "ticketPrice"),
      ticketTier: getOptionalString(formData, "ticketTier"),
      eventFormat: getOptionalString(formData, "eventFormat"),
      accessibilityOptions: getList(formData, "accessibilityOptions"),
      featuredMediaUrl: getOptionalString(formData, "featuredMediaUrl"),
      venueName: getOptionalString(formData, "venueName"),
      venueAddress: getOptionalString(formData, "venueAddress"),
      notes: getOptionalString(formData, "notes"),
      tags,
    },
  });

  revalidatePath("/events");
  redirect(`/events/${eventId}`);
};

export const deleteEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  const eventId = getString(formData, "eventId");

  if (!eventId) {
    throw new Error("Event id is required.");
  }

  await database.event.updateMany({
    where: {
      AND: [{ tenantId }, { id: eventId }],
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/events");
  redirect("/events");
};

/** Soft-delete an event by id. Call from client with confirmation. */
export async function deleteEventById(eventId: string): Promise<void> {
  const tenantId = await requireTenantId();
  if (!eventId?.trim()) {
    throw new Error("Event id is required.");
  }
  await database.event.updateMany({
    where: { tenantId, id: eventId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/events");
  redirect("/events");
}

export const importEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Import file is required.");
  }

  const fileName = file.name || "event-import";
  const isPdf =
    file.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const eventId = isPdf
    ? await importEventFromPdf({ tenantId, fileName, content: fileBuffer })
    : await importEventFromCsvText({
        tenantId,
        fileName,
        content: fileBuffer.toString("utf-8"),
      });

  revalidatePath("/events");
  redirect(`/events/${eventId}`);
};

export const attachEventImport = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  const eventId = getString(formData, "eventId");
  const file = formData.get("file");

  if (!eventId) {
    throw new Error("Event id is required.");
  }

  if (!(file instanceof File)) {
    throw new Error("Import file is required.");
  }

  const fileName = file.name || "event-import";
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.event_imports (
        tenant_id,
        id,
        eventId,
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
        ${fileBuffer.byteLength},
        ${fileBuffer}
      )
    `
  );

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
};
