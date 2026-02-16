import type { FileInput, SalesRecord } from "../types";
import { parseCsv } from "./csv-parser";
import { parseXlsx } from "./xlsx-parser";

export function parseFiles(
  files: FileInput[],
  dateColumn?: string
): SalesRecord[] {
  const allRecords: SalesRecord[] = [];

  for (const file of files) {
    const records =
      file.type === "csv"
        ? parseCsv(file.data, dateColumn)
        : parseXlsx(file.data, dateColumn);
    allRecords.push(...records);
  }

  allRecords.sort((a, b) => a.date.getTime() - b.date.getTime());
  return allRecords;
}
