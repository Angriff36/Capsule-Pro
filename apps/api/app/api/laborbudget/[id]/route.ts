// Auto-generated Next.js API route for laborbudget (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const laborbudget = await database.laborbudget.findUnique({
    where: { id }
  });

  if (!laborbudget) {
    return manifestErrorResponse("laborbudget not found", 404);
  }

    return manifestSuccessResponse({ laborbudget });
  } catch (error) {
    console.error("Error fetching laborbudget:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
