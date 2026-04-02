// Auto-generated Next.js API route for recipeversion (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const recipeversion = await database.recipeversion.findUnique({
    where: { id }
  });

  if (!recipeversion) {
    return manifestErrorResponse("recipeversion not found", 404);
  }

    return manifestSuccessResponse({ recipeversion });
  } catch (error) {
    console.error("Error fetching recipeversion:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
