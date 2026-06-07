/**
 * Discard Simulation API Endpoint
 *
 * POST /api/command-board/simulations/[id]/discard - Discard a simulation
 *
 * This marks the simulation as discarded (archived) without applying changes.
 */

import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/command-board/simulations/[id]/discard - Discard a simulation
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);

  // Pre-validate: verify it's a simulation board and hasn't been applied/discarded
  const board = await database.commandBoard.findUnique({
    where: {
      tenantId_id: {
        tenantId: user.tenantId,
        id,
      },
    },
  });

  if (!(board && board.tags?.includes("simulation"))) {
    return NextResponse.json(
      { message: "Simulation not found" },
      { status: 404 }
    );
  }

  if (board.tags.includes("applied")) {
    return NextResponse.json(
      { message: "Cannot discard an applied simulation" },
      { status: 400 }
    );
  }

  if (board.status === "archived") {
    return NextResponse.json(
      { message: "Simulation already discarded" },
      { status: 400 }
    );
  }

  return runManifestCommand({
    entity: "CommandBoard",
    command: "deactivate",
    body: {
      id,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
