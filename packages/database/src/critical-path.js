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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCriticalPath = calculateCriticalPath;
exports.validateTasksForCPM = validateTasksForCPM;
exports.getCriticalPathOrder = getCriticalPathOrder;
/**
 * Runtime invariant helper that throws if condition is falsy.
 */
function invariant(condition, message) {
  if (!condition) {
    throw new Error(`Invariant violation: ${message}`);
  }
}
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
function calculateCriticalPath(tasks) {
  invariant(tasks.length > 0, "calculateCriticalPath: tasks array is empty");
  // Build a map for quick lookup
  const taskMap = new Map();
  const taskDurationMinutes = new Map();
  for (const task of tasks) {
    taskMap.set(task.id, task);
    const duration = Math.round(
      (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60)
    );
    taskDurationMinutes.set(task.id, duration);
  }
  // Build adjacency lists
  // forwardMap: task -> list of tasks it depends on (predecessors)
  // reverseMap: task -> list of tasks that depend on it (successors)
  const forwardMap = new Map();
  const reverseMap = new Map();
  for (const task of tasks) {
    forwardMap.set(task.id, [...task.dependencies]);
    reverseMap.set(task.id, []);
    // Build reverse map
    for (const depId of task.dependencies) {
      if (!reverseMap.has(depId)) {
        reverseMap.set(depId, []);
      }
      reverseMap.get(depId).push(task.id);
    }
  }
  // Store calculation results
  const earliestStart = new Map();
  const earliestFinish = new Map();
  const latestStart = new Map();
  const latestFinish = new Map();
  const slack = new Map();
  const isCritical = new Map();
  // Helper to add minutes to a date
  const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60 * 1000);
  };
  // ============================================================
  // FORWARD PASS: Calculate ES and EF for each task
  // ============================================================
  // Find tasks with no dependencies (roots) - use their start time as baseline
  const roots = [];
  for (const task of tasks) {
    if (task.dependencies.length === 0) {
      roots.push(task.id);
    }
  }
  // Use the earliest root start time as baseline
  let baselineTime = new Date(8_640_000_000_000_000); // Max date
  for (const rootId of roots) {
    const root = taskMap.get(rootId);
    if (root.startTime < baselineTime) {
      baselineTime = root.startTime;
    }
  }
  // Topological sort for forward pass
  const visited = new Set();
  const processForward = (taskId) => {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    const task = taskMap.get(taskId);
    const duration = taskDurationMinutes.get(taskId);
    if (task.dependencies.length === 0) {
      // Root task - use its actual start time
      earliestStart.set(taskId, task.startTime);
    } else {
      // Ensure all dependencies are processed first
      for (const depId of task.dependencies) {
        processForward(depId);
      }
      // ES = max(EF of all dependencies)
      let maxEF = new Date(0); // Min date
      for (const depId of task.dependencies) {
        const depEF = earliestFinish.get(depId);
        invariant(
          depEF !== undefined,
          `Dependency ${depId} not processed for task ${taskId}`
        );
        if (depEF > maxEF) {
          maxEF = depEF;
        }
      }
      earliestStart.set(taskId, maxEF);
    }
    // EF = ES + duration
    const es = earliestStart.get(taskId);
    earliestFinish.set(taskId, addMinutes(es, duration));
  };
  // Process all tasks
  for (const task of tasks) {
    processForward(task.id);
  }
  // Find the project end time (max EF of all tasks)
  let projectEnd = new Date(0);
  for (const [taskId, ef] of earliestFinish) {
    if (ef > projectEnd) {
      projectEnd = ef;
    }
  }
  // ============================================================
  // BACKWARD PASS: Calculate LS and LF for each task
  // ============================================================
  const visitedBackward = new Set();
  const processBackward = (taskId) => {
    if (visitedBackward.has(taskId)) return;
    visitedBackward.add(taskId);
    const task = taskMap.get(taskId);
    const duration = taskDurationMinutes.get(taskId);
    const successors = reverseMap.get(taskId) || [];
    if (successors.length === 0) {
      // End task - LF = project end time
      latestFinish.set(taskId, projectEnd);
    } else {
      // Ensure all successors are processed first
      for (const succId of successors) {
        processBackward(succId);
      }
      // LF = min(LS of all successors)
      let minLS = new Date(8_640_000_000_000_000); // Max date
      for (const succId of successors) {
        const succLS = latestStart.get(succId);
        invariant(
          succLS !== undefined,
          `Successor ${succId} not processed for task ${taskId}`
        );
        if (succLS < minLS) {
          minLS = succLS;
        }
      }
      latestFinish.set(taskId, minLS);
    }
    // LS = LF - duration
    const lf = latestFinish.get(taskId);
    latestStart.set(taskId, addMinutes(lf, -duration));
  };
  // Process all tasks
  for (const task of tasks) {
    processBackward(task.id);
  }
  // ============================================================
  // CALCULATE SLACK AND IDENTIFY CRITICAL PATH
  // ============================================================
  for (const task of tasks) {
    const es = earliestStart.get(task.id);
    const ef = earliestFinish.get(task.id);
    const ls = latestStart.get(task.id);
    const lf = latestFinish.get(task.id);
    // Slack = LS - ES (or LF - EF, should be the same)
    const slackMinutesValue = Math.round(
      (ls.getTime() - es.getTime()) / (1000 * 60)
    );
    slack.set(task.id, slackMinutesValue);
    // Tasks with zero or negative slack are on critical path
    // Negative slack means the task is already behind schedule
    isCritical.set(task.id, slackMinutesValue <= 0);
  }
  // Build result map
  const result = new Map();
  for (const task of tasks) {
    result.set(task.id, {
      taskId: task.id,
      earliestStart: earliestStart.get(task.id),
      earliestFinish: earliestFinish.get(task.id),
      latestStart: latestStart.get(task.id),
      latestFinish: latestFinish.get(task.id),
      slackMinutes: slack.get(task.id),
      isOnCriticalPath: isCritical.get(task.id),
    });
  }
  return result;
}
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
function validateTasksForCPM(tasks) {
  if (tasks.length === 0) {
    throw new Error("Cannot calculate critical path: no tasks provided");
  }
  const taskIds = new Set(tasks.map((t) => t.id));
  // Check for missing dependencies
  for (const task of tasks) {
    for (const depId of task.dependencies) {
      if (!taskIds.has(depId)) {
        throw new Error(
          `Task "${task.id}" depends on non-existent task "${depId}"`
        );
      }
    }
  }
  // Check for circular dependencies using DFS
  const visited = new Set();
  const recursionStack = new Set();
  const hasCycle = (taskId) => {
    visited.add(taskId);
    recursionStack.add(taskId);
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          if (hasCycle(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }
    }
    recursionStack.delete(taskId);
    return false;
  };
  for (const task of tasks) {
    if (!visited.has(task.id) && hasCycle(task.id)) {
      throw new Error("Circular dependency detected in task dependencies");
    }
  }
}
/**
 * Get the critical path as an ordered list of task IDs.
 *
 * @param results - Map of task ID to critical path results
 * @returns Ordered array of task IDs on the critical path
 */
function getCriticalPathOrder(results) {
  const criticalTasks = [];
  for (const [taskId, result] of results) {
    if (result.isOnCriticalPath) {
      criticalTasks.push({
        id: taskId,
        earliestStart: result.earliestStart,
      });
    }
  }
  // Sort by earliest start time
  criticalTasks.sort(
    (a, b) => a.earliestStart.getTime() - b.earliestStart.getTime()
  );
  return criticalTasks.map((t) => t.id);
}
