import { extractPdfText } from "@repo/event-parser";
import { generateObject } from "ai";
import {
  recipeDocumentAiSchema,
  toRecipeSheet,
} from "./recipe-document-schema";
import {
  getRecipeImportModel,
  RecipeOcrNotConfiguredError,
} from "./recipe-ocr-model";
import type { RecipeSheet } from "./recipe-sheet-types";

const MIN_TEXT_CHARS_FOR_TEXT_ONLY = 120;
const RECIPE_EXTRACTION_PROMPT = `Extract kitchen recipe sheet data from this document.

Return one or more recipes with:
- recipeName, yield (quantity + unit), portion size, servings, prep/cook/total times, version
- allergens (Dairy, Eggs, Wheat/Gluten, Soy, Peanuts, Tree Nuts, Fish, Shellfish, Sesame)
- equipment list
- ingredients with name, full amount text, parsed quantity, and unit
- numbered instruction steps
- packaging notes (drop-off, bring-hot, cook on-site)

Use empty strings or zero when a field is missing. Preserve kitchen units (GALLONS, POUNDS, #10 CANS, etc.).`;

export interface RecipeDocumentInput {
  buffer: Buffer;
  fileName: string;
}

function getExtension(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

function isImageExtension(ext: string): boolean {
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
}

function mimeTypeForFile(fileName: string): string {
  const ext = getExtension(fileName);
  if (ext === "pdf") {
    return "application/pdf";
  }
  if (ext === "png") {
    return "image/png";
  }
  if (ext === "webp") {
    return "image/webp";
  }
  if (ext === "gif") {
    return "image/gif";
  }
  return "image/jpeg";
}

function joinExtractedLines(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

async function extractSheetsWithAi(
  fileName: string,
  buffer: Buffer,
  mode: "text" | "vision",
  extractedText?: string
): Promise<RecipeSheet[]> {
  const { model } = getRecipeImportModel();
  const ext = getExtension(fileName);
  const mimeType = mimeTypeForFile(fileName);

  const userContent =
    mode === "text" && extractedText
      ? [
          { type: "text" as const, text: RECIPE_EXTRACTION_PROMPT },
          {
            type: "text" as const,
            text: `Document: ${fileName}\n\nExtracted text:\n${extractedText}`,
          },
        ]
      : [
          { type: "text" as const, text: RECIPE_EXTRACTION_PROMPT },
          isImageExtension(ext)
            ? {
                type: "image" as const,
                image: buffer,
                mediaType: mimeType,
              }
            : {
                type: "file" as const,
                data: buffer,
                mediaType: mimeType,
              },
        ];

  const result = await generateObject({
    model,
    schema: recipeDocumentAiSchema,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: 0.1,
  });

  if (result.object.sheets.length === 0) {
    throw new Error(`No recipes found in ${fileName}`);
  }

  return result.object.sheets.map(toRecipeSheet);
}

export async function parseRecipeDocument(
  input: RecipeDocumentInput
): Promise<RecipeSheet[]> {
  const { buffer, fileName } = input;
  const ext = getExtension(fileName);

  if (isImageExtension(ext)) {
    return extractSheetsWithAi(fileName, buffer, "vision");
  }

  if (ext === "pdf") {
    const pdfData = new Uint8Array(buffer);
    const extraction = await extractPdfText(pdfData);
    const text = joinExtractedLines(extraction.lines);

    if (text.length >= MIN_TEXT_CHARS_FOR_TEXT_ONLY) {
      return extractSheetsWithAi(fileName, buffer, "text", text);
    }

    return extractSheetsWithAi(fileName, buffer, "vision");
  }

  if (ext === "txt") {
    const text = buffer.toString("utf-8").trim();
    if (text.length === 0) {
      throw new Error(`Empty recipe text file: ${fileName}`);
    }
    return extractSheetsWithAi(fileName, buffer, "text", text);
  }

  throw new Error(`Unsupported recipe document type: ${fileName}`);
}

export async function parseRecipeDocuments(
  files: RecipeDocumentInput[]
): Promise<{ sheets: RecipeSheet[]; warnings: string[] }> {
  const sheets: RecipeSheet[] = [];
  const warnings: string[] = [];

  try {
    getRecipeImportModel();
  } catch (error) {
    if (error instanceof RecipeOcrNotConfiguredError) {
      throw error;
    }
    throw error;
  }

  for (const file of files) {
    try {
      const parsed = await parseRecipeDocument(file);
      sheets.push(...parsed);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown parse error";
      warnings.push(`${file.fileName}: ${message}`);
    }
  }

  if (sheets.length === 0 && warnings.length > 0) {
    throw new Error(warnings.join("; "));
  }

  return { sheets, warnings };
}
