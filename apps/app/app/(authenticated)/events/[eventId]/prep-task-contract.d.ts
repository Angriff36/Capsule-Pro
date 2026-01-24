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
export declare function assertPrepTaskContract(
  value: unknown
): asserts value is PrepTaskSummary[];
export declare const validatePrepTasks: (value: unknown) => PrepTaskSummary[];
//# sourceMappingURL=prep-task-contract.d.ts.map
