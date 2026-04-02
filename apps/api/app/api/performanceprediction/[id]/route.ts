// Auto-generated Next.js API route for performanceprediction (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const performanceprediction = await database.performanceprediction.findUnique({
    where: { id }
  });

  if (!performanceprediction) {
    return manifestErrorResponse("performanceprediction not found", 404);
  }

    return manifestSuccessResponse({ performanceprediction });
  } catch (error) {
    console.error("Error fetching performanceprediction:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
