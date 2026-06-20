import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import {
  BUILT_IN_SIMULATIONS,
  getSimulationById,
  scoreSimulation,
} from "@repo/types/training-simulations";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/staff/training-simulations — list scenarios */
export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    simulations: BUILT_IN_SIMULATIONS.map(({ steps, ...rest }) => ({
      ...rest,
      stepCount: steps.length,
    })),
  });
}

/** POST /api/staff/training-simulations — score a completed run */
export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    simulationId?: string;
    answers?: Record<string, string>;
  };

  if (!(body.simulationId && body.answers)) {
    return NextResponse.json(
      { message: "simulationId and answers are required" },
      { status: 400 }
    );
  }

  const simulation = getSimulationById(body.simulationId);
  if (!simulation) {
    return NextResponse.json(
      { message: "Simulation not found" },
      { status: 404 }
    );
  }

  try {
    const result = scoreSimulation(simulation, body.answers);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    log.error("Failed to score simulation", { error });
    return NextResponse.json(
      { message: "Failed to score simulation" },
      { status: 500 }
    );
  }
}
