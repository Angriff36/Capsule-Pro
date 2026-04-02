// Auto-generated Next.js API route for eventimportworkflow (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const eventimportworkflow = await database.eventimportworkflow.findUnique({
    where: { id }
  });

  if (!eventimportworkflow) {
    return manifestErrorResponse("eventimportworkflow not found", 404);
  }

    return manifestSuccessResponse({ eventimportworkflow });
  } catch (error) {
    console.error("Error fetching eventimportworkflow:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
