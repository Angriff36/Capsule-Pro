/**
 * Discard Simulation API Endpoint
 *
 * POST /api/command-board/simulations/[id]/discard - Discard a simulation
 *
 * This marks the simulation as discarded (archived) without applying changes.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/command-board/simulations/[id]/discard - Discard a simulation
 */
export async function POST(_request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { message: "Simulation ID is required" },
        { status: 400 }
      );
    }

    // Verify it's a simulation board
    const board = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    if (!board || !board.tags.includes("simulation")) {
      return NextResponse.json(
        { message: "Simulation not found" },
        { status: 404 }
      );
    }

    // Check if already applied
    if (board.tags.includes("applied")) {
      return NextResponse.json(
        { message: "Cannot discard an applied simulation" },
        { status: 400 }
      );
    }

    // Check if already discarded
    if (board.status === "archived") {
      return NextResponse.json(
        { message: "Simulation already discarded" },
        { status: 400 }
      );
    }

    // Mark as discarded (archived)
    await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: { status: "archived" },
    });

    return NextResponse.json({
      success: true,
      message: "Simulation discarded successfully",
    });
  } catch (error) {
    console.error("Failed to discard simulation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
