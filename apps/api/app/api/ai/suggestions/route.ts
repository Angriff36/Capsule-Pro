import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateSuggestions } from "../../../../app/(authenticated)/command-board/actions/suggestions";
import { getTenantIdForOrg } from "../../../../app/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const boardId = searchParams.get("boardId");
    const eventId = searchParams.get("eventId");
    const module = searchParams.get("module");
    const timeframe = searchParams.get("timeframe") as
      | "today"
      | "week"
      | "month"
      | null;
    const maxSuggestions = Number.parseInt(
      searchParams.get("maxSuggestions") || "5",
      10
    );

    const result = await generateSuggestions({
      tenantId,
      boardId: boardId || undefined,
      eventId: eventId || undefined,
      module: module || undefined,
      timeframe: timeframe || undefined,
      maxSuggestions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
