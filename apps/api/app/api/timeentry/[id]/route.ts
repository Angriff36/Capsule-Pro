// Auto-generated Next.js API route for timeentry (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const timeentry = await database.timeentry.findUnique({
    where: { id }
  });

  if (!timeentry) {
    return manifestErrorResponse("timeentry not found", 404);
  }

    return manifestSuccessResponse({ timeentry });
  } catch (error) {
    console.error("Error fetching timeentry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
