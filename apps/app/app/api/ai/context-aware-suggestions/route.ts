import { auth } from "@repo/auth/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  type GenerateAiContextAwareSuggestionsInput,
  generateAiContextAwareSuggestions,
} from "../../../(authenticated)/command-board/actions/ai-context-aware-suggestions";

export const runtime = "nodejs";
export const maxDuration = 30;

interface QueryParams {
  boardId: string;
  maxSuggestions?: string;
  timeframe?: "today" | "week" | "month";
  useAi?: "true" | "false";
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await requireTenantId();

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) {
      return Response.json({ error: "boardId is required" }, { status: 400 });
    }

    const maxSuggestions = searchParams.get("maxSuggestions");
    const timeframe = searchParams.get("timeframe");
    const useAi = searchParams.get("useAi");

    const input: GenerateAiContextAwareSuggestionsInput = {
      tenantId,
      boardId,
      userId,
      maxSuggestions: maxSuggestions ? Number.parseInt(maxSuggestions, 10) : 5,
      timeframe: (timeframe ?? "week") as "today" | "week" | "month",
      useAi: useAi !== "false",
    };

    const result = await generateAiContextAwareSuggestions(input);

    return Response.json({
      suggestions: result.suggestions,
      summary: result.summary,
      analysis: result.analysis,
      generatedAt: result.generatedAt,
      method: result.method,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return Response.json(
      {
        error: message,
        suggestions: [],
        summary: "Failed to generate suggestions",
      },
      { status: 500 }
    );
  }
}
