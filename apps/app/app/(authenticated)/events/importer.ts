import "server-only";

import type { MenuItem, ParsedEvent } from "@repo/event-parser";
import {
  dishCreate,
  eventCreate,
  eventDishCreate,
  eventImportCreate,
  listDishes,
  listRecipes,
  prepTaskCreate,
  recipeCreate,
} from "@/app/lib/manifest-client.generated";
import { createEventSchema } from "./validation";

type EventParserModule = typeof import("@repo/event-parser");
let eventParserPromise: Promise<EventParserModule> | null = null;
const getEventParser = () => {
  eventParserPromise ??= import("@repo/event-parser");
  return eventParserPromise;
};

type CsvRow = Record<string, string>;
const LINE_SPLIT_REGEX = /\r?\n/;
const NUMBER_REGEX = /[\d.]+/;
const UNIT_REGEX = /[a-zA-Z]+/g;
const EXTENSION_REGEX = /\.[^/.]+$/;
const SEPARATOR_REGEX = /[_-]+/g;

const normalizeHeader = (value: string) =>
  value.replace(/\uFEFF/g, "").trim().replace(/\s+/g, " ").toLowerCase();

const parseCsv = (input: string): CsvRow[] => {
  const lines = input.split(LINE_SPLIT_REGEX).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => normalizeHeader(header));
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? "").trim();
    });
    return row;
  });
};

const getValue = (row: CsvRow, keys: string[]) => {
  for (const key of keys) {
    const normalized = normalizeHeader(key);
    if (row[normalized]) {
      return row[normalized];
    }
  }
  return "";
};

const parseNumber = (value: string) => {
  const parsed = Number(value.match(NUMBER_REGEX)?.[0] ?? "");
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseQuantityUnit = (value: string) => ({
  amount: parseNumber(value),
  unit: (value.match(UNIT_REGEX)?.join(" ") ?? "").toLowerCase(),
});

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

async function ensureRecipeAndDish(itemName: string) {
  const [recipes, dishes] = await Promise.all([listRecipes(), listDishes()]);
  const existingDish = dishes.data.find(
    (dish) => !dish.deletedAt && (dish.name ?? "").toLowerCase() === itemName.toLowerCase()
  );
  if (existingDish?.id) return { recipeId: existingDish.recipeId ?? "", dishId: existingDish.id };
  let recipeId =
    recipes.data.find(
      (recipe) =>
        !recipe.deletedAt && (recipe.name ?? "").toLowerCase() === itemName.toLowerCase()
    )?.id ?? "";
  if (!recipeId) {
    recipeId = (await recipeCreate({ name: itemName, category: "imported", tags: ["imported"] }))?.id ?? "";
  }
  const dishId =
    (await dishCreate({
      recipeId,
      name: itemName,
      description: "",
      category: "imported",
      serviceStyle: "catering",
      defaultContainerId: "",
      presentationImageUrl: "",
      minPrepLeadDays: 0,
      maxPrepLeadDays: 0,
      portionSizeDescription: "",
      dietaryTags: [],
      allergens: [],
      pricePerPerson: 0,
      costPerPerson: 0,
    }))?.id ?? "";
  return { recipeId, dishId };
}

function createEventFromParsed(parsedEvent: ParsedEvent, fileName: string) {
  const title = parsedEvent.client?.trim() || parsedEvent.number?.trim() || fileName;
  const eventDate = parsedEvent.date ? new Date(parsedEvent.date) : new Date();
  const validated = createEventSchema.safeParse({
    title,
    eventType: parsedEvent.serviceStyle?.trim() || "catering",
    eventDate: formatDate(eventDate),
    guestCount: parsedEvent.headcount > 0 ? parsedEvent.headcount : 1,
    notes: parsedEvent.notes?.join("\n") || `Imported from ${fileName}`,
  });
  if (!validated.success) {
    throw new Error(`Invalid event data: ${validated.error.message}`);
  }
  return eventCreate({
    clientId: "",
    eventNumber: parsedEvent.number?.trim() || "",
    title: validated.data.title,
    eventType: validated.data.eventType,
    eventDate: validated.data.eventDate,
    guestCount: validated.data.guestCount,
    venueName: parsedEvent.venue?.name || "",
    venueAddress: parsedEvent.venue?.address || "",
    notes: validated.data.notes || "",
    tags: ["imported"],
    status: "draft",
    budget: 0,
    ticketPrice: 0,
    ticketTier: "",
    eventFormat: "",
    accessibilityOptions: [],
    featuredMediaUrl: "",
  });
}

async function addMenuItemsToEvent(eventId: string, eventDate: Date, menuItems: MenuItem[]) {
  for (const menuItem of menuItems) {
    const itemName = menuItem.name.trim();
    if (!itemName) continue;
    const { dishId } = await ensureRecipeAndDish(itemName);
    const servings = Math.max(1, Math.round(menuItem.qty?.value ?? 1));
    await eventDishCreate({
      eventId,
      dishId,
      quantityServings: servings,
      specialInstructions: menuItem.preparationNotes ?? "",
      course: menuItem.category ?? "",
    });
    await prepTaskCreate({
      name: itemName,
      eventId,
      taskType: "prep",
      priority: 5,
      quantityTotal: servings,
      servingsTotal: servings,
      startByDate: formatDate(addDays(eventDate, -2)),
      dueByDate: formatDate(eventDate),
      notes: menuItem.preparationNotes ?? "",
    });
  }
}

export const importEventFromCsvText = async ({
  tenantId: _tenantId,
  fileName,
  content,
}: {
  tenantId: string;
  fileName: string;
  content: string;
}) => {
  const rows = parseCsv(content);
  if (rows.length === 0) throw new Error("No rows found in CSV.");
  const now = new Date();
  const title = fileName.replace(EXTENSION_REGEX, "").replace(SEPARATOR_REGEX, " ").trim();
  const eventDate = addDays(now, 10);
  const createdEvent = await eventCreate({
    clientId: "",
    eventNumber: "",
    title,
    eventType: "catering",
    eventDate: formatDate(eventDate),
    guestCount: Math.max(
      1,
      Math.round(parseNumber(getValue(rows[0], ["servings/batch", "servings batch"])) ?? 1)
    ),
    venueName: "",
    venueAddress: "",
    notes: `Imported from ${fileName}`,
    tags: ["imported"],
    status: "draft",
    budget: 0,
    ticketPrice: 0,
    ticketTier: "",
    eventFormat: "",
    accessibilityOptions: [],
    featuredMediaUrl: "",
  });
  const eventId = createdEvent?.id;
  if (!eventId) throw new Error("Failed to create event");

  for (const row of rows) {
    const itemName = getValue(row, ["dish name", "item_name"]).trim();
    if (!itemName) continue;
    const { amount } = parseQuantityUnit(getValue(row, ["quantity/unit", "quantity unit"]));
    const servings = parseNumber(getValue(row, ["servings/batch", "servings batch"])) ?? 1;
    const { dishId } = await ensureRecipeAndDish(itemName);
    await eventDishCreate({
      eventId,
      dishId,
      quantityServings: Math.max(1, Math.round(servings)),
      specialInstructions: getValue(row, ["special instructions", "notes"]),
      course: "",
    });
    await prepTaskCreate({
      name: itemName,
      eventId,
      taskType: "prep",
      priority: 5,
      quantityTotal: amount ?? servings,
      servingsTotal: servings,
      startByDate: formatDate(addDays(eventDate, -2)),
      dueByDate: formatDate(eventDate),
      notes: getValue(row, ["special instructions", "notes"]),
    });
  }

  await eventImportCreate({
    fileType: "csv",
    fileName,
    mimeType: "text/csv",
    totalRows: rows.length,
  });

  return eventId;
};

export const importEventFromPdf = async ({
  tenantId: _tenantId,
  fileName,
  content,
}: {
  tenantId: string;
  fileName: string;
  content: Buffer;
}) => {
  const { processMultipleDocuments } = await getEventParser();
  const result = await processMultipleDocuments([{ content, fileName }]);
  const mergedEvent = result.mergedEvent;
  if (!mergedEvent) {
    throw new Error("No event data could be extracted from the PDF.");
  }

  const created = await createEventFromParsed(mergedEvent, fileName);
  const eventId = created?.id;
  if (!eventId) throw new Error("Event create succeeded but returned no ID");

  await addMenuItemsToEvent(
    eventId,
    mergedEvent.date ? new Date(mergedEvent.date) : new Date(),
    mergedEvent.menuSections ?? []
  );

  await eventImportCreate({
    fileType: "pdf",
    fileName,
    mimeType: "application/pdf",
    totalRows: result.documents.length,
  });

  return eventId;
};
