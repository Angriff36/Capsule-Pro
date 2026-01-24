/**
 * Critical Path Method (CPM) Algorithm
 *
 * Calculates the critical path through a network of dependent tasks.
 *
 * The critical path is the longest path through the task network and determines
 * the minimum time required to complete the project. Tasks on the critical path
 * have zero slack (float) - any delay in these tasks will delay the entire project.
 *
 * @see https://en.wikipedia.org/wiki/Critical_path_method
 */
export type TaskForCPM = {
  id: string;
  startTime: Date;
  endTime: Date;
  dependencies: string[];
};
export type CriticalPathResult = {
  taskId: string;
  earliestStart: Date;
  earliestFinish: Date;
  latestStart: Date;
  latestFinish: Date;
  slackMinutes: number;
  isOnCriticalPath: boolean;
};
/**
 * Calculate the critical path through a set of tasks.
 *
 * Algorithm:
 * 1. Build adjacency lists for forward (dependencies) and reverse (dependents) traversal
 * 2. Forward pass: Calculate ES and EF for each task
 *    - Tasks with no dependencies start at time 0
 *    - Tasks with dependencies start after max(EF) of all dependencies
 * 3. Backward pass: Calculate LS and LF for each task
 *    - Tasks with no dependents finish at max(EF) of all tasks
 *    - Tasks with dependents finish at min(LS) of all dependents
 * 4. Calculate slack = LS - ES (or LF - EF)
 * 5. Critical path = tasks with zero slack
 *
 * @param tasks - Array of tasks with id, startTime, endTime, and dependencies
 * @returns Map of task ID to critical path calculation results
 */
export declare function calculateCriticalPath(
  tasks: TaskForCPM[]
): Map<string, CriticalPathResult>;
/**
 * Validate a set of tasks for critical path calculation.
 *
 * Checks for:
 * - Circular dependencies
 * - Missing dependencies (referenced tasks that don't exist)
 * - Empty task list
 *
 * @throws Error if validation fails
 */
export declare function validateTasksForCPM(tasks: TaskForCPM[]): void;
/**
 * Get the critical path as an ordered list of task IDs.
 *
 * @param results - Map of task ID to critical path results
 * @returns Ordered array of task IDs on the critical path
 */
export declare function getCriticalPathOrder(
  results: Map<string, CriticalPathResult>
): string[];
//# sourceMappingURL=critical-path.d.ts.map
