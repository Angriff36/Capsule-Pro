import { detectPdfFormat, extractPdfText } from "@repo/event-parser";
import { parseCsv } from "../../kitchen/import/lib/csv";
import { isRecipeDocumentFile } from "../../kitchen/import/file-ingest";
import { looksLikeKitchenRecipeText } from "../../kitchen/import/lib/recipe-text-heuristics";
import { isRecipeSheetFormat } from "../../kitchen/import/lib/recipe-sheet-parser";
import type { CsvRow } from "../../kitchen/import/lib/types";

export type SmartImportKind =
  | "event-document"
  | "kitchen-recipes"
  | "kitchen-ingredients"
  | "kitchen-dishes"
  | "kitchen-prep-lists"
  | "kitchen-recipe-ingredients"
  | "kitchen-events";

export interface SmartImportDetection {
  confidence: number;
  fileName: string;
  kind: SmartImportKind;
  label: string;
  reason: string;
}

const KIND_LABELS: Record<SmartImportKind, string> = {
  "event-document": "Event document (TPP PDF or staff roster)",
  "kitchen-recipes": "Kitchen recipe sheet",
  "kitchen-ingredients": "Ingredient catalog",
  "kitchen-dishes": "Dish catalog",
  "kitchen-prep-lists": "Prep list",
  "kitchen-recipe-ingredients": "Recipe ingredient lines",
  "kitchen-events": "Event header CSV",
};

function normalizeHeaders(rows: CsvRow[]): Set<string> {
  if (rows.length === 0) {
    return new Set();
  }
  return new Set(Object.keys(rows[0] ?? {}).map((key) => key.toLowerCase()));
}

function hasHeaders(headers: Set<string>, keys: string[]): number {
  return headers.intersection(new Set(keys)).size;
}

function detectPlainTextRecipe(
  text: string,
  fileName: string,
  source: string
): SmartImportDetection {
  return {
    fileName,
    kind: "kitchen-recipes",
    label: KIND_LABELS["kitchen-recipes"],
    confidence: text.trim().length > 40 ? 95 : 80,
    reason: source,
  };
}

function detectCsvKind(rows: CsvRow[], fileName: string): SmartImportDetection {
  const headers = normalizeHeaders(rows);

  if (isRecipeSheetFormat(rows)) {
    return {
      fileName,
      kind: "kitchen-recipes",
      label: KIND_LABELS["kitchen-recipes"],
      confidence: 95,
      reason: "Section-based recipe sheet columns detected",
    };
  }

  const staffScore =
    hasHeaders(headers, ["event name", "event", "eventname"]) +
    hasHeaders(headers, ["first name", "firstname", "first"]) +
    hasHeaders(headers, ["scheduled in", "start time", "start"]);

  if (staffScore >= 2) {
    return {
      fileName,
      kind: "event-document",
      label: KIND_LABELS["event-document"],
      confidence: 80 + staffScore * 5,
      reason: "Staff roster CSV columns detected",
    };
  }

  const scores: Array<{ kind: SmartImportKind; score: number; reason: string }> =
    [
      {
        kind: "kitchen-recipe-ingredients",
        score:
          hasHeaders(headers, ["recipe_name", "recipe"]) * 25 +
          hasHeaders(headers, ["ingredient_name", "ingredient"]) * 25 +
          hasHeaders(headers, ["quantity", "unit"]) * 10,
        reason: "Recipe + ingredient link columns",
      },
      {
        kind: "kitchen-prep-lists",
        score:
          hasHeaders(headers, ["prep_list_name"]) * 40 +
          hasHeaders(headers, ["item_name", "station_name"]) * 15,
        reason: "Prep list columns detected",
      },
      {
        kind: "kitchen-dishes",
        score:
          hasHeaders(headers, ["name"]) * 10 +
          hasHeaders(headers, ["recipe_name"]) * 30 +
          hasHeaders(headers, ["service_style", "portion_size_description"]) * 10,
        reason: "Dish + recipe columns detected",
      },
      {
        kind: "kitchen-events",
        score:
          hasHeaders(headers, ["title", "event_title"]) * 25 +
          hasHeaders(headers, ["event_date", "date"]) * 25 +
          hasHeaders(headers, ["guest_count", "headcount"]) * 10,
        reason: "Event header columns detected",
      },
      {
        kind: "kitchen-ingredients",
        score:
          hasHeaders(headers, ["name"]) * 15 +
          hasHeaders(headers, ["default_unit", "unit"]) * 20 +
          hasHeaders(headers, ["category", "allergens", "shelf_life_days"]) * 10,
        reason: "Ingredient catalog columns detected",
      },
      {
        kind: "kitchen-recipes",
        score:
          hasHeaders(headers, ["name"]) * 10 +
          hasHeaders(headers, ["yield_quantity", "instructions", "version_name"]) *
            15,
        reason: "Legacy flat recipe CSV columns",
      },
    ];

  const best = scores.sort((a, b) => b.score - a.score)[0];

  const hasEventScheduleColumns =
    hasHeaders(headers, ["event_date", "date"]) > 0 ||
    hasHeaders(headers, ["guest_count", "headcount"]) > 0;

  if (
    best?.kind === "kitchen-events" &&
    (!hasEventScheduleColumns || best.score < 50)
  ) {
    return {
      fileName,
      kind: "kitchen-ingredients",
      label: KIND_LABELS["kitchen-ingredients"],
      confidence: 40,
      reason:
        "CSV has a title-like column but no event date or guest count; not an event import",
    };
  }

  if (!best || best.score < 25) {
    return {
      fileName,
      kind: "kitchen-ingredients",
      label: KIND_LABELS["kitchen-ingredients"],
      confidence: 40,
      reason: "Could not match a known format; defaulting to ingredients",
    };
  }

  return {
    fileName,
    kind: best.kind,
    label: KIND_LABELS[best.kind],
    confidence: Math.min(40 + best.score, 90),
    reason: best.reason,
  };
}

async function detectPdfKind(
  buffer: Buffer,
  fileName: string
): Promise<SmartImportDetection> {
  const extraction = await extractPdfText(new Uint8Array(buffer));
  const text = extraction.lines.join("\n");

  if (text.length > 0 && looksLikeKitchenRecipeText(text)) {
    return detectPlainTextRecipe(
      text,
      fileName,
      "Recipe sheet text detected in PDF"
    );
  }

  if (text.length > 0) {
    const format = detectPdfFormat(extraction.lines);
    if (format.format === "tpp") {
      return {
        fileName,
        kind: "event-document",
        label: KIND_LABELS["event-document"],
        confidence: format.confidence,
        reason: `TPP event markers: ${format.markers.join(", ") || "detected"}`,
      };
    }
  }

  return {
    fileName,
    kind: "kitchen-recipes",
    label: KIND_LABELS["kitchen-recipes"],
    confidence: text.length > 120 ? 75 : 60,
    reason:
      text.length > 120
        ? "PDF text extracted; treating as kitchen recipe sheet"
        : "Scanned or sparse PDF; recipe OCR will run on import",
  };
}

export async function detectImportKind(
  file: File
): Promise<SmartImportDetection> {
  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;

  if (ext === ".csv") {
    const raw = await file.text();
    if (looksLikeKitchenRecipeText(raw)) {
      return detectPlainTextRecipe(
        raw,
        file.name,
        "Plain-text recipe content detected in file"
      );
    }

    const rows = parseCsv(raw);
    return detectCsvKind(rows, file.name);
  }

  if (isRecipeDocumentFile(file.name)) {
    if (ext === ".pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      return detectPdfKind(buffer, file.name);
    }

    if (ext === ".txt") {
      const text = await file.text();
      if (looksLikeKitchenRecipeText(text)) {
        return detectPlainTextRecipe(text, file.name, "Plain-text recipe file");
      }

      return {
        fileName: file.name,
        kind: "kitchen-recipes",
        label: KIND_LABELS["kitchen-recipes"],
        confidence: 70,
        reason: "Text file routed to kitchen recipe import",
      };
    }

    return {
      fileName: file.name,
      kind: "kitchen-recipes",
      label: KIND_LABELS["kitchen-recipes"],
      confidence: 85,
      reason: "Image file matched kitchen recipe sheet import",
    };
  }

  return {
    fileName: file.name,
    kind: "kitchen-ingredients",
    label: KIND_LABELS["kitchen-ingredients"],
    confidence: 20,
    reason: "Unknown extension; best-effort ingredient import",
  };
}

export function kindToKitchenImportType(
  kind: SmartImportKind
): import("../../kitchen/import/lib/types").ImportType | null {
  switch (kind) {
    case "kitchen-recipes":
      return "recipes";
    case "kitchen-ingredients":
      return "ingredients";
    case "kitchen-dishes":
      return "dishes";
    case "kitchen-prep-lists":
      return "prep-lists";
    case "kitchen-recipe-ingredients":
      return "recipe-ingredients";
    case "kitchen-events":
      return "events";
    default:
      return null;
  }
}

export function isEventDocumentKind(kind: SmartImportKind): boolean {
  return kind === "event-document";
}
