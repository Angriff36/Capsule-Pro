export type ConvexDoc = Record<string, unknown> & {
  _id: string;
  _creationTime?: number;
};

export function convexDocId(doc: ConvexDoc): string {
  return String(doc._id);
}

export function activeTenantRows(docs: ConvexDoc[]): ConvexDoc[] {
  return docs.filter((d) => d.deletedAt == null);
}

export function msToDate(value: unknown): Date | null {
  if (typeof value === "number") {
    return new Date(value);
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

export function parseDecimalString(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
