// Auto-generated Next.js API route for adminchatparticipant (detail)
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

  const adminchatparticipant = await database.adminChatParticipant.findFirst({
    where: { id }
  });

  if (!adminchatparticipant) {
    return manifestErrorResponse("adminchatparticipant not found", 404);
  }

    return manifestSuccessResponse({ adminchatparticipant });
  } catch (error) {
    console.error("Error fetching adminchatparticipant:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
