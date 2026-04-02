// Auto-generated Next.js API route for preptask (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const preptask = await database.preptask.findUnique({
    where: { id }
  });

  if (!preptask) {
    return manifestErrorResponse("preptask not found", 404);
  }

    return manifestSuccessResponse({ preptask });
  } catch (error) {
    console.error("Error fetching preptask:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
