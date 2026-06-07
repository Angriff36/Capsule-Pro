import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

interface TaskInput {
  taskType: string;
  name: string;
  dishId?: string | null;
  quantityTotal: number;
  startByDate: string;
  dueByDate: string;
  dueByTime?: string;
  priority: number;
  estimatedMinutes?: number;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const user = await requireCurrentUser();

    const body = (await request.json()) as {
      eventId?: string;
      tasks?: TaskInput[];
    };

    const { eventId, tasks } = body;

    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { message: "No tasks provided" },
        { status: 400 }
      );
    }

    // Fetch event for locationId and validation
    const event = await database.event.findFirst({
      where: { tenantId, id: eventId, deletedAt: null },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!event.locationId) {
      return NextResponse.json(
        { message: "Event must have a location" },
        { status: 400 }
      );
    }

    // Validate no past due dates
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const validTasks = tasks.filter((task) => {
      const dueDate = new Date(task.dueByDate);
      return dueDate >= now;
    });

    if (validTasks.length === 0) {
      return NextResponse.json(
        { message: "All tasks have past due dates and cannot be created" },
        { status: 400 }
      );
    }

    // Check for duplicate task names
    const existingTasks = await database.prepTask.findMany({
      where: { tenantId, eventId, deletedAt: null },
      select: { name: true },
    });

    const existingNames = new Set(
      existingTasks.map((t) => t.name.toLowerCase())
    );

    const nonDuplicateTasks = validTasks.filter(
      (t) => !existingNames.has(t.name.toLowerCase())
    );

    if (nonDuplicateTasks.length === 0) {
      return NextResponse.json(
        {
          message: "All tasks duplicate existing tasks for this event",
          createdCount: 0,
          taskIds: [],
          skippedCount: tasks.length,
        },
        { status: 200 }
      );
    }

    // Create PrepTask records via governed Manifest runtime
    // (same pattern as saveTaskBreakdown in task-breakdown.ts)
    const createdIds: string[] = [];

    for (const task of nonDuplicateTasks) {
      const result = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "PrepTask",
          command: "create",
          body: {
            name: task.name,
            eventId,
            prepListId: "",
            taskType: task.taskType || "prep",
            priority: task.priority || 5,
            quantityTotal: task.quantityTotal || 1,
            quantityUnitId: "",
            servingsTotal: task.quantityTotal || 1,
            startByDate: new Date(task.startByDate).getTime(),
            dueByDate: new Date(task.dueByDate).getTime(),
            notes: task.notes ?? "",
            ingredients: "",
          },
          user: { id: user.id, tenantId, role: user.role },
        }
      );

      if (!result.ok) {
        // Log individual failure but continue creating remaining tasks
        captureException(
          new Error(
            `Bulk-task PrepTask.create failed for "${task.name}": ${result.message}`
          )
        );
        continue;
      }

      const createdId =
        typeof result.result === "object" && result.result !== null
          ? (result.result as { id?: string }).id
          : undefined;

      if (createdId) {
        createdIds.push(createdId);

        // Governed write: set supplementary details via PrepTask.updateDetails
        const detailResult = await runManifestCommandCore(
          {
            createRuntime: ({ user: u, entityName }) =>
              createManifestRuntime({
                user: { id: u.id, tenantId: u.tenantId, role: u.role },
                entityName,
              }),
          },
          {
            entity: "PrepTask",
            command: "updateDetails",
            body: {
              id: createdId,
              dishId: task.dishId ?? "",
              locationId: event.locationId!,
              estimatedMinutes: task.estimatedMinutes ?? 0,
              dueByTime: task.dueByTime
                ? new Date(`1970-01-01T${task.dueByTime}:00`)
                : "",
            },
            user: { id: user.id, tenantId, role: user.role },
          }
        );

        if (!detailResult.ok) {
          captureException(
            new Error(
              `Bulk-task PrepTask.updateDetails failed for "${task.name}": ${detailResult.message}`
            )
          );
        }
      }
    }

    return NextResponse.json({
      createdCount: createdIds.length,
      taskIds: createdIds,
      skippedCount: tasks.length - createdIds.length,
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create tasks",
      },
      { status: 500 }
    );
  }
}
