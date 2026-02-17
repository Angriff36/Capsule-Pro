/**
 * @module DocumentParseAPI
 * @intent Parse uploaded PDFs and CSVs to extract event data
 * @responsibility Handle document upload, parsing, and data extraction
 * @domain Events
 * @tags events, documents, parsing, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type {
  MenuItem,
  ParsedEvent,
  ProcessedDocument,
  StaffShift,
} from "@repo/event-parser";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type EventParserModule = typeof import("@repo/event-parser");

let eventParserPromise: Promise<EventParserModule> | null = null;

const getEventParser = () => {
  eventParserPromise ??= import("@repo/event-parser");
  return eventParserPromise;
};

type MissingField =
  | "client"
  | "eventDate"
  | "venueName"
  | "eventType"
  | "headcount"
  | "menuItems";

interface MenuImportSummary {
  missingQuantities: string[];
  linkedDishes: number;
  createdDishes: number;
  createdRecipes: number;
  updatedLinks: number;
}

interface AggregatedMenuItem {
  name: string;
  category: string | null;
  serviceLocation: string | null;
  quantity: number;
  quantitySource: "parsed" | "details" | "headcount" | "fallback";
  allergens: Set<string>;
  dietaryTags: Set<string>;
  instructions: Set<string>;
}

const MISSING_FIELD_TAG_PREFIX = "needs:";

// Module-level regex constants for performance
const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
const SEPARATOR_REGEX = /[-]+/g;
const SERVING_UNIT_REGEX = /serv|pax|guest|portion/i;
const WHITESPACE_REGEX = /\s+/g;

const normalizeName = (value: string) =>
  value.trim().replace(WHITESPACE_REGEX, " ");

const normalizeList = (values: string[] | undefined) =>
  (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const getFileLabel = (fileName: string) =>
  fileName
    .replace(FILE_EXTENSION_REGEX, "")
    .replace(SEPARATOR_REGEX, " ")
    .trim();

const getMissingFieldsFromParsedEvent = (
  event: ParsedEvent
): MissingField[] => {
  const missing: MissingField[] = [];
  if (!event.client?.trim()) {
    missing.push("client");
  }
  if (!event.date?.trim()) {
    missing.push("eventDate");
  }
  if (!event.venue?.name?.trim()) {
    missing.push("venueName");
  }
  if (!event.serviceStyle?.trim()) {
    missing.push("eventType");
  }
  if (!event.headcount || event.headcount <= 0) {
    missing.push("headcount");
  }
  if (!event.menuSections || event.menuSections.length === 0) {
    missing.push("menuItems");
  }
  return missing;
};

const buildMissingFieldTags = (missing: MissingField[]) =>
  missing.map((field) => `${MISSING_FIELD_TAG_PREFIX}${field}`);

const buildEventTags = (baseTags: string[], missing: MissingField[]) => {
  const tagSet = new Set<string>(baseTags.filter(Boolean));
  for (const tag of buildMissingFieldTags(missing)) {
    tagSet.add(tag);
  }
  return Array.from(tagSet);
};

const deriveEventTitle = (event: ParsedEvent, files: File[]) => {
  const client = event.client?.trim();
  if (client) {
    return client;
  }
  const number = event.number?.trim();
  if (number) {
    return number;
  }
  return files[0]?.name ? getFileLabel(files[0].name) : "";
};

const parseEventDate = (dateValue: string | undefined) => {
  if (!dateValue) {
    return null;
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mergeInstructions = (item: MenuItem) => {
  const instructions = new Set<string>();
  if (item.preparationNotes?.trim()) {
    instructions.add(item.preparationNotes.trim());
  }
  for (const note of normalizeList(item.specials)) {
    instructions.add(note);
  }
  return instructions;
};

const deriveMenuQuantity = (
  item: MenuItem,
  fallbackHeadcount: number
): {
  quantity: number;
  source: "parsed" | "details" | "headcount" | "fallback";
} => {
  if (item.qty?.value && item.qty.value > 0) {
    return { quantity: Math.round(item.qty.value), source: "parsed" as const };
  }

  const servingDetails =
    item.quantityDetails?.filter(
      (detail) => detail.value > 0 && SERVING_UNIT_REGEX.test(detail.unit)
    ) ?? [];
  if (servingDetails.length > 0) {
    const maxDetail = servingDetails.reduce(
      (max, detail) => (detail.value > max ? detail.value : max),
      0
    );
    return {
      quantity: Math.round(maxDetail),
      source: "details" as const,
    };
  }

  if (fallbackHeadcount > 0) {
    return {
      quantity: Math.round(fallbackHeadcount),
      source: "headcount" as const,
    };
  }

  return { quantity: 1, source: "fallback" as const };
};

// ============================================================================
// HELPER FUNCTIONS FOR MENU IMPORT (reduce complexity of importMenuToEvent)
// ============================================================================

/**
 * Aggregate menu items by name to combine duplicates
 */
function aggregateMenuItems(
  menuItems: MenuItem[],
  headcount: number
): Map<string, AggregatedMenuItem> {
  const aggregated = new Map<string, AggregatedMenuItem>();

  for (const item of menuItems) {
    const name = normalizeName(item.name);
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    const { quantity, source } = deriveMenuQuantity(item, headcount);

    let entry = aggregated.get(key);
    if (!entry) {
      entry = {
        name,
        category: item.category?.trim() || null,
        serviceLocation: item.serviceLocation ?? null,
        quantity: 0,
        quantitySource: source,
        allergens: new Set<string>(),
        dietaryTags: new Set<string>(),
        instructions: new Set<string>(),
      };
      aggregated.set(key, entry);
    }

    entry.quantity += quantity;
    if (entry.quantitySource === "fallback" && source !== "fallback") {
      entry.quantitySource = source;
    }

    for (const allergen of normalizeList(item.allergens)) {
      entry.allergens.add(allergen);
    }
    for (const tag of normalizeList(item.badges)) {
      entry.dietaryTags.add(tag);
    }
    for (const instruction of mergeInstructions(item)) {
      entry.instructions.add(instruction);
    }
  }

  return aggregated;
}

/**
 * Find or create a recipe for a dish
 */
async function findOrCreateRecipe(
  tenantId: string,
  dishName: string,
  category: string | null
): Promise<{ recipeId: string; created: boolean }> {
  const existingRecipe = await database.recipe.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      name: {
        equals: dishName,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existingRecipe) {
    return { recipeId: existingRecipe.id, created: false };
  }

  const createdRecipe = await database.recipe.create({
    data: {
      tenantId,
      name: dishName,
      category: category ?? undefined,
      tags: ["imported"],
      isActive: true,
    },
  });

  return { recipeId: createdRecipe.id, created: true };
}

/**
 * Find or create a dish
 */
async function findOrCreateDish(
  tenantId: string,
  entry: AggregatedMenuItem,
  serviceStyle: string | undefined
): Promise<{ dishId: string; created: boolean; recipeCreated: boolean }> {
  const existingDish = await database.dish.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      name: {
        equals: entry.name,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      recipeId: true,
    },
  });

  if (existingDish) {
    return { dishId: existingDish.id, created: false, recipeCreated: false };
  }

  const { recipeId, created: recipeCreated } = await findOrCreateRecipe(
    tenantId,
    entry.name,
    entry.category
  );

  const createdDish = await database.dish.create({
    data: {
      tenantId,
      recipeId,
      name: entry.name,
      category: entry.category ?? undefined,
      serviceStyle,
      dietaryTags: Array.from(entry.dietaryTags),
      allergens: Array.from(entry.allergens),
      isActive: true,
    },
  });

  return { dishId: createdDish.id, created: true, recipeCreated };
}

/**
 * Check if an event-dish link already exists
 */
async function findExistingEventDishLink(
  tenantId: string,
  eventId: string,
  dishId: string
): Promise<string | undefined> {
  const [existingLink] = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND dish_id = ${dishId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  return existingLink?.id;
}

/**
 * Update an existing event-dish link
 */
async function updateEventDishLink(
  tenantId: string,
  eventId: string,
  linkId: string,
  entry: AggregatedMenuItem,
  serviceStyle: string | undefined
): Promise<void> {
  const specialInstructions = Array.from(entry.instructions).join("; ");

  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_events.event_dishes
      SET quantity_servings = ${Math.max(1, Math.round(entry.quantity))},
          service_style = ${entry.serviceLocation ?? serviceStyle ?? null},
          course = ${entry.category ?? null},
          special_instructions = ${
            specialInstructions.length > 0 ? specialInstructions : null
          },
          updated_at = ${new Date()}
      WHERE tenant_id = ${tenantId}
        AND id = ${linkId}
        AND event_id = ${eventId}
    `
  );
}

/**
 * Create a new event-dish link
 */
async function createEventDishLink(
  tenantId: string,
  eventId: string,
  dishId: string,
  entry: AggregatedMenuItem,
  serviceStyle: string | undefined
): Promise<void> {
  const specialInstructions = Array.from(entry.instructions).join("; ");

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.event_dishes (
        tenant_id,
        id,
        event_id,
        dish_id,
        course,
        quantity_servings,
        service_style,
        special_instructions,
        created_at,
        updated_at
      )
      VALUES (
        ${tenantId},
        gen_random_uuid(),
        ${eventId},
        ${dishId},
        ${entry.category ?? null},
        ${Math.max(1, Math.round(entry.quantity))},
        ${entry.serviceLocation ?? serviceStyle ?? null},
        ${specialInstructions.length > 0 ? specialInstructions : null},
        ${new Date()},
        ${new Date()}
      )
    `
  );
}

/**
 * Process a single aggregated menu item entry
 */
async function processMenuItemEntry(
  tenantId: string,
  eventId: string,
  entry: AggregatedMenuItem,
  serviceStyle: string | undefined,
  summary: MenuImportSummary
): Promise<void> {
  const { dishId, created, recipeCreated } = await findOrCreateDish(
    tenantId,
    entry,
    serviceStyle
  );

  if (created) {
    summary.createdDishes += 1;
  }
  if (recipeCreated) {
    summary.createdRecipes += 1;
  }

  const existingLinkId = await findExistingEventDishLink(
    tenantId,
    eventId,
    dishId
  );

  if (existingLinkId) {
    await updateEventDishLink(
      tenantId,
      eventId,
      existingLinkId,
      entry,
      serviceStyle
    );
    summary.updatedLinks += 1;
  } else {
    await createEventDishLink(tenantId, eventId, dishId, entry, serviceStyle);
    summary.linkedDishes += 1;
  }
}

/**
 * Build summary of missing quantities from aggregated items
 */
function buildMissingQuantitiesSummary(
  aggregated: Map<string, AggregatedMenuItem>
): string[] {
  const missing: string[] = [];
  for (const entry of aggregated.values()) {
    if (entry.quantitySource === "fallback") {
      missing.push(entry.name);
    }
  }
  return missing;
}

const importMenuToEvent = async (
  tenantId: string,
  eventId: string,
  event: ParsedEvent
): Promise<MenuImportSummary> => {
  const summary: MenuImportSummary = {
    missingQuantities: [],
    linkedDishes: 0,
    createdDishes: 0,
    createdRecipes: 0,
    updatedLinks: 0,
  };

  const menuItems = event.menuSections ?? [];
  if (menuItems.length === 0) {
    return summary;
  }

  // Aggregate menu items by name to combine duplicates
  const aggregated = aggregateMenuItems(menuItems, event.headcount);

  // Build missing quantities summary
  summary.missingQuantities = buildMissingQuantitiesSummary(aggregated);

  // Process each aggregated menu item entry
  for (const entry of aggregated.values()) {
    await processMenuItemEntry(
      tenantId,
      eventId,
      entry,
      event.serviceStyle?.trim(),
      summary
    );
  }

  return summary;
};

/**
 * Helper function to generate and save battle board
 * Note: Event must be created before calling this function
 */
async function _createBattleBoard(
  mergedEvent: ParsedEvent,
  tenantId: string,
  eventId: string
) {
  const { buildBattleBoardFromEvent } = await getEventParser();
  const battleBoardResult = buildBattleBoardFromEvent(mergedEvent);

  // Save battle board to database
  const boardName = mergedEvent.client || mergedEvent.number || eventId || "";

  const savedBattleBoard = await database.battleBoard.create({
    data: {
      tenantId,
      eventId,
      board_name: boardName,
      board_type: "event-specific",
      schema_version: "mangia-battle-board@1",
      boardData: battleBoardResult.battleBoard as object,
      status: "draft",
      is_template: false,
      tags: ["imported"],
    },
  });

  return { battleBoard: battleBoardResult, battleBoardId: savedBattleBoard.id };
}

/**
 * Helper function to validate file extensions
 */
function validateFileExtensions(
  files: File[],
  allowedExtensions: string[]
): { valid: true; files: File[] } | { valid: false; error: string } {
  const invalidFiles = files.filter((file) => {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    return !allowedExtensions.includes(ext);
  });

  if (invalidFiles.length > 0) {
    return {
      valid: false,
      error: `Invalid file types: ${invalidFiles.map((f) => f.name).join(", ")}. Only PDF and CSV files are allowed.`,
    };
  }

  return { valid: true, files };
}

/**
 * Helper function to validate file extensions
 */
async function processFormData(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  return { files, formData };
}

/**
 * Helper function to parse documents
 */
async function parseDocuments(
  fileContents: Array<{
    content: ArrayBuffer | Uint8Array | Buffer;
    fileName: string;
  }>
) {
  const { processMultipleDocuments } = await getEventParser();
  return await processMultipleDocuments(fileContents);
}

/**
 * Helper function to create import records
 */
async function createImportRecords(
  files: File[],
  result: {
    documents: ProcessedDocument[];
    mergedEvent?: ParsedEvent;
    mergedStaff?: StaffShift[];
    errors: string[];
  },
  tenantId: string,
  eventId?: string
) {
  return await Promise.all(
    files.map(async (file, index) => {
      const doc = result.documents[index];

      // Determine MIME type
      const ext = file.name.split(".").pop()?.toLowerCase();
      let mimeType = "";
      if (ext === "pdf") {
        mimeType = "application/pdf";
      } else if (ext === "csv") {
        mimeType = "text/csv";
      }

      // Prisma Bytes in Node.js expects Buffer; doc may be missing if parser returned fewer items
      const rawContent = await file.arrayBuffer();
      const contentBuffer = Buffer.from(rawContent);

      // Create import record matching EventImport schema (parseErrors is required)
      const importRecord = await database.eventImport.create({
        data: {
          tenantId,
          eventId: eventId || undefined,
          fileName: file.name,
          mimeType,
          fileSize: file.size,
          content: contentBuffer,
          parseErrors: doc?.errors ?? [],
          fileType: doc?.fileType ?? (ext === "csv" ? "csv" : "pdf"),
          detectedFormat: doc?.detectedFormat ?? null,
        },
      });

      return {
        importId: importRecord.id,
        document: doc,
      };
    })
  );
}

// ============================================================================
// HELPER FUNCTIONS FOR DOCUMENT PROCESSING (reduce complexity)
// ============================================================================

/**
 * Build event notes from parsed event data and files
 */
function buildEventNotes(files: File[], event: ParsedEvent): string {
  const notesParts: string[] = [
    `Imported from ${files.map((file) => file.name).join(", ")}`,
  ];
  if (event.notes && event.notes.length > 0) {
    notesParts.push(...event.notes);
  }
  if (event.flags && event.flags.length > 0) {
    const flagMessages = event.flags.map((f) => f.message).filter(Boolean);
    if (flagMessages.length > 0) {
      notesParts.push(`Flags: ${flagMessages.join("; ")}`);
    }
  }
  return notesParts.join("\n\n");
}

/**
 * Create a new event from parsed data
 */
async function createEventFromParsedData(
  tenantId: string,
  event: ParsedEvent,
  files: File[],
  missingFields: MissingField[]
): Promise<{ eventId: string; title: string }> {
  const derivedTitle = deriveEventTitle(event, files);
  const parsedDate = parseEventDate(event.date);
  const resolvedEventDate = parsedDate ?? new Date();
  const notes = buildEventNotes(files, event);

  const newEvent = await database.event.create({
    data: {
      tenantId,
      title: derivedTitle,
      eventType: event.serviceStyle || "catering",
      eventDate: resolvedEventDate,
      guestCount: event.headcount > 0 ? event.headcount : 0,
      status: missingFields.length > 0 ? "draft" : "confirmed",
      eventNumber: event.number || undefined,
      venueName: event.venue?.name || undefined,
      venueAddress: event.venue?.address || undefined,
      notes,
      tags: buildEventTags(["imported", ...(event.kits || [])], missingFields),
    },
  });

  return { eventId: newEvent.id, title: derivedTitle };
}

/**
 * Link import records to an event
 */
async function linkImportRecordsToEvent(
  importRecords: Array<{ importId: string; document: ProcessedDocument }>,
  eventId: string
): Promise<void> {
  await Promise.all(
    importRecords.map((record) =>
      database.eventImport.update({
        where: { id: record.importId },
        data: { eventId },
      })
    )
  );
}

/**
 * Handle event creation from parsed data
 */
async function handleEventCreation(
  tenantId: string,
  event: ParsedEvent,
  files: File[],
  importRecords: Array<{ importId: string; document: ProcessedDocument }>
): Promise<{ eventId: string; title: string }> {
  console.log("[handleEventCreation] Creating new event from parsed data");
  const missingFields = getMissingFieldsFromParsedEvent(event);
  const result = await createEventFromParsedData(
    tenantId,
    event,
    files,
    missingFields
  );
  console.log("[handleEventCreation] Event created:", result.eventId);

  await linkImportRecordsToEvent(importRecords, result.eventId);

  return result;
}

/**
 * Generate battle board from parsed event data
 */
async function generateBattleBoardForEvent(
  tenantId: string,
  eventId: string,
  event: ParsedEvent,
  response: ParseDocumentsResponse
): Promise<void> {
  try {
    console.log("[generateBattleBoardForEvent] Creating battle board");

    const { buildBattleBoardFromEvent } = await getEventParser();
    const battleBoardResult = buildBattleBoardFromEvent(event);
    const battleBoardId = crypto.randomUUID();

    const savedBattleBoard = await database.battleBoard.create({
      data: {
        tenantId,
        id: battleBoardId,
        eventId,
        board_name: event.client || event.number || eventId || "",
        board_type: "event-specific",
        schema_version: "mangia-battle-board@1",
        boardData: battleBoardResult.battleBoard as object,
        status: "draft",
        is_template: false,
        tags: ["imported"],
      },
    });

    console.log(
      "[generateBattleBoardForEvent] Battle board saved:",
      savedBattleBoard.id
    );
    response.battleBoard = battleBoardResult.battleBoard;
    response.battleBoardId = savedBattleBoard.id;
  } catch (error) {
    console.error("[generateBattleBoardForEvent] Generation failed:", error);
    response.battleBoardError =
      error instanceof Error ? error.message : "Unknown error";
  }
}

/**
 * Generate checklist from parsed event data
 */
async function generateChecklistForEvent(
  tenantId: string,
  eventId: string,
  event: ParsedEvent,
  eventTitle: string,
  response: ParseDocumentsResponse
): Promise<void> {
  try {
    console.log("[generateChecklistForEvent] Creating checklist");

    const { buildInitialChecklist } = await getEventParser();
    const checklistResult = buildInitialChecklist(event);

    const completionPercent =
      checklistResult.totalQuestions > 0
        ? Math.round(
            (checklistResult.autoFilledCount / checklistResult.totalQuestions) *
              100
          )
        : 0;

    const savedReport = await database.eventReport.create({
      data: {
        tenantId,
        id: crypto.randomUUID(),
        eventId,
        name: eventTitle || eventId,
        status: "draft",
        completion: completionPercent,
        autoFillScore: checklistResult.autoFilledCount,
        checklistData: {
          checklist: checklistResult.checklist,
          warnings: checklistResult.warnings,
        } as unknown as Prisma.InputJsonObject,
        parsedEventData: event as unknown as Prisma.InputJsonObject,
      },
    });

    console.log("[generateChecklistForEvent] Checklist saved:", savedReport.id);

    response.checklist = checklistResult;
    response.checklistId = savedReport.id;
  } catch (error) {
    console.error("[generateChecklistForEvent] Generation failed:", error);
    response.checklistError =
      error instanceof Error ? error.message : "Unknown error";
  }
}

/**
 * Process parsed event data - create event and import menu
 */
async function processParsedEventData(
  tenantId: string,
  eventId: string | undefined,
  event: ParsedEvent,
  files: File[],
  importRecords: Array<{ importId: string; document: ProcessedDocument }>
): Promise<{ actualEventId: string; derivedTitle: string }> {
  let actualEventId = eventId ?? "";

  if (!actualEventId) {
    const result = await handleEventCreation(
      tenantId,
      event,
      files,
      importRecords
    );
    actualEventId = result.eventId;
  }

  // Import menu items to event
  if (actualEventId) {
    try {
      await importMenuToEvent(tenantId, actualEventId, event);
    } catch (menuError) {
      console.error("[processParsedEventData] Menu import failed:", menuError);
    }
  }

  const derivedTitle = deriveEventTitle(event, files);
  return { actualEventId, derivedTitle };
}

/**
 * Helper function to handle the entire document processing flow
 * Now powered by Manifest language runtime for orchestration
 */
async function processDocumentsAndGenerateResponse(
  files: File[],
  tenantId: string,
  _userId: string,
  eventId: string | undefined,
  shouldGenerateChecklist: boolean,
  shouldGenerateBattleBoard: boolean
) {
  console.log(
    "[processDocumentsAndGenerateResponse] Starting with",
    files.length,
    "files"
  );
  // Initialize Manifest runtime via dynamic import (avoids require() of ESM on Vercel)
  // Note: Event import functions are capsule-pro specific and not in @angriff36/manifest
  // These need to be ported to kitchen-ops or a separate event-import module
  const _engine = undefined;
  const _processDoc = undefined;
  const _createUpdateEvent = undefined;
  const _generateBattleBoardFn = undefined;
  const _generateChecklistFn = undefined;

  // Process files
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const buffer = Buffer.from(base64, "base64");
      return {
        content: buffer,
        fileName: file.name,
      };
    })
  );

  // Parse documents (existing parser logic)
  const result = await parseDocuments(fileContents);
  console.log("[processDocumentsAndGenerateResponse] parseDocuments result:", {
    documentCount: result.documents.length,
    hasEvent: !!result.mergedEvent,
    staffCount: result.mergedStaff?.length || 0,
    errors: result.errors,
  });

  // Create import records in database
  const importRecords = await createImportRecords(
    files,
    result,
    tenantId,
    eventId
  );

  // Process each document import through Manifest (if available)
  // TODO: Re-enable after porting event import functions from manifest-backup to kitchen-ops
  // if (engine && processDoc) {
  //   try {
  //     const manifestImportIds: string[] = [];
  //     for (const importRecord of importRecords) {
  //       const importId = importRecord.importId;
  //       const doc = importRecord.document;
  //
  //       // Create Manifest instance for DocumentImport
  //       await engine.createInstance("DocumentImport", {
  //         id: importId,
  //         tenantId,
  //         fileName: doc.fileName,
  //         mimeType: doc.fileType === "pdf" ? "application/pdf" : "text/csv",
  //         fileType: doc.fileType,
  //         detectedFormat: doc.detectedFormat,
  //         parseStatus: "pending",
  //       });
  //
  //       manifestImportIds.push(importId);
  //
  //       // Process through Manifest
  //       if (doc.errors && doc.errors.length > 0) {
  //         await processDoc(
  //           engine,
  //           importId,
  //           doc.fileName,
  //           doc.parsedEvent || {},
  //           0,
  //           doc.errors
  //         );
  //       } else {
  //         await processDoc(
  //           engine,
  //           importId,
  //           doc.fileName,
  //           doc.parsedEvent || {},
  //           doc.confidence || 0
  //         );
  //       }
  //     }
  //     console.log(
  //       "[processDocumentsAndGenerateResponse] Processed",
  //       manifestImportIds.length,
  //       "imports through Manifest"
  //     );
  //   } catch (manifestError) {
  //     console.error(
  //       "[processDocumentsAndGenerateResponse] Manifest processing failed, continuing:",
  //       manifestError
  //     );
  //     // Continue without Manifest
  //   }
  // }

  // Build response
  const response = buildResponse(result, importRecords);
  console.log("[processDocumentsAndGenerateResponse] response built");

  // Process parsed event data - create event and import menu
  let actualEventId = eventId;
  let derivedTitle = "";
  if (result.mergedEvent) {
    console.log(
      "[processDocumentsAndGenerateResponse] Parsed event data:",
      JSON.stringify(
        {
          client: result.mergedEvent.client,
          number: result.mergedEvent.number,
          date: result.mergedEvent.date,
          serviceStyle: result.mergedEvent.serviceStyle,
          headcount: result.mergedEvent.headcount,
          venue: result.mergedEvent.venue,
          status: result.mergedEvent.status,
          kits: result.mergedEvent.kits,
          menuSectionsCount: result.mergedEvent.menuSections?.length || 0,
          timelineCount: result.mergedEvent.timeline?.length || 0,
          staffingCount: result.mergedEvent.staffing?.length || 0,
        },
        null,
        2
      )
    );

    const eventData = await processParsedEventData(
      tenantId,
      eventId,
      result.mergedEvent,
      files,
      importRecords
    );
    actualEventId = eventData.actualEventId;
    derivedTitle = eventData.derivedTitle;
  }

  // Generate battle board if requested
  if (shouldGenerateBattleBoard) {
    if (!result.mergedEvent) {
      console.warn(
        "[processDocumentsAndGenerateResponse] Cannot generate battle board: no merged event data"
      );
      response.battleBoardError = "No event data extracted from documents";
    } else if (actualEventId) {
      await generateBattleBoardForEvent(
        tenantId,
        actualEventId,
        result.mergedEvent,
        response
      );
    } else {
      console.warn(
        "[processDocumentsAndGenerateResponse] Cannot generate battle board: no event ID"
      );
      response.battleBoardError =
        "Event must be created before generating battle board";
    }
  }

  // Generate checklist if requested
  if (shouldGenerateChecklist) {
    if (!result.mergedEvent) {
      console.warn(
        "[processDocumentsAndGenerateResponse] Cannot generate checklist: no merged event data"
      );
      response.checklistError = "No event data extracted from documents";
    } else if (actualEventId) {
      await generateChecklistForEvent(
        tenantId,
        actualEventId,
        result.mergedEvent,
        derivedTitle,
        response
      );
    } else {
      console.warn(
        "[processDocumentsAndGenerateResponse] Cannot generate checklist: no event ID"
      );
      response.checklistError =
        "Event must be created before generating checklist";
    }
  }

  return response;
}

/**
 * Helper function to build and return the response
 */
interface ParseDocumentsResponse {
  documents: ProcessedDocument[];
  mergedEvent?: ParsedEvent;
  mergedStaff?: StaffShift[];
  imports: Array<{ importId: string; document: ProcessedDocument }>;
  errors: string[];
  battleBoard?: unknown;
  battleBoardId?: string;
  battleBoardError?: string;
  checklist?: unknown;
  checklistId?: string;
  checklistError?: string;
}

function buildResponse(
  result: {
    documents: ProcessedDocument[];
    mergedEvent?: ParsedEvent;
    mergedStaff?: StaffShift[];
    errors: string[];
  },
  importRecords: Array<{ importId: string; document: ProcessedDocument }>
): ParseDocumentsResponse {
  return {
    documents: result.documents,
    mergedEvent: result.mergedEvent,
    mergedStaff: result.mergedStaff,
    imports: importRecords,
    errors: result.errors,
  };
}

/**
 * Helper function to generate and save checklist
 * Note: Event must be created before calling this function
 */
async function _createChecklist(
  mergedEvent: ParsedEvent,
  tenantId: string,
  eventId: string
) {
  const { buildInitialChecklist } = await getEventParser();
  const checklistResult = buildInitialChecklist(mergedEvent);
  const reportName = deriveEventTitle(mergedEvent, []) || eventId;

  // Save the checklist/report
  const savedReport = await database.eventReport.create({
    data: {
      tenantId,
      eventId,
      name: reportName,
      status: "draft",
      completion: Math.round(
        (checklistResult.autoFilledCount / checklistResult.totalQuestions) * 100
      ),
      autoFillScore: checklistResult.autoFilledCount,
      checklistData: {
        checklist: checklistResult.checklist,
        warnings: checklistResult.warnings,
      } as unknown as Prisma.InputJsonObject,
      parsedEventData: mergedEvent as unknown as Prisma.InputJsonObject,
    },
  });

  return {
    checklist: checklistResult,
    checklistId: savedReport.id,
  };
}

/**
 * POST /api/events/documents/parse
 * Upload and parse document(s) for event data extraction
 *
 * Accepts multipart/form-data with files
 * Query params:
 *   - eventId: Optional - link to existing event
 *   - generateChecklist: boolean - auto-fill Pre-Event Review
 *   - generateBattleBoard: boolean - auto-fill Battle Board
 */
export async function POST(request: Request) {
  try {
    console.log("[POST /api/events/documents/parse] Starting");
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    console.log("[POST] tenantId:", tenantId);
    const { searchParams } = new URL(request.url);

    const eventId = searchParams.get("eventId");
    const generateChecklist = searchParams.get("generateChecklist") === "true";
    const generateBattleBoard =
      searchParams.get("generateBattleBoard") === "true";
    console.log(
      "[POST] eventId:",
      eventId,
      "generateChecklist:",
      generateChecklist,
      "generateBattleBoard:",
      generateBattleBoard
    );

    // Parse form data
    const { files } = await processFormData(request);
    console.log(
      "[POST] Files received:",
      files.length,
      files.map((f) => f.name)
    );

    if (files.length === 0) {
      return NextResponse.json(
        { message: "No files uploaded" },
        { status: 400 }
      );
    }

    // Validate file types
    const allowedExtensions = [".pdf", ".csv"];
    const validation = validateFileExtensions(files, allowedExtensions);
    if (!validation.valid) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    // Process documents and generate response (now powered by Manifest)
    console.log("[POST] About to call processDocumentsAndGenerateResponse");
    let response: ParseDocumentsResponse;
    try {
      response = await processDocumentsAndGenerateResponse(
        files,
        tenantId,
        userId,
        eventId ?? undefined,
        generateChecklist,
        generateBattleBoard
      );
      console.log("[POST] processDocumentsAndGenerateResponse completed");
    } catch (innerError) {
      console.error(
        "[POST] Error in processDocumentsAndGenerateResponse:",
        innerError
      );
      throw innerError;
    }

    console.log("[POST] Response generated successfully");
    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("[POST] Error parsing documents:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[POST] Error details:", { errorMessage, errorStack });

    // Always include details in response so client/Network tab can show the real error
    return NextResponse.json(
      {
        message: "Failed to parse documents",
        details: errorMessage,
        ...(process.env.NODE_ENV === "development" && errorStack
          ? { stack: errorStack }
          : {}),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/documents/parse
 * Get list of recent import records
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );
    const offset = (page - 1) * limit;

    const imports = await database.eventImport.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await database.eventImport.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    });

    return NextResponse.json({
      data: imports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing imports:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
