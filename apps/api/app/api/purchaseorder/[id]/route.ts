// Auto-generated Next.js API route for purchaseorder (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const purchaseorder = await database.purchaseorder.findUnique({
    where: { id }
  });

  if (!purchaseorder) {
    return manifestErrorResponse("purchaseorder not found", 404);
  }

    return manifestSuccessResponse({ purchaseorder });
  } catch (error) {
    console.error("Error fetching purchaseorder:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
