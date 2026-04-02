// Auto-generated Next.js API route for wasteentry (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const wasteentry = await database.wasteentry.findUnique({
    where: { id }
  });

  if (!wasteentry) {
    return manifestErrorResponse("wasteentry not found", 404);
  }

    return manifestSuccessResponse({ wasteentry });
  } catch (error) {
    console.error("Error fetching wasteentry:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
