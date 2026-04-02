// Auto-generated Next.js API route for budgetalert (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const budgetalert = await database.budgetalert.findUnique({
    where: { id }
  });

  if (!budgetalert) {
    return manifestErrorResponse("budgetalert not found", 404);
  }

    return manifestSuccessResponse({ budgetalert });
  } catch (error) {
    console.error("Error fetching budgetalert:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
