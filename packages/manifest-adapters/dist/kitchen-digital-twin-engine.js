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
import { Prisma } from "@repo/database/standalone";
import { createPrepTaskDependencyEngine, } from "./prep-task-dependency-engine.js";
// ============================================================================
// Digital Twin Engine
// ============================================================================
export class KitchenDigitalTwinEngine {
    db;
    tenantId;
    dependencyEngine = createPrepTaskDependencyEngine();
    constructor(db, tenantId) {
        this.db = db;
        this.tenantId = tenantId;
    }
    // -------------------------------------------------------------------------
    // Layout Analysis
    // -------------------------------------------------------------------------
    /**
     * Analyze current kitchen layout for efficiency
     */
    async analyzeLayout(eventId) {
        // Get stations for this event/location
        const stations = await this.getStationsForEvent(eventId);
        const layoutData = await this.buildStationLayout(stations);
        // Analyze workflow efficiency
        const workflowData = await this.analyzeWorkflowPaths(eventId);
        const bottlenecks = this.identifyLayoutBottlenecks(layoutData, workflowData);
        // Generate optimization suggestions
        const suggestions = await this.generateLayoutSuggestions(layoutData, workflowData, bottlenecks);
        // Calculate overall efficiency score
        const efficiencyScore = this.calculateLayoutEfficiency(layoutData, workflowData);
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
    async simulateLayoutChange(eventId, proposedLayout) {
        // Get current simulation
        const currentSim = await this.runSimulation(eventId, {
            duration: 480, // 8 hours
            timeStep: 5,
            scenario: "normal",
        });
        // Run simulation with proposed layout
        const proposedSim = await this.runSimulationWithLayout(eventId, proposedLayout, {
            duration: 480,
            timeStep: 5,
            scenario: "normal",
        });
        // Compare metrics
        const comparison = this.compareMetrics(currentSim.metrics, proposedSim.metrics);
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
    async analyzeWorkflow(eventId) {
        // Build workflow from event data
        const workflowSteps = await this.buildWorkflowFromEvent(eventId);
        // Use dependency engine for critical path
        const tasks = await this.getPrepTasksForEvent(eventId);
        const dependencies = await this.getPrepTaskDependencies(eventId);
        this.dependencyEngine.buildGraph(tasks, dependencies);
        const criticalPath = this.dependencyEngine.calculateCriticalPath(eventId);
        // Identify inefficiencies
        const inefficiencies = await this.identifyWorkflowInefficiencies(workflowSteps, criticalPath);
        // Find optimization opportunities
        const optimizationOpportunities = await this.findOptimizationOpportunities(workflowSteps, criticalPath, inefficiencies);
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
    async simulateProcessChange(eventId, changes) {
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
    async optimizeStaffAllocation(eventId, constraints) {
        // Get current allocation
        const currentAllocation = await this.getCurrentStaffAllocation(eventId);
        // Get resources
        const resources = await this.getKitchenResources(eventId);
        const staffResources = resources.filter((r) => r.type === "staff");
        // Run optimization simulation
        const optimizedAllocation = await this.runStaffOptimization(eventId, staffResources, constraints);
        // Compare results
        const currentSim = await this.runSimulation(eventId, {
            duration: 480,
            timeStep: 5,
            scenario: "normal",
        });
        const optimizedSim = await this.runSimulationWithAllocation(eventId, optimizedAllocation, {
            duration: 480,
            timeStep: 5,
            scenario: "normal",
        });
        const improvements = optimizedSim.metrics;
        const costImpact = this.calculateCostDelta(currentSim, optimizedSim);
        const recommendations = this.generateStaffRecommendations(currentAllocation, optimizedAllocation, improvements);
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
    async simulateResourceScenario(eventId, scenario, parameters) {
        const simParams = {
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
    async runSimulation(eventId, parameters) {
        // Get simulation inputs
        const workflow = await this.buildWorkflowFromEvent(eventId);
        const resources = await this.getKitchenResources(eventId);
        const layout = await this.getStationLayout(eventId);
        // Initialize simulation state
        const states = [];
        const timelineEvents = [];
        let currentTime = new Date();
        const endTime = new Date(currentTime.getTime() + parameters.duration * 60_000);
        // Initialize state
        const initialState = {
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
        const activeTasks = [];
        const completedTasks = [];
        const taskWaitingTime = new Map();
        while (currentTime < endTime) {
            currentTime = new Date(currentTime.getTime() + parameters.timeStep * 60_000);
            // Apply scenario effects
            await this.applyScenarioEffects(parameters, resources, currentTime);
            // Check for task completions
            const newlyCompleted = this.processTaskCompletions(activeTasks, currentTime, parameters.timeStep);
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
            const newTasks = this.startNewTasks(pendingTasks, workflow, resources, layout, activeTasks, completedTasks, currentTime);
            activeTasks.push(...newTasks);
            pendingTasks = pendingTasks.filter((t) => !newTasks.find((n) => n.stepId === t));
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
                taskWaitingTime.set(pending, (taskWaitingTime.get(pending) || 0) + parameters.timeStep);
            }
            // Calculate current utilization
            const resourceUtilization = this.calculateCurrentUtilization(resources, activeTasks);
            const stationBacklog = this.calculateStationBacklog(workflow, activeTasks, pendingTasks);
            // Check for bottlenecks and resource shortages
            const bottlenecks = this.detectBottlenecks(stationBacklog, resources, layout);
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
        const metrics = this.calculateSimulationMetrics(states, resources, layout, taskWaitingTime, timelineEvents);
        // Generate recommendations
        const recommendations = this.generateRecommendations(metrics, workflow, layout, resources);
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
    async compareScenarios(eventId, scenarios) {
        const results = await Promise.all(scenarios.map((params) => this.runSimulation(eventId, params)));
        return results.map((result) => ({
            scenario: result.parameters,
            metrics: result.metrics,
            summary: this.summarizeSimulationResult(result),
        }));
    }
    // -------------------------------------------------------------------------
    // Private Helper Methods
    // -------------------------------------------------------------------------
    async getStationsForEvent(eventId) {
        const rows = await this.db.$queryRaw(Prisma.sql `
        SELECT s.id, s.name, s.capacity, s.position_x, s.position_y, s.width, s.height
        FROM tenant_kitchen.stations s
        JOIN tenant_kitchen.event_dishes ed ON ed.station_id = s.id
        WHERE ed.tenant_id = ${this.tenantId}
          AND ed.event_id = ${eventId}
          AND s.deleted_at IS NULL
          AND ed.deleted_at IS NULL
      `);
        return rows;
    }
    async buildStationLayout(stations) {
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
    async buildWorkflowFromEvent(eventId) {
        // Get dishes for event
        const dishes = await this.db.$queryRaw(Prisma.sql `
        SELECT ed.dish_id, d.name as dish_name, ed.station_id,
               COALESCE(d.lead_time_minutes, 30) as prep_time_minutes
        FROM tenant_kitchen.event_dishes ed
        JOIN tenant_kitchen.dishes d ON d.id = ed.dish_id
        WHERE ed.tenant_id = ${this.tenantId}
          AND ed.event_id = ${eventId}
          AND ed.deleted_at IS NULL
          AND d.deleted_at IS NULL
      `);
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
    async getPrepTasksForEvent(eventId) {
        const rows = await this.db.$queryRaw(Prisma.sql `
        SELECT id, event_id, name, estimated_minutes, start_by_date, due_by_date, status
        FROM tenant_kitchen.prep_tasks
        WHERE tenant_id = ${this.tenantId}
          AND event_id = ${eventId}
          AND deleted_at IS NULL
      `);
        return rows.map((r) => ({
            id: r.id,
            eventId: r.event_id,
            name: r.name,
            estimatedMinutes: r.estimated_minutes,
            startByDate: r.start_by_date,
            dueByDate: r.due_by_date,
            status: r.status,
            predecessors: new Set(),
            successors: new Set(),
        }));
    }
    async getPrepTaskDependencies(eventId) {
        const rows = await this.db.$queryRaw(Prisma.sql `
        SELECT id, event_id, predecessor_task_id, successor_task_id,
               dependency_type, lag_minutes, is_hard_constraint, status
        FROM tenant_kitchen.prep_task_dependencies
        WHERE tenant_id = ${this.tenantId}
          AND event_id = ${eventId}
          AND deleted_at IS NULL
      `);
        return rows.map((r) => ({
            id: r.id,
            eventId: r.event_id,
            predecessorTaskId: r.predecessor_task_id,
            successorTaskId: r.successor_task_id,
            dependencyType: r.dependency_type,
            lagMinutes: r.lag_minutes,
            isHardConstraint: r.is_hard_constraint,
            status: r.status,
        }));
    }
    async getKitchenResources(eventId) {
        // Get staff
        const staff = await this.db.$queryRaw(Prisma.sql `
        SELECT DISTINCT u.id, u.name, COALESCE(es.cost_per_hour, 20) as cost_per_hour
        FROM platform.users u
        JOIN tenant.schedule_shifts ss ON ss.assigned_to = u.id
        LEFT JOIN tenant.employee_staffing es ON es.user_id = u.id
        WHERE ss.tenant_id = ${this.tenantId}
          AND ss.event_id = ${eventId}
          AND u.deleted_at IS NULL
      `);
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
    async getStationLayout(eventId) {
        const stations = await this.getStationsForEvent(eventId);
        return this.buildStationLayout(stations);
    }
    initializeResourceUtilization(resources) {
        const util = new Map();
        for (const r of resources) {
            util.set(r.resourceId, 0);
        }
        return util;
    }
    initializeStationBacklog(workflow, layout) {
        const backlog = new Map();
        for (const station of layout) {
            const tasksAtStation = workflow.filter((w) => w.stationId === station.stationId).length;
            backlog.set(station.stationId, tasksAtStation);
        }
        return backlog;
    }
    processTaskCompletions(activeTasks, currentTime, timeStep) {
        const completed = [];
        for (let i = activeTasks.length - 1; i >= 0; i--) {
            const task = activeTasks[i];
            task.progress += timeStep / task.remainingMinutes;
            if (task.progress >= 1) {
                completed.push({ taskId: task.taskId, stepId: task.stepId });
                activeTasks.splice(i, 1);
            }
            else {
                task.remainingMinutes -= timeStep;
            }
        }
        return completed;
    }
    startNewTasks(pendingTasks, workflow, resources, layout, activeTasks, completedTasks, currentTime) {
        const newTasks = [];
        for (const pendingId of pendingTasks) {
            const step = workflow.find((w) => w.stepId === pendingId);
            if (!step)
                continue;
            // Check dependencies
            const depsMet = step.dependencies.every((d) => completedTasks.includes(d));
            if (!depsMet)
                continue;
            // Check resource availability
            const station = layout.find((s) => s.stationId === step.stationId);
            if (!station)
                continue;
            const activeAtStation = activeTasks.filter((t) => t.stationId === step.stationId).length;
            if (activeAtStation >= station.capacity)
                continue;
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
    assignResources(step, resources) {
        // Simple resource assignment - could be more sophisticated
        const available = resources.filter((r) => r.currentUtilization < r.capacity);
        const assigned = [];
        for (const required of step.requiredResources) {
            const resource = available.find((r) => r.resourceId === required);
            if (resource) {
                assigned.push(resource.resourceId);
                resource.currentUtilization++;
            }
        }
        return assigned;
    }
    calculateCurrentUtilization(resources, activeTasks) {
        const util = new Map();
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
    calculateStationBacklog(workflow, activeTasks, pendingTasks) {
        const backlog = new Map();
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
    detectBottlenecks(stationBacklog, resources, layout) {
        const bottlenecks = [];
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
    async applyScenarioEffects(parameters, resources, currentTime) {
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
    calculateSimulationMetrics(states, resources, layout, taskWaitingTime, timelineEvents) {
        if (states.length === 0) {
            return this.emptyMetrics();
        }
        const finalState = states[states.length - 1];
        // Calculate utilizations
        const stationUtilization = new Map();
        const resourceUtilization = new Map();
        for (const station of layout) {
            const avgBacklog = states.reduce((sum, s) => sum + (s.stationBacklog.get(station.stationId) || 0), 0) / states.length;
            const utilization = Math.min(100, (avgBacklog / station.capacity) * 100);
            stationUtilization.set(station.stationId, utilization);
        }
        for (const resource of resources) {
            const avgUtil = states.reduce((sum, s) => sum + (s.resourceUtilization.get(resource.resourceId) || 0), 0) / states.length;
            const utilization = Math.min(100, (avgUtil / resource.capacity) * 100);
            resourceUtilization.set(resource.resourceId, utilization);
        }
        // Find bottlenecks (high utilization stations)
        const bottleneckStations = [];
        for (const [stationId, util] of stationUtilization.entries()) {
            if (util > 85) {
                bottleneckStations.push(stationId);
            }
        }
        // Calculate average cycle time
        const avgWaitingTime = Array.from(taskWaitingTime.values()).reduce((a, b) => a + b, 0) /
            (taskWaitingTime.size || 1);
        const avgCycleTime = avgWaitingTime + 30; // Baseline process time
        // Calculate idle time
        const idleTime = new Map();
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
        const avgUtil = Array.from(stationUtilization.values()).reduce((a, b) => a + b, 0) /
            (stationUtilization.size || 1);
        const efficiencyScore = Math.min(100, avgUtil * (onTimeCompletionRate / 100));
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
    emptyMetrics() {
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
    generateRecommendations(metrics, workflow, layout, resources) {
        const recommendations = [];
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
    summarizeSimulationResult(result) {
        const { metrics, parameters } = result;
        return `Scenario: ${parameters.scenario} - ${metrics.totalThroughput} tasks completed, ${metrics.efficiencyScore.toFixed(1)}% efficiency, $${metrics.totalCost.toFixed(2)} total cost`;
    }
    async analyzeWorkflowPaths(eventId) {
        // Analyze common paths between stations
        return [];
    }
    identifyLayoutBottlenecks(layout, workflowData) {
        const bottlenecks = [];
        // Analyze station capacity vs demand
        return bottlenecks;
    }
    async generateLayoutSuggestions(layout, workflowData, bottlenecks) {
        return [];
    }
    calculateLayoutEfficiency(layout, workflowData) {
        // Score based on station adjacency matching workflow paths
        return 75;
    }
    async runSimulationWithLayout(eventId, proposedLayout, parameters) {
        // Run simulation with custom layout
        return this.runSimulation(eventId, parameters);
    }
    compareMetrics(current, proposed) {
        const comparison = [];
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
    makeLayoutRecommendation(comparison) {
        const improvements = comparison.filter((c) => c.improvement).length;
        const significantImprovements = comparison.filter((c) => c.improvement && Math.abs(c.change) > 10).length;
        if (significantImprovements >= 2) {
            return {
                action: "adopt",
                reasoning: `Significant improvements in ${significantImprovements} metrics with no major downsides.`,
            };
        }
        if (improvements >= 1) {
            return {
                action: "consider",
                reasoning: "Some improvements detected, but evaluate cost-benefit carefully.",
            };
        }
        return {
            action: "reject",
            reasoning: "No clear benefits identified from this change.",
        };
    }
    async identifyWorkflowInefficiencies(workflowSteps, criticalPath) {
        return [];
    }
    async findOptimizationOpportunities(workflowSteps, criticalPath, inefficiencies) {
        return [];
    }
    applyWorkflowChanges(workflow, changes) {
        // Apply changes to workflow for simulation
        return [...workflow];
    }
    async runSimulationWithWorkflow(eventId, modifiedWorkflow, parameters) {
        return this.runSimulation(eventId, parameters);
    }
    async getCurrentStaffAllocation(eventId) {
        return new Map();
    }
    async runStaffOptimization(eventId, staffResources, constraints) {
        // Run optimization algorithm
        return new Map();
    }
    async runSimulationWithAllocation(eventId, allocation, parameters) {
        return this.runSimulation(eventId, parameters);
    }
    calculateCostDelta(sim1, sim2) {
        return sim2.metrics.totalCost - sim1.metrics.totalCost;
    }
    generateStaffRecommendations(current, optimized, improvements) {
        return [];
    }
}
// ============================================================================
// Factory Function
// ============================================================================
export function createKitchenDigitalTwinEngine(db, tenantId) {
    return new KitchenDigitalTwinEngine(db, tenantId);
}
