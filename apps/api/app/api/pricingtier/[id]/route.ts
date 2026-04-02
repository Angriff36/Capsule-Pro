// Auto-generated Next.js API route for pricingtier (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const pricingtier = await database.pricingtier.findUnique({
    where: { id }
  });

  if (!pricingtier) {
    return manifestErrorResponse("pricingtier not found", 404);
  }

    return manifestSuccessResponse({ pricingtier });
  } catch (error) {
    console.error("Error fetching pricingtier:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
