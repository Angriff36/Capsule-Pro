// Prep Task Dependency Engine
// Implements Critical Path Method (CPM) for prep task scheduling
// Calculates slack time, critical path, and dependency validation

export interface PrepTaskNode {
  id: string;
  eventId: string;
  name: string;
  estimatedMinutes: number | null;
  startByDate: Date | null;
  dueByDate: Date | null;
  status: string;
  predecessors: Set<string>;
  successors: Set<string>;
}

export interface PrepTaskDependency {
  id: string;
  eventId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: DependencyType;
  lagMinutes: number;
  isHardConstraint: boolean;
  status: string;
}

export type DependencyType =
  | "finish_to_start"
  | "start_to_start"
  | "finish_to_finish"
  | "start_to_finish";

export interface ScheduleNode {
  taskId: string;
  earliestStart: number; // minutes from event start
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  duration: number;
  slack: number;
  isCritical: boolean;
}

export interface CriticalPathResult {
  eventId: string;
  totalDuration: number;
  criticalPath: string[]; // task IDs in order
  allNodes: Map<string, ScheduleNode>;
  slackTime: Map<string, number>; // taskId -> slack minutes
  flexibleConstraints: PrepTaskDependency[];
  hardConstraints: PrepTaskDependency[];
  warnings: string[];
}

export interface DependencyConflict {
  type: "circular" | "impossible" | "constraint_violation";
  message: string;
  tasks: string[];
}

/**
 * Prep Task Dependency Engine
 *
 * Implements the Critical Path Method (CPM) for prep task scheduling:
 * 1. Build dependency graph from tasks and dependencies
 * 2. Calculate earliest start/finish (forward pass)
 * 3. Calculate latest start/finish (backward pass)
 * 4. Identify critical path (zero slack tasks)
 * 5. Validate constraints and detect conflicts
 */
export class PrepTaskDependencyEngine {
  private tasks: Map<string, PrepTaskNode> = new Map();
  private dependencies: Map<string, PrepTaskDependency> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();

  /**
   * Build the dependency graph from tasks and their relationships
   */
  buildGraph(
    tasks: PrepTaskNode[],
    dependencies: PrepTaskDependency[]
  ): { success: boolean; conflicts: DependencyConflict[] } {
    this.clear();

    // Add all tasks to the graph
    for (const task of tasks) {
      this.tasks.set(task.id, task);
      this.adjacencyList.set(task.id, new Set(Array.from(task.successors)));
      this.reverseAdjacencyList.set(
        task.id,
        new Set(Array.from(task.predecessors))
      );
    }

    // Add dependencies
    for (const dep of dependencies) {
      if (dep.status !== "active") continue;
      this.dependencies.set(dep.id, dep);

      // Build adjacency from dependencies
      const preds = this.adjacencyList.get(dep.predecessorTaskId) ?? new Set();
      const newPreds = new Set(Array.from(preds));
      newPreds.add(dep.successorTaskId);
      this.adjacencyList.set(dep.predecessorTaskId, newPreds);

      const succs =
        this.reverseAdjacencyList.get(dep.successorTaskId) ?? new Set();
      const newSuccs = new Set(Array.from(succs));
      newSuccs.add(dep.predecessorTaskId);
      this.reverseAdjacencyList.set(dep.successorTaskId, newSuccs);
    }

    // Check for circular dependencies
    const conflicts = this.detectCircularDependencies();
    return { success: conflicts.length === 0, conflicts };
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(): DependencyConflict[] {
    const conflicts: DependencyConflict[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const successors = this.adjacencyList.get(taskId) ?? new Set();
      const successorsArray = Array.from(successors);
      for (let i = 0; i < successorsArray.length; i++) {
        const successor = successorsArray[i];
        if (!visited.has(successor)) {
          if (dfs(successor)) {
            return true;
          }
        } else if (recursionStack.has(successor)) {
          // Found a cycle - extract the cycle path
          const cycleStart = path.indexOf(successor);
          const cycle = [...path.slice(cycleStart), successor];
          conflicts.push({
            type: "circular",
            message: `Circular dependency detected: ${cycle.join(" -> ")}`,
            tasks: cycle,
          });
          return true;
        }
      }

      recursionStack.delete(taskId);
      path.pop();
      return false;
    };

    const tasksArray = Array.from(this.tasks.keys());
    for (let i = 0; i < tasksArray.length; i++) {
      const taskId = tasksArray[i];
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    }

    return conflicts;
  }

  /**
   * Calculate the critical path using CPM
   *
   * Forward pass: Calculate earliest start/finish times
   * Backward pass: Calculate latest start/finish times
   * Critical path: Tasks with zero slack time
   */
  calculateCriticalPath(eventId: string): CriticalPathResult | null {
    if (this.tasks.size === 0) {
      return null;
    }

    const warnings: string[] = [];
    const durations = this.getDurations();
    const hardConstraints: PrepTaskDependency[] = [];
    const flexibleConstraints: PrepTaskDependency[] = [];

    // Categorize constraints
    const depsArray = Array.from(this.dependencies.values());
    for (let i = 0; i < depsArray.length; i++) {
      const dep = depsArray[i];
      if (dep.status !== "active") continue;
      if (dep.isHardConstraint) {
        hardConstraints.push(dep);
      } else {
        flexibleConstraints.push(dep);
      }
    }

    // Find all tasks for this event
    const tasksEntries = Array.from(this.tasks.entries());
    const eventTasks = tasksEntries
      .filter(([, task]) => task.eventId === eventId)
      .map(([id, task]) => ({ id, task }));

    if (eventTasks.length === 0) {
      return null;
    }

    // Initialize schedule nodes
    const nodes = new Map<string, ScheduleNode>();
    for (let i = 0; i < eventTasks.length; i++) {
      const { id, task } = eventTasks[i];
      nodes.set(id, {
        taskId: id,
        earliestStart: 0,
        earliestFinish: durations.get(id) ?? 0,
        latestStart: 0,
        latestFinish: 0,
        duration: durations.get(id) ?? 0,
        slack: 0,
        isCritical: false,
      });
    }

    // ===== FORWARD PASS: Calculate earliest times =====
    const inDegrees = new Map<string, number>();
    for (let i = 0; i < eventTasks.length; i++) {
      const { id } = eventTasks[i];
      const reverseAdj = this.reverseAdjacencyList.get(id) ?? new Set();
      inDegrees.set(id, reverseAdj.size);
    }

    // Queue for topological sort (tasks with no incoming edges)
    const queue: string[] = [];
    for (let i = 0; i < eventTasks.length; i++) {
      const { id } = eventTasks[i];
      if ((inDegrees.get(id) ?? 0) === 0) {
        queue.push(id);
      }
    }

    let processedCount = 0;
    while (queue.length > 0) {
      const taskId = queue.shift()!;
      processedCount++;

      const node = nodes.get(taskId)!;
      const task = this.tasks.get(taskId)!;

      // Use task's existing start time as base if available
      if (task.startByDate) {
        // Convert to minutes from some reference (simplified)
        node.earliestStart = 0; // Would need actual date calculation
      }

      node.earliestFinish = node.earliestStart + node.duration;

      // Update successors
      const adjList = this.adjacencyList.get(taskId) ?? new Set();
      const successors = Array.from(adjList);
      for (let i = 0; i < successors.length; i++) {
        const successorId = successors[i];
        const successorNode = nodes.get(successorId);
        if (!successorNode) continue; // Not in this event

        const dep = this.findDependency(taskId, successorId);
        if (dep) {
          const lag = dep.lagMinutes;
          let newStart = node.earliestFinish + lag;

          // Adjust based on dependency type
          if (dep.dependencyType === "start_to_start") {
            newStart = node.earliestStart + lag;
          } else if (dep.dependencyType === "finish_to_finish") {
            successorNode.earliestFinish = Math.max(
              successorNode.earliestFinish,
              node.earliestFinish + lag
            );
          } else if (dep.dependencyType === "start_to_finish") {
            newStart = node.earliestStart + lag;
          }

          successorNode.earliestStart = Math.max(
            successorNode.earliestStart,
            newStart
          );
          successorNode.earliestFinish = Math.max(
            successorNode.earliestFinish,
            successorNode.earliestStart + successorNode.duration
          );
        }

        // Update in-degree and add to queue if ready
        const newInDegree = (inDegrees.get(successorId) ?? 0) - 1;
        inDegrees.set(successorId, newInDegree);
        if (newInDegree === 0) {
          queue.push(successorId);
        }
      }
    }

    // Check for cycles (if not all tasks processed)
    if (processedCount !== eventTasks.length) {
      warnings.push(
        "Circular dependency detected - CPM results may be invalid"
      );
    }

    // ===== BACKWARD PASS: Calculate latest times =====
    // Find the maximum earliest finish (project end)
    let projectEnd = 0;
    const nodesArray = Array.from(nodes.values());
    for (let i = 0; i < nodesArray.length; i++) {
      const node = nodesArray[i];
      projectEnd = Math.max(projectEnd, node.earliestFinish);
    }

    // Initialize latest finish times
    for (let i = 0; i < nodesArray.length; i++) {
      const node = nodesArray[i];
      node.latestFinish =
        node.earliestFinish === projectEnd ? projectEnd : projectEnd;
      node.latestStart = node.latestFinish - node.duration;
    }

    // Process in reverse topological order
    const reverseTopoOrder = [...eventTasks].reverse();
    for (let i = 0; i < reverseTopoOrder.length; i++) {
      const { id: taskId } = reverseTopoOrder[i];
      const node = nodes.get(taskId)!;

      // Find minimum latest start among predecessors
      const reverseAdj = this.reverseAdjacencyList.get(taskId) ?? new Set();
      const predecessors = Array.from(reverseAdj);
      const minPredecessorStart = node.latestFinish;

      for (let j = 0; j < predecessors.length; j++) {
        const predId = predecessors[j];
        const predNode = nodes.get(predId);
        if (!predNode) continue;

        const dep = this.findDependency(predId, taskId);
        if (dep) {
          let predLatest = node.latestStart - dep.lagMinutes;

          if (dep.dependencyType === "start_to_start") {
            predLatest = node.latestStart - dep.lagMinutes;
          } else if (dep.dependencyType === "finish_to_finish") {
            predLatest = node.latestFinish - dep.lagMinutes;
          } else if (dep.dependencyType === "start_to_finish") {
            predLatest = node.latestFinish - dep.lagMinutes;
          }

          predNode.latestFinish = Math.min(predNode.latestFinish, predLatest);
          predNode.latestStart = predNode.latestFinish - predNode.duration;
        }
      }
    }

    // ===== CALCULATE SLACK AND IDENTIFY CRITICAL PATH =====
    for (let i = 0; i < nodesArray.length; i++) {
      const node = nodesArray[i];
      node.slack = node.latestStart - node.earliestStart;
      node.isCritical = Math.abs(node.slack) < 1; // Essentially zero
    }

    // Extract critical path (tasks with zero slack)
    const criticalPathNodes = nodesArray
      .filter((n) => n.isCritical)
      .sort((a, b) => a.earliestStart - b.earliestStart);
    const criticalPath = criticalPathNodes.map((n) => n.taskId);

    // Build slack time map
    const slackTime = new Map<string, number>();
    const nodesEntries = Array.from(nodes.entries());
    for (let i = 0; i < nodesEntries.length; i++) {
      const [taskId, node] = nodesEntries[i];
      slackTime.set(taskId, node.slack);
    }

    // Validate against hard constraints
    for (let i = 0; i < hardConstraints.length; i++) {
      const dep = hardConstraints[i];
      const predNode = nodes.get(dep.predecessorTaskId);
      const succNode = nodes.get(dep.successorTaskId);

      if (
        predNode &&
        succNode &&
        dep.dependencyType === "finish_to_start" &&
        succNode.earliestStart < predNode.earliestFinish + dep.lagMinutes
      ) {
        warnings.push(
          `Hard constraint violation: ${dep.predecessorTaskId} -> ${dep.successorTaskId}`
        );
      }
    }

    return {
      eventId,
      totalDuration: projectEnd,
      criticalPath,
      allNodes: nodes,
      slackTime,
      flexibleConstraints,
      hardConstraints,
      warnings,
    };
  }

  /**
   * Find the dependency between two tasks
   */
  private findDependency(
    predecessorId: string,
    successorId: string
  ): PrepTaskDependency | null {
    const depsArray = Array.from(this.dependencies.values());
    for (let i = 0; i < depsArray.length; i++) {
      const dep = depsArray[i];
      if (
        dep.predecessorTaskId === predecessorId &&
        dep.successorTaskId === successorId
      ) {
        return dep;
      }
    }
    return null;
  }

  /**
   * Get task durations (estimated or default)
   */
  private getDurations(): Map<string, number> {
    const durations = new Map<string, number>();
    const entries = Array.from(this.tasks.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, task] = entries[i];
      durations.set(id, task.estimatedMinutes ?? 30); // Default 30 minutes
    }
    return durations;
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.tasks.clear();
    this.dependencies.clear();
    this.adjacencyList.clear();
    this.reverseAdjacencyList.clear();
  }

  /**
   * Get topological ordering of tasks
   */
  getTopologicalOrder(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const adjList = this.adjacencyList.get(taskId) ?? new Set();
      const successors = Array.from(adjList);
      for (let i = 0; i < successors.length; i++) {
        visit(successors[i]);
      }

      result.push(taskId);
    };

    const keys = Array.from(this.tasks.keys());
    for (let i = 0; i < keys.length; i++) {
      visit(keys[i]);
    }

    return result.reverse();
  }

  /**
   * Validate all dependencies for consistency
   */
  validateDependencies(): {
    isValid: boolean;
    conflicts: DependencyConflict[];
    warnings: string[];
  } {
    const conflicts = this.detectCircularDependencies();
    const warnings: string[] = [];

    // Check for tasks with missing dependencies
    const entries = Array.from(this.tasks.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, task] = entries[i];
      const predecessors = Array.from(task.predecessors);
      for (let j = 0; j < predecessors.length; j++) {
        const predId = predecessors[j];
        if (!this.tasks.has(predId)) {
          conflicts.push({
            type: "impossible",
            message: `Task ${id} depends on non-existent task ${predId}`,
            tasks: [id, predId],
          });
        }
      }
    }

    // Check for overdue tasks on critical path
    const now = Date.now();
    for (let i = 0; i < entries.length; i++) {
      const [id, task] = entries[i];
      if (task.dueByDate && new Date(task.dueByDate).getTime() < now) {
        warnings.push(`Task ${task.name} (${id}) is overdue`);
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings,
    };
  }

  /**
   * Calculate schedule for automated task assignment
   * Returns suggested start times for all tasks
   */
  calculateSchedule(
    eventId: string
  ): Map<string, { startTime: Date; endTime: Date }> | null {
    const result = this.calculateCriticalPath(eventId);
    if (!result) return null;

    const schedule = new Map<string, { startTime: Date; endTime: Date }>();
    const now = new Date();

    const nodesEntries = Array.from(result.allNodes.entries());
    for (let i = 0; i < nodesEntries.length; i++) {
      const [taskId, node] = nodesEntries[i];
      const startTime = new Date(now.getTime() + node.earliestStart * 60_000);
      const endTime = new Date(now.getTime() + node.earliestFinish * 60_000);
      schedule.set(taskId, { startTime, endTime });
    }

    return schedule;
  }

  /**
   * Get tasks that can be started now (all dependencies satisfied)
   */
  getAvailableTasks(eventId: string): string[] {
    const available: string[] = [];

    const entries = Array.from(this.tasks.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, task] = entries[i];
      if (task.eventId !== eventId) continue;
      if (task.status === "completed" || task.status === "in_progress")
        continue;

      // Check if all predecessors are completed
      let allPredsComplete = true;
      const predecessors = Array.from(task.predecessors);
      for (let j = 0; j < predecessors.length; j++) {
        const predId = predecessors[j];
        const pred = this.tasks.get(predId);
        if (pred && pred.status !== "completed") {
          allPredsComplete = false;
          break;
        }
      }

      if (allPredsComplete && task.predecessors.size === 0) {
        available.push(id);
      }
    }

    return available;
  }

  /**
   * Get tasks blocking others (on critical path, not started)
   */
  getBlockingTasks(eventId: string): string[] {
    const result = this.calculateCriticalPath(eventId);
    if (!result) return [];

    const criticalPath = result.criticalPath;
    const blocking: string[] = [];

    for (let i = 0; i < criticalPath.length; i++) {
      const id = criticalPath[i];
      const task = this.tasks.get(id);
      if (task && task.status !== "completed") {
        blocking.push(id);
      }
    }

    return blocking;
  }

  /**
   * Get the critical path as a readable format
   */
  getCriticalPathDescription(eventId: string): string | null {
    const result = this.calculateCriticalPath(eventId);
    if (!result) return null;

    const taskNames: string[] = [];
    const criticalPath = result.criticalPath;
    for (let i = 0; i < criticalPath.length; i++) {
      const id = criticalPath[i];
      const task = this.tasks.get(id);
      taskNames.push(task?.name ?? id);
    }

    const totalHours = Math.round((result.totalDuration / 60) * 10) / 10;
    return `Critical path: ${taskNames.join(" → ")} (${totalHours}h total)`;
  }
}

/**
 * Factory function to create a dependency engine
 */
export function createPrepTaskDependencyEngine(): PrepTaskDependencyEngine {
  return new PrepTaskDependencyEngine();
}
