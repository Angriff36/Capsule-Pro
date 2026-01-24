Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prep_task_contract_1 = require("../app/(authenticated)/events/[eventId]/prep-task-contract");
const CONTRACT_VIOLATION_REGEX = /PrepTask contract violation/;
(0, vitest_1.test)("prep task contract accepts valid rows", () => {
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
  (0, vitest_1.expect)(() =>
    (0, prep_task_contract_1.validatePrepTasks)(rows)
  ).not.toThrow();
});
(0, vitest_1.test)("prep task contract rejects missing fields", () => {
  const rows = [
    {
      id: "missing-fields",
      dueByDate: "2025-01-01",
    },
  ];
  (0, vitest_1.expect)(() =>
    (0, prep_task_contract_1.validatePrepTasks)(rows)
  ).toThrow(CONTRACT_VIOLATION_REGEX);
});
