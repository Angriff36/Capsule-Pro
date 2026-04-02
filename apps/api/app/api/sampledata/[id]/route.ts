// Auto-generated Next.js API route for sampledata (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const sampledata = await database.sampledata.findUnique({
    where: { id }
  });

  if (!sampledata) {
    return manifestErrorResponse("sampledata not found", 404);
  }

    return manifestSuccessResponse({ sampledata });
  } catch (error) {
    console.error("Error fetching sampledata:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
