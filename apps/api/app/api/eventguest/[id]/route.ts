// Auto-generated Next.js API route for eventguest (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const eventguest = await database.eventguest.findUnique({
    where: { id }
  });

  if (!eventguest) {
    return manifestErrorResponse("eventguest not found", 404);
  }

    return manifestSuccessResponse({ eventguest });
  } catch (error) {
    console.error("Error fetching eventguest:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
