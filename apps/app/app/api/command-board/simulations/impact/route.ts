import { NextResponse } from "next/server";
import { analyzeSimulationImpact } from "@/app/(authenticated)/command-board/actions/simulation-impact";
import { requireTenantId } from "@/app/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const simulationId = searchParams.get("simulationId");
    const useAi = searchParams.get("useAi") !== "false"; // default true

    if (!simulationId) {
      return NextResponse.json(
        { error: "simulationId is required" },
        { status: 400 }
      );
    }

    const result = await analyzeSimulationImpact({
      simulationId,
      tenantId,
      useAi,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Failed to analyze simulation impact:", error);
    return NextResponse.json(
      {
        analysis: null,
        method: "fallback",
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
