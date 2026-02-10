/**
 * AI Bulk Task Generation API Endpoint
 * POST /api/kitchen/ai/bulk-generate/prep-tasks
 *
 * Generates prep tasks for an event using AI analysis
 */

import { NextResponse } from "next/server";
import { invariant } from "@/app/lib/invariant";
import { requireTenantId } from "@/app/lib/tenant";
import { generateBulkPrepTasks } from "./service";
import type { BulkGenerateRequest, BulkGenerateResponse } from "./types";

export async function POST(request: Request) {
  try {
    // Auth check and get tenant ID
    const tenantId = await requireTenantId();

    // Parse request body
    const body = (await request.json()) as BulkGenerateRequest;
    invariant(body.eventId, "eventId is required");

    // Validate options
    if (body.options?.batchMultiplier !== undefined) {
      invariant(
        body.options.batchMultiplier > 0 && body.options.batchMultiplier <= 10,
        "batchMultiplier must be between 1 and 10"
      );
    }

    if (body.options?.priorityStrategy) {
      invariant(
        ["due_date", "urgency", "manual"].includes(
          body.options.priorityStrategy
        ),
        "priorityStrategy must be one of: due_date, urgency, manual"
      );
    }

    if (body.options?.basePriority !== undefined) {
      invariant(
        body.options.basePriority >= 1 && body.options.basePriority <= 10,
        "basePriority must be between 1 and 10"
      );
    }

    // Generate tasks
    const result = await generateBulkPrepTasks(tenantId, body);

    // Build response
    const response: BulkGenerateResponse = {
      batchId: result.batchId,
      status: result.status,
      generatedCount: result.generatedCount,
      totalExpected: result.totalExpected,
      tasks: result.tasks,
      errors: result.errors,
      warnings: result.warnings,
      summary: result.summary,
    };

    // Return success response (tasks are generated but not yet saved)
    // Client can choose to save by calling a separate endpoint
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error("Bulk task generation API error:", error);

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

    if (error instanceof Error && error.message.includes("is required")) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (
      error instanceof Error &&
      (error.message.includes("must be between") ||
        error.message.includes("must be one of"))
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json(
      {
        message: "Failed to generate tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
