// Auto-generated Next.js API route for trainingmodule (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const trainingmodule = await database.trainingmodule.findUnique({
    where: { id }
  });

  if (!trainingmodule) {
    return manifestErrorResponse("trainingmodule not found", 404);
  }

    return manifestSuccessResponse({ trainingmodule });
  } catch (error) {
    console.error("Error fetching trainingmodule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
