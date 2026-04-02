// Auto-generated Next.js API route for cateringorder (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const cateringorder = await database.cateringorder.findUnique({
    where: { id }
  });

  if (!cateringorder) {
    return manifestErrorResponse("cateringorder not found", 404);
  }

    return manifestSuccessResponse({ cateringorder });
  } catch (error) {
    console.error("Error fetching cateringorder:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
