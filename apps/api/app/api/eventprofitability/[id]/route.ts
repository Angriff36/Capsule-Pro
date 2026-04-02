// Auto-generated Next.js API route for eventprofitability (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const eventprofitability = await database.eventprofitability.findUnique({
    where: { id }
  });

  if (!eventprofitability) {
    return manifestErrorResponse("eventprofitability not found", 404);
  }

    return manifestSuccessResponse({ eventprofitability });
  } catch (error) {
    console.error("Error fetching eventprofitability:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
