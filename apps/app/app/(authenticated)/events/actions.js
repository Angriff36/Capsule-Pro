"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.attachEventImport =
  exports.importEvent =
  exports.deleteEvent =
  exports.updateEvent =
  exports.createEvent =
    void 0;
const database_1 = require("@repo/database");
const crypto_1 = require("crypto");
const cache_1 = require("next/cache");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../lib/tenant");
const constants_1 = require("./constants");
const importer_1 = require("./importer");
const getString = (formData, key) => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
const getOptionalString = (formData, key) => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const getNumber = (formData, key) => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};
const getNumberOrNull = (formData, key) => {
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
const getDate = (formData, key) => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const dateValue = new Date(`${value}T00:00:00`);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
};
const getStatus = (formData) => getString(formData, "status") ?? "confirmed";
const getTags = (formData) =>
  (getString(formData, "tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
const createEvent = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const eventDate = getDate(formData, "eventDate");
  if (!eventDate) {
    throw new Error("Event date is required.");
  }
  const status = getStatus(formData);
  if (!constants_1.eventStatuses.includes(status)) {
    throw new Error("Invalid status.");
  }
  const created = await database_1.database.event.create({
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
  (0, cache_1.revalidatePath)("/events");
  (0, navigation_1.redirect)(`/events/${created.id}`);
};
exports.createEvent = createEvent;
const updateEvent = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const eventId = getString(formData, "eventId");
  const eventDate = getDate(formData, "eventDate");
  if (!eventId) {
    throw new Error("Event id is required.");
  }
  if (!eventDate) {
    throw new Error("Event date is required.");
  }
  const status = getStatus(formData);
  if (!constants_1.eventStatuses.includes(status)) {
    throw new Error("Invalid status.");
  }
  await database_1.database.event.update({
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
  (0, cache_1.revalidatePath)("/events");
  (0, navigation_1.redirect)(`/events/${eventId}`);
};
exports.updateEvent = updateEvent;
const deleteEvent = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const eventId = getString(formData, "eventId");
  if (!eventId) {
    throw new Error("Event id is required.");
  }
  await database_1.database.event.update({
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
  (0, cache_1.revalidatePath)("/events");
  (0, navigation_1.redirect)("/events");
};
exports.deleteEvent = deleteEvent;
const importEvent = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Import file is required.");
  }
  const fileName = file.name || "event-import";
  const isPdf =
    file.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const eventId = isPdf
    ? await (0, importer_1.importEventFromPdf)({
        tenantId,
        fileName,
        content: fileBuffer,
      })
    : await (0, importer_1.importEventFromCsvText)({
        tenantId,
        fileName,
        content: fileBuffer.toString("utf-8"),
      });
  (0, cache_1.revalidatePath)("/events");
  (0, navigation_1.redirect)(`/events/${eventId}`);
};
exports.importEvent = importEvent;
const attachEventImport = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
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
  await database_1.database.$executeRaw(database_1.Prisma.sql`
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
        ${(0, crypto_1.randomUUID)()},
        ${eventId},
        ${fileName},
        ${file.type || "application/octet-stream"},
        ${fileBuffer.byteLength},
        ${fileBuffer}
      )
    `);
  (0, cache_1.revalidatePath)(`/events/${eventId}`);
  (0, navigation_1.redirect)(`/events/${eventId}`);
};
exports.attachEventImport = attachEventImport;
