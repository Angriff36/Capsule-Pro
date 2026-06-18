import type { CsvRow } from "./types";

export const trimOpt = (val: string | undefined): string | null => {
  const trimmed = val?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export const parseIntOpt = (val: string | undefined): number | null => {
  const trimmed = val?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseDecimalOpt = (val: string | undefined): number | null => {
  const trimmed = val?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseBoolOpt = (val: string | undefined): boolean => {
  const normalized = val?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};

export const parseListOpt = (val: string | undefined, separator = ";"): string[] => {
  if (!val?.trim()) {
    return [];
  }
  return val
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
};

export const emptySummary = (): import("./types").ImportSummary => ({
  imported: 0,
  skipped: 0,
  errors: [],
  created: [],
});

export const mergeImportSummaries = (
  ...summaries: import("./types").ImportSummary[]
): import("./types").ImportSummary => {
  return summaries.reduce(
    (acc, summary) => ({
      imported: acc.imported + summary.imported,
      skipped: acc.skipped + summary.skipped,
      errors: [...acc.errors, ...summary.errors],
      created: [...acc.created, ...summary.created],
    }),
    emptySummary()
  );
};

export const getRowLabel = (row: CsvRow, keys: string[], fallback = "Row"): string => {
  for (const key of keys) {
    const value = trimOpt(row[key]);
    if (value) {
      return value;
    }
  }
  return fallback;
};
