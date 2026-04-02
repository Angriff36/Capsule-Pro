// Auto-generated Next.js API route for recipestep (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const recipestep = await database.recipestep.findUnique({
    where: { id }
  });

  if (!recipestep) {
    return manifestErrorResponse("recipestep not found", 404);
  }

    return manifestSuccessResponse({ recipestep });
  } catch (error) {
    console.error("Error fetching recipestep:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
