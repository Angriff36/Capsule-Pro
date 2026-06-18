import { parseCsv } from "./lib/csv";
import { parseRecipeDocuments } from "./lib/recipe-document-parser";
import type { RecipeSheet } from "./lib/recipe-sheet-types";
import type { CsvRow, ImportType } from "./lib/types";

const CSV_EXTENSION = ".csv";
const RECIPE_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
];

export function allowedExtensionsForType(importType: ImportType): string[] {
  if (importType === "recipes") {
    return [CSV_EXTENSION, ...RECIPE_DOCUMENT_EXTENSIONS];
  }
  return [CSV_EXTENSION];
}

export function isRecipeDocumentFile(fileName: string): boolean {
  const ext = `.${fileName.split(".").pop()?.toLowerCase()}`;
  return RECIPE_DOCUMENT_EXTENSIONS.includes(ext);
}

export async function ingestCsvRows(files: File[]): Promise<CsvRow[]> {
  async function* rowsFromFiles(fileList: File[]): AsyncGenerator<CsvRow> {
    for (const file of fileList) {
      yield* parseCsv(await file.text());
    }
  }

  return Array.fromAsync(rowsFromFiles(files));
}

export async function parseRecipeDocumentFiles(
  files: File[]
): Promise<{ sheets: RecipeSheet[]; warnings: string[] }> {
  const inputs = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    }))
  );

  return parseRecipeDocuments(inputs);
}

export function splitRecipeUploadFiles(files: File[]): {
  csvFiles: File[];
  documentFiles: File[];
} {
  const csvFiles: File[] = [];
  const documentFiles: File[] = [];

  for (const file of files) {
    if (isRecipeDocumentFile(file.name)) {
      documentFiles.push(file);
    } else {
      csvFiles.push(file);
    }
  }

  return { csvFiles, documentFiles };
}
