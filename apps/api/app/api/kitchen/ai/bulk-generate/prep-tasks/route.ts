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

function validateBatchMultiplier(value: number): void {
  invariant(
    value > 0 && value <= 10,
    "batchMultiplier must be between 1 and 10"
  );
}

function validatePriorityStrategy(value: string): void {
  invariant(
    ["due_date", "urgency", "manual"].includes(value),
    "priorityStrategy must be one of: due_date, urgency, manual"
  );
}

function validateBasePriority(value: number): void {
  invariant(
    value >= 1 && value <= 10,
    "basePriority must be between 1 and 10"
  );
}

function validateRequestOptions(body: BulkGenerateRequest): void {
  if (body.options?.batchMultiplier !== undefined) {
    validateBatchMultiplier(body.options.batchMultiplier);
  }

  if (body.options?.priorityStrategy) {
    validatePriorityStrategy(body.options.priorityStrategy);
  }

  if (body.options?.basePriority !== undefined) {
    validateBasePriority(body.options.basePriority);
  }
}

function determineErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      {
        message: "Failed to generate tasks",
        error: "Unknown error",
      },
      { status: 500 }
    );
  }

  const message = error.message;

  if (message.includes("Unauthorized")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (message.includes("Tenant not found")) {
    return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
  }

  if (message.includes("is required")) {
    return NextResponse.json({ message }, { status: 400 });
  }

  if (message.includes("must be between") || message.includes("must be one of")) {
    return NextResponse.json({ message }, { status: 400 });
  }

  return NextResponse.json(
    {
      message: "Failed to generate tasks",
      error: message,
    },
    { status: 500 }
  );
}

function buildResponse(result: Awaited<ReturnType<typeof generateBulkPrepTasks>>): BulkGenerateResponse {
  return {
    batchId: result.batchId,
    status: result.status,
    generatedCount: result.generatedCount,
    totalExpected: result.totalExpected,
    tasks: result.tasks,
    errors: result.errors,
    warnings: result.warnings,
    summary: result.summary,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const tenantId = await requireTenantId();
    const body = (await request.json()) as BulkGenerateRequest;
    invariant(body.eventId, "eventId is required");

    validateRequestOptions(body);

    const result = await generateBulkPrepTasks(tenantId, body);
    const response = buildResponse(result);

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error("Bulk task generation API error:", error);
    return determineErrorResponse(error);
  }
}
