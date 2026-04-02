// Auto-generated Next.js API route for battleboard (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const battleboard = await database.battleboard.findUnique({
    where: { id }
  });

  if (!battleboard) {
    return manifestErrorResponse("battleboard not found", 404);
  }

    return manifestSuccessResponse({ battleboard });
  } catch (error) {
    console.error("Error fetching battleboard:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
