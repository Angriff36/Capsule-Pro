// Auto-generated Next.js API route for commandboardgroup (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const commandboardgroup = await database.commandboardgroup.findUnique({
    where: { id }
  });

  if (!commandboardgroup) {
    return manifestErrorResponse("commandboardgroup not found", 404);
  }

    return manifestSuccessResponse({ commandboardgroup });
  } catch (error) {
    console.error("Error fetching commandboardgroup:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
