// Auto-generated Next.js API route for overrideaudit (detail)
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

  const overrideaudit = await database.overrideAudit.findFirst({
    where: { id }
  });

  if (!overrideaudit) {
    return manifestErrorResponse("overrideaudit not found", 404);
  }

    return manifestSuccessResponse({ overrideaudit });
  } catch (error) {
    console.error("Error fetching overrideaudit:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
