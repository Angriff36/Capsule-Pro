// Auto-generated Next.js API route for eventsummary (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const eventsummary = await database.eventsummary.findUnique({
    where: { id }
  });

  if (!eventsummary) {
    return manifestErrorResponse("eventsummary not found", 404);
  }

    return manifestSuccessResponse({ eventsummary });
  } catch (error) {
    console.error("Error fetching eventsummary:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
