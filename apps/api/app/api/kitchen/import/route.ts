/**
 * @module KitchenImportAPI
 * @intent Bulk import recipes, dishes, and prep-lists from CSV files
 * @responsibility Handle file upload, CSV parsing, and database insertion
 * @domain Kitchen
 * @tags kitchen, import, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { parseError as parseErrorToMessage } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Uses createManifestRuntime — requires Node.js runtime (not Edge)
export const runtime = "nodejs";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type ImportType = "recipes" | "dishes" | "prep-lists";

interface ImportSummary {
  imported: number;
  skipped: number;
  errors: string[];
  created: string[]; // human-readable summary of what was created
}

interface CsvRow {
  [key: string]: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CSV parsing
// ═══════════════════════════════════════════════════════════════════════

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

/** Split a CSV line respecting quoted fields */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

const trimOpt = (val: string | undefined): string | null => {
  const trimmed = val?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

const parseIntOpt = (val: string | undefined): number | null => {
  const trimmed = val?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDecimalOpt = (val: string | undefined): number | null => {
  const trimmed = val?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseListOpt = (val: string | undefined, separator = ";"): string[] => {
  if (!val?.trim()) return [];
  return val
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
};

// ═══════════════════════════════════════════════════════════════════════
// Recipe Import
// ═══════════════════════════════════════════════════════════════════════

async function importRecipes(
  rows: CsvRow[],
  tenantId: string,
  userId: string
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    errors: [],
    created: [],
  };

  for (const row of rows) {
    const name = trimOpt(row.name);
    if (!name) {
      summary.errors.push("Row missing recipe name, skipped");
      summary.skipped++;
      continue;
    }

    try {
      // Create the recipe (governed)
      const recipeResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "Recipe",
          command: "create",
          user: { id: userId, tenantId, role: "admin" },
          body: {
            tenantId,
            name,
            category: trimOpt(row.category) ?? "",
            cuisineType: trimOpt(row.cuisine_type) ?? "",
            description: trimOpt(row.description) ?? "",
            tags: parseListOpt(row.tags),
          },
        }
      );

      if (!recipeResult.ok) {
        throw new Error(
          `Failed to create Recipe via Manifest: ${recipeResult.message}`
        );
      }

      const recipeId = (recipeResult.result as { id?: string }).id!;

      // Create version 1 (governed)
      const yieldQty = parseDecimalOpt(row.yield_quantity) ?? 1;
      const yieldUnitId = parseIntOpt(row.yield_unit) ?? 1; // default to "servings" unit 1
      const prepTime = parseIntOpt(row.prep_time_minutes);
      const cookTime = parseIntOpt(row.cook_time_minutes);
      const difficultyLevel = parseIntOpt(row.difficulty_level);

      const versionResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "RecipeVersion",
          command: "create",
          user: { id: userId, tenantId, role: "admin" },
          body: {
            tenantId,
            recipeId,
            name: row.version_name?.trim() || name,
            versionNumber: 1,
            yieldQuantity: yieldQty,
            yieldUnitId,
            yieldDescription: trimOpt(row.yield_description) ?? "",
            prepTimeMinutes: prepTime ?? 0,
            cookTimeMinutes: cookTime ?? 0,
            restTimeMinutes: parseIntOpt(row.rest_time_minutes) ?? 0,
            difficultyLevel: difficultyLevel ?? 1,
            instructions: trimOpt(row.instructions) ?? "",
            notes: trimOpt(row.notes) ?? "",
            category: trimOpt(row.category) ?? "",
            cuisineType: trimOpt(row.cuisine_type) ?? "",
            description: trimOpt(row.description) ?? "",
            tags: parseListOpt(row.tags).join(";"),
          },
        }
      );

      if (!versionResult.ok) {
        throw new Error(
          `Failed to create RecipeVersion via Manifest: ${versionResult.message}`
        );
      }

      summary.imported++;
      summary.created.push(`Recipe: ${name}`);
    } catch (error) {
      const msg = parseErrorToMessage(error);
      summary.errors.push(`"${name}": ${msg}`);
      summary.skipped++;
    }
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════
// Dish Import
// ═══════════════════════════════════════════════════════════════════════

async function importDishes(
  rows: CsvRow[],
  tenantId: string,
  _userId: string
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    errors: [],
    created: [],
  };

  for (const row of rows) {
    const name = trimOpt(row.name);
    if (!name) {
      summary.errors.push("Row missing dish name, skipped");
      summary.skipped++;
      continue;
    }

    try {
      // Resolve recipe by name if provided
      let recipeId: string | undefined;
      const recipeName = trimOpt(row.recipe_name);
      if (recipeName) {
        const recipe = await database.recipe.findFirst({
          where: { tenantId, name: recipeName, deletedAt: null },
          select: { id: true },
        });
        if (!recipe) {
          summary.errors.push(
            `"${name}": Recipe "${recipeName}" not found, dish skipped`
          );
          summary.skipped++;
          continue;
        }
        recipeId = recipe.id;
      }

      if (!recipeId) {
        summary.errors.push(
          `"${name}": No recipe linked (set recipe_name column), dish skipped`
        );
        summary.skipped++;
        continue;
      }

      const pricePerPerson = parseDecimalOpt(row.price_per_person);
      const costPerPerson = parseDecimalOpt(row.cost_per_person);

      const dishResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "Dish",
          command: "create",
          user: { id: _userId, tenantId, role: "admin" },
          body: {
            tenantId,
            recipeId,
            name,
            description: trimOpt(row.description) ?? "",
            category: trimOpt(row.category) ?? "",
            serviceStyle: trimOpt(row.service_style) ?? "",
            portionSizeDescription:
              trimOpt(row.portion_size_description) ?? "",
            dietaryTags: parseListOpt(row.dietary_tags),
            allergens: parseListOpt(row.allergens),
            pricePerPerson:
              pricePerPerson != null
                ? new Prisma.Decimal(pricePerPerson).toFixed(2)
                : "0.00",
            costPerPerson:
              costPerPerson != null
                ? new Prisma.Decimal(costPerPerson).toFixed(2)
                : "0.00",
            minPrepLeadDays: parseIntOpt(row.min_prep_lead_days) ?? 0,
            maxPrepLeadDays: parseIntOpt(row.max_prep_lead_days) ?? 0,
          },
        }
      );

      if (!dishResult.ok) {
        throw new Error(
          `Failed to create Dish via Manifest: ${dishResult.message}`
        );
      }

      summary.imported++;
      summary.created.push(`Dish: ${name}`);
    } catch (error) {
      const msg = parseErrorToMessage(error);
      summary.errors.push(`"${name}": ${msg}`);
      summary.skipped++;
    }
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════
// Prep List Import
// ═══════════════════════════════════════════════════════════════════════

async function importPrepLists(
  rows: CsvRow[],
  tenantId: string,
  _userId: string
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    errors: [],
    created: [],
  };

  // Group rows by prep_list_name to create one PrepList per group
  const groups = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const listName = trimOpt(row.prep_list_name) ?? "__unnamed__";
    if (!groups.has(listName)) groups.set(listName, []);
    groups.get(listName)!.push(row);
  }

  for (const [listName, listRows] of Array.from(groups.entries())) {
    try {
      // Resolve event — optional
      let eventId: string | undefined;
      const eventNumber = trimOpt(listRows[0]?.event_number);
      if (eventNumber) {
        const event = await database.event.findFirst({
          where: { tenantId, eventNumber, deletedAt: null },
          select: { id: true },
        });
        if (event) eventId = event.id;
        else {
          summary.errors.push(
            `"${listName}": Event #${eventNumber} not found, prep list skipped`
          );
          summary.skipped += listRows.length;
          continue;
        }
      }

      const batchMultiplier =
        parseDecimalOpt(listRows[0]?.batch_multiplier) ?? 1;
      const dietaryRestrictions = parseListOpt(
        listRows[0]?.dietary_restrictions
      );

      const prepListResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "PrepList",
          command: "create",
          user: { id: _userId, tenantId, role: "admin" },
          body: {
            tenantId,
            eventId: eventId ?? "00000000-0000-0000-0000-000000000000",
            name: listName,
            batchMultiplier: batchMultiplier.toFixed(2),
            dietaryRestrictions,
            status: "draft",
            totalItems: listRows.length,
          },
        }
      );

      if (!prepListResult.ok) {
        throw new Error(
          `Failed to create PrepList via Manifest: ${prepListResult.message}`
        );
      }

      const prepListId = (prepListResult.result as { id?: string }).id!;

      // Create PrepListItems (governed)
      for (let i = 0; i < listRows.length; i++) {
        const row = listRows[i];
        const itemName = trimOpt(row.item_name) ?? `Item ${i + 1}`;
        const stationName = trimOpt(row.station_name) ?? "Unassigned";
        const baseQty = parseDecimalOpt(row.base_quantity) ?? 1;
        const baseUnit = trimOpt(row.base_unit) ?? "ea";

        const itemResult = await runManifestCommandCore(
          {
            createRuntime: ({ user: u, entityName }) =>
              createManifestRuntime({
                user: { id: u.id, tenantId: u.tenantId, role: u.role },
                entityName,
              }),
          },
          {
            entity: "PrepListItem",
            command: "create",
            user: { id: _userId, tenantId, role: "admin" },
            body: {
              tenantId,
              prepListId,
              stationId: "",
              stationName,
              ingredientId: "00000000-0000-0000-0000-000000000000",
              ingredientName: itemName,
              baseQuantity: baseQty,
              baseUnit,
              scaledQuantity: baseQty * batchMultiplier,
              scaledUnit: baseUnit,
              preparationNotes: trimOpt(row.preparation_notes) ?? "",
              dishName: trimOpt(row.dish_name) ?? "",
              sortOrder: i,
            },
          }
        );

        if (!itemResult.ok) {
          throw new Error(
            `Failed to create PrepListItem via Manifest: ${itemResult.message}`
          );
        }
      }

      summary.imported += listRows.length;
      summary.created.push(`Prep List: ${listName} (${listRows.length} items)`);
    } catch (error) {
      const msg = parseErrorToMessage(error);
      summary.errors.push(`"${listName}": ${msg}`);
      summary.skipped += listRows.length;
    }
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════
// FormData processing
// ═══════════════════════════════════════════════════════════════════════

async function processFormData(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  return { files, formData };
}

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
      error: `Invalid file types: ${invalidFiles.map((f) => f.name).join(", ")}. Only ${allowedExtensions.join(", ")} files are allowed.`,
    };
  }

  return { valid: true, files };
}

// ═══════════════════════════════════════════════════════════════════════
// Route handler
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/kitchen/import
 *
 * Bulk import kitchen entities from CSV files.
 *
 * Query params:
 *   - type: "recipes" | "dishes" | "prep-lists" (required)
 *
 * Accepts multipart/form-data with files field.
 * Returns an ImportSummary with import/error counts and details.
 */
export async function POST(request: Request) {
  try {
    log.debug("[POST /api/kitchen/import] Starting");
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);
    const importType = searchParams.get("type") as ImportType | null;

    if (
      !(importType && ["recipes", "dishes", "prep-lists"].includes(importType))
    ) {
      return NextResponse.json(
        {
          message:
            'Missing or invalid "type" query parameter. Must be: recipes, dishes, or prep-lists',
        },
        { status: 400 }
      );
    }

    // Parse form data
    const { files } = await processFormData(request);
    log.debug("[POST /api/kitchen/import] Files received", {
      fileCount: files.length,
      fileNames: files.map((f) => f.name),
    });

    if (files.length === 0) {
      return NextResponse.json(
        { message: "No files uploaded" },
        { status: 400 }
      );
    }

    // Validate: CSV for now
    const validation = validateFileExtensions(files, [".csv"]);
    if (!validation.valid) {
      const err = (validation as { valid: false; error: string }).error;
      return NextResponse.json({ message: err }, { status: 400 });
    }

    // Parse all CSV files and collect rows
    const allRows: CsvRow[] = [];
    for (const file of files) {
      const content = await file.text();
      const rows = parseCsv(content);
      allRows.push(...rows);
      log.debug(
        `[POST /api/kitchen/import] Parsed ${rows.length} rows from ${file.name}`
      );
    }

    if (allRows.length === 0) {
      return NextResponse.json(
        { message: "No data rows found in uploaded files" },
        { status: 400 }
      );
    }

    // Dispatch to appropriate importer
    let summary: ImportSummary;
    switch (importType) {
      case "recipes":
        summary = await importRecipes(allRows, tenantId, userId);
        break;
      case "dishes":
        summary = await importDishes(allRows, tenantId, userId);
        break;
      case "prep-lists":
        summary = await importPrepLists(allRows, tenantId, userId);
        break;
    }

    log.debug("[POST /api/kitchen/import] Completed", summary);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    captureException(error);
    const errorMessage = parseErrorToMessage(error);
    log.error("[POST /api/kitchen/import] Error", { error });
    return NextResponse.json(
      {
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
