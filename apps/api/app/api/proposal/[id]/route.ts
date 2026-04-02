// Auto-generated Next.js API route for proposal (detail)
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {


  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return manifestErrorResponse("ID is required", 400);
  }

  const proposal = await database.proposal.findUnique({
    where: { id }
  });

  if (!proposal) {
    return manifestErrorResponse("proposal not found", 404);
  }

    return manifestSuccessResponse({ proposal });
  } catch (error) {
    console.error("Error fetching proposal:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
