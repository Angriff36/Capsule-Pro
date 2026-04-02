// Auto-generated Next.js API route for admintask (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const admintask = await database.admintask.findUnique({
    where: { id }
  });

  if (!admintask) {
    return manifestErrorResponse("admintask not found", 404);
  }

    return manifestSuccessResponse({ admintask });
  } catch (error) {
    console.error("Error fetching admintask:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
