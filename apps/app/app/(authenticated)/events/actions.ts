"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "../../lib/tenant";
import { type EventStatus, eventStatuses } from "./constants";
import { importEventFromCsvText, importEventFromPdf } from "./importer";

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

export const createEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  const eventDate = getDate(formData, "eventDate");

  if (!eventDate) {
    throw new Error("Event date is required.");
  }

  const status = getStatus(formData);

  if (!eventStatuses.includes(status)) {
    throw new Error("Invalid status.");
  }

  const created = await database.event.create({
    data: {
      tenantId,
      title: getString(formData, "title") ?? "Untitled Event",
      eventType: getString(formData, "eventType") ?? "catering",
      eventDate,
      guestCount: getNumber(formData, "guestCount") ?? 1,
      status,
      budget: getNumberOrNull(formData, "budget"),
      venueName: getOptionalString(formData, "venueName"),
      venueAddress: getOptionalString(formData, "venueAddress"),
      notes: getOptionalString(formData, "notes"),
      tags: getTags(formData),
    },
  });

  revalidatePath("/events");
  redirect(`/events/${created.id}`);
};

export const updateEvent = async (formData: FormData): Promise<void> => {
  const tenantId = await requireTenantId();
  const eventId = getString(formData, "eventId");
  const eventDate = getDate(formData, "eventDate");

  if (!eventId) {
    throw new Error("Event id is required.");
  }

  if (!eventDate) {
    throw new Error("Event date is required.");
  }

  const status = getStatus(formData);

  if (!eventStatuses.includes(status)) {
    throw new Error("Invalid status.");
  }

  await database.event.update({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
    data: {
      title: getString(formData, "title") ?? "Untitled Event",
      eventType: getString(formData, "eventType") ?? "catering",
      eventDate,
      guestCount: getNumber(formData, "guestCount") ?? 1,
      status,
      budget: getNumberOrNull(formData, "budget"),
      venueName: getOptionalString(formData, "venueName"),
      venueAddress: getOptionalString(formData, "venueAddress"),
      notes: getOptionalString(formData, "notes"),
      tags: getTags(formData),
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

  await database.event.update({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/events");
  redirect("/events");
};

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
        ${fileBuffer.byteLength},
        ${fileBuffer}
      )
    `
  );

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
};
