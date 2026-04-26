/**
 * Revenue Recognition Schedules API Routes
 *
 * NOTE: RevenueRecognitionSchedule model is not yet implemented in the database schema.
 * These routes return 501 Not Implemented until the model is added.
 * BLOCKER: RevenueRecognitionSchedule model does not exist in schema.
 * Tracked as capsule-pro/TODO:revenue-recognition-schedule-model
 */

import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

/**
 * GET /api/accounting/revenue-recognition/schedules
 * List all revenue recognition schedules
 */
export async function GET(request: NextRequest) {
  try {
    await requireTenantId();

    // BLOCKER: RevenueRecognitionSchedule model does not exist in schema.
    // Tracked as capsule-pro/TODO:revenue-recognition-schedule-model
    return NextResponse.json(
      { error: "Revenue recognition schedules not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    captureException(error);
    console.error("Error listing revenue recognition schedules:", error);
    return NextResponse.json(
      { error: "Failed to list revenue recognition schedules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/revenue-recognition/schedules
 * Create a new revenue recognition schedule
 */
export async function POST(request: NextRequest) {
  try {
    await requireTenantId();

    // BLOCKER: RevenueRecognitionSchedule model does not exist in schema.
    // Tracked as capsule-pro/TODO:revenue-recognition-schedule-model
    return NextResponse.json(
      { error: "Revenue recognition schedules not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    captureException(error);
    console.error("Error creating revenue recognition schedule:", error);
    return NextResponse.json(
      { error: "Failed to create revenue recognition schedule" },
      { status: 500 }
    );
  }
}
