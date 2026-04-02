// Auto-generated Next.js API route for workforceoptimization (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const workforceoptimization = await database.workforceoptimization.findUnique({
    where: { id }
  });

  if (!workforceoptimization) {
    return manifestErrorResponse("workforceoptimization not found", 404);
  }

    return manifestSuccessResponse({ workforceoptimization });
  } catch (error) {
    console.error("Error fetching workforceoptimization:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
