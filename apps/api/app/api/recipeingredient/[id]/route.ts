// Auto-generated Next.js API route for recipeingredient (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const recipeingredient = await database.recipeingredient.findUnique({
    where: { id }
  });

  if (!recipeingredient) {
    return manifestErrorResponse("recipeingredient not found", 404);
  }

    return manifestSuccessResponse({ recipeingredient });
  } catch (error) {
    console.error("Error fetching recipeingredient:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
