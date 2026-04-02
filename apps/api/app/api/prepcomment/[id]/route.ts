// Auto-generated Next.js API route for prepcomment (detail)
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

  const prepcomment = await database.prepComment.findFirst({
    where: { id }
  });

  if (!prepcomment) {
    return manifestErrorResponse("prepcomment not found", 404);
  }

    return manifestSuccessResponse({ prepcomment });
  } catch (error) {
    console.error("Error fetching prepcomment:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
