// Auto-generated Next.js API route for vendorcatalog (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const vendorcatalog = await database.vendorcatalog.findUnique({
    where: { id }
  });

  if (!vendorcatalog) {
    return manifestErrorResponse("vendorcatalog not found", 404);
  }

    return manifestSuccessResponse({ vendorcatalog });
  } catch (error) {
    console.error("Error fetching vendorcatalog:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
