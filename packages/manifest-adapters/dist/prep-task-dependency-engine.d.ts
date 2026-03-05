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
export type DependencyType = "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";
export interface ScheduleNode {
    taskId: string;
    earliestStart: number;
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
    criticalPath: string[];
    allNodes: Map<string, ScheduleNode>;
    slackTime: Map<string, number>;
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
export declare class PrepTaskDependencyEngine {
    private tasks;
    private dependencies;
    private adjacencyList;
    private reverseAdjacencyList;
    /**
     * Build the dependency graph from tasks and their relationships
     */
    buildGraph(tasks: PrepTaskNode[], dependencies: PrepTaskDependency[]): {
        success: boolean;
        conflicts: DependencyConflict[];
    };
    /**
     * Detect circular dependencies using DFS
     */
    private detectCircularDependencies;
    /**
     * Calculate the critical path using CPM
     *
     * Forward pass: Calculate earliest start/finish times
     * Backward pass: Calculate latest start/finish times
     * Critical path: Tasks with zero slack time
     */
    calculateCriticalPath(eventId: string): CriticalPathResult | null;
    /**
     * Find the dependency between two tasks
     */
    private findDependency;
    /**
     * Get task durations (estimated or default)
     */
    private getDurations;
    /**
     * Clear the graph
     */
    clear(): void;
    /**
     * Get topological ordering of tasks
     */
    getTopologicalOrder(): string[];
    /**
     * Validate all dependencies for consistency
     */
    validateDependencies(): {
        isValid: boolean;
        conflicts: DependencyConflict[];
        warnings: string[];
    };
    /**
     * Calculate schedule for automated task assignment
     * Returns suggested start times for all tasks
     */
    calculateSchedule(eventId: string): Map<string, {
        startTime: Date;
        endTime: Date;
    }> | null;
    /**
     * Get tasks that can be started now (all dependencies satisfied)
     */
    getAvailableTasks(eventId: string): string[];
    /**
     * Get tasks blocking others (on critical path, not started)
     */
    getBlockingTasks(eventId: string): string[];
    /**
     * Get the critical path as a readable format
     */
    getCriticalPathDescription(eventId: string): string | null;
}
/**
 * Factory function to create a dependency engine
 */
export declare function createPrepTaskDependencyEngine(): PrepTaskDependencyEngine;
//# sourceMappingURL=prep-task-dependency-engine.d.ts.map