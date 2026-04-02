// Auto-generated Next.js API route for clientcontact (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const clientcontact = await database.clientcontact.findUnique({
    where: { id }
  });

  if (!clientcontact) {
    return manifestErrorResponse("clientcontact not found", 404);
  }

    return manifestSuccessResponse({ clientcontact });
  } catch (error) {
    console.error("Error fetching clientcontact:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
