// Auto-generated Next.js API route for aieventsetupsession (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const aieventsetupsession = await database.aieventsetupsession.findUnique({
    where: { id }
  });

  if (!aieventsetupsession) {
    return manifestErrorResponse("aieventsetupsession not found", 404);
  }

    return manifestSuccessResponse({ aieventsetupsession });
  } catch (error) {
    console.error("Error fetching aieventsetupsession:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
