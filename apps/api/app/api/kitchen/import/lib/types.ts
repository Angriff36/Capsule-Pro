export type ImportType =
  | "recipes"
  | "dishes"
  | "prep-lists"
  | "ingredients"
  | "recipe-ingredients"
  | "events";

export const IMPORT_TYPES: ImportType[] = [
  "recipes",
  "dishes",
  "prep-lists",
  "ingredients",
  "recipe-ingredients",
  "events",
];

export interface ImportSummary {
  created: string[];
  errors: string[];
  imported: number;
  skipped: number;
}

export interface CsvRow {
  [key: string]: string;
}

export interface ImportUserContext {
  tenantId: string;
  userId: string;
  userRole: string;
}
