import { NextResponse } from "next/server";
import { generateScenarioSuggestions } from "@/app/(authenticated)/command-board/actions/simulation-impact";
import { requireTenantId } from "@/app/lib/tenant";

export async function GET(request: Request) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const boardId = searchParams.get("boardId");
    const focusAreas = searchParams.get("focusAreas")?.split(",") as
      | Array<"bottlenecks" | "deadlines" | "resources" | "costs" | "quality">
      | undefined;
    const maxScenarios = searchParams.get("maxScenarios")
      ? Number.parseInt(searchParams.get("maxScenarios")!, 10)
      : undefined;
    const useAi = searchParams.get("useAi") !== "false"; // default true

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 }
      );
    }

    const result = await generateScenarioSuggestions({
      boardId,
      tenantId,
      focusAreas,
      maxScenarios,
      useAi,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Failed to generate scenario suggestions:", error);
    return NextResponse.json(
      {
        scenarios: [],
        summary: "Failed to generate suggestions",
        method: "fallback",
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 500 }
    );
  }
}
