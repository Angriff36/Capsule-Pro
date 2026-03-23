/**
 * Simulation Merge API Endpoint
 *
 * POST /api/command-board/simulations/merge - Merge a simulation back to its source board
 * GET /api/command-board/simulations/merge - Check for merge conflicts
 */

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  detectMergeConflicts,
  type MergeOptions,
  mergeSimulationToSource,
} from "../../../../(authenticated)/command-board/actions/boards";

export const runtime = "nodejs";

/**
 * POST /api/command-board/simulations/merge - Merge a simulation back to source
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { simulationId, options } = body as {
      simulationId: string;
      options?: MergeOptions;
    };

    if (!simulationId) {
      return NextResponse.json(
        { message: "Simulation ID is required" },
        { status: 400 }
      );
    }

    // First check for conflicts
    const conflictCheck = await detectMergeConflicts(simulationId);

    // If there are conflicts and we're not forcing, return them
    if (conflictCheck.hasConflicts && options?.applyRemovals !== true) {
      return NextResponse.json({
        success: false,
        hasConflicts: true,
        conflicts: conflictCheck.conflicts,
        message:
          "Merge conflicts detected. Please resolve them before merging.",
      });
    }

    // Perform the merge
    const result = await mergeSimulationToSource(simulationId, options);

    if (result.success) {
      return NextResponse.json({
        success: true,
        mergedChanges: result.mergedChanges,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Failed to merge simulation:",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/command-board/simulations/merge?simulationId=xxx - Check for merge conflicts
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const simulationId = searchParams.get("simulationId");

    if (!simulationId) {
      return NextResponse.json(
        { message: "Simulation ID is required" },
        { status: 400 }
      );
    }

    const result = await detectMergeConflicts(simulationId);

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Failed to check merge conflicts:",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        hasConflicts: false,
        conflicts: [],
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
