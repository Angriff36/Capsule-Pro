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
  BattleBoardBuildResult,
  ChecklistBuildResult,
  MenuItem,
  ParsedEvent,
  ProcessedDocument,
  StaffShift,
} from "@repo/event-parser";
import {
  buildBattleBoardFromEvent,
  buildInitialChecklist,
  processMultipleDocuments,
} from "@repo/event-parser";
import { triggerPrepListAutoGeneration } from "@repo/manifest-adapters";
import { createOutboxEvent } from "@repo/realtime";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ParseParams {
  eventId: string | null;
  generateChecklist: boolean;
  generateBattleBoard: boolean;
}

interface ImportRecord {
  importId: string;
  document: ProcessedDocument;
}

type MissingField =
  | "client"
  | "eventDate"
  | "venueName"
  | "eventType"
  | "headcount"
  | "menuItems";

interface DishMatch {
  name: string;
  dishId: string;
  eventDishId: string;
}

interface MenuImportSummary {
  dishMatches: DishMatch[];
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

// Top-level regex for performance
const WHITESPACE_REGEX = /\s+/g;
const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
const HYPHEN_UNDERSCORE_REGEX = /[-_]+/g;
const SERVING_UNIT_REGEX = /serv|pax|guest|portion/i;

const normalizeName = (value: string) =>
  value.trim().replace(WHITESPACE_REGEX, " ");

const getFileLabel = (fileName: string) =>
  fileName
    .replace(FILE_EXTENSION_REGEX, "")
    .replace(HYPHEN_UNDERSCORE_REGEX, " ")
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
  const tagSet = new Set<string>(
    baseTags.filter((tag) => tag.trim().length > 0)
  );
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
  const fallbackFile = files[0]?.name;
  return fallbackFile ? getFileLabel(fallbackFile) : "";
};

const parseEventDate = (dateValue: string | undefined) => {
  if (!dateValue) {
    return null;
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeList = (values: string[] | undefined) =>
  (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

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

const deriveMenuQuantity = (item: MenuItem, fallbackHeadcount: number) => {
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

function parseParams(searchParams: URLSearchParams): ParseParams {
  return {
    eventId: searchParams.get("eventId"),
    generateChecklist: searchParams.get("generateChecklist") === "true",
    generateBattleBoard: searchParams.get("generateBattleBoard") === "true",
  };
}

function validateFileTypes(files: File[]): NextResponse | undefined {
  if (files.length === 0) {
    return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
  }

  const allowedExtensions = [".pdf", ".csv"];

  for (const file of files) {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          message: `Invalid file type: ${file.name}. Only PDF and CSV files are allowed.`,
        },
        { status: 400 }
      );
    }
  }

  return undefined;
}

function processFiles(
  files: File[]
): Promise<Array<{ content: ArrayBuffer; fileName: string }>> {
  return Promise.all(
    files.map((file) =>
      file.arrayBuffer().then((content) => ({ content, fileName: file.name }))
    )
  );
}

function createImportRecords(
  files: File[],
  result: { documents: ProcessedDocument[] },
  tenantId: string,
  eventId: string | null
): Promise<ImportRecord[]> {
  return Promise.all(
    files.map((file, index) => {
      const doc = result.documents[index];

      const ext = file.name.split(".").pop()?.toLowerCase();
      let mimeType: string;
      if (ext === "pdf") {
        mimeType = "application/pdf";
      } else if (ext === "csv") {
        mimeType = "text/csv";
      } else {
        mimeType = "";
      }

      return database.eventImport
        .create({
          data: {
            tenantId,
            fileName: file.name,
            mimeType,
            fileSize: file.size,
            fileType: doc.fileType,
            detectedFormat: doc.detectedFormat,
            parseStatus: doc.errors.length > 0 ? "failed" : "parsed",
            parseErrors: doc.errors,
            confidence: doc.confidence,
            extractedData: JSON.parse(
              JSON.stringify({
                event: doc.parsedEvent?.event || null,
                staff: doc.staffShifts
                  ? Object.fromEntries(doc.staffShifts)
                  : null,
                warnings: doc.warnings,
              })
            ),
            eventId: eventId || undefined,
            parsedAt: new Date(),
          },
        })
        .then((importRecord) => ({
          importId: importRecord.id,
          document: doc,
        }));
    })
  );
}

async function _generateBattleBoard(
  mergedEvent: ParsedEvent,
  tenantId: string,
  eventId: string | null,
  importRecords: ImportRecord[]
): Promise<{ battleBoard: BattleBoardBuildResult; battleBoardId: string }> {
  const battleBoardResult = buildBattleBoardFromEvent(mergedEvent);

  const boardName = mergedEvent.client || mergedEvent.number || eventId || "";

  const savedBattleBoard = await database.battleBoard.create({
    data: {
      tenantId,
      board_name: boardName,
      board_type: "event-specific",
      schema_version: "mangia-battle-board@1",
      boardData: battleBoardResult.battleBoard as object,
      status: "draft",
      is_template: false,
      tags: ["imported"],
      eventId: eventId || undefined,
    },
  });

  for (const record of importRecords) {
    await database.eventImport.update({
      where: { id: record.importId },
      data: { battleBoardId: savedBattleBoard.id },
    });
  }

  return {
    battleBoard: battleBoardResult,
    battleBoardId: savedBattleBoard.id,
  };
}

async function createEventFromParsedData(
  mergedEvent: ParsedEvent,
  tenantId: string,
  files: File[],
  missingFields: MissingField[],
  userId?: string
): Promise<string> {
  const derivedTitle = deriveEventTitle(mergedEvent, files);
  const parsedDate = parseEventDate(mergedEvent.date);
  const eventDate = parsedDate ?? new Date();
  const notes = [
    ...normalizeList(mergedEvent.notes),
    `Imported from ${files.map((f) => f.name).join(", ")}`,
  ]
    .filter((value) => value.length > 0)
    .join("\n");

  const newEvent = await database.event.create({
    data: {
      tenantId,
      title: derivedTitle,
      eventType: mergedEvent.serviceStyle?.trim() || "catering",
      eventDate,
      guestCount: mergedEvent.headcount > 0 ? mergedEvent.headcount : 0,
      status: missingFields.length > 0 ? "draft" : "confirmed",
      eventNumber: mergedEvent.number || undefined,
      venueName: mergedEvent.venue?.name || undefined,
      venueAddress: mergedEvent.venue?.address || undefined,
      notes: notes.length > 0 ? notes : undefined,
      tags: buildEventTags(["imported"], missingFields),
    },
  });

  // Create outbox event for event creation
  await createOutboxEvent(database, {
    tenantId,
    aggregateType: "Event",
    aggregateId: newEvent.id,
    eventType: "event.created",
    payload: {
      eventId: newEvent.id,
      title: derivedTitle,
      status: newEvent.status,
      guestCount: mergedEvent.headcount > 0 ? mergedEvent.headcount : 0,
      eventDate: eventDate.toISOString(),
      createdBy: userId,
    },
  });

  // Trigger prep list auto-generation for confirmed events
  if (newEvent.status === "confirmed" && userId) {
    await triggerPrepListAutoGeneration({
      db: database,
      tenantId,
      eventId: newEvent.id,
      eventTitle: derivedTitle,
      guestCount: mergedEvent.headcount > 0 ? mergedEvent.headcount : 0,
      userId,
    });
  }

  return newEvent.id;
}

async function updateImportRecordsWithEvent(
  importRecords: ImportRecord[],
  eventId: string
): Promise<void> {
  for (const record of importRecords) {
    await database.eventImport.update({
      where: { id: record.importId },
      data: { eventId },
    });
  }
}

async function importMenuToEvent(
  tenantId: string,
  eventId: string,
  event: ParsedEvent
): Promise<MenuImportSummary> {
  const summary: MenuImportSummary = {
    dishMatches: [],
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

  const aggregated = new Map<string, AggregatedMenuItem>();

  for (const item of menuItems) {
    const name = normalizeName(item.name);
    if (!name) {
      continue;
    }

    const key = name.toLowerCase();
    const { quantity, source } = deriveMenuQuantity(item, event.headcount);

    if (source === "fallback") {
      summary.missingQuantities.push(name);
    }

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

  for (const entry of aggregated.values()) {
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

    let dishId = existingDish?.id;

    if (!dishId) {
      let recipeId: string | undefined;
      const existingRecipe = await database.recipe.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: {
            equals: entry.name,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existingRecipe) {
        recipeId = existingRecipe.id;
      } else {
        const createdRecipe = await database.recipe.create({
          data: {
            tenantId,
            name: entry.name,
            category: entry.category ?? undefined,
            tags: ["imported"],
            isActive: true,
          },
        });
        recipeId = createdRecipe.id;
        summary.createdRecipes += 1;
      }

      const createdDish = await database.dish.create({
        data: {
          tenantId,
          recipeId,
          name: entry.name,
          category: entry.category ?? undefined,
          serviceStyle: event.serviceStyle?.trim() || undefined,
          dietaryTags: Array.from(entry.dietaryTags),
          allergens: Array.from(entry.allergens),
          isActive: true,
        },
      });
      dishId = createdDish.id;
      summary.createdDishes += 1;
    }

    const specialInstructions = Array.from(entry.instructions).join("; ");
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

    let eventDishId: string;

    if (existingLink?.id) {
      await database.$executeRaw(
        Prisma.sql`
          UPDATE tenant_events.event_dishes
          SET quantity_servings = ${Math.max(1, Math.round(entry.quantity))},
              service_style = ${entry.serviceLocation ?? event.serviceStyle ?? null},
              course = ${entry.category ?? null},
              special_instructions = ${
                specialInstructions.length > 0 ? specialInstructions : null
              },
              updated_at = ${new Date()}
          WHERE tenant_id = ${tenantId}
            AND id = ${existingLink.id}
            AND event_id = ${eventId}
        `
      );
      eventDishId = existingLink.id;
      summary.updatedLinks += 1;
    } else {
      const [inserted] = await database.$queryRaw<Array<{ id: string }>>(
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
            ${entry.serviceLocation ?? event.serviceStyle ?? null},
            ${specialInstructions.length > 0 ? specialInstructions : null},
            ${new Date()},
            ${new Date()}
          )
          RETURNING id
        `
      );
      eventDishId = inserted?.id ?? "";
      summary.linkedDishes += 1;
    }

    if (existingDish?.id && eventDishId) {
      summary.dishMatches.push({
        name: entry.name,
        dishId,
        eventDishId,
      });
    }
  }

  return summary;
}

async function _generateChecklist(
  mergedEvent: ParsedEvent,
  tenantId: string,
  eventId: string | null,
  importRecords: ImportRecord[],
  battleBoardId?: string
): Promise<{ checklist: ChecklistBuildResult; checklistId: string }> {
  const checklistResult = buildInitialChecklist(mergedEvent);
  if (!eventId) {
    throw new Error("Event must exist before generating checklist.");
  }

  const reportName = deriveEventTitle(mergedEvent, []) || eventId;

  const savedReport = await database.eventReport.create({
    data: {
      tenantId,
      eventId,
      name: reportName,
      version: new Date().toISOString().slice(0, 10),
      status: "draft",
      completion: Math.round(
        (checklistResult.autoFilledCount / checklistResult.totalQuestions) * 100
      ),
      checklistData: checklistResult.checklist as object,
      parsedEventData: mergedEvent as object,
      autoFillScore: checklistResult.autoFilledCount,
      reviewNotes:
        checklistResult.warnings.length > 0
          ? `Auto-fill warnings: ${checklistResult.warnings.join("; ")}`
          : undefined,
    },
  });

  for (const record of importRecords) {
    await database.eventImport.update({
      where: { id: record.importId },
      data: { reportId: savedReport.id },
    });
  }

  if (battleBoardId) {
    await database.battleBoard.update({
      where: { tenantId_id: { tenantId, id: battleBoardId } },
      data: { eventId },
    });
  }

  return {
    checklist: checklistResult,
    checklistId: savedReport.id,
  };
}

/**
 * Build final response with optional battle board and checklist
 */
async function buildResponse(
  result: {
    documents: ProcessedDocument[];
    mergedEvent?: ParsedEvent;
    mergedStaff?: StaffShift[];
    errors: string[];
  },
  importRecords: ImportRecord[],
  tenantId: string,
  eventId: string | null,
  generateBattleBoard: boolean,
  generateChecklist: boolean,
  missingFields: MissingField[],
  menuImport: MenuImportSummary | null
): Promise<{
  documents: ProcessedDocument[];
  mergedEvent: typeof result.mergedEvent;
  mergedStaff: typeof result.mergedStaff;
  imports: typeof importRecords;
  missingFields: MissingField[];
  menuImport?: MenuImportSummary | null;
  checklist?: ChecklistBuildResult;
  checklistId?: string;
  battleBoard?: BattleBoardBuildResult;
  battleBoardId?: string;
  errors: string[];
}> {
  const response: {
    documents: ProcessedDocument[];
    mergedEvent: typeof result.mergedEvent;
    mergedStaff: typeof result.mergedStaff;
    imports: typeof importRecords;
    missingFields: MissingField[];
    menuImport?: MenuImportSummary | null;
    checklist?: ChecklistBuildResult;
    checklistId?: string;
    battleBoard?: BattleBoardBuildResult;
    battleBoardId?: string;
    errors: string[];
  } = {
    documents: result.documents,
    mergedEvent: result.mergedEvent ?? undefined,
    mergedStaff: result.mergedStaff ?? undefined,
    imports: importRecords,
    missingFields,
    menuImport,
    errors: result.errors,
  };

  if (generateBattleBoard && result.mergedEvent) {
    const battleBoardData = await _generateBattleBoard(
      result.mergedEvent,
      tenantId,
      eventId,
      importRecords
    );
    response.battleBoard = battleBoardData.battleBoard;
    response.battleBoardId = battleBoardData.battleBoardId;
  }

  if (generateChecklist && result.mergedEvent) {
    const checklistData = await _generateChecklist(
      result.mergedEvent,
      tenantId,
      eventId,
      importRecords,
      response.battleBoardId
    );
    response.checklist = checklistData.checklist;
    response.checklistId = checklistData.checklistId;
  }

  return response;
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
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);
    const params = parseParams(searchParams);

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    const validationError = validateFileTypes(files);
    if (validationError) {
      return validationError;
    }

    const fileContents = await processFiles(files);
    const result = await processMultipleDocuments(fileContents);
    const importRecords = await createImportRecords(
      files,
      result,
      tenantId,
      params.eventId
    );

    const missingFields = result.mergedEvent
      ? getMissingFieldsFromParsedEvent(result.mergedEvent)
      : [];

    let resolvedEventId = params.eventId;
    if (!resolvedEventId && result.mergedEvent) {
      resolvedEventId = await createEventFromParsedData(
        result.mergedEvent,
        tenantId,
        files,
        missingFields,
        userId
      );
      await updateImportRecordsWithEvent(importRecords, resolvedEventId);
    }

    let menuImport: MenuImportSummary | null = null;
    if (resolvedEventId && result.mergedEvent) {
      menuImport = await importMenuToEvent(
        tenantId,
        resolvedEventId,
        result.mergedEvent
      );
    }

    const response = await buildResponse(
      result,
      importRecords,
      tenantId,
      resolvedEventId,
      params.generateBattleBoard,
      params.generateChecklist,
      missingFields,
      menuImport
    );

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Error parsing documents:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        message: "Failed to parse documents",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
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

