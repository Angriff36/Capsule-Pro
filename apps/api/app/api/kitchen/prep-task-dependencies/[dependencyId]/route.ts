import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/lib/tenant";

type RouteContext = {
  params: Promise<{ dependencyId: string }>;
};

/**
 * GET /api/kitchen/prep-task-dependencies/[dependencyId]
 *
 * Get a specific dependency
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { dependencyId } = await context.params;
    const tenantId = await getTenantId();

    const dependency = await database.prepTaskDependency.findFirst({
      where: {
        id: dependencyId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(dependency);
  } catch (error) {
    console.error("[prep-task-dependencies] GET by ID error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dependency" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/kitchen/prep-task-dependencies/[dependencyId]
 *
 * Update a dependency
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { dependencyId } = await context.params;
    const tenantId = await getTenantId();
    const body = await request.json();

    const { dependencyType, lagMinutes, isHardConstraint, status } = body;

    // Check if dependency exists
    const existing = await database.prepTaskDependency.findFirst({
      where: {
        id: dependencyId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    // Validate dependency type if provided
    if (dependencyType) {
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
    }

    // Build update data
    const updateData: any = {};
    if (dependencyType !== undefined)
      updateData.dependencyType = dependencyType;
    if (lagMinutes !== undefined) updateData.lagMinutes = lagMinutes;
    if (isHardConstraint !== undefined)
      updateData.isHardConstraint = isHardConstraint;
    if (status !== undefined) updateData.status = status;

    const dependency = await database.prepTaskDependency.update({
      where: { tenantId_id: { tenantId, id: dependencyId } },
      data: updateData,
    });

    return NextResponse.json(dependency);
  } catch (error) {
    console.error("[prep-task-dependencies] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update dependency" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kitchen/prep-task-dependencies/[dependencyId]
 *
 * Remove a dependency (soft delete)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { dependencyId } = await context.params;
    const tenantId = await getTenantId();

    // Check if dependency exists
    const existing = await database.prepTaskDependency.findFirst({
      where: {
        id: dependencyId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await database.prepTaskDependency.update({
      where: { tenantId_id: { tenantId, id: dependencyId } },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[prep-task-dependencies] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete dependency" },
      { status: 500 }
    );
  }
}
