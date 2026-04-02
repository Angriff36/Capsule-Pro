// Auto-generated Next.js API route for lead (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const lead = await database.lead.findUnique({
    where: { id }
  });

  if (!lead) {
    return manifestErrorResponse("lead not found", 404);
  }

    return manifestSuccessResponse({ lead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
