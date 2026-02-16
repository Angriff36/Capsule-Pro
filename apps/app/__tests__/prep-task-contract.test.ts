import { expect, test } from "vitest";
import { validatePrepTasks } from "../app/(authenticated)/events/[eventId]/prep-task-contract";

const CONTRACT_VIOLATION_REGEX = /PrepTask contract violation/;

test("prep task contract accepts valid rows", () => {
  const rows = [
    {
      id: "4f5c5c73-8b0d-4bf9-9f2f-8ad6d8d7af0f",
      name: "Chop onions",
      status: "pending",
      quantityTotal: 4,
      servingsTotal: null,
      dueByDate: new Date("2025-01-01T00:00:00.000Z"),
      isEventFinish: false,
    },
  ];

  expect(() => validatePrepTasks(rows)).not.toThrow();
});

test("prep task contract rejects missing fields", () => {
  const rows = [
    {
      id: "missing-fields",
      dueByDate: "2025-01-01",
    },
  ];

  expect(() => validatePrepTasks(rows)).toThrow(CONTRACT_VIOLATION_REGEX);
});
