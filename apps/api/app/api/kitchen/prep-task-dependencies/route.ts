import { database } from "@repo/database";
import {
  createPrepTaskDependencyEngine,
  type PrepTaskDependency as EngineDependency,
  type PrepTaskNode,
} from "@repo/manifest-adapters";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/lib/tenant";

/**
 * GET /api/kitchen/prep-task-dependencies
 *
 * Query params:
 * - eventId: Filter dependencies by event
 * - taskId: Filter dependencies involving this task
 * - includeCriticalPath: Calculate and include critical path analysis
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const taskId = searchParams.get("taskId");
    const includeCriticalPath =
      searchParams.get("includeCriticalPath") === "true";

    // Build query conditions
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (eventId) {
      where.eventId = eventId;
    }

    if (taskId) {
      where.OR = [{ predecessorTaskId: taskId }, { successorTaskId: taskId }];
    }

    const dependencies = await database.prepTaskDependency.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    // If critical path analysis requested
    let criticalPathAnalysis = null;
    if (eventId && includeCriticalPath) {
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

      // Build predecessor/successor sets from dependencies
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

      engine.buildGraph(prepTasks, engineDeps);
      criticalPathAnalysis = engine.calculateCriticalPath(eventId);

      // Add task names to critical path
      if (criticalPathAnalysis) {
        criticalPathAnalysis.criticalPath =
          criticalPathAnalysis.criticalPath.map((id) => {
            const task = taskMap.get(id);
            return task ? `${task.name} (${id})` : id;
          });
      }
    }

    return NextResponse.json({
      dependencies,
      criticalPathAnalysis,
      count: dependencies.length,
    });
  } catch (error) {
    console.error("[prep-task-dependencies] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dependencies" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/prep-task-dependencies
 *
 * Create a new dependency relationship
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();

    const {
      eventId,
      predecessorTaskId,
      successorTaskId,
      dependencyType = "finish_to_start",
      lagMinutes = 0,
      isHardConstraint = true,
    } = body;

    // Validate required fields
    if (!(eventId && predecessorTaskId && successorTaskId)) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: eventId, predecessorTaskId, successorTaskId",
        },
        { status: 400 }
      );
    }

    // Check for self-dependency
    if (predecessorTaskId === successorTaskId) {
      return NextResponse.json(
        { error: "Task cannot depend on itself" },
        { status: 400 }
      );
    }

    // Validate dependency type
    const validTypes = [
      "finish_to_start",
      "start_to_start",
      "finish_to_finish",
      "start_to_finish",
    ];
    if (!validTypes.includes(dependencyType)) {
      return NextResponse.json(
        {
          error: `Invalid dependencyType. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check that both tasks exist
    const [predecessor, successor] = await Promise.all([
      database.prepTask.findFirst({
        where: { id: predecessorTaskId, tenantId, deletedAt: null },
      }),
      database.prepTask.findFirst({
        where: { id: successorTaskId, tenantId, deletedAt: null },
      }),
    ]);

    if (!predecessor) {
      return NextResponse.json(
        { error: "Predecessor task not found" },
        { status: 404 }
      );
    }

    if (!successor) {
      return NextResponse.json(
        { error: "Successor task not found" },
        { status: 404 }
      );
    }

    // Check for duplicate dependency
    const existing = await database.prepTaskDependency.findFirst({
      where: {
        tenantId,
        eventId,
        predecessorTaskId,
        successorTaskId,
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Dependency already exists between these tasks" },
        { status: 409 }
      );
    }

    // Create dependency
    const dependency = await database.prepTaskDependency.create({
      data: {
        tenantId,
        eventId,
        predecessorTaskId,
        successorTaskId,
        dependencyType,
        lagMinutes,
        isHardConstraint,
        status: "active",
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    console.error("[prep-task-dependencies] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create dependency" },
      { status: 500 }
    );
  }
}
