// Auto-generated Next.js API route for cyclecountsession (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const cyclecountsession = await database.cycleCountSession.findFirst({
    where: { id }
  });

  if (!cyclecountsession) {
    return manifestErrorResponse("cyclecountsession not found", 404);
  }

    return manifestSuccessResponse({ cyclecountsession });
  } catch (error) {
    console.error("Error fetching cyclecountsession:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
