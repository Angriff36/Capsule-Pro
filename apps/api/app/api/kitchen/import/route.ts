/**
 * @module KitchenImportAPI
 * @intent Bulk import kitchen and event catalog entities from CSV files
 * @responsibility Handle file upload, CSV parsing, and governed database insertion
 * @domain Kitchen
 * @tags kitchen, import, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { parseError as parseErrorToMessage } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { dispatchKitchenImport } from "./dispatch";
import {
  allowedExtensionsForType,
  ingestCsvRows,
  parseRecipeDocumentFiles,
  splitRecipeUploadFiles,
} from "./file-ingest";
import { RecipeOcrNotConfiguredError } from "./lib/recipe-ocr-model";
import type { RecipeSheet } from "./lib/recipe-sheet-types";
import { type CsvRow, IMPORT_TYPES, type ImportType } from "./lib/types";

export const runtime = "nodejs";

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

/**
 * POST /api/kitchen/import
 *
 * Bulk import catalog entities from CSV files.
 *
 * Query params:
 *   - type: recipes | dishes | prep-lists | ingredients | recipe-ingredients | events
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
    const currentUser = await resolveCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const importType = searchParams.get("type") as ImportType | null;

    if (!(importType && IMPORT_TYPES.includes(importType))) {
      return NextResponse.json(
        {
          message:
            'Missing or invalid "type" query parameter. Must be: recipes, dishes, prep-lists, ingredients, recipe-ingredients, or events',
        },
        { status: 400 }
      );
    }

    const { files } = await processFormData(request);
    log.debug("[POST /api/kitchen/import] Files received", {
      fileCount: files.length,
      fileNames: files.map((f) => f.name),
      importType,
    });

    if (files.length === 0) {
      return NextResponse.json(
        { message: "No files uploaded" },
        { status: 400 }
      );
    }

    const allowedExtensions = allowedExtensionsForType(importType);
    const validation = validateFileExtensions(files, allowedExtensions);
    if (!validation.valid) {
      const err = (validation as { valid: false; error: string }).error;
      return NextResponse.json({ message: err }, { status: 400 });
    }

    let rows: CsvRow[] = [];
    let documentSheets: RecipeSheet[] = [];
    let documentWarnings: string[] = [];

    if (importType === "recipes") {
      const { csvFiles, documentFiles } = splitRecipeUploadFiles(files);

      if (csvFiles.length > 0) {
        rows = await ingestCsvRows(csvFiles);
        log.debug(
          `[POST /api/kitchen/import] Parsed ${rows.length} CSV rows from ${csvFiles.length} file(s)`
        );
      }

      if (documentFiles.length > 0) {
        const parsed = await parseRecipeDocumentFiles(documentFiles);
        documentSheets = parsed.sheets;
        documentWarnings = parsed.warnings;
        log.debug(
          `[POST /api/kitchen/import] Parsed ${documentSheets.length} recipe sheet(s) from ${documentFiles.length} document(s)`
        );
      }
    } else {
      rows = await ingestCsvRows(files);
      log.debug(`[POST /api/kitchen/import] Parsed ${rows.length} rows`);
    }

    if (rows.length === 0 && documentSheets.length === 0) {
      return NextResponse.json(
        { message: "No data rows found in uploaded files" },
        { status: 400 }
      );
    }

    const summary = await dispatchKitchenImport(
      importType,
      rows,
      {
        tenantId,
        // Importers feed this into governed command actor contexts — use the
        // resolved employee uuid, not the raw Clerk id, to attribute correctly.
        userId: currentUser.id,
        userRole: currentUser.role,
      },
      {
        documentSheets,
        documentWarnings,
      }
    );

    log.debug("[POST /api/kitchen/import] Completed", summary);
    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    captureException(error);
    const errorMessage = parseErrorToMessage(error);
    log.error("[POST /api/kitchen/import] Error", { error });

    if (error instanceof RecipeOcrNotConfiguredError) {
      return NextResponse.json({ message: errorMessage }, { status: 503 });
    }

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
