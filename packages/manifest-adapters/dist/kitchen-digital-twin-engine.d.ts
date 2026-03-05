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
import { type CriticalPathResult } from "./prep-task-dependency-engine.js";
/**
 * Represents a station in the kitchen layout
 */
export interface StationLayout {
    stationId: string;
    stationName: string;
    position: {
        x: number;
        y: number;
    };
    dimensions: {
        width: number;
        height: number;
    };
    capacity: number;
    equipment: string[];
    connectedStations: string[];
    avgProcessingTime: number;
}
/**
 * Represents a resource in the kitchen (staff, equipment)
 */
export interface KitchenResource {
    resourceId: string;
    name: string;
    type: "staff" | "equipment" | "station";
    capacity: number;
    currentUtilization: number;
    skills: string[];
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
    estimatedDuration: number;
    dependencies: string[];
    requiredResources: string[];
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
        progress: number;
        remainingMinutes: number;
    }>;
    pendingTasks: string[];
    completedTasks: string[];
    resourceUtilization: Map<string, number>;
    stationBacklog: Map<string, number>;
}
/**
 * Simulation parameters
 */
export interface SimulationParameters {
    duration: number;
    timeStep: number;
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
    totalThroughput: number;
    averageCycleTime: number;
    stationUtilization: Map<string, number>;
    resourceUtilization: Map<string, number>;
    bottleneckStations: string[];
    idleTime: Map<string, number>;
    waitingTime: Map<string, number>;
    onTimeCompletionRate: number;
    totalCost: number;
    efficiencyScore: number;
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
        improvement: number;
    };
    implementationEffort: "low" | "medium" | "high";
}
/**
 * Event on the simulation timeline
 */
export interface TimelineEvent {
    timestamp: Date;
    type: "task_start" | "task_complete" | "bottleneck" | "resource_shortage" | "idle";
    description: string;
    severity: "info" | "warning" | "critical";
    affectedEntities: string[];
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
export declare class KitchenDigitalTwinEngine {
    private db;
    private tenantId;
    private dependencyEngine;
    constructor(db: PrismaClient | Prisma.TransactionClient, tenantId: string);
    /**
     * Analyze current kitchen layout for efficiency
     */
    analyzeLayout(eventId: string): Promise<{
        currentLayout: StationLayout[];
        efficiencyScore: number;
        bottlenecks: string[];
        suggestions: LayoutSuggestion[];
    }>;
    /**
     * Simulate a proposed layout change before implementing
     */
    simulateLayoutChange(eventId: string, proposedLayout: StationLayout[]): Promise<{
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
    }>;
    /**
     * Analyze workflow patterns and identify inefficiencies
     */
    analyzeWorkflow(eventId: string): Promise<{
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
            potentialSavings: number;
        }>;
    }>;
    /**
     * Simulate process changes (e.g., adding stations, changing processes)
     */
    simulateProcessChange(eventId: string, changes: Array<{
        type: "add_station" | "remove_station" | "modify_step" | "add_parallel";
        target: string;
        parameters: Record<string, unknown>;
    }>): Promise<SimulationResult>;
    /**
     * Optimize staff allocation based on simulation
     */
    optimizeStaffAllocation(eventId: string, constraints?: {
        maxStaff?: number;
        requiredSkills?: string[];
        budgetLimit?: number;
    }): Promise<{
        currentAllocation: Map<string, string[]>;
        optimizedAllocation: Map<string, string[]>;
        improvements: SimulationMetrics;
        costImpact: number;
        recommendations: string[];
    }>;
    /**
     * Simulate what-if scenarios for resource changes
     */
    simulateResourceScenario(eventId: string, scenario: "peak_demand" | "staff_shortage" | "equipment_down" | "new_menu", parameters?: Record<string, unknown>): Promise<SimulationResult>;
    /**
     * Run a time-step simulation of kitchen operations
     */
    runSimulation(eventId: string, parameters: SimulationParameters): Promise<SimulationResult>;
    /**
     * Compare multiple scenarios side by side
     */
    compareScenarios(eventId: string, scenarios: SimulationParameters[]): Promise<Array<{
        scenario: SimulationParameters;
        metrics: SimulationMetrics;
        summary: string;
    }>>;
    private getStationsForEvent;
    private buildStationLayout;
    private buildWorkflowFromEvent;
    private getPrepTasksForEvent;
    private getPrepTaskDependencies;
    private getKitchenResources;
    private getStationLayout;
    private initializeResourceUtilization;
    private initializeStationBacklog;
    private processTaskCompletions;
    private startNewTasks;
    private assignResources;
    private calculateCurrentUtilization;
    private calculateStationBacklog;
    private detectBottlenecks;
    private applyScenarioEffects;
    private calculateSimulationMetrics;
    private emptyMetrics;
    private generateRecommendations;
    private summarizeSimulationResult;
    private analyzeWorkflowPaths;
    private identifyLayoutBottlenecks;
    private generateLayoutSuggestions;
    private calculateLayoutEfficiency;
    private runSimulationWithLayout;
    private compareMetrics;
    private makeLayoutRecommendation;
    private identifyWorkflowInefficiencies;
    private findOptimizationOpportunities;
    private applyWorkflowChanges;
    private runSimulationWithWorkflow;
    private getCurrentStaffAllocation;
    private runStaffOptimization;
    private runSimulationWithAllocation;
    private calculateCostDelta;
    private generateStaffRecommendations;
}
export declare function createKitchenDigitalTwinEngine(db: PrismaClient | Prisma.TransactionClient, tenantId: string): KitchenDigitalTwinEngine;
//# sourceMappingURL=kitchen-digital-twin-engine.d.ts.map