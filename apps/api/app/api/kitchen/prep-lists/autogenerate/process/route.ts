/**
 * Prep List Auto-Generation Processor
 *
 * This API endpoint processes pending prep list generation requests from the outbox.
 * It should be called by a cron job or background worker.
 *
 * POST /api/kitchen/prep-lists/autogenerate/process
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  generatePrepList,
  processPendingPrepListGenerations,
  savePrepListToDatabase,
} from "@repo/kitchen-ops";
import { NextResponse } from "next/server";

/**
 * Process pending prep list generation requests
 *
 * This endpoint queries for pending prep list generation events in the outbox
 * and processes them. It should be called by a cron job or background worker.
 */
export async function POST() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Process pending generations
    const result = await processPendingPrepListGenerations(
      database,
      async (input) => {
        // Generate prep list
        const prepList = await generatePrepList(input);

        // Save to database
        const saveResult = await savePrepListToDatabase(
          input.eventId,
          prepList,
          `${prepList.eventTitle} - Auto-Generated Prep List`
        );

        if (!saveResult.success) {
          return {
            success: false,
            error: saveResult.error,
          };
        }

        return {
          success: true,
          prepListId: saveResult.prepListId,
        };
      }
    );

    return NextResponse.json({
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing prep list generations:", error);
    return NextResponse.json(
      { error: "Failed to process prep list generations" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check status of pending generations
 */
export async function GET() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Count pending generations
    const pendingCount = await database.outboxEvent.count({
      where: {
        eventType: "event.prep-list.requested",
        status: "pending",
      },
    });

    return NextResponse.json({
      pending: pendingCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking pending generations:", error);
    return NextResponse.json(
      { error: "Failed to check pending generations" },
      { status: 500 }
    );
  }
}
