// Auto-generated Next.js API route for menu (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const menu = await database.menu.findUnique({
    where: { id }
  });

  if (!menu) {
    return manifestErrorResponse("menu not found", 404);
  }

    return manifestSuccessResponse({ menu });
  } catch (error) {
    console.error("Error fetching menu:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
