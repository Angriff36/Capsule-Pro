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
import { processPendingPrepListGenerations } from "@repo/manifest-runtime";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  generatePrepListCore,
  savePrepListToDatabaseCore,
} from "../../generate/route";

/**
 * Process pending prep list generation requests
 *
 * This endpoint queries for pending prep list generation events in the outbox
 * and processes them. It generates the prep list from event dishes/recipes
 * and persists the result to the database.
 */
export async function POST() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Process pending generations using authenticated tenant context
    const result = await processPendingPrepListGenerations(
      database,
      async (input) => {
        try {
          const prepList = await generatePrepListCore(tenantId, {
            eventId: input.eventId,
            batchMultiplier: input.batchMultiplier,
            dietaryRestrictions: input.dietaryRestrictions,
          });

          const saveResult = await savePrepListToDatabaseCore(
            tenantId,
            input.eventId,
            prepList,
            `${prepList.eventTitle} - Auto-generated Prep List`
          );

          return saveResult;
        } catch (error) {
          captureException(error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to generate prep list",
          };
        }
      }
    );

    return NextResponse.json({
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    captureException(error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    captureException(error);
    return NextResponse.json(
      { error: "Failed to check pending generations" },
      { status: 500 }
    );
  }
}
