import { database } from "@repo/database";
import {
  createPrepTaskDependencyEngine,
  type PrepTaskDependency as EngineDependency,
  type PrepTaskNode,
} from "@repo/manifest-adapters";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/lib/tenant";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

/**
 * GET /api/kitchen/prep-task-dependencies/critical-path/[eventId]
 *
 * Calculate and return the critical path for an event's prep tasks
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { eventId } = await context.params;
    const tenantId = await getTenantId();

    // Fetch all tasks for this event
    const tasks = await database.prepTask.findMany({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
      },
      select: {
        id: true,
        eventId: true,
        name: true,
        estimatedMinutes: true,
        startByDate: true,
        dueByDate: true,
        status: true,
      },
    });

    if (tasks.length === 0) {
      return NextResponse.json({
        eventId,
        totalDuration: 0,
        criticalPath: [],
        allNodes: [],
        slackTime: {},
        warnings: ["No prep tasks found for this event"],
      });
    }

    // Fetch all dependencies for this event
    const dependencies = await database.prepTaskDependency.findMany({
      where: {
        tenantId,
        eventId,
        status: "active",
        deletedAt: null,
      },
    });

    // Build task map
    const taskMap = new Map<string, PrepTaskNode>();
    for (const task of tasks) {
      taskMap.set(task.id, {
        id: task.id,
        eventId: task.eventId,
        name: task.name,
        estimatedMinutes: task.estimatedMinutes,
        startByDate: task.startByDate,
        dueByDate: task.dueByDate,
        status: task.status,
        predecessors: new Set(),
        successors: new Set(),
      });
    }

    // Populate predecessor/successor relationships
    for (const dep of dependencies) {
      const pred = taskMap.get(dep.predecessorTaskId);
      const succ = taskMap.get(dep.successorTaskId);
      if (pred && succ) {
        pred.successors.add(dep.successorTaskId);
        succ.predecessors.add(dep.predecessorTaskId);
      }
    }

    // Calculate critical path
    const engine = createPrepTaskDependencyEngine();
    const prepTasks = Array.from(taskMap.values());
    const engineDeps: EngineDependency[] = dependencies.map((d) => ({
      id: d.id,
      eventId: d.eventId,
      predecessorTaskId: d.predecessorTaskId,
      successorTaskId: d.successorTaskId,
      dependencyType: d.dependencyType as any,
      lagMinutes: d.lagMinutes,
      isHardConstraint: d.isHardConstraint,
      status: d.status,
    }));

    const buildResult = engine.buildGraph(prepTasks, engineDeps);
    const criticalPathResult = engine.calculateCriticalPath(eventId);

    if (!criticalPathResult) {
      return NextResponse.json(
        { error: "Failed to calculate critical path" },
        { status: 500 }
      );
    }

    // Format the response with task names
    const formattedNodes = Array.from(
      criticalPathResult.allNodes.entries()
    ).map(([taskId, node]) => ({
      taskId,
      taskName: taskMap.get(taskId)?.name ?? "Unknown",
      earliestStart: node.earliestStart,
      earliestFinish: node.earliestFinish,
      latestStart: node.latestStart,
      latestFinish: node.latestFinish,
      duration: node.duration,
      slack: node.slack,
      isCritical: node.isCritical,
    }));

    const formattedSlackTime: Record<string, number> = {};
    for (const [taskId, slack] of criticalPathResult.slackTime.entries()) {
      const taskName = taskMap.get(taskId)?.name ?? "Unknown";
      formattedSlackTime[`${taskName} (${taskId})`] = slack;
    }

    const formattedCriticalPath = criticalPathResult.criticalPath.map((id) => {
      const task = taskMap.get(id);
      return {
        id,
        name: task?.name ?? "Unknown",
        estimatedMinutes: task?.estimatedMinutes ?? 0,
      };
    });

    return NextResponse.json({
      eventId,
      totalDuration: criticalPathResult.totalDuration,
      totalDurationHours:
        Math.round((criticalPathResult.totalDuration / 60) * 100) / 100,
      criticalPath: formattedCriticalPath,
      allNodes: formattedNodes,
      slackTime: formattedSlackTime,
      conflicts: buildResult.conflicts,
      warnings: criticalPathResult.warnings,
      flexibleConstraintCount: criticalPathResult.flexibleConstraints.length,
      hardConstraintCount: criticalPathResult.hardConstraints.length,
    });
  } catch (error) {
    console.error("[critical-path] GET error:", error);
    return NextResponse.json(
      { error: "Failed to calculate critical path" },
      { status: 500 }
    );
  }
}
