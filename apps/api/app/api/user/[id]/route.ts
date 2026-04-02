// Auto-generated Next.js API route for user (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const user = await database.user.findUnique({
    where: { id }
  });

  if (!user) {
    return manifestErrorResponse("user not found", 404);
  }

    return manifestSuccessResponse({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
