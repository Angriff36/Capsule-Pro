// Auto-generated Next.js API route for kitchentask (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const kitchentask = await database.kitchentask.findUnique({
    where: { id }
  });

  if (!kitchentask) {
    return manifestErrorResponse("kitchentask not found", 404);
  }

    return manifestSuccessResponse({ kitchentask });
  } catch (error) {
    console.error("Error fetching kitchentask:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
