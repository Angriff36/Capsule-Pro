/**
 * Available Connectors API
 *
 * GET /api/inventory/supplier-sync/connectors
 *
 * List all available supplier connectors and their metadata.
 * Useful for UI to show which suppliers can be connected.
 */

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { connectorRegistry } from "@repo/supplier-connectors";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/inventory/supplier-sync/connectors
 *
 * Returns a list of all registered supplier connectors.
 * Each connector includes its ID and display name.
 */
export async function GET(_request: NextRequest) {
  try {
    // Authenticate (optional for public connector listing)
    const { orgId } = await auth();
    if (!orgId) {
      // Allow unauthenticated access to connector list
      // In production, you might want to require auth
      log.warn(
        "[supplier-connectors] Unauthenticated request for connector list"
      );
    }

    const connectors = connectorRegistry.listMetadata();

    return NextResponse.json({
      connectors,
      count: connectors.length,
    });
  } catch (error) {
    captureException(error);
    log.error("[supplier-connectors] Error listing connectors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
