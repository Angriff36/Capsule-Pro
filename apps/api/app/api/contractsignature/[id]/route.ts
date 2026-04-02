// Auto-generated Next.js API route for contractsignature (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const contractsignature = await database.contractsignature.findUnique({
    where: { id }
  });

  if (!contractsignature) {
    return manifestErrorResponse("contractsignature not found", 404);
  }

    return manifestSuccessResponse({ contractsignature });
  } catch (error) {
    console.error("Error fetching contractsignature:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
