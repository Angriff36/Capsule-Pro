import { dispatchKitchenImport } from "../../kitchen/import/dispatch";
import {
  ingestCsvRows,
  parseRecipeDocumentFiles,
  splitRecipeUploadFiles,
} from "../../kitchen/import/file-ingest";
import { mergeImportSummaries } from "../../kitchen/import/lib/parse-helpers";
import type {
  ImportSummary,
  ImportType,
  ImportUserContext,
} from "../../kitchen/import/lib/types";
import {
  kindToKitchenImportType,
  type SmartImportDetection,
  type SmartImportKind,
} from "./detect";

function groupFilesByKind(
  files: File[],
  detections: SmartImportDetection[]
): Map<SmartImportKind, File[]> {
  const groups = new Map<SmartImportKind, File[]>();
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const detection = detections[index];
    if (!(file && detection)) {
      continue;
    }
    const existing = groups.get(detection.kind) ?? [];
    existing.push(file);
    groups.set(detection.kind, existing);
  }
  return groups;
}

async function runKitchenImportGroup(
  importType: ImportType,
  files: File[],
  context: ImportUserContext
): Promise<ImportSummary> {
  if (importType === "recipes") {
    const { csvFiles, documentFiles } = splitRecipeUploadFiles(files);
    const rows = csvFiles.length > 0 ? await ingestCsvRows(csvFiles) : [];
    let documentSheets: Awaited<
      ReturnType<typeof parseRecipeDocumentFiles>
    >["sheets"] = [];
    let documentWarnings: string[] = [];

    if (documentFiles.length > 0) {
      const parsed = await parseRecipeDocumentFiles(documentFiles);
      documentSheets = parsed.sheets;
      documentWarnings = parsed.warnings;
    }

    return dispatchKitchenImport(importType, rows, context, {
      documentSheets,
      documentWarnings,
    });
  }

  const rows = await ingestCsvRows(files);
  return dispatchKitchenImport(importType, rows, context);
}

export async function executeKitchenImports(
  files: File[],
  detections: SmartImportDetection[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const groups = groupFilesByKind(files, detections);
  const summaries: ImportSummary[] = [];

  for (const [kind, groupFiles] of groups) {
    const importType = kindToKitchenImportType(kind);
    if (!importType) {
      continue;
    }

    summaries.push(
      await runKitchenImportGroup(importType, groupFiles, context)
    );
  }

  if (summaries.length === 0) {
    return { imported: 0, skipped: 0, errors: [], created: [] };
  }

  return mergeImportSummaries(...summaries);
}

export function filterEventDocumentFiles(
  files: File[],
  detections: SmartImportDetection[]
): File[] {
  return files.filter((_file, index) => {
    const detection = detections[index];
    return detection?.kind === "event-document";
  });
}
