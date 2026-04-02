// Auto-generated Next.js API route for eventcontract (detail)
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

  const eventcontract = await database.eventContract.findFirst({
    where: { id }
  });

  if (!eventcontract) {
    return manifestErrorResponse("eventcontract not found", 404);
  }

    return manifestSuccessResponse({ eventcontract });
  } catch (error) {
    console.error("Error fetching eventcontract:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
