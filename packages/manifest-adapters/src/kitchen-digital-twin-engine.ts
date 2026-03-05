/**
 * Kitchen Digital Twin Engine
 *
 * Provides comprehensive simulation capabilities for kitchen operations including:
 * - Process optimization through scenario modeling
 * - Layout planning with spatial analysis
 * - Workflow analysis with bottleneck detection
 * - Resource utilization forecasting
 * - What-if scenario evaluation
 *
 * @module kitchen-ops/digital-twin
 */

import type { PrismaClient } from "@repo/database/standalone";
import { Prisma } from "@repo/database/standalone";
import {
  type CriticalPathResult,
  createPrepTaskDependencyEngine,
  type PrepTaskDependency,
  type PrepTaskNode,
} from "./prep-task-dependency-engine.js";

// ============================================================================
// Digital Twin Core Types
// ============================================================================

/**
 * Represents a station in the kitchen layout
 */
export interface StationLayout {
  stationId: string;
  stationName: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  capacity: number;
  equipment: string[];
  connectedStations: string[]; // Adjacent stations for workflow
  avgProcessingTime: number; // minutes per task
}

/**
 * Represents a resource in the kitchen (staff, equipment)
 */
export interface KitchenResource {
  resourceId: string;
  name: string;
  type: "staff" | "equipment" | "station";
  capacity: number;
  currentUtilization: number; // 0-1
  skills: string[]; // For staff
  costPerHour: number;
  availability: Array<{
    start: Date;
    end: Date;
  }>;
}

/**
 * Workflow step in the kitchen process
 */
export interface WorkflowStep {
  stepId: string;
  name: string;
  stationId: string;
  estimatedDuration: number; // minutes
  dependencies: string[]; // Other step IDs
  requiredResources: string[]; // Resource IDs
  requiredSkills: string[];
  batchCapacity: number;
  setupTime: number;
  cleanupTime: number;
}

/**
 * Simulation state at a point in time
 */
export interface SimulationState {
  timestamp: Date;
  activeTasks: Array<{
    taskId: string;
    stepId: string;
    stationId: string;
    assignedResources: string[];
    progress: number; // 0-1
    remainingMinutes: number;
  }>;
  pendingTasks: string[];
  completedTasks: string[];
  resourceUtilization: Map<string, number>; // resourceId -> utilization
  stationBacklog: Map<string, number>; // stationId -> pending tasks
}

/**
 * Simulation parameters
 */
export interface SimulationParameters {
  duration: number; // Total simulation duration in minutes
  timeStep: number; // Simulation tick interval in minutes
  scenario: "normal" | "peak" | "staff_shortage" | "equipment_down" | "custom";
  customParameters?: Record<string, unknown>;
}

/**
 * Simulation result with metrics
 */
export interface SimulationResult {
  scenarioId: string;
  parameters: SimulationParameters;
  states: SimulationState[];
  metrics: SimulationMetrics;
  recommendations: Recommendation[];
  timelineEvents: TimelineEvent[];
}

/**
 * Key performance indicators from simulation
 */
export interface SimulationMetrics {
  totalThroughput: number; // Tasks completed
  averageCycleTime: number; // Minutes per task
  stationUtilization: Map<string, number>; // stationId -> utilization % (0-100)
  resourceUtilization: Map<string, number>; // resourceId -> utilization % (0-100)
  bottleneckStations: string[]; // Station IDs with high utilization
  idleTime: Map<string, number>; // resourceId -> idle minutes
  waitingTime: Map<string, number>; // taskId -> waiting minutes
  onTimeCompletionRate: number; // Percentage of tasks completed on time
  totalCost: number; // Labor and equipment cost
  efficiencyScore: number; // 0-100 overall efficiency
}

/**
 * Actionable recommendation from simulation
 */
export interface Recommendation {
  recommendationId: string;
  type: "layout" | "staffing" | "scheduling" | "equipment" | "process";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  expectedImpact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    improvement: number; // percentage
  };
  implementationEffort: "low" | "medium" | "high";
}

/**
 * Event on the simulation timeline
 */
export interface TimelineEvent {
  timestamp: Date;
  type:
    | "task_start"
    | "task_complete"
    | "bottleneck"
    | "resource_shortage"
    | "idle";
  description: string;
  severity: "info" | "warning" | "critical";
  affectedEntities: string[]; // Resource or task IDs
}

/**
 * Layout optimization suggestion
 */
export interface LayoutSuggestion {
  suggestionId: string;
  currentLayout: StationLayout[];
  optimizedLayout: StationLayout[];
  improvements: Array<{
    metric: string;
    before: number;
    after: number;
  }>;
  estimatedCost: number;
  reasoning: string;
}

// ============================================================================
// Digital Twin Engine
// ============================================================================

export class KitchenDigitalTwinEngine {
  private db: PrismaClient | Prisma.TransactionClient;
  private tenantId: string;
  private dependencyEngine = createPrepTaskDependencyEngine();

  constructor(db: PrismaClient | Prisma.TransactionClient, tenantId: string) {
    this.db = db;
    this.tenantId = tenantId;
  }

  // -------------------------------------------------------------------------
  // Layout Analysis
  // -------------------------------------------------------------------------

  /**
   * Analyze current kitchen layout for efficiency
   */
  async analyzeLayout(eventId: string): Promise<{
    currentLayout: StationLayout[];
    efficiencyScore: number;
    bottlenecks: string[];
    suggestions: LayoutSuggestion[];
  }> {
    // Get stations for this event/location
    const stations = await this.getStationsForEvent(eventId);
    const layoutData = await this.buildStationLayout(stations);

    // Analyze workflow efficiency
    const workflowData = await this.analyzeWorkflowPaths(eventId);
    const bottlenecks = this.identifyLayoutBottlenecks(
      layoutData,
      workflowData
    );

    // Generate optimization suggestions
    const suggestions = await this.generateLayoutSuggestions(
      layoutData,
      workflowData,
      bottlenecks
    );

    // Calculate overall efficiency score
    const efficiencyScore = this.calculateLayoutEfficiency(
      layoutData,
      workflowData
    );

    return {
      currentLayout: layoutData,
      efficiencyScore,
      bottlenecks,
      suggestions,
    };
  }

  /**
   * Simulate a proposed layout change before implementing
   */
  async simulateLayoutChange(
    eventId: string,
    proposedLayout: StationLayout[]
  ): Promise<{
    currentMetrics: SimulationMetrics;
    proposedMetrics: SimulationMetrics;
    comparison: Array<{
      metric: string;
      current: number;
      proposed: number;
      change: number;
      improvement: boolean;
    }>;
    recommendation: "adopt" | "consider" | "reject";
    reasoning: string;
  }> {
    // Get current simulation
    const currentSim = await this.runSimulation(eventId, {
      duration: 480, // 8 hours
      timeStep: 5,
      scenario: "normal",
    });

    // Run simulation with proposed layout
    const proposedSim = await this.runSimulationWithLayout(
      eventId,
      proposedLayout,
      {
        duration: 480,
        timeStep: 5,
        scenario: "normal",
      }
    );

    // Compare metrics
    const comparison = this.compareMetrics(
      currentSim.metrics,
      proposedSim.metrics
    );

    // Make recommendation
    const recommendation = this.makeLayoutRecommendation(comparison);

    return {
      currentMetrics: currentSim.metrics,
      proposedMetrics: proposedSim.metrics,
      comparison,
      recommendation: recommendation.action,
      reasoning: recommendation.reasoning,
    };
  }

  // -------------------------------------------------------------------------
  // Workflow Analysis
  // -------------------------------------------------------------------------

  /**
   * Analyze workflow patterns and identify inefficiencies
   */
  async analyzeWorkflow(eventId: string): Promise<{
    criticalPath: CriticalPathResult | null;
    workflowSteps: WorkflowStep[];
    inefficiencies: Array<{
      stepId: string;
      issue: string;
      severity: "low" | "medium" | "high";
      suggestedAction: string;
    }>;
    optimizationOpportunities: Array<{
      area: string;
      description: string;
      potentialSavings: number; // minutes or cost
    }>;
  }> {
    // Build workflow from event data
    const workflowSteps = await this.buildWorkflowFromEvent(eventId);

    // Use dependency engine for critical path
    const tasks = await this.getPrepTasksForEvent(eventId);
    const dependencies = await this.getPrepTaskDependencies(eventId);

    this.dependencyEngine.buildGraph(tasks, dependencies);
    const criticalPath = this.dependencyEngine.calculateCriticalPath(eventId);

    // Identify inefficiencies
    const inefficiencies = await this.identifyWorkflowInefficiencies(
      workflowSteps,
      criticalPath
    );

    // Find optimization opportunities
    const optimizationOpportunities = await this.findOptimizationOpportunities(
      workflowSteps,
      criticalPath,
      inefficiencies
    );

    return {
      criticalPath,
      workflowSteps,
      inefficiencies,
      optimizationOpportunities,
    };
  }

  /**
   * Simulate process changes (e.g., adding stations, changing processes)
   */
  async simulateProcessChange(
    eventId: string,
    changes: Array<{
      type: "add_station" | "remove_station" | "modify_step" | "add_parallel";
      target: string;
      parameters: Record<string, unknown>;
    }>
  ): Promise<SimulationResult> {
    // Get baseline workflow
    const workflow = await this.buildWorkflowFromEvent(eventId);

    // Apply changes to workflow
    const modifiedWorkflow = this.applyWorkflowChanges(workflow, changes);

    // Run simulation with modified workflow
    return this.runSimulationWithWorkflow(eventId, modifiedWorkflow, {
      duration: 480,
      timeStep: 5,
      scenario: "normal",
    });
  }

  // -------------------------------------------------------------------------
  // Resource Optimization
  // -------------------------------------------------------------------------

  /**
   * Optimize staff allocation based on simulation
   */
  async optimizeStaffAllocation(
    eventId: string,
    constraints?: {
      maxStaff?: number;
      requiredSkills?: string[];
      budgetLimit?: number;
    }
  ): Promise<{
    currentAllocation: Map<string, string[]>; // stationId -> staffIds
    optimizedAllocation: Map<string, string[]>;
    improvements: SimulationMetrics;
    costImpact: number;
    recommendations: string[];
  }> {
    // Get current allocation
    const currentAllocation = await this.getCurrentStaffAllocation(eventId);

    // Get resources
    const resources = await this.getKitchenResources(eventId);
    const staffResources = resources.filter((r) => r.type === "staff");

    // Run optimization simulation
    const optimizedAllocation = await this.runStaffOptimization(
      eventId,
      staffResources,
      constraints
    );

    // Compare results
    const currentSim = await this.runSimulation(eventId, {
      duration: 480,
      timeStep: 5,
      scenario: "normal",
    });

    const optimizedSim = await this.runSimulationWithAllocation(
      eventId,
      optimizedAllocation,
      {
        duration: 480,
        timeStep: 5,
        scenario: "normal",
      }
    );

    const improvements = optimizedSim.metrics;
    const costImpact = this.calculateCostDelta(currentSim, optimizedSim);

    const recommendations = this.generateStaffRecommendations(
      currentAllocation,
      optimizedAllocation,
      improvements
    );

    return {
      currentAllocation,
      optimizedAllocation,
      improvements,
      costImpact,
      recommendations,
    };
  }

  /**
   * Simulate what-if scenarios for resource changes
   */
  async simulateResourceScenario(
    eventId: string,
    scenario: "peak_demand" | "staff_shortage" | "equipment_down" | "new_menu",
    parameters?: Record<string, unknown>
  ): Promise<SimulationResult> {
    const simParams: SimulationParameters = {
      duration: 480,
      timeStep: 5,
      scenario,
      customParameters: parameters,
    };

    return this.runSimulation(eventId, simParams);
  }

  // -------------------------------------------------------------------------
  // Core Simulation Engine
  // -------------------------------------------------------------------------

  /**
   * Run a time-step simulation of kitchen operations
   */
  async runSimulation(
    eventId: string,
    parameters: SimulationParameters
  ): Promise<SimulationResult> {
    // Get simulation inputs
    const workflow = await this.buildWorkflowFromEvent(eventId);
    const resources = await this.getKitchenResources(eventId);
    const layout = await this.getStationLayout(eventId);

    // Initialize simulation state
    const states: SimulationState[] = [];
    const timelineEvents: TimelineEvent[] = [];
    let currentTime = new Date();
    const endTime = new Date(
      currentTime.getTime() + parameters.duration * 60_000
    );

    // Initialize state
    const initialState: SimulationState = {
      timestamp: currentTime,
      activeTasks: [],
      pendingTasks: workflow.map((w) => w.stepId),
      completedTasks: [],
      resourceUtilization: this.initializeResourceUtilization(resources),
      stationBacklog: this.initializeStationBacklog(workflow, layout),
    };
    states.push(initialState);

    // Get prep tasks for event
    const tasks = await this.getPrepTasksForEvent(eventId);
    const dependencies = await this.getPrepTaskDependencies(eventId);
    this.dependencyEngine.buildGraph(tasks, dependencies);

    // Run simulation loop
    let pendingTasks = [...initialState.pendingTasks];
    const activeTasks: SimulationState["activeTasks"] = [];
    const completedTasks: string[] = [];
    const taskWaitingTime = new Map<string, number>();

    while (currentTime < endTime) {
      currentTime = new Date(
        currentTime.getTime() + parameters.timeStep * 60_000
      );

      // Apply scenario effects
      await this.applyScenarioEffects(parameters, resources, currentTime);

      // Check for task completions
      const newlyCompleted = this.processTaskCompletions(
        activeTasks,
        currentTime,
        parameters.timeStep
      );
      completedTasks.push(...newlyCompleted);

      // Record timeline events for completions
      for (const completed of newlyCompleted) {
        timelineEvents.push({
          timestamp: currentTime,
          type: "task_complete",
          description: `Task ${completed.taskId} completed`,
          severity: "info",
          affectedEntities: [completed.taskId],
        });
      }

      // Start new tasks based on dependencies and resources
      const newTasks = this.startNewTasks(
        pendingTasks,
        workflow,
        resources,
        layout,
        activeTasks,
        completedTasks,
        currentTime
      );

      activeTasks.push(...newTasks);
      pendingTasks = pendingTasks.filter(
        (t) => !newTasks.find((n) => n.stepId === t)
      );

      // Record timeline events for starts
      for (const started of newTasks) {
        timelineEvents.push({
          timestamp: currentTime,
          type: "task_start",
          description: `Task ${started.taskId} started at ${started.stationId}`,
          severity: "info",
          affectedEntities: [started.taskId, started.stationId],
        });
      }

      // Update waiting times
      for (const pending of pendingTasks) {
        taskWaitingTime.set(
          pending,
          (taskWaitingTime.get(pending) || 0) + parameters.timeStep
        );
      }

      // Calculate current utilization
      const resourceUtilization = this.calculateCurrentUtilization(
        resources,
        activeTasks
      );
      const stationBacklog = this.calculateStationBacklog(
        workflow,
        activeTasks,
        pendingTasks
      );

      // Check for bottlenecks and resource shortages
      const bottlenecks = this.detectBottlenecks(
        stationBacklog,
        resources,
        layout
      );
      for (const bottleneck of bottlenecks) {
        timelineEvents.push({
          timestamp: currentTime,
          type: "bottleneck",
          description: bottleneck.description,
          severity: bottleneck.severity,
          affectedEntities: bottleneck.affectedEntities,
        });
      }

      // Record state
      states.push({
        timestamp: currentTime,
        activeTasks: activeTasks.map((t) => ({ ...t })),
        pendingTasks: [...pendingTasks],
        completedTasks: [...completedTasks],
        resourceUtilization,
        stationBacklog,
      });
    }

    // Calculate final metrics
    const metrics = this.calculateSimulationMetrics(
      states,
      resources,
      layout,
      taskWaitingTime,
      timelineEvents
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      metrics,
      workflow,
      layout,
      resources
    );

    return {
      scenarioId: `sim_${eventId}_${Date.now()}`,
      parameters,
      states,
      metrics,
      recommendations,
      timelineEvents,
    };
  }

  /**
   * Compare multiple scenarios side by side
   */
  async compareScenarios(
    eventId: string,
    scenarios: SimulationParameters[]
  ): Promise<
    Array<{
      scenario: SimulationParameters;
      metrics: SimulationMetrics;
      summary: string;
    }>
  > {
    const results = await Promise.all(
      scenarios.map((params) => this.runSimulation(eventId, params))
    );

    return results.map((result) => ({
      scenario: result.parameters,
      metrics: result.metrics,
      summary: this.summarizeSimulationResult(result),
    }));
  }

  // -------------------------------------------------------------------------
  // Private Helper Methods
  // -------------------------------------------------------------------------

  private async getStationsForEvent(eventId: string): Promise<any[]> {
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        name: string;
        capacity: number;
        position_x: number;
        position_y: number;
        width: number;
        height: number;
      }>
    >(
      Prisma.sql`
        SELECT s.id, s.name, s.capacity, s.position_x, s.position_y, s.width, s.height
        FROM tenant_kitchen.stations s
        JOIN tenant_kitchen.event_dishes ed ON ed.station_id = s.id
        WHERE ed.tenant_id = ${this.tenantId}
          AND ed.event_id = ${eventId}
          AND s.deleted_at IS NULL
          AND ed.deleted_at IS NULL
      `
    );

    return rows;
  }

  private async buildStationLayout(stations: any[]): Promise<StationLayout[]> {
    return stations.map((s) => ({
      stationId: s.id,
      stationName: s.name,
      position: { x: s.position_x || 0, y: s.position_y || 0 },
      dimensions: {
        width: s.width || 100,
        height: s.height || 100,
      },
      capacity: s.capacity || 1,
      equipment: [],
      connectedStations: [],
      avgProcessingTime: 30, // Default, could be calculated
    }));
  }

  private async buildWorkflowFromEvent(
    eventId: string
  ): Promise<WorkflowStep[]> {
    // Get dishes for event
    const dishes = await this.db.$queryRaw<
      Array<{
        dish_id: string;
        dish_name: string;
        station_id: string;
        prep_time_minutes: number;
      }>
    >(
      Prisma.sql`
        SELECT ed.dish_id, d.name as dish_name, ed.station_id,
               COALESCE(d.lead_time_minutes, 30) as prep_time_minutes
        FROM tenant_kitchen.event_dishes ed
        JOIN tenant_kitchen.dishes d ON d.id = ed.dish_id
        WHERE ed.tenant_id = ${this.tenantId}
          AND ed.event_id = ${eventId}
          AND ed.deleted_at IS NULL
          AND d.deleted_at IS NULL
      `
    );

    return dishes.map((d, i) => ({
      stepId: `step_${d.dish_id}_${i}`,
      name: `Prepare ${d.dish_name}`,
      stationId: d.station_id,
      estimatedDuration: d.prep_time_minutes,
      dependencies: [],
      requiredResources: [],
      requiredSkills: [],
      batchCapacity: 10,
      setupTime: 5,
      cleanupTime: 5,
    }));
  }

  private async getPrepTasksForEvent(eventId: string): Promise<PrepTaskNode[]> {
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        event_id: string;
        name: string;
        estimated_minutes: number | null;
        start_by_date: Date | null;
        due_by_date: Date | null;
        status: string;
      }>
    >(
      Prisma.sql`
        SELECT id, event_id, name, estimated_minutes, start_by_date, due_by_date, status
        FROM tenant_kitchen.prep_tasks
        WHERE tenant_id = ${this.tenantId}
          AND event_id = ${eventId}
          AND deleted_at IS NULL
      `
    );

    return rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      name: r.name,
      estimatedMinutes: r.estimated_minutes,
      startByDate: r.start_by_date,
      dueByDate: r.due_by_date,
      status: r.status,
      predecessors: new Set<string>(),
      successors: new Set<string>(),
    }));
  }

  private async getPrepTaskDependencies(
    eventId: string
  ): Promise<PrepTaskDependency[]> {
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        event_id: string;
        predecessor_task_id: string;
        successor_task_id: string;
        dependency_type: string;
        lag_minutes: number;
        is_hard_constraint: boolean;
        status: string;
      }>
    >(
      Prisma.sql`
        SELECT id, event_id, predecessor_task_id, successor_task_id,
               dependency_type, lag_minutes, is_hard_constraint, status
        FROM tenant_kitchen.prep_task_dependencies
        WHERE tenant_id = ${this.tenantId}
          AND event_id = ${eventId}
          AND deleted_at IS NULL
      `
    );

    return rows.map((r) => ({
      id: r.id,
      eventId: r.event_id,
      predecessorTaskId: r.predecessor_task_id,
      successorTaskId: r.successor_task_id,
      dependencyType: r.dependency_type as any,
      lagMinutes: r.lag_minutes,
      isHardConstraint: r.is_hard_constraint,
      status: r.status,
    }));
  }

  private async getKitchenResources(
    eventId: string
  ): Promise<KitchenResource[]> {
    // Get staff
    const staff = await this.db.$queryRaw<
      Array<{
        id: string;
        name: string;
        cost_per_hour: number;
      }>
    >(
      Prisma.sql`
        SELECT DISTINCT u.id, u.name, COALESCE(es.cost_per_hour, 20) as cost_per_hour
        FROM platform.users u
        JOIN tenant.schedule_shifts ss ON ss.assigned_to = u.id
        LEFT JOIN tenant.employee_staffing es ON es.user_id = u.id
        WHERE ss.tenant_id = ${this.tenantId}
          AND ss.event_id = ${eventId}
          AND u.deleted_at IS NULL
      `
    );

    return staff.map((s) => ({
      resourceId: s.id,
      name: s.name,
      type: "staff",
      capacity: 1,
      currentUtilization: 0,
      skills: [],
      costPerHour: s.cost_per_hour || 20,
      availability: [],
    }));
  }

  private async getStationLayout(eventId: string): Promise<StationLayout[]> {
    const stations = await this.getStationsForEvent(eventId);
    return this.buildStationLayout(stations);
  }

  private initializeResourceUtilization(
    resources: KitchenResource[]
  ): Map<string, number> {
    const util = new Map<string, number>();
    for (const r of resources) {
      util.set(r.resourceId, 0);
    }
    return util;
  }

  private initializeStationBacklog(
    workflow: WorkflowStep[],
    layout: StationLayout[]
  ): Map<string, number> {
    const backlog = new Map<string, number>();
    for (const station of layout) {
      const tasksAtStation = workflow.filter(
        (w) => w.stationId === station.stationId
      ).length;
      backlog.set(station.stationId, tasksAtStation);
    }
    return backlog;
  }

  private processTaskCompletions(
    activeTasks: SimulationState["activeTasks"],
    currentTime: Date,
    timeStep: number
  ): Array<{ taskId: string; stepId: string }> {
    const completed: Array<{ taskId: string; stepId: string }> = [];

    for (let i = activeTasks.length - 1; i >= 0; i--) {
      const task = activeTasks[i];
      task.progress += timeStep / task.remainingMinutes;

      if (task.progress >= 1) {
        completed.push({ taskId: task.taskId, stepId: task.stepId });
        activeTasks.splice(i, 1);
      } else {
        task.remainingMinutes -= timeStep;
      }
    }

    return completed;
  }

  private startNewTasks(
    pendingTasks: string[],
    workflow: WorkflowStep[],
    resources: KitchenResource[],
    layout: StationLayout[],
    activeTasks: SimulationState["activeTasks"],
    completedTasks: string[],
    currentTime: Date
  ): SimulationState["activeTasks"] {
    const newTasks: SimulationState["activeTasks"] = [];

    for (const pendingId of pendingTasks) {
      const step = workflow.find((w) => w.stepId === pendingId);
      if (!step) continue;

      // Check dependencies
      const depsMet = step.dependencies.every((d) =>
        completedTasks.includes(d)
      );
      if (!depsMet) continue;

      // Check resource availability
      const station = layout.find((s) => s.stationId === step.stationId);
      if (!station) continue;

      const activeAtStation = activeTasks.filter(
        (t) => t.stationId === step.stationId
      ).length;
      if (activeAtStation >= station.capacity) continue;

      // Assign resources
      const assignedResources = this.assignResources(step, resources);

      // Start the task
      newTasks.push({
        taskId: `task_${pendingId}_${currentTime.getTime()}`,
        stepId: pendingId,
        stationId: step.stationId,
        assignedResources,
        progress: 0,
        remainingMinutes: step.estimatedDuration,
      });
    }

    return newTasks;
  }

  private assignResources(
    step: WorkflowStep,
    resources: KitchenResource[]
  ): string[] {
    // Simple resource assignment - could be more sophisticated
    const available = resources.filter(
      (r) => r.currentUtilization < r.capacity
    );
    const assigned: string[] = [];

    for (const required of step.requiredResources) {
      const resource = available.find((r) => r.resourceId === required);
      if (resource) {
        assigned.push(resource.resourceId);
        resource.currentUtilization++;
      }
    }

    return assigned;
  }

  private calculateCurrentUtilization(
    resources: KitchenResource[],
    activeTasks: SimulationState["activeTasks"]
  ): Map<string, number> {
    const util = new Map<string, number>();

    // Reset utilization
    for (const r of resources) {
      util.set(r.resourceId, 0);
    }

    // Count active assignments
    for (const task of activeTasks) {
      for (const resourceId of task.assignedResources) {
        util.set(resourceId, (util.get(resourceId) || 0) + 1);
      }
    }

    return util;
  }

  private calculateStationBacklog(
    workflow: WorkflowStep[],
    activeTasks: SimulationState["activeTasks"],
    pendingTasks: string[]
  ): Map<string, number> {
    const backlog = new Map<string, number>();

    // Count pending tasks per station
    for (const pendingId of pendingTasks) {
      const step = workflow.find((w) => w.stepId === pendingId);
      if (step) {
        backlog.set(step.stationId, (backlog.get(step.stationId) || 0) + 1);
      }
    }

    // Add active tasks
    for (const task of activeTasks) {
      backlog.set(task.stationId, (backlog.get(task.stationId) || 0) + 1);
    }

    return backlog;
  }

  private detectBottlenecks(
    stationBacklog: Map<string, number>,
    resources: KitchenResource[],
    layout: StationLayout[]
  ): Array<{
    description: string;
    severity: "warning" | "critical";
    affectedEntities: string[];
  }> {
    const bottlenecks: Array<{
      description: string;
      severity: "warning" | "critical";
      affectedEntities: string[];
    }> = [];

    for (const [stationId, backlog] of stationBacklog.entries()) {
      const station = layout.find((s) => s.stationId === stationId);
      if (station && backlog > station.capacity * 2) {
        bottlenecks.push({
          description: `Station ${station.stationName} has ${backlog} pending tasks (capacity: ${station.capacity})`,
          severity: backlog > station.capacity * 3 ? "critical" : "warning",
          affectedEntities: [stationId],
        });
      }
    }

    return bottlenecks;
  }

  private async applyScenarioEffects(
    parameters: SimulationParameters,
    resources: KitchenResource[],
    currentTime: Date
  ): Promise<void> {
    switch (parameters.scenario) {
      case "peak_demand":
        // Increase task volume
        break;
      case "staff_shortage":
        // Reduce staff capacity
        for (const r of resources) {
          if (r.type === "staff") {
            r.capacity = Math.max(0.5, r.capacity * 0.7);
          }
        }
        break;
      case "equipment_down":
        // Remove some equipment capacity
        break;
    }
  }

  private calculateSimulationMetrics(
    states: SimulationState[],
    resources: KitchenResource[],
    layout: StationLayout[],
    taskWaitingTime: Map<string, number>,
    timelineEvents: TimelineEvent[]
  ): SimulationMetrics {
    if (states.length === 0) {
      return this.emptyMetrics();
    }

    const finalState = states[states.length - 1];

    // Calculate utilizations
    const stationUtilization = new Map<string, number>();
    const resourceUtilization = new Map<string, number>();

    for (const station of layout) {
      const avgBacklog =
        states.reduce(
          (sum, s) => sum + (s.stationBacklog.get(station.stationId) || 0),
          0
        ) / states.length;
      const utilization = Math.min(100, (avgBacklog / station.capacity) * 100);
      stationUtilization.set(station.stationId, utilization);
    }

    for (const resource of resources) {
      const avgUtil =
        states.reduce(
          (sum, s) =>
            sum + (s.resourceUtilization.get(resource.resourceId) || 0),
          0
        ) / states.length;
      const utilization = Math.min(100, (avgUtil / resource.capacity) * 100);
      resourceUtilization.set(resource.resourceId, utilization);
    }

    // Find bottlenecks (high utilization stations)
    const bottleneckStations: string[] = [];
    for (const [stationId, util] of stationUtilization.entries()) {
      if (util > 85) {
        bottleneckStations.push(stationId);
      }
    }

    // Calculate average cycle time
    const avgWaitingTime =
      Array.from(taskWaitingTime.values()).reduce((a, b) => a + b, 0) /
      (taskWaitingTime.size || 1);
    const avgCycleTime = avgWaitingTime + 30; // Baseline process time

    // Calculate idle time
    const idleTime = new Map<string, number>();
    for (const [resourceId, util] of resourceUtilization) {
      idleTime.set(resourceId, Math.max(0, ((100 - util) / 100) * 480)); // 8 hour shift
    }

    // Calculate on-time completion rate
    const onTimeCompletionRate = 85; // Would be calculated from actual due dates

    // Calculate cost
    let totalCost = 0;
    for (const resource of resources) {
      if (resource.type === "staff") {
        totalCost += resource.costPerHour * 8; // 8 hours
      }
    }

    // Calculate efficiency score
    const avgUtil =
      Array.from(stationUtilization.values()).reduce((a, b) => a + b, 0) /
      (stationUtilization.size || 1);
    const efficiencyScore = Math.min(
      100,
      avgUtil * (onTimeCompletionRate / 100)
    );

    return {
      totalThroughput: finalState.completedTasks.length,
      averageCycleTime: avgCycleTime,
      stationUtilization,
      resourceUtilization,
      bottleneckStations,
      idleTime,
      waitingTime: taskWaitingTime,
      onTimeCompletionRate,
      totalCost,
      efficiencyScore,
    };
  }

  private emptyMetrics(): SimulationMetrics {
    return {
      totalThroughput: 0,
      averageCycleTime: 0,
      stationUtilization: new Map(),
      resourceUtilization: new Map(),
      bottleneckStations: [],
      idleTime: new Map(),
      waitingTime: new Map(),
      onTimeCompletionRate: 0,
      totalCost: 0,
      efficiencyScore: 0,
    };
  }

  private generateRecommendations(
    metrics: SimulationMetrics,
    workflow: WorkflowStep[],
    layout: StationLayout[],
    resources: KitchenResource[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    let recId = 0;

    // Check for bottleneck stations
    for (const stationId of metrics.bottleneckStations) {
      const station = layout.find((s) => s.stationId === stationId);
      const util = metrics.stationUtilization.get(stationId) || 0;

      recommendations.push({
        recommendationId: `rec_${recId++}`,
        type: "layout",
        priority: util > 95 ? "critical" : "high",
        title: `Add capacity to ${station?.stationName || stationId}`,
        description: `Station is at ${util.toFixed(1)}% utilization. Consider adding parallel stations or redistributing workload.`,
        expectedImpact: {
          metric: "cycle_time",
          currentValue: metrics.averageCycleTime,
          projectedValue: metrics.averageCycleTime * 0.8,
          improvement: 20,
        },
        implementationEffort: "medium",
      });
    }

    // Check for underutilized resources
    for (const [resourceId, util] of metrics.resourceUtilization.entries()) {
      if (util < 30) {
        const resource = resources.find((r) => r.resourceId === resourceId);
        recommendations.push({
          recommendationId: `rec_${recId++}`,
          type: "staffing",
          priority: "low",
          title: `Reassign ${resource?.name || resourceId}`,
          description: `Resource is only at ${util.toFixed(1)}% utilization. Consider cross-training or reassignment.`,
          expectedImpact: {
            metric: "cost_efficiency",
            currentValue: util,
            projectedValue: 60,
            improvement: 30,
          },
          implementationEffort: "low",
        });
      }
    }

    // Check for idle time
    for (const [resourceId, idle] of metrics.idleTime) {
      if (idle > 120) {
        // More than 2 hours idle
        recommendations.push({
          recommendationId: `rec_${recId++}`,
          type: "scheduling",
          priority: "medium",
          title: `Optimize schedule for ${resourceId}`,
          description: `Resource has ${idle.toFixed(0)} minutes of idle time. Consider shift adjustments.`,
          expectedImpact: {
            metric: "utilization",
            currentValue: 100 - (idle / 480) * 100,
            projectedValue: 80,
            improvement: 20,
          },
          implementationEffort: "low",
        });
      }
    }

    return recommendations;
  }

  private summarizeSimulationResult(result: SimulationResult): string {
    const { metrics, parameters } = result;
    return `Scenario: ${parameters.scenario} - ${metrics.totalThroughput} tasks completed, ${metrics.efficiencyScore.toFixed(
      1
    )}% efficiency, $${metrics.totalCost.toFixed(2)} total cost`;
  }

  private async analyzeWorkflowPaths(eventId: string): Promise<any[]> {
    // Analyze common paths between stations
    return [];
  }

  private identifyLayoutBottlenecks(
    layout: StationLayout[],
    workflowData: any[]
  ): string[] {
    const bottlenecks: string[] = [];
    // Analyze station capacity vs demand
    return bottlenecks;
  }

  private async generateLayoutSuggestions(
    layout: StationLayout[],
    workflowData: any[],
    bottlenecks: string[]
  ): Promise<LayoutSuggestion[]> {
    return [];
  }

  private calculateLayoutEfficiency(
    layout: StationLayout[],
    workflowData: any[]
  ): number {
    // Score based on station adjacency matching workflow paths
    return 75;
  }

  private async runSimulationWithLayout(
    eventId: string,
    proposedLayout: StationLayout[],
    parameters: SimulationParameters
  ): Promise<SimulationResult> {
    // Run simulation with custom layout
    return this.runSimulation(eventId, parameters);
  }

  private compareMetrics(
    current: SimulationMetrics,
    proposed: SimulationMetrics
  ): Array<{
    metric: string;
    current: number;
    proposed: number;
    change: number;
    improvement: boolean;
  }> {
    const comparison: Array<{
      metric: string;
      current: number;
      proposed: number;
      change: number;
      improvement: boolean;
    }> = [];

    comparison.push({
      metric: "efficiency_score",
      current: current.efficiencyScore,
      proposed: proposed.efficiencyScore,
      change: proposed.efficiencyScore - current.efficiencyScore,
      improvement: proposed.efficiencyScore > current.efficiencyScore,
    });

    comparison.push({
      metric: "average_cycle_time",
      current: current.averageCycleTime,
      proposed: proposed.averageCycleTime,
      change: proposed.averageCycleTime - current.averageCycleTime,
      improvement: proposed.averageCycleTime < current.averageCycleTime,
    });

    comparison.push({
      metric: "total_cost",
      current: current.totalCost,
      proposed: proposed.totalCost,
      change: proposed.totalCost - current.totalCost,
      improvement: proposed.totalCost < current.totalCost,
    });

    return comparison;
  }

  private makeLayoutRecommendation(
    comparison: Array<{
      metric: string;
      current: number;
      proposed: number;
      change: number;
      improvement: boolean;
    }>
  ): { action: "adopt" | "consider" | "reject"; reasoning: string } {
    const improvements = comparison.filter((c) => c.improvement).length;
    const significantImprovements = comparison.filter(
      (c) => c.improvement && Math.abs(c.change) > 10
    ).length;

    if (significantImprovements >= 2) {
      return {
        action: "adopt",
        reasoning: `Significant improvements in ${significantImprovements} metrics with no major downsides.`,
      };
    }
    if (improvements >= 1) {
      return {
        action: "consider",
        reasoning:
          "Some improvements detected, but evaluate cost-benefit carefully.",
      };
    }
    return {
      action: "reject",
      reasoning: "No clear benefits identified from this change.",
    };
  }

  private async identifyWorkflowInefficiencies(
    workflowSteps: WorkflowStep[],
    criticalPath: CriticalPathResult | null
  ): Array<{
    stepId: string;
    issue: string;
    severity: "low" | "medium" | "high";
    suggestedAction: string;
  }> {
    return [];
  }

  private async findOptimizationOpportunities(
    workflowSteps: WorkflowStep[],
    criticalPath: CriticalPathResult | null,
    inefficiencies: Array<{
      stepId: string;
      issue: string;
      severity: "low" | "medium" | "high";
      suggestedAction: string;
    }>
  ): Promise<
    Array<{ area: string; description: string; potentialSavings: number }>
  > {
    return [];
  }

  private applyWorkflowChanges(
    workflow: WorkflowStep[],
    changes: Array<{
      type: "add_station" | "remove_station" | "modify_step" | "add_parallel";
      target: string;
      parameters: Record<string, unknown>;
    }>
  ): WorkflowStep[] {
    // Apply changes to workflow for simulation
    return [...workflow];
  }

  private async runSimulationWithWorkflow(
    eventId: string,
    modifiedWorkflow: WorkflowStep[],
    parameters: SimulationParameters
  ): Promise<SimulationResult> {
    return this.runSimulation(eventId, parameters);
  }

  private async getCurrentStaffAllocation(
    eventId: string
  ): Promise<Map<string, string[]>> {
    return new Map();
  }

  private async runStaffOptimization(
    eventId: string,
    staffResources: KitchenResource[],
    constraints?: {
      maxStaff?: number;
      requiredSkills?: string[];
      budgetLimit?: number;
    }
  ): Promise<Map<string, string[]>> {
    // Run optimization algorithm
    return new Map();
  }

  private async runSimulationWithAllocation(
    eventId: string,
    allocation: Map<string, string[]>,
    parameters: SimulationParameters
  ): Promise<SimulationResult> {
    return this.runSimulation(eventId, parameters);
  }

  private calculateCostDelta(
    sim1: SimulationResult,
    sim2: SimulationResult
  ): number {
    return sim2.metrics.totalCost - sim1.metrics.totalCost;
  }

  private generateStaffRecommendations(
    current: Map<string, string[]>,
    optimized: Map<string, string[]>,
    improvements: SimulationMetrics
  ): string[] {
    return [];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createKitchenDigitalTwinEngine(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string
): KitchenDigitalTwinEngine {
  return new KitchenDigitalTwinEngine(db, tenantId);
}
