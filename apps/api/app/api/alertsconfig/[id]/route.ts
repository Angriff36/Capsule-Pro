// Auto-generated Next.js API route for alertsconfig (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const alertsconfig = await database.alertsconfig.findUnique({
    where: { id }
  });

  if (!alertsconfig) {
    return manifestErrorResponse("alertsconfig not found", 404);
  }

    return manifestSuccessResponse({ alertsconfig });
  } catch (error) {
    console.error("Error fetching alertsconfig:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
