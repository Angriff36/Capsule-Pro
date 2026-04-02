// Auto-generated Next.js API route for commandboardcard (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const commandboardcard = await database.commandboardcard.findUnique({
    where: { id }
  });

  if (!commandboardcard) {
    return manifestErrorResponse("commandboardcard not found", 404);
  }

    return manifestSuccessResponse({ commandboardcard });
  } catch (error) {
    console.error("Error fetching commandboardcard:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
