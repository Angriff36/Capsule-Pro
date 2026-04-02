// Auto-generated Next.js API route for inventorysupplier (detail)
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

  const inventorysupplier = await database.inventorySupplier.findFirst({
    where: { id }
  });

  if (!inventorysupplier) {
    return manifestErrorResponse("inventorysupplier not found", 404);
  }

    return manifestSuccessResponse({ inventorysupplier });
  } catch (error) {
    console.error("Error fetching inventorysupplier:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
