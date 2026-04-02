// Auto-generated Next.js API route for ingredient (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const ingredient = await database.ingredient.findUnique({
    where: { id }
  });

  if (!ingredient) {
    return manifestErrorResponse("ingredient not found", 404);
  }

    return manifestSuccessResponse({ ingredient });
  } catch (error) {
    console.error("Error fetching ingredient:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
