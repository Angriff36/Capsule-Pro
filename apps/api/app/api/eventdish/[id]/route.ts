// Auto-generated Next.js API route for eventdish (detail)
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

  const eventdish = await database.event_dishes.findFirst({
    where: { id }
  });

  if (!eventdish) {
    return manifestErrorResponse("eventdish not found", 404);
  }

    return manifestSuccessResponse({ eventdish });
  } catch (error) {
    console.error("Error fetching eventdish:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
