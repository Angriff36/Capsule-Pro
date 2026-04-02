// Auto-generated Next.js API route for timeoffrequest (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const timeoffrequest = await database.timeoffrequest.findUnique({
    where: { id }
  });

  if (!timeoffrequest) {
    return manifestErrorResponse("timeoffrequest not found", 404);
  }

    return manifestSuccessResponse({ timeoffrequest });
  } catch (error) {
    console.error("Error fetching timeoffrequest:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
