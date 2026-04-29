import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
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

    // Create PrepTask records
    const created = await database.$transaction(
      nonDuplicateTasks.map((task) =>
        database.prepTask.create({
          data: {
            tenantId,
            eventId,
            dishId: task.dishId ?? null,
            locationId: event.locationId!,
            taskType: task.taskType || "prep",
            name: task.name,
            quantityTotal: task.quantityTotal || 1,
            quantityCompleted: 0,
            startByDate: new Date(task.startByDate),
            dueByDate: new Date(task.dueByDate),
            dueByTime: task.dueByTime
              ? new Date(`1970-01-01T${task.dueByTime}:00`)
              : null,
            status: "pending",
            priority: task.priority || 5,
            estimatedMinutes: task.estimatedMinutes ?? null,
            notes: task.notes ?? null,
          },
        })
      )
    );

    return NextResponse.json({
      createdCount: created.length,
      taskIds: created.map((t) => t.id),
      skippedCount: tasks.length - created.length,
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
