// Auto-generated Next.js API route for allergenwarning (detail)
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

  const allergenwarning = await database.allergenWarning.findFirst({
    where: { id }
  });

  if (!allergenwarning) {
    return manifestErrorResponse("allergenwarning not found", 404);
  }

    return manifestSuccessResponse({ allergenwarning });
  } catch (error) {
    console.error("Error fetching allergenwarning:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
