/**
 * Save Generated Tasks API Endpoint
 * POST /api/kitchen/ai/bulk-generate/prep-tasks/save
 *
 * Saves AI-generated prep tasks to the database
 */

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { saveGeneratedTasks } from "../service";
import type { GeneratedPrepTask } from "../types";

interface SaveTasksRequest {
  eventId: string;
  tasks: GeneratedPrepTask[];
}

interface SaveTasksResponse {
  created: number;
  failed: number;
  errors: string[];
  summary: string;
}

export async function POST(request: Request) {
  try {
    // Auth check and get tenant/user IDs
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = (await request.json()) as SaveTasksRequest;
    invariant(body.eventId, "eventId is required");
    invariant(
      Array.isArray(body.tasks) && body.tasks.length > 0,
      "tasks must be a non-empty array"
    );

    // Validate task structure
    for (const task of body.tasks) {
      invariant(task.name, "Task name is required");
      invariant(
        typeof task.quantityTotal === "number" && task.quantityTotal > 0,
        "Task quantityTotal must be a positive number"
      );
      invariant(
        task.startByDate instanceof Date ||
          !Number.isNaN(Date.parse(task.startByDate as unknown as string)),
        "Task startByDate must be a valid date"
      );
      invariant(
        task.dueByDate instanceof Date ||
          !Number.isNaN(Date.parse(task.dueByDate as unknown as string)),
        "Task dueByDate must be a valid date"
      );
      invariant(
        task.priority >= 1 && task.priority <= 10,
        "Task priority must be between 1 and 10"
      );
    }

    // Convert date strings to Date objects if needed
    const normalizedTasks = body.tasks.map((task) => ({
      ...task,
      startByDate:
        task.startByDate instanceof Date
          ? task.startByDate
          : new Date(task.startByDate as unknown as string),
      dueByDate:
        task.dueByDate instanceof Date
          ? task.dueByDate
          : new Date(task.dueByDate as unknown as string),
    }));

    // Save tasks to database via manifest runtime
    const result = await saveGeneratedTasks(
      tenantId,
      userId,
      body.eventId,
      normalizedTasks
    );

    const response: SaveTasksResponse = {
      created: result.created,
      failed: body.tasks.length - result.created,
      errors: result.errors,
      summary: `Created ${result.created} of ${body.tasks.length} tasks${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ""}.`,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    captureException(error);

    // Handle invariant errors
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes("Tenant not found")) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes("is required") ||
        error.message.includes("must be a"))
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json(
      {
        message: "Failed to save tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
