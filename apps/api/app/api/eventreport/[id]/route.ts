// Auto-generated Next.js API route for eventreport (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const eventreport = await database.eventreport.findUnique({
    where: { id }
  });

  if (!eventreport) {
    return manifestErrorResponse("eventreport not found", 404);
  }

    return manifestSuccessResponse({ eventreport });
  } catch (error) {
    console.error("Error fetching eventreport:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
