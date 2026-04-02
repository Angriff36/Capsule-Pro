// Auto-generated Next.js API route for trainingassignment (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const trainingassignment = await database.trainingassignment.findUnique({
    where: { id }
  });

  if (!trainingassignment) {
    return manifestErrorResponse("trainingassignment not found", 404);
  }

    return manifestSuccessResponse({ trainingassignment });
  } catch (error) {
    console.error("Error fetching trainingassignment:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
