import type { PrepTask } from "@repo/database";

export type PrepTaskSummary = Pick<
  PrepTask,
  | "id"
  | "name"
  | "status"
  | "quantityTotal"
  | "servingsTotal"
  | "dueByDate"
  | "isEventFinish"
>;

type RecordShape = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordShape =>
  typeof value === "object" && value !== null;

const isNumberLike = (value: unknown): boolean => {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    return typeof Reflect.get(value, "toString") === "function";
  }

  return false;
};

function assertField(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertPrepTaskContract(
  value: unknown
): asserts value is PrepTaskSummary[] {
  assertField(
    Array.isArray(value),
    "PrepTask contract violation: expected an array."
  );

  (value as unknown[]).forEach((item: unknown, index: number) => {
    assertField(
      isRecord(item),
      `PrepTask contract violation at index ${index}: expected an object.`
    );

    const record = item as RecordShape;

    assertField(
      typeof record.id === "string" && record.id.trim().length > 0,
      `PrepTask contract violation at index ${index}: 'id' must be a non-empty string.`
    );

    assertField(
      typeof record.name === "string" && record.name.trim().length > 0,
      `PrepTask contract violation at index ${index}: 'name' must be a non-empty string.`
    );

    assertField(
      typeof record.status === "string" && record.status.trim().length > 0,
      `PrepTask contract violation at index ${index}: 'status' must be a non-empty string.`
    );

    assertField(
      isNumberLike(record.quantityTotal),
      `PrepTask contract violation at index ${index}: 'quantityTotal' must be a number-like value.`
    );

    assertField(
      record.servingsTotal === null || typeof record.servingsTotal === "number",
      `PrepTask contract violation at index ${index}: 'servingsTotal' must be a number or null.`
    );

    assertField(
      record.dueByDate instanceof Date &&
        !Number.isNaN(record.dueByDate.getTime()),
      `PrepTask contract violation at index ${index}: 'dueByDate' must be a valid Date.`
    );

    assertField(
      typeof record.isEventFinish === "boolean",
      `PrepTask contract violation at index ${index}: 'isEventFinish' must be a boolean.`
    );
  });
}

export const validatePrepTasks = (value: unknown): PrepTaskSummary[] => {
  assertPrepTaskContract(value);
  return value as PrepTaskSummary[];
};
