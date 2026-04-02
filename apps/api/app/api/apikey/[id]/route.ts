// Auto-generated Next.js API route for apikey (detail)
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

  const apikey = await database.apiKey.findFirst({
    where: { id }
  });

  if (!apikey) {
    return manifestErrorResponse("apikey not found", 404);
  }

    return manifestSuccessResponse({ apikey });
  } catch (error) {
    console.error("Error fetching apikey:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
