// Auto-generated Next.js API route for preptaskplanworkflow (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const preptaskplanworkflow = await database.preptaskplanworkflow.findUnique({
    where: { id }
  });

  if (!preptaskplanworkflow) {
    return manifestErrorResponse("preptaskplanworkflow not found", 404);
  }

    return manifestSuccessResponse({ preptaskplanworkflow });
  } catch (error) {
    console.error("Error fetching preptaskplanworkflow:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
