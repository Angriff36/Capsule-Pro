import { getPrismaClient } from "@repo/database";
import {
  createKitchenDigitalTwinEngine,
  type SimulationParameters,
} from "@repo/manifest-adapters";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/lib/tenant";

/**
 * POST /api/kitchen/digital-twin/simulate
 *
 * Run a digital twin simulation for kitchen operations
 *
 * Query parameters:
 * - eventId: The event to simulate
 *
 * Body:
 * - scenarioType: "normal" | "peak" | "staff_shortage" | "equipment_down" | "custom"
 * - duration: Simulation duration in minutes (default: 480)
 * - timeStep: Simulation tick interval in minutes (default: 5)
 * - customParameters: Optional custom scenario parameters
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const tenantId = await getTenantId();
    const db = getPrismaClient(tenantId);
    const { eventId } = await params;

    const body = await req.json();
    const {
      scenarioType = "normal",
      duration = 480,
      timeStep = 5,
      customParameters,
    } = body as {
      scenarioType?:
        | "normal"
        | "peak"
        | "staff_shortage"
        | "equipment_down"
        | "custom";
      duration?: number;
      timeStep?: number;
      customParameters?: Record<string, unknown>;
    };

    // Validate event exists
    const event = await db.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Create digital twin engine
    const engine = createKitchenDigitalTwinEngine(db, tenantId);

    // Run simulation
    const parameters: SimulationParameters = {
      duration,
      timeStep,
      scenario: scenarioType,
      customParameters,
    };

    const result = await engine.runSimulation(eventId, parameters);

    return NextResponse.json({
      scenarioId: result.scenarioId,
      parameters: result.parameters,
      metrics: {
        totalThroughput: result.metrics.totalThroughput,
        averageCycleTime: result.metrics.averageCycleTime,
        stationUtilization: Array.from(
          result.metrics.stationUtilization.entries()
        ),
        resourceUtilization: Array.from(
          result.metrics.resourceUtilization.entries()
        ),
        bottleneckStations: result.metrics.bottleneckStations,
        onTimeCompletionRate: result.metrics.onTimeCompletionRate,
        totalCost: result.metrics.totalCost,
        efficiencyScore: result.metrics.efficiencyScore,
      },
      recommendations: result.recommendations,
      timelineEvents: result.timelineEvents.slice(0, 100), // Limit for response size
    });
  } catch (error) {
    console.error("Digital twin simulation error:", error);
    return NextResponse.json(
      {
        error: "Simulation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
