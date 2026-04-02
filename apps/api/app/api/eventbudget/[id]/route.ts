// Auto-generated Next.js API route for eventbudget (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const eventbudget = await database.eventbudget.findUnique({
    where: { id }
  });

  if (!eventbudget) {
    return manifestErrorResponse("eventbudget not found", 404);
  }

    return manifestSuccessResponse({ eventbudget });
  } catch (error) {
    console.error("Error fetching eventbudget:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
