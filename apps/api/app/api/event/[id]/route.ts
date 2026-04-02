// Auto-generated Next.js API route for event (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const event = await database.event.findUnique({
    where: { id }
  });

  if (!event) {
    return manifestErrorResponse("event not found", 404);
  }

    return manifestSuccessResponse({ event });
  } catch (error) {
    console.error("Error fetching event:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
