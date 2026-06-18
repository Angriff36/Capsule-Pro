/**
 * @module SmartImportAPI
 * @intent Auto-detect uploaded file types and route to the correct import pipeline
 * @domain Platform
 * @tags import, smart, api
 */

import { auth } from "@repo/auth/server";
import { parseError as parseErrorToMessage } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { RecipeOcrNotConfiguredError } from "../../kitchen/import/lib/recipe-ocr-model";
import { looksLikeKitchenRecipeText } from "../../kitchen/import/lib/recipe-text-heuristics";
import { isRecipeDocumentFile } from "../../kitchen/import/file-ingest";
import { POST as parseEventDocuments } from "../../events/documents/parse/route";
import { detectImportKind, type SmartImportDetection } from "./detect";
import {
  executeKitchenImports,
  filterEventDocumentFiles,
} from "./execute-kitchen";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = [
  ".csv",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
];

function validateFiles(files: File[]): string | null {
  const invalid = files.filter((file) => {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    return !ALLOWED_EXTENSIONS.includes(ext);
  });

  if (invalid.length === 0) {
    return null;
  }

  return `Unsupported file types: ${invalid.map((file) => file.name).join(", ")}`;
}

async function readFileText(file: File): Promise<string> {
  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (ext === ".pdf") {
    return "";
  }
  return file.text();
}

async function guardRecipeMisclassification(
  file: File,
  detection: SmartImportDetection
): Promise<SmartImportDetection> {
  if (detection.kind !== "event-document") {
    return detection;
  }

  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (ext === ".txt" || isRecipeDocumentFile(file.name)) {
    const text = await readFileText(file);
    if (text && looksLikeKitchenRecipeText(text)) {
      return {
        ...detection,
        kind: "kitchen-recipes",
        label: "Kitchen recipe sheet",
        confidence: 95,
        reason: "Recipe content override (was misclassified as event document)",
      };
    }
  }

  return detection;
}

async function runEventDocumentImport(
  files: File[],
  request: Request
): Promise<unknown> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const url = new URL(request.url);
  url.pathname = "/api/events/documents/parse";
  url.searchParams.set("generateChecklist", "true");
  url.searchParams.set("generateBattleBoard", "true");

  const internalRequest = new NextRequest(url.toString(), {
    method: "POST",
    body: formData,
    headers: request.headers,
  });

  const response = await parseEventDocuments(internalRequest);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? payload.details ?? "Event import failed");
  }

  return payload.data ?? payload;
}

/**
 * POST /api/import/smart
 *
 * Accept any supported import file, auto-detect format, and run the matching pipeline.
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const currentUser = await resolveCurrentUser(request);
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ message: "No files uploaded" }, { status: 400 });
    }

    const validationError = validateFiles(files);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const detections = await Array.fromAsync(
      (async function* () {
        for (const file of files) {
          const detection = await detectImportKind(file);
          yield await guardRecipeMisclassification(file, detection);
        }
      })()
    );
    log.debug("[POST /api/import/smart] Detections", { detections });

    const kitchenPairs = files
      .map((file, index) => ({
        file,
        detection: detections[index],
      }))
      .filter(
        (pair): pair is { file: File; detection: SmartImportDetection } =>
          pair.detection?.kind !== "event-document"
      );
    const kitchenFiles = kitchenPairs.map((pair) => pair.file);
    const kitchenDetections = kitchenPairs.map((pair) => pair.detection);
    const eventFiles = filterEventDocumentFiles(files, detections);

    const kitchenSummary =
      kitchenFiles.length > 0
        ? await executeKitchenImports(kitchenFiles, kitchenDetections, {
            tenantId,
            userId,
            userRole: currentUser.role,
          })
        : null;

    const eventResult =
      eventFiles.length > 0
        ? await runEventDocumentImport(eventFiles, request)
        : null;

    return NextResponse.json({
      success: true,
      data: {
        detections,
        kitchen: kitchenSummary,
        event: eventResult,
      },
    });
  } catch (error) {
    captureException(error);
    const errorMessage = parseErrorToMessage(error);
    log.error("[POST /api/import/smart] Error", { error });

    if (error instanceof RecipeOcrNotConfiguredError) {
      return NextResponse.json({ message: errorMessage }, { status: 503 });
    }

    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
