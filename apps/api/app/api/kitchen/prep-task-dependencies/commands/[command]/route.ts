import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getTenantId } from "@/lib/tenant";

type RouteContext = {
  params: Promise<{ command: string }>;
};

/**
 * POST /api/kitchen/prep-task-dependencies/commands/[command]
 *
 * Execute Manifest commands for PrepTaskDependency
 *
 * Supported commands:
 * - create: Create a new dependency
 * - update: Update dependency configuration
 * - satisfy: Mark dependency as satisfied
 * - break: Mark dependency as broken (constraint violation)
 * - bypass: Bypass a flexible constraint
 * - remove: Remove/delete a dependency
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { command } = await context.params;
    const tenantId = await getTenantId();
    const session = await auth();
    const body = await request.json();

    // Validate command
    const validCommands = [
      "create",
      "update",
      "satisfy",
      "break",
      "bypass",
      "remove",
    ];
    if (!validCommands.includes(command)) {
      return NextResponse.json(
        {
          error: `Invalid command. Must be one of: ${validCommands.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // For now, we'll use direct database operations since the PrepTaskDependency
    // entity uses in-memory storage. In a full implementation, you would:
    // 1. Compile the prep-task-dependency.manifest file
    // 2. Create a runtime engine for PrepTaskDependency
    // 3. Execute commands through the runtime

    // Execute the appropriate command
    const result = await executeCommand(
      command,
      body,
      tenantId,
      session?.user?.id
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[prep-task-dependency-command] POST error:", error);
    return NextResponse.json(
      { error: "Failed to execute command" },
      { status: 500 }
    );
  }
}

async function executeCommand(
  command: string,
  body: any,
  tenantId: string,
  userId: string | undefined
): Promise<{ error?: string; status?: number; data?: any }> {
  switch (command) {
    case "create": {
      const {
        eventId,
        predecessorTaskId,
        successorTaskId,
        dependencyType = "finish_to_start",
        lagMinutes = 0,
        isHardConstraint = true,
      } = body;

      // Validation
      if (!(eventId && predecessorTaskId && successorTaskId)) {
        return {
          error:
            "Missing required fields: eventId, predecessorTaskId, successorTaskId",
          status: 400,
        };
      }

      if (predecessorTaskId === successorTaskId) {
        return { error: "Task cannot depend on itself", status: 400 };
      }

      const validTypes = [
        "finish_to_start",
        "start_to_start",
        "finish_to_finish",
        "start_to_finish",
      ];
      if (!validTypes.includes(dependencyType)) {
        return {
          error: `Invalid dependencyType. Must be one of: ${validTypes.join(", ")}`,
          status: 400,
        };
      }

      // Check for existing dependency
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
        return {
          error: "Dependency already exists between these tasks",
          status: 409,
        };
      }

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
          createdBy: userId,
        },
      });

      return { data: dependency };
    }

    case "update": {
      const { dependencyId, dependencyType, lagMinutes, isHardConstraint } =
        body;

      if (!dependencyId) {
        return { error: "Missing dependencyId", status: 400 };
      }

      const existing = await database.prepTaskDependency.findFirst({
        where: { id: dependencyId, tenantId, deletedAt: null },
      });

      if (!existing) {
        return { error: "Dependency not found", status: 404 };
      }

      if (existing.status !== "active") {
        return { error: "Cannot update non-active dependencies", status: 400 };
      }

      const updateData: any = {};
      if (dependencyType !== undefined)
        updateData.dependencyType = dependencyType;
      if (lagMinutes !== undefined) updateData.lagMinutes = lagMinutes;
      if (isHardConstraint !== undefined)
        updateData.isHardConstraint = isHardConstraint;

      const dependency = await database.prepTaskDependency.update({
        where: { tenantId_id: { tenantId, id: dependencyId } },
        data: updateData,
      });

      return { data: dependency };
    }

    case "satisfy": {
      const { dependencyId } = body;

      if (!dependencyId) {
        return { error: "Missing dependencyId", status: 400 };
      }

      const existing = await database.prepTaskDependency.findFirst({
        where: { id: dependencyId, tenantId, deletedAt: null },
      });

      if (!existing) {
        return { error: "Dependency not found", status: 404 };
      }

      if (existing.status !== "active") {
        return { error: "Can only satisfy active dependencies", status: 400 };
      }

      const dependency = await database.prepTaskDependency.update({
        where: { tenantId_id: { tenantId, id: dependencyId } },
        data: { status: "satisfied" },
      });

      return { data: dependency };
    }

    case "break": {
      const { dependencyId, reason } = body;

      if (!dependencyId) {
        return { error: "Missing dependencyId", status: 400 };
      }

      const existing = await database.prepTaskDependency.findFirst({
        where: { id: dependencyId, tenantId, deletedAt: null },
      });

      if (!existing) {
        return { error: "Dependency not found", status: 404 };
      }

      if (existing.status !== "active") {
        return { error: "Can only break active dependencies", status: 400 };
      }

      const dependency = await database.prepTaskDependency.update({
        where: { tenantId_id: { tenantId, id: dependencyId } },
        data: { status: "broken" },
      });

      // If this was a hard constraint, emit a warning
      if (existing.isHardConstraint) {
        console.warn(
          `[prep-task-dependency] Hard constraint broken: ${existing.predecessorTaskId} -> ${existing.successorTaskId}`,
          { reason }
        );
      }

      return {
        data: { dependency, wasHardConstraint: existing.isHardConstraint },
      };
    }

    case "bypass": {
      const { dependencyId, reason } = body;

      if (!dependencyId) {
        return { error: "Missing dependencyId", status: 400 };
      }

      const existing = await database.prepTaskDependency.findFirst({
        where: { id: dependencyId, tenantId, deletedAt: null },
      });

      if (!existing) {
        return { error: "Dependency not found", status: 404 };
      }

      if (existing.isHardConstraint) {
        return { error: "Cannot bypass hard constraints", status: 400 };
      }

      if (existing.status !== "active") {
        return { error: "Can only bypass active dependencies", status: 400 };
      }

      const dependency = await database.prepTaskDependency.update({
        where: { tenantId_id: { tenantId, id: dependencyId } },
        data: { status: "bypassed" },
      });

      return { data: dependency };
    }

    case "remove": {
      const { dependencyId } = body;

      if (!dependencyId) {
        return { error: "Missing dependencyId", status: 400 };
      }

      const existing = await database.prepTaskDependency.findFirst({
        where: { id: dependencyId, tenantId, deletedAt: null },
      });

      if (!existing) {
        return { error: "Dependency not found", status: 404 };
      }

      await database.prepTaskDependency.update({
        where: { tenantId_id: { tenantId, id: dependencyId } },
        data: { status: "deleted", deletedAt: new Date() },
      });

      return { data: { success: true } };
    }

    default:
      return { error: "Unknown command", status: 400 };
  }
}
